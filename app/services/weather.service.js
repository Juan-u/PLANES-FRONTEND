const WEATHER_CACHE_MS = 15 * 60 * 1000;
const WEATHER_CODE_LABELS = new Map([
  [0, 'Despejado'], [1, 'Mayormente despejado'], [2, 'Parcialmente nublado'], [3, 'Nublado'],
  [45, 'Niebla'], [48, 'Niebla'], [51, 'Llovizna'], [53, 'Llovizna'], [55, 'Llovizna intensa'],
  [56, 'Llovizna helada'], [57, 'Llovizna helada'], [61, 'Lluvia ligera'], [63, 'Lluvia'], [65, 'Lluvia intensa'],
  [66, 'Lluvia helada'], [67, 'Lluvia helada'], [71, 'Nieve ligera'], [73, 'Nieve'], [75, 'Nieve intensa'],
  [77, 'Granos de nieve'], [80, 'Chubascos ligeros'], [81, 'Chubascos'], [82, 'Chubascos intensos'],
  [85, 'Chubascos de nieve'], [86, 'Chubascos de nieve intensos'], [95, 'Tormenta'], [96, 'Tormenta con granizo'], [99, 'Tormenta con granizo']
]);
function weatherSymbol(code) {
  if (code <= 1) return '☀';
  if ([2, 3, 45, 48].includes(code)) return '☁';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '🌧';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄';
  if ([95, 96, 99].includes(code)) return '⛈';
  return '☁';
}

export function createWeatherService({ apiKey, fetchImpl = globalThis.fetch, now = () => Date.now(), defaultCity = 'Villavicencio, Meta, Colombia', latitude = '-4.142', longitude = '-73.626', timeoutMs = 5000 } = {}) {
  const cache = new Map();
  return { async current(city = defaultCity) {
    const requestedCity = typeof city === 'string' ? city.trim().slice(0, 100) : '';
    if (!apiKey || typeof fetchImpl !== 'function') return { available: false, city: requestedCity || defaultCity };
    const cacheKey = (requestedCity || defaultCity).toLocaleLowerCase('es-CO');
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > now()) return cached.value;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      let coords = { name: defaultCity.split(',')[0], latitude: Number(latitude), longitude: Number(longitude), admin1: 'Meta' };
      if (requestedCity && cacheKey !== defaultCity.toLocaleLowerCase('es-CO')) {
        const geoUrl = new URL('https://customer-api.open-meteo.com/v1/search');
        geoUrl.search = new URLSearchParams({ name: requestedCity, count: '1', language: 'es', format: 'json', apikey: apiKey }).toString();
        const geoResponse = await fetchImpl(geoUrl, { signal: controller.signal });
        if (!geoResponse.ok) return { available: false, city: requestedCity };
        const location = (await geoResponse.json()).results?.[0];
        if (!location || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) return { available: false, city: requestedCity };
        coords = location;
      }
      const url = new URL('https://customer-api.open-meteo.com/v1/forecast');
      url.search = new URLSearchParams({ latitude: String(coords.latitude), longitude: String(coords.longitude), current: 'temperature_2m,weather_code', timezone: 'America/Bogota', temperature_unit: 'celsius', apikey: apiKey }).toString();
      const response = await fetchImpl(url, { signal: controller.signal });
      if (!response.ok) return { available: false, city: requestedCity || defaultCity };
      const payload = await response.json();
      const temperature = payload.current?.temperature_2m;
      const code = payload.current?.weather_code;
      if (!Number.isFinite(temperature) || !WEATHER_CODE_LABELS.has(code)) return { available: false, city: requestedCity || defaultCity };
      const value = { available: true, city: [coords.name, coords.admin1, 'Colombia'].filter(Boolean).join(', '), temperature, condition: WEATHER_CODE_LABELS.get(code), icon: weatherSymbol(code), updatedAt: new Date(now()).toISOString(), attribution: 'Datos meteorológicos: Open-Meteo (CC BY 4.0)' };
      cache.set(cacheKey, { value, expiresAt: now() + WEATHER_CACHE_MS });
      return value;
    } catch { return { available: false, city: requestedCity || defaultCity }; }
    finally { clearTimeout(timeout); }
  } };
}

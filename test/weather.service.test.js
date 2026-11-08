import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createWeatherService } from '../app/services/weather.service.js';

const jsonResponse = (body, ok = true) => ({ ok, async json() { return body; } });

test('public Open-Meteo endpoint returns Villavicencio weather in Celsius and Bogota timezone', async () => {
  let requestUrl;
  const service = createWeatherService({ now: () => 1_800_000_000_000,
    fetchImpl: async (url) => {
      requestUrl = new URL(url);
      return jsonResponse({ current: { temperature_2m: 23.4, weather_code: 2 } });
    } });
  const weather = await service.current();
  assert.equal(requestUrl.hostname, 'api.open-meteo.com');
  assert.equal(requestUrl.pathname, '/v1/forecast');
  assert.equal(requestUrl.searchParams.get('latitude'), '-4.142');
  assert.equal(requestUrl.searchParams.get('longitude'), '-73.626');
  assert.equal(requestUrl.searchParams.get('timezone'), 'America/Bogota');
  assert.equal(requestUrl.searchParams.get('temperature_unit'), 'celsius');
  assert.equal(requestUrl.searchParams.has('apikey'), false);
  assert.equal(weather.available, true);
  assert.equal(weather.city, 'Villavicencio, Meta, Colombia');
  assert.equal(weather.temperature, 23.4);
  assert.equal(weather.condition, 'Parcialmente nublado');
  assert.equal(weather.icon, '☁');
  assert.match(weather.attribution, /CC BY 4\.0/);
});

test('public forecast is cached for 15 minutes to avoid duplicate requests', async () => {
  let calls = 0;
  let now = 1_800_000_000_000;
  const service = createWeatherService({ now: () => now, fetchImpl: async () => {
    calls++;
    return jsonResponse({ current: { temperature_2m: 25, weather_code: 0 } });
  } });
  const first = await service.current();
  assert.deepEqual(await service.current(), first);
  assert.equal(calls, 1);
  now += 15 * 60 * 1000;
  await service.current();
  assert.equal(calls, 2);
});

test('user-selected city uses public geocoding and returns a matching weather icon', async () => {
  const urls = [];
  const service = createWeatherService({ defaultCity: 'Villavicencio, Meta, Colombia', fetchImpl: async (url) => {
    urls.push(new URL(url));
    return urls.length === 1
      ? jsonResponse({ results: [{ name: 'Bogotá', admin1: 'Bogota D.C.', latitude: 4.7, longitude: -74.1 }] })
      : jsonResponse({ current: { temperature_2m: 16, weather_code: 61 } });
  } });
  const weather = await service.current('Bogotá');
  assert.equal(urls[0].hostname, 'geocoding-api.open-meteo.com');
  assert.equal(urls[0].pathname, '/v1/search');
  assert.equal(urls[0].searchParams.get('name'), 'Bogotá');
  assert.equal(urls[0].searchParams.has('apikey'), false);
  assert.equal(urls[1].searchParams.get('latitude'), '4.7');
  assert.equal(weather.city, 'Bogotá, Bogota D.C., Colombia');
  assert.equal(weather.condition, 'Lluvia ligera');
  assert.equal(weather.icon, '🌧');
});

test('network failures, invalid weather values and request timeouts do not fabricate temperatures', async () => {
  const unavailable = createWeatherService({ fetchImpl: async () => ({ ok: false }) });
  assert.equal((await unavailable.current()).available, false);
  const unknownCode = createWeatherService({ fetchImpl: async () =>
    jsonResponse({ current: { temperature_2m: 20, weather_code: 999 } }) });
  assert.equal((await unknownCode.current()).available, false);
  const missingTemperature = createWeatherService({ fetchImpl: async () =>
    jsonResponse({ current: { temperature_2m: null, weather_code: 0 } }) });
  assert.equal((await missingTemperature.current()).available, false);
  const timedOut = createWeatherService({ timeoutMs: 1, fetchImpl: (_url, { signal }) =>
    new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })) });
  assert.deepEqual(await timedOut.current(), { available: false, city: 'Villavicencio, Meta, Colombia' });
});

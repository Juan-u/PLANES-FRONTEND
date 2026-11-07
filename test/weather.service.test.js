import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createWeatherService } from '../app/services/weather.service.js';

const jsonResponse = (body, ok = true) => ({ ok, async json() { return body; } });

test('weather is unavailable without a commercial API key and performs no outbound request', async () => {
  let calls = 0;
  const service = createWeatherService({ fetchImpl: async () => { calls++; }, defaultCity: 'Villavicencio, Meta, Colombia' });
  assert.deepEqual(await service.current(), { available: false, city: 'Villavicencio, Meta, Colombia' });
  assert.equal(calls, 0);
});

test('configured weather service uses the customer endpoint, returns Spanish conditions and caches the result', async () => {
  let calls = 0;
  const service = createWeatherService({ apiKey: 'synthetic-test-key', defaultCity: 'Villavicencio, Meta, Colombia', now: () => 1_800_000_000_000,
    fetchImpl: async (url) => { calls++; assert.equal(new URL(url).hostname, 'customer-api.open-meteo.com'); return jsonResponse({ current: { temperature_2m: 23.4, weather_code: 2 } }); } });
  const first = await service.current();
  const second = await service.current();
  assert.equal(first.available, true);
  assert.equal(first.temperature, 23.4);
  assert.equal(first.condition, 'Parcialmente nublado');
  assert.match(first.attribution, /CC BY 4\.0/);
  assert.deepEqual(second, first);
  assert.equal(calls, 1);
});

test('user-selected city is geocoded through the configured commercial endpoint', async () => {
  const urls = [];
  const service = createWeatherService({ apiKey: 'synthetic-test-key', defaultCity: 'Villavicencio, Meta, Colombia', fetchImpl: async (url) => {
    urls.push(new URL(url));
    return urls.length === 1
      ? jsonResponse({ results: [{ name: 'Bogotá', admin1: 'Bogota D.C.', latitude: 4.7, longitude: -74.1 }] })
      : jsonResponse({ current: { temperature_2m: 16, weather_code: 3 } });
  } });
  const weather = await service.current('Bogotá');
  assert.equal(urls[0].pathname, '/v1/search');
  assert.equal(urls[0].searchParams.get('name'), 'Bogotá');
  assert.equal(urls[1].searchParams.get('latitude'), '4.7');
  assert.equal(weather.city, 'Bogotá, Bogota D.C., Colombia');
  assert.equal(weather.condition, 'Nublado');
});

test('upstream errors and unsupported weather codes return unavailable without fabricated values', async () => {
  const unavailable = createWeatherService({ apiKey: 'synthetic-test-key', fetchImpl: async () => ({ ok: false }) });
  assert.equal((await unavailable.current()).available, false);
  const unknown = createWeatherService({ apiKey: 'synthetic-test-key', fetchImpl: async () => jsonResponse({ current: { temperature_2m: 20, weather_code: 999 } }) });
  assert.equal((await unknown.current()).available, false);
});

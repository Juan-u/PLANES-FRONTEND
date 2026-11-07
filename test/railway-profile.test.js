import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {railwayConfiguration, enforceHttps} from '../app/services/railway-profile.js';
const valid = () => ({DEPLOYMENT_PROFILE: 'railway-private-test', BACKEND_API_URL: 'http://backend.railway.internal:3000/api', PUBLIC_ORIGIN: 'https://private-test.example.invalid', SESSION_SECRET: randomBytes(48).toString('base64url'), SESSION_DB_HOST: 'mysql.railway.internal', SESSION_DB_PORT: '3306', SESSION_DB_NAME: 'planes_accion_railway_test', SESSION_DB_USER: 'planes_web_sessions', SESSION_DB_PASSWORD: 'synthetic-only'});
test('local profile does not enable cloud changes', () => assert.equal(railwayConfiguration({}), null));
test('cloud accepts explicit private endpoints and HTTPS origin', () => assert.equal(railwayConfiguration(valid()).database.user, 'planes_web_sessions'));
test('cloud rejects public backend, local database and weak secret', () => {
  for (const override of [{BACKEND_API_URL: 'https://public.example/api'}, {SESSION_DB_HOST: '127.0.0.1'}, {SESSION_DB_NAME: 'planes_accion_test'}, {SESSION_DB_USER: 'root'}, {SESSION_SECRET: 'x'.repeat(64)}, {PUBLIC_ORIGIN: 'http://example.invalid'}, {PUBLIC_ORIGIN: 'https://example.invalid/path'}, {DEPLOYMENT_PROFILE: 'unknown'}]) assert.throws(() => railwayConfiguration({...valid(), ...override}));
});
test('HTTPS redirect ignores untrusted Host and rejects insecure writes', () => {
  const middleware = enforceHttps('https://trusted.example'); let result;
  const res = {redirect: (...args) => {result = args;}, sendStatus: n => {result = n;}, setHeader: () => {}};
  middleware({secure: false, method: 'GET', originalUrl: '/login?x=1', headers: {host: 'evil.example'}}, res, () => assert.fail());
  assert.deepEqual(result, [308, 'https://trusted.example/login?x=1']);
  middleware({secure: false, method: 'POST'}, res, () => assert.fail()); assert.equal(result, 400);
  let next = false; middleware({secure: true}, res, () => {next = true;}); assert.ok(next);
});

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';
import ejs from 'ejs';
import { fileURLToPath } from 'node:url';

test('login renders the approved institutional hierarchy, date, and independent weather indicator', async () => {
  const html = await ejs.renderFile(fileURLToPath(new URL('../views/login.ejs', import.meta.url)), { error: null });
  assert.match(html, /<script src="\/app.js" defer>/);
  assert.match(html, /data-time-zone="America\/Bogota"/);
  assert.match(html, /<h1>Planes de Acción<\/h1>/);
  assert.match(html, /class="auth-institution">Instituto del Huila<\/p>/);
  assert.match(html, /class="auth-subtitle">Sistema de Gestión Institucional<\/p>/);
  assert.match(html, /class="auth-description">Un espacio para organizar los planes y dar seguimiento a la gestión\.<\/p>/);
  assert.ok(html.indexOf('<h1>Planes de Acción</h1>') < html.indexOf('Instituto del Huila'));
  assert.ok(html.indexOf('Instituto del Huila') < html.indexOf('Sistema de Gestión Institucional'));
  assert.match(html, /class="auth-local-date"[\s\S]*?<svg[^>]*aria-hidden="true"[\s\S]*?<time data-current-date aria-label="Fecha actual en Colombia"><\/time>/);
  assert.doesNotMatch(html, /data-current-time|Hora de Colombia|auth-local-time/);
  assert.match(html, /data-login-weather/);
  assert.match(html, /Villavicencio, Meta/);
  assert.match(html, /Consultando el clima/);
  assert.equal((html.match(/class="auth-topography/g) ?? []).length, 3);
  assert.equal((html.match(/aria-hidden="true" focusable="false"/g) ?? []).length, 3);
  assert.match(html, /auth-topography--context-top/);
  assert.match(html, /auth-topography--context-bottom/);
  assert.match(html, /auth-topography--form/);
  assert.match(html, /href="https:\/\/open-meteo\.com\/" target="_blank" rel="noopener noreferrer">Fuente: Open-Meteo/);
  assert.doesNotMatch(html, /data-weather-widget/);
  assert.match(html, /action="\/login" method="POST"/);
  assert.match(html, /<p class="auth-form-help">Ingresa con el correo de tu cuenta<\/p>/);
  assert.ok(html.indexOf('data-login-weather') < html.indexOf('<section class="card card--auth"'));
  const loginForm = html.match(/<form action="\/login"[\s\S]*?<\/form>/)?.[0];
  assert.ok(loginForm);
  assert.match(loginForm, /class="auth-input-wrap"[\s\S]*?<svg[^>]*aria-hidden="true"[\s\S]*?<input class="form-control" type="email" id="correo" name="correo" autocomplete="username" required>/);
  assert.match(loginForm, /class="password-field auth-input-wrap"[\s\S]*?<svg[^>]*aria-hidden="true"[\s\S]*?<input class="form-control" type="password" id="password" name="password" autocomplete="current-password" required>/);
  assert.match(loginForm, /type="button" data-password-toggle aria-controls="password" aria-label="Mostrar contraseña" aria-pressed="false"/);
  assert.match(loginForm, /<button type="submit" class="btn btn-primary auth-submit">Ingresar/);
  assert.doesNotMatch(loginForm, /data-login-weather|data-weather-result/);
});

test('login layout adapts to narrow screens without coupling the widget to the form', async () => {
  const css = await readFile(new URL('../public/style.css', import.meta.url), 'utf8');
  assert.match(css, /\.auth-shell\s*\{[^}]*grid-template-columns:\s*1\.15fr 1fr/);
  assert.match(css, /\.auth-shell\s*\{[^}]*background:\s*linear-gradient\(135deg,\s*#2875d2,\s*#35c4c0/);
  assert.match(css, /@media \(max-width: 760px\)\s*\{\s*\.auth-shell\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /\.auth-topography\s*\{[^}]*pointer-events:\s*none/);
  assert.match(css, /\.auth-topography--context-top\s*\{[^}]*top:\s*-5\.5rem; right:\s*-5\.5rem/);
  assert.match(css, /\.auth-topography--context-bottom\s*\{[^}]*bottom:\s*-7rem; left:\s*-7rem/);
  assert.match(css, /\.auth-topography--form\s*\{[^}]*top:\s*-5\.25rem; right:\s*-5\.5rem/);
  assert.match(css, /\.auth-context\s*\{[^}]*position:\s*relative; isolation:\s*isolate/);
  assert.match(css, /\.auth-input-wrap\s*\{[^}]*position:\s*relative/);
  assert.match(css, /\.auth-input-wrap \.form-control\s*\{[^}]*padding:\s*\.7rem \.85rem \.7rem 2\.8rem/);
  assert.match(css, /\.auth-shell \.btn-primary\s*\{[^}]*linear-gradient/);
  assert.match(css, /\.auth-weather\s*\{[^}]*min-width:\s*0/);
  assert.match(css, /\.auth-weather__details\s*\{[^}]*min-width:\s*0/);
  assert.match(css, /\.auth-local-date\s*\{[^}]*margin:\s*auto 0 1\.15rem/);
  assert.match(css, /@media \(max-width: 760px\)\s*\{[\s\S]*?\.auth-local-date\s*\{[^}]*margin-top:\s*1\.5rem/);
});

test('login weather calls the public fixed-city endpoint and updates without reloading the page', async () => {
  const html = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const attributes = {};
  const nodes = {
    icon: { textContent: '' },
    result: { textContent: '' },
    updated: { textContent: '' }
  };
  const weather = {
    querySelector: selector => ({
      '[data-weather-icon]': nodes.icon,
      '[data-weather-result]': nodes.result,
      '[data-weather-updated]': nodes.updated
    })[selector] ?? null,
    setAttribute: (name, value) => { attributes[name] = value; }
  };
  const intervalCalls = [];
  const timeoutCalls = [];
  let requestUrl;
  let fetchCalls = 0;
  const document = {
    body: { dataset: { timeZone: 'America/Bogota' } },
    getElementById: () => null,
    querySelector: selector => selector === '[data-login-weather]' ? weather : null,
    querySelectorAll: () => [],
    addEventListener() {}
  };
  vm.runInNewContext(html, {
    document,
    Intl,
    Date,
    AbortController,
    fetch: async (url, options) => {
      fetchCalls++;
      requestUrl = url;
      assert.equal(options.cache, 'no-store');
      assert.equal(options.signal.aborted, false);
      return { ok: true, async json() { return {
        available: true, temperature: 24.5, condition: 'Parcialmente nublado', icon: '☁',
        updatedAt: '2026-11-08T19:00:00.000Z'
      }; } };
    },
    window: {
      matchMedia: () => ({ addEventListener() {} }),
      setInterval: (callback, delay) => { intervalCalls.push({ callback, delay }); },
      setTimeout: (callback, delay) => { timeoutCalls.push({ callback, delay }); return timeoutCalls.length; },
      clearTimeout() {}
    }
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(requestUrl, '/api/clima-publico');
  assert.equal(fetchCalls, 1);
  assert.equal(nodes.icon.textContent, '☁');
  assert.equal(nodes.result.textContent, '24.5 °C · Parcialmente nublado');
  assert.match(nodes.updated.textContent, /^Actualizado /);
  assert.equal(attributes['aria-busy'], 'false');
  assert.equal(intervalCalls.length, 1);
  assert.equal(intervalCalls[0].delay, 15 * 60 * 1000);
  assert.equal(timeoutCalls[0].delay, 5000);
});

test('login weather reports unavailable on network errors and keeps the login usable', async () => {
  const html = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const attributes = {};
  const result = { textContent: '' };
  const icon = { textContent: '' };
  const weather = {
    querySelector: selector => ({ '[data-weather-icon]': icon, '[data-weather-result]': result })[selector] ?? null,
    setAttribute: (name, value) => { attributes[name] = value; }
  };
  const document = {
    body: { dataset: { timeZone: 'America/Bogota' } },
    getElementById: () => null,
    querySelector: selector => selector === '[data-login-weather]' ? weather : null,
    querySelectorAll: () => [],
    addEventListener() {}
  };
  vm.runInNewContext(html, {
    document, Intl, Date, AbortController,
    fetch: async () => { throw new Error('offline'); },
    window: {
      matchMedia: () => ({ addEventListener() {} }),
      setInterval() {},
      setTimeout: () => 1,
      clearTimeout() {}
    }
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(result.textContent, 'Clima temporalmente no disponible.');
  assert.equal(icon.textContent, '—');
  assert.equal(attributes['aria-busy'], 'false');
  assert.equal(typeof result.textContent, 'string');
});

test('public login weather route is not session protected; existing custom weather route remains protected', async () => {
  const source = await readFile(new URL('../app/routes/routes.views.js', import.meta.url), 'utf8');
  assert.match(source, /router\.get\("\/api\/clima-publico", getLoginWeather\);/);
  assert.match(source, /router\.get\("\/api\/clima", verificarSesion, getWeather\);/);
});
test('password toggles twice unchanged; login date uses Colombian time and updates on day change', async () => {
  const script = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(script, /data-current-time|second:\s*'2-digit'/);
  const handlers = {};
  const attributes = { 'aria-controls': 'password' };
  let visibleIcon = false;
  const input = { type: 'password', value: 'test-value' };
  const button = {
    getAttribute: key => attributes[key], setAttribute: (key, value) => { attributes[key] = value; },
    addEventListener: (name, callback) => { handlers[name] = callback; },
    querySelector: () => ({ classList: { toggle: (_name, value) => { visibleIcon = value; } } })
  };
  const date = {};
  const intervals = [];
  let now = '2026-11-02T15:04:05Z';
  const document = {
    body: { dataset: { timeZone: 'America/Bogota' } },
    getElementById: id => id === 'password' ? input : null,
    querySelector: selector => selector === '[data-current-date]' ? date : null,
    querySelectorAll: selector => selector === '[data-password-toggle]' ? [button] : [],
    addEventListener() {}
  };
  class FixedDate extends Date { constructor() { super(now); } }
  vm.runInNewContext(script, {
    document, Intl, Date: FixedDate,
    window: { matchMedia: () => ({ addEventListener() {} }), setInterval: (callback, delay) => { intervals.push({ callback, delay }); } }
  });
  assert.match(date.textContent, /^Lunes, 2 de noviembre de 2026$/);
  assert.equal(date.dateTime, '2026-11-02T15:04:05.000Z');
  assert.equal(intervals.length, 1);
  assert.equal(intervals[0].delay, 60 * 1000);
  now = '2026-11-03T15:04:05Z';
  intervals[0].callback();
  assert.match(date.textContent, /^Martes, 3 de noviembre de 2026$/);
  assert.equal(date.dateTime, '2026-11-03T15:04:05.000Z');
  handlers.click();
  assert.equal(input.type, 'text');
  assert.equal(attributes['aria-pressed'], 'true');
  assert.equal(attributes['aria-label'], 'Ocultar contraseña');
  assert.equal(visibleIcon, true);
  handlers.click();
  assert.equal(input.type, 'password');
  assert.equal(attributes['aria-pressed'], 'false');
  assert.equal(visibleIcon, false);
  assert.equal(input.value, 'test-value');
});

test('dashboard keeps capability navigation and excludes local information', async () => {
  const html = await ejs.renderFile(fileURLToPath(new URL('../views/menu.ejs', import.meta.url)), {
    canReadPlans: false, canReadActivities: false, canReadFollowup: true, canReadReports: false,
    canManageUsers: false, canManageRoles: false, navigation: { followup: true }, metrics: {}
  });
  assert.match(html, /href="\/seguimiento"/);
  assert.doesNotMatch(html, /href="\/(planes|actividades|usuarios|roles|informes)"/);
  assert.doesNotMatch(html, /data-current-time|data-current-date|data-weather|weather-card/);
  assert.match(html, /Información no disponible/);
});

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';
import ejs from 'ejs';
import { fileURLToPath } from 'node:url';

test('login loads shared script and public unavailable weather without private requests', async () => {
  const html = await ejs.renderFile(fileURLToPath(new URL('../views/login.ejs', import.meta.url)), { error: null });
  assert.match(html, /<script src="\/app.js" defer>/);
  assert.match(html, /data-time-zone="America\/Bogota"/);
  assert.match(html, /Clima no disponible/);
  assert.doesNotMatch(html, /data-weather-widget|\/api\/clima/);
  assert.match(html, /action="\/login" method="POST"/);
  assert.match(html, /type="button" data-password-toggle/);
});

test('password toggles twice without changing value; clock uses Colombian time', async () => {
  const handlers = {};
  const attributes = { 'aria-controls': 'password' };
  let visibleIcon = false;
  const input = { type: 'password', value: 'test-value' };
  const button = {
    getAttribute: key => attributes[key], setAttribute: (key, value) => { attributes[key] = value; },
    addEventListener: (name, callback) => { handlers[name] = callback; },
    querySelector: () => ({ classList: { toggle: (_name, value) => { visibleIcon = value; } } })
  };
  const date = {}, time = {};
  let interval;
  const document = {
    body: { dataset: { timeZone: 'America/Bogota' } },
    getElementById: id => id === 'password' ? input : null,
    querySelector: selector => ({ '[data-current-date]': date, '[data-current-time]': time })[selector] ?? null,
    querySelectorAll: selector => selector === '[data-password-toggle]' ? [button] : [],
    addEventListener() {}
  };
  class FixedDate extends Date { constructor() { super('2026-11-02T15:04:05Z'); } }
  vm.runInNewContext(await readFile(new URL('../public/app.js', import.meta.url), 'utf8'), {
    document, Intl, Date: FixedDate,
    window: { matchMedia: () => ({ addEventListener() {} }), setInterval: callback => { interval = callback; } }
  });
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
  assert.equal(time.textContent, '10:04:05');
  assert.match(date.textContent, /lunes.*2.*noviembre.*2026/);
  assert.equal(typeof interval, 'function');
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

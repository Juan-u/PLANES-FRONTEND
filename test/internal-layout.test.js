import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ejs from 'ejs';

const render = (file, locals) => ejs.renderFile(fileURLToPath(new URL(`../views/${file}`, import.meta.url)), locals);
const followup = {
  periods: [{ id_periodo: 3, anio: 2026, trimestre: 1, estado: 'open' }], selectedId: '3',
  activities: [{ id_actividad: 8, responsable: 'Ana', fecha_inicio: '2026-01-01', fecha_fin: '2026-03-31', porcentaje_aprobado: 0 }],
  history: [{ id_seguimiento: 19, id_actividad: 8, anio: 2026, trimestre: 1, porcentaje: 75, estado: 'pending' }],
  summary: { period: { estado: 'open' }, activitiesDue: 12, activitiesApproved: 0, activitiesPending: 3,
    summary: { promedioAvance: { explicacion: 'Sin avances aprobados' }, coberturaTrimestral: 0 } },
  canCreate: true, canApprove: true, canManagePeriods: true, csrfToken: 'test-csrf', error: null, notice: null
};

test('followup dates use calendar components without mutating input or changing form dates', async () => {
  for (const [start, end, expectedStart, expectedEnd] of [
    ['2026-11-02', '2026-11-06', '02/11/2026', '06/11/2026'],
    ['2026-11-02T00:00:00.000Z', '2026-11-06T23:30:00-05:00', '02/11/2026', '06/11/2026'],
    ['2024-02-29', '2027-01-01', '29/02/2024', '01/01/2027'],
    [null, '', 'Sin fecha', 'Sin fecha'],
    ['Sin fecha registrada', '<script>x</script>', 'Sin fecha registrada', '&lt;script&gt;x&lt;/script&gt;']
  ]) {
    const activity = Object.freeze({ ...followup.activities[0], fecha_inicio: start, fecha_fin: end });
    const original = JSON.stringify(activity);
    const html = await render('seguimiento.ejs', { ...followup, activities: [activity] });
    assert.ok(html.includes(`Inicio: ${expectedStart}</span>`));
    assert.ok(html.includes(`Fin: ${expectedEnd}</span>`));
    assert.equal(JSON.stringify(activity), original);
    assert.match(html, /id="period-start" name="fecha_inicio" type="date" required/);
    assert.match(html, /id="period-end" name="fecha_fin" type="date" required/);
    assert.match(html, /name="id_periodo" value="3"/);
    assert.match(html, /name="csrfToken" value="test-csrf"/);
    assert.doesNotMatch(html, /<script>x<\/script>/);
  }
});

test('followup renders five original metrics, preserves zero and missing-data explanation', async () => {
  const html = await render('seguimiento.ejs', followup);
  assert.equal((html.match(/<article class="followup-metric">/g) ?? []).length, 5);
  assert.match(html, /followup-metric-value">12</);
  assert.match(html, /followup-metric-value">0</);
  assert.match(html, /followup-metric-value">3</);
  assert.match(html, /followup-metric-value">0%</);
  assert.match(html, /Sin avances aprobados/);
  assert.match(html, /Inicio: 01\/01\/2026/);
  assert.match(html, /Fin: 31\/03\/2026/);
  assert.match(html, /name="periodId"/);
  assert.match(html, /name="csrfToken" value="test-csrf"/);
  assert.match(html, /name="resultado" value="approved"/);
  assert.match(html, /name="resultado" value="rejected"/);
  assert.doesNotMatch(html, /data-current-date|data-current-time/);
  const missing = await render('seguimiento.ejs', { ...followup, summary: { period: { estado: 'closed' } }, canCreate: false });
  assert.equal((missing.match(/Sin datos disponibles/g) ?? []).length, 5);
  assert.doesNotMatch(missing, /followup-metric-value">0/);
});

test('shared header omits clocks for every module and preserves authorized accessible navigation', async () => {
  for (const active of ['menu', 'planes', 'actividades', 'actividad-detalle', 'seguimiento', 'informes', 'usuarios', 'crear', 'editar', 'roles']) {
    const html = await render('partials/navigation.ejs', { active, pageTitle: active, navigation: { followup: true } });
    assert.doesNotMatch(html, /data-current-time|data-current-date/);
    assert.match(html, /aria-label="Seguimiento"/);
    assert.match(html, /href="\/logout"/);
    assert.doesNotMatch(html, /href="\/(planes|actividades|informes|usuarios|roles)"/);
  }
  const full = await render('partials/navigation.ejs', { active: 'planes', pageTitle: 'Planes', navigation: { plans: true, activities: true, followup: true, reports: true, users: true, roles: true } });
  for (const path of ['menu', 'planes', 'actividades', 'seguimiento', 'informes', 'usuarios', 'roles', 'logout']) assert.ok(full.includes(`href="/${path}"`));
  assert.match(full, /is-active[^>]*aria-current="page"/);
});

test('activity edit keeps its raw state and never puts badge HTML inside the input', async () => {
  const html = await render('actividades.ejs', { activities: [{ id_actividad: 5, estado: 'active' }], plans: [], filters: {}, canCreate: false, canUpdate: true, csrfToken: 'csrf', error: null, notice: null,
    labelForDisplay: () => 'Activo' });
  assert.match(html, /name="estado" maxlength="50" value="active"/);
  assert.doesNotMatch(html, /value="<span/);
  assert.match(html, /data-state="active">Activo/);
});

function element() {
  const attrs = new Map(), handlers = {};
  return { attrs, handlers, dataset: {}, inert: false,
    setAttribute: (key, value) => attrs.set(key, value), getAttribute: key => attrs.get(key),
    removeAttribute: key => attrs.delete(key), hasAttribute: key => attrs.has(key),
    toggleAttribute(key, force = !attrs.has(key)) { if (force) attrs.set(key, ''); else attrs.delete(key); return force; },
    addEventListener: (name, callback) => { handlers[name] = callback; },
    querySelector: () => null, querySelectorAll: () => [], focus() { this.focused = true; }, getClientRects: () => [1]
  };
}

test('sidebar defaults expanded, persists collapse and recovers when storage is blocked', async () => {
  const source = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  for (const saved of [null, 'true', 'blocked']) {
    const body = element(), sidebar = element(), collapse = element(), open = element(), close = element(), dismiss = element(), main = element(), topbar = element();
    const link = element(); sidebar.querySelector = () => link;
    sidebar.querySelectorAll = () => [link, dismiss];
    const nodes = { '[data-sidebar-collapse]': collapse, '[data-sidebar-open]': open, '[data-sidebar-close]': close, '[data-sidebar-dismiss]': dismiss, main, '.app-topbar': topbar };
    let stored = saved, change;
    const media = { matches: false, addEventListener: (_name, callback) => { change = callback; } };
    const docHandlers = {};
    const document = { body, activeElement: link, getElementById: id => id === 'app-sidebar' ? sidebar : null,
      querySelector: selector => nodes[selector] ?? null, querySelectorAll: () => [], addEventListener: (name, cb) => { docHandlers[name] = cb; } };
    vm.runInNewContext(source, { document, Intl, Date, window: { matchMedia: () => media,
      localStorage: { getItem: () => { if (saved === 'blocked') throw Error('blocked'); return saved; }, setItem: (_key, value) => { if (saved === 'blocked') throw Error('blocked'); stored = value; } } } });
    assert.equal(body.hasAttribute('data-sidebar-collapsed'), saved === 'true');
    collapse.handlers.click();
    assert.equal(body.hasAttribute('data-sidebar-collapsed'), saved !== 'true');
    if (saved !== 'blocked') assert.equal(stored, String(saved !== 'true'));
    media.matches = true; change();
    assert.equal(sidebar.inert, true);
    open.handlers.click();
    assert.equal(sidebar.inert, false);
    assert.equal(main.hasAttribute('inert'), true);
    assert.equal(sidebar.getAttribute('aria-modal'), 'true');
    assert.equal(open.getAttribute('aria-expanded'), 'true');
    document.activeElement = dismiss;
    let prevented = false;
    docHandlers.keydown({ key: 'Tab', preventDefault: () => { prevented = true; } });
    assert.equal(prevented, true);
    docHandlers.keydown({ key: 'Escape' });
    assert.equal(sidebar.inert, true);
    assert.equal(main.hasAttribute('inert'), false);
    assert.equal(open.getAttribute('aria-expanded'), 'false');
    assert.equal(open.focused, true);
    media.matches = false; change();
    assert.equal(sidebar.inert, false);
  }
});

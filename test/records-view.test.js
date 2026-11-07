import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import ejs from 'ejs';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const render = (view, data) => ejs.renderFile(fileURLToPath(new URL(`../views/${view}.ejs`, import.meta.url)), data);
const plans = { planes: [{ id_plan: 3, nombre: 'Plan <prueba>', descripcion: 'Descripción <segura>', fecha_creacion: '2026-11-02T00:00:00Z', estado: 'Pendiente de aprobación' }], canCreatePlans: true, canUpdatePlans: true, canReadActivities: true, csrfToken: 'test-csrf', error: null, notice: null };
const activities = { activities: [{ id_actividad: 8, id_plan: 3, descripcion: 'Descripción <segura>', responsable: 'Ana', fecha_inicio: '2026-11-02', fecha_fin: '2026-11-06', estado: 'Pendiente de aprobación' }], plans: [{ id_plan: 3, nombre: 'Plan <prueba>' }], canCreate: true, canUpdate: true, csrfToken: 'test-csrf', filters: { planId: '3', estado: 'Pendiente', responsable: 'Ana' }, error: null, notice: null };

for (const [value, expected] of [
  ['2026-11-02', '02/11/2026'], ['2026-11-02T00:00:00Z', '02/11/2026'],
  ['2026-11-02T23:30:00-05:00', '02/11/2026'], ['2024-02-29', '29/02/2024'],
  ['2026-02-29', '2026-02-29'], ['2026-13-01', '2026-13-01'],
  [null, 'Sin fecha'], ['', 'Sin fecha'], ['fecha desconocida', 'fecha desconocida'],
  ['<script>alert(1)</script>', '&lt;script&gt;alert(1)&lt;/script&gt;']
]) {
  test(`record calendar date safely preserves calendar meaning: ${String(value)}`, async () => {
    const html = await render('partials/record-date', { value });
    assert.ok(html.includes(expected));
    assert.doesNotMatch(html, /<script>/);
    if (expected.includes('/202')) assert.match(html, /<time datetime="\d{4}-\d{2}-\d{2}">/);
  });
}

for (const [view, data, actions, editorId] of [
  ['planes', plans, ['/planes/crear', '/planes/editar'], 'edit-plan-3'],
  ['actividades', activities, ['/actividades/crear', '/actividades/editar'], 'edit-activity-8']
]) {
  test(`${view} keeps POST actions, CSRF, values and identifiers outside table rows`, async () => {
    const snapshot = JSON.stringify(data), html = await render(view, data);
    for (const action of actions) {
      const form = html.match(new RegExp(`<form action="${action}"[\\s\\S]*?</form>`))[0];
      assert.match(form, /method="post"/);
      assert.match(form, /name="csrfToken" value="test-csrf"/);
    }
    assert.doesNotMatch(html.match(/<tbody>[\s\S]*?<\/tbody>/)[0], /<form|<details/);
    assert.match(html, new RegExp(`aria-controls="${editorId}" aria-expanded="false"`));
    assert.match(html, new RegExp(`id="${editorId}" data-record-editor`));
    assert.match(html, /type="button" data-record-close>Cancelar/);
    assert.match(html, /name="id" value="(3|8)"/);
    assert.match(html, /Descripci[oó]n &lt;segura&gt;/);
    assert.match(html, /status-pill record-status/);
    assert.match(html, /Pendiente de aprobación/);
    assert.equal(JSON.stringify(data), snapshot);
  });
  test(`${view} preserves restricted permissions and existing error messages`, async () => {
    const restricted = { ...data, canCreatePlans: false, canUpdatePlans: false, canCreate: false, canUpdate: false, error: '<error de prueba>' };
    const html = await render(view, restricted);
    assert.doesNotMatch(html, /data-record-editor|data-record-open|method="post"/);
    assert.match(html, /role="alert">&lt;error de prueba&gt;/);
  });
}

test('activities preserve native date values, filter parameters and field constraints', async () => {
  const html = await render('actividades', activities);
  assert.match(html, /<time datetime="2026-11-02">02\/11\/2026/);
  assert.match(html, /<time datetime="2026-11-06">06\/11\/2026/);
  assert.match(html, /id="start-8" name="fecha_inicio" type="date" value="2026-11-02"/);
  assert.match(html, /id="end-8" name="fecha_fin" type="date" value="2026-11-06"/);
  assert.match(html, /name="estado" maxlength="50" value="Pendiente de aprobación"/);
  assert.match(html, /action="\/actividades" method="get"/);
  assert.match(html, /name="responsable" maxlength="100" value="Ana"/);
  assert.match(html, /name="id_plan" required/);
});

test('detail shares date and badge presentation while retaining evidence actions', async () => {
  const html = await render('actividad-detalle', { activity: activities.activities[0], evidences: [{ id_evidencia: 4, fecha_subida: '2026-11-02T00:00:00Z', nombre_original: 'Prueba.pdf', bytes: 10 }], canReadEvidence: true, canUploadEvidence: true, csrfToken: 'test-csrf' });
  assert.match(html, /02\/11\/2026/);
  assert.match(html, /06\/11\/2026/);
  assert.match(html, /status-pill record-status/);
  assert.match(html, /href="\/evidencias\/4\/descargar"/);
  assert.match(html, /action="\/evidencias\/cargar" method="post"/);
});

test('record disclosure restores focus, keeps the draft and never submits on open or close', async () => {
  const events = {}, triggerEvents = {}, closeEvents = {};
  let focused = '', scrolled = false;
  const input = { value: 'Borrador conservado', focus() { focused = 'input'; } };
  const trigger = { attributes: { 'aria-controls': 'edit-plan-3' },
    getAttribute(key) { return this.attributes[key]; }, setAttribute(key, value) { this.attributes[key] = value; },
    addEventListener(key, callback) { triggerEvents[key] = callback; }, focus() { focused = 'trigger'; } };
  const cancel = { addEventListener(key, callback) { closeEvents[key] = callback; } };
  const editor = { id: 'edit-plan-3', open: false,
    addEventListener(key, callback) { events[key] = callback; },
    querySelector(selector) { return selector === '[data-record-close]' ? cancel : input; },
    scrollIntoView() { scrolled = true; } };
  const document = { body: { dataset: {} }, getElementById() { return null; }, querySelector() { return null; },
    addEventListener() {}, querySelectorAll(selector) {
      return selector === '[data-record-editor]' ? [editor] : selector === '[data-record-open]' ? [trigger] : [];
    } };
  vm.runInNewContext(await readFile(new URL('../public/app.js', import.meta.url), 'utf8'), {
    document, Date, Intl, window: { matchMedia: () => ({ matches: false, addEventListener() {} }) }
  });
  triggerEvents.click();
  assert.equal(editor.open, true); assert.equal(focused, 'input'); assert.equal(scrolled, true);
  events.toggle(); assert.equal(trigger.attributes['aria-expanded'], 'true');
  closeEvents.click(); assert.equal(editor.open, false); assert.equal(focused, 'trigger');
  assert.equal(input.value, 'Borrador conservado');
  triggerEvents.click();
  let prevented = false;
  events.keydown({ key: 'Escape', preventDefault() { prevented = true; } });
  assert.equal(prevented, true); assert.equal(editor.open, false);
  assert.equal(trigger.attributes['aria-expanded'], 'false');
  assert.equal(focused, 'trigger'); assert.equal(input.value, 'Borrador conservado');
});

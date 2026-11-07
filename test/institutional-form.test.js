import assert from 'node:assert/strict';
import { test } from 'node:test';
import ejs from 'ejs';
import { fileURLToPath } from 'node:url';
import { institutionalBody, retainDraft } from '../app/controllers/institutional-form.js';
const render = (name, data) => ejs.renderFile(fileURLToPath(new URL(`../views/partials/${name}.ejs`, import.meta.url)), data);
test('form transport preserves decimal precision, references and incomplete draft values', () => {
  const body = { institucional: { nombre: 'A', revision: '2' }, resource_id: ['4',''], resource_description: ['Equipo',''], resource_quantity: ['0.0000',''], resource_cost: ['10.20',''] };
  const before = structuredClone(body), result = institutionalBody(body, 'actividad');
  assert.deepEqual(result.institucional.recursos, [{ id: '4', descripcion: 'Equipo', cantidad: '0.0000', costo_estimado: '10.20' }]);
  assert.deepEqual(body, before);
  assert.deepEqual(institutionalBody({ nombre: 'Legacy' }, 'plan'), {});
});
test('error recovery stores only draft input and never CSRF, passwords or tokens', () => {
  const req = { session: {} };
  retainDraft(req, 'plan', { nombre: 'Conservar', password: 'excluded', csrfToken: 'excluded', token: 'excluded', institucional: { problema: '<script>' } });
  assert.deepEqual(req.session.recordDraft.value, { nombre: 'Conservar', institucional: { problema: '<script>' } });
});
test('institutional forms escape input and preserve revision, association and resources', async () => {
  const html = await render('institutional-fields', { kind: 'actividad', draft: { revision: 2, nombre: '<script>x</script>', id_objetivo: 4, recursos: [{ id: 9, descripcion: 'Equipo', cantidad: '0', costo_estimado: '1.25' }] }, linkedPlans: [{ id_plan: 7, nombre: 'P', institucional: { objetivos: [{ id: 4, descripcion: '<objetivo>' }] } }] });
  assert.match(html, /&lt;script&gt;x&lt;\/script&gt;/);
  assert.match(html, /name="institucional\[revision\]" value="2"/);
  assert.match(html, /data-plan="7" selected/);
  assert.match(html, /name="resource_id\[\]" value="9"/);
  assert.doesNotMatch(html, /<script>|required|password|eval\(/);
});
test('read-only draft is explicit and escapes formulas without executing them', async () => {
  const html = await render('institutional-read', { draft: { problema: '<unsafe>', meta_valor: '0.0000', indicador: { formula: '<script>' }, objetivos: [{ id: 3, descripcion: 'A' }] } });
  assert.match(html, /borrador/);
  assert.match(html, /0.0000/);
  assert.match(html, /&lt;unsafe&gt;/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<form|<script>/);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import ejs from 'ejs';

const base = {
  canReadPlans: true, canReadActivities: true, canReadFollowup: true,
  canReadReports: true, canManageUsers: true, canManageRoles: true,
  navigation: { plans: true, activities: true, followup: true, reports: true, users: true, roles: true },
  metrics: { plans: 12, activities: 35, pendingFollowups: 4, approvedProgress: 42.5, coverage: 70 },
  metricStates: {}, followupPeriod: { year: 2026, quarter: 4 }
};
const render = data => ejs.renderFile(fileURLToPath(new URL('../views/menu.ejs', import.meta.url)), { ...base, ...data });

test('dashboard keeps numbers prominent and associates the period only with followup metrics', async () => {
  const html = await render({});
  assert.equal((html.match(/class="metric-value"/g) ?? []).length, 5);
  assert.equal((html.match(/Cuarto trimestre de 2026/g) ?? []).length, 3);
  for (const key of ['plans', 'activities']) {
    const card = html.match(new RegExp(`<article[^>]*data-metric="${key}"[\\s\\S]*?</article>`))[0];
    assert.doesNotMatch(card, /metric-period|trimestre de/);
  }
  assert.match(html, /42\.5%/);
  assert.doesNotMatch(html, /data-current-time|data-current-date|weather-card|período disponible/);
});

test('dashboard preserves zero and separately explains valid empty lists', async () => {
  const html = await render({ metrics: { plans: 0, activities: 0, pendingFollowups: 0, approvedProgress: 0, coverage: 0 }, metricStates: { plans: 'empty', activities: 'empty' } });
  assert.equal((html.match(/class="metric-value">0%?</g) ?? []).length, 5);
  assert.equal((html.match(/No hay registros disponibles/g) ?? []).length, 2);
});

test('dashboard explanatory objects and long text never use the numeric class and are escaped', async () => {
  const explanation = 'No hay avances aprobados para calcular este indicador. Consulta los registros del período autorizado. <script>unsafe()</script>';
  const html = await render({ metrics: { ...base.metrics, approvedProgress: { explicacion: explanation } } });
  assert.equal((html.match(/class="metric-value"/g) ?? []).length, 4);
  assert.match(html, /class="metric-message ">No hay avances/);
  assert.match(html, /&lt;script&gt;unsafe\(\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>unsafe/);
});

test('dashboard distinguishes partial failures, unavailable data and denied metrics', async () => {
  const html = await render({ metrics: { ...base.metrics, plans: null, pendingFollowups: null, coverage: null }, metricStates: { plans: 'error', pendingFollowups: 'unavailable', coverage: 'forbidden' }, followupPeriod: null });
  assert.match(html, /metric-message--error">No fue posible consultar esta información/);
  assert.match(html, /Información no disponible para tu cuenta/);
  assert.match(html, /class="metric-value">35</);
  assert.match(html, /class="metric-value">42\.5%</);
  assert.equal((html.match(/Período no disponible/g) ?? []).length, 3);
});

test('dashboard restricted permissions hide unrelated cards and module links', async () => {
  const html = await render({ canReadPlans: false, canReadActivities: false, canReadReports: false, canManageUsers: false, canManageRoles: false, navigation: { followup: true } });
  assert.equal((html.match(/data-metric=/g) ?? []).length, 3);
  assert.doesNotMatch(html, /Planes registrados|Actividades existentes|href="\/(planes|actividades|usuarios|roles|informes)"/);
});

test('dashboard rejects invalid display period without inferring the current date', async () => {
  for (const followupPeriod of [null, { year: 2026, quarter: 0 }, { year: 2026, quarter: 5 }, { year: '2026', quarter: 4 }]) {
    const html = await render({ followupPeriod });
    assert.equal((html.match(/Período no disponible/g) ?? []).length, 3);
    assert.doesNotMatch(html, /trimestre de/);
  }
});

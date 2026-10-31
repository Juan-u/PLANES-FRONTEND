import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ejs from 'ejs';

test('role administration view renders modules, approvals, assignment controls and CSRF fields safely', async () => {
  const template = await readFile(new URL('../views/role-admin.ejs', import.meta.url), 'utf8');
  const html = ejs.render(template, {
    error: null, csrfToken: 'session-csrf', selectedUserId: '', assignments: [],
    capabilities: { 'M01.roles.read': true, 'M01.permissions.read': true, 'M01.requests.read': true, 'M01.assignments.read': true, 'M03.plans.read': true,
      'approve-role-change': true, 'revoke-role': true, 'assign-role': true, 'M01.roles.manage': true, 'M01.permissions.manage': true },
    requests: [{ id: 'request-id', action: 'assign', status: 'pending_approval', targetUserId: 8,
      roleName: '<script>alert(1)</script>', reason: 'Business reason', expiresAt: '2026-11-01T00:00:00Z' }],
    roles: [{ id: 4, name: 'plan_author', description: 'Author', classification: 'ordinary',
      requiresScope: true, allowOpenEndedAssignment: false, permissions: [{ code: 'M03.plans.read', active: true }] }],
    permissions: [{ id: 1, code: 'M03.plans.read', description: 'Read plans', active: true }]
  });
  assert.match(html, /Roles y permisos/);
  assert.match(html, /pending_approval|Asignar/);
  assert.match(html, /name="csrfToken" value="session-csrf"/);
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test('role administration view omits unauthorized mutation controls', async () => {
  const template = await readFile(new URL('../views/role-admin.ejs', import.meta.url), 'utf8');
  const html = ejs.render(template, {
    error: null, csrfToken: 'csrf', selectedUserId: '9',
    assignments: [{ id: 'assignment-id', status: 'active', canRevoke: false }],
    requests: [{ id: 'request-id', status: 'pending_approval', action: 'assign', canDecide: false }],
    roles: [], permissions: [], capabilities: { 'M01.assignments.read': true, 'M01.requests.read': true }
  });
  assert.doesNotMatch(html, /action="\/roles\/asignaciones"/);
  assert.doesNotMatch(html, /action="\/roles\/revocaciones"/);
  assert.doesNotMatch(html, /action="\/roles\/solicitudes\/decision"/);
  assert.doesNotMatch(html, /action="\/roles\/permisos"/);
  assert.doesNotMatch(html, /action="\/roles\/configuracion"/);
});

test('menu only exposes management navigation when backend permission checks render true', async () => {
  const template = await readFile(new URL('../views/menu.ejs', import.meta.url), 'utf8');
  const hidden = ejs.render(template, { canManageUsers: false, canManageRoles: false, canReadPlans: false, canReadActivities: false, canReadReports: false, canReadFollowup: false });
  assert.doesNotMatch(hidden, /href="\/usuarios"/);
  assert.doesNotMatch(hidden, /href="\/roles"/);
  const permitted = ejs.render(template, { canManageUsers: true, canManageRoles: true, canReadPlans: true, canReadActivities: true, canReadReports: true, canReadFollowup: true });
  assert.match(permitted, /href="\/usuarios"/);
  assert.match(permitted, /href="\/roles"/);
  assert.match(permitted, /href="\/planes"/);
  assert.match(permitted, /href="\/actividades"/);
  assert.match(permitted, /href="\/informes"/);
  assert.match(permitted, /href="\/seguimiento"/);
});

test('user management view renders only actions in the effective capability set', async () => {
  const template = await readFile(new URL('../views/listar.ejs', import.meta.url), 'utf8');
  const hidden = ejs.render(template, { usuarios: [{ id: 9, nombre: 'User', email: 'user@example.test', estado: 'Activo' }],
    csrfToken: 'csrf', canCreateUsers: false, canUpdateUsers: false, canDeactivateUsers: false, canReadRoles: false, canReadPlans: false });
  assert.doesNotMatch(hidden, /href="\/usuarios\/nuevo"/);
  assert.doesNotMatch(hidden, /href="\/usuarios\/editar/);
  assert.doesNotMatch(hidden, /action="\/usuarios\/eliminar"/);
  assert.doesNotMatch(hidden, /href="\/roles"/);
  assert.doesNotMatch(hidden, /href="\/planes"/);
  const permitted = ejs.render(template, { usuarios: [{ id: 9, nombre: 'User', email: 'user@example.test', estado: 'Activo' }],
    csrfToken: 'csrf', canCreateUsers: true, canUpdateUsers: true, canDeactivateUsers: true, canReadRoles: true, canReadPlans: true });
  assert.match(permitted, /href="\/usuarios\/nuevo"/);
  assert.match(permitted, /href="\/usuarios\/editar\/9"/);
  assert.match(permitted, /action="\/usuarios\/eliminar"/);
  assert.match(permitted, /href="\/roles"/);
  assert.match(permitted, /href="\/planes"/);
});

test('plans screen renders only escaped read-only records', async () => {
  const template = await readFile(new URL('../views/planes.ejs', import.meta.url), 'utf8');
  const html = ejs.render(template, { planes: [{ id_plan: 3, nombre: '<script>x</script>', descripcion: 'Plan', fecha_creacion: '2026-01-01', estado: 'Activo' }], canCreatePlans: false, canUpdatePlans: false, canReadActivities: false, csrfToken: 'csrf', notice: null, error: null });
  assert.match(html, /Planes de acción/);
  assert.match(html, /&lt;script&gt;x&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<form/);
});

test('plans screen exposes create and edit forms only for corresponding capabilities', async () => {
  const template = await readFile(new URL('../views/planes.ejs', import.meta.url), 'utf8');
  const permitted = ejs.render(template, { planes: [{ id_plan: 3, nombre: 'Plan', descripcion: null }], canCreatePlans: true, canUpdatePlans: true, canReadActivities: true, csrfToken: 'csrf', notice: null, error: null });
  assert.match(permitted, /action="\/planes\/crear"/);
  assert.match(permitted, /action="\/planes\/editar"/);
  assert.match(permitted, /name="csrfToken"/);
  const hidden = ejs.render(template, { planes: [{ id_plan: 3, nombre: 'Plan', descripcion: null }], canCreatePlans: false, canUpdatePlans: false, canReadActivities: false, csrfToken: 'csrf', notice: null, error: null });
  assert.doesNotMatch(hidden, /<form/);
});

test('activities view renders filters, escaped details and capability-gated mutation forms', async () => {
  const template = await readFile(new URL('../views/actividades.ejs', import.meta.url), 'utf8');
  const html = ejs.render(template, { activities: [{ id_actividad: 5, id_plan: 2, descripcion: '<img src=x>', responsable: 'Ana', estado: 'En proceso' }], plans: [{ id_plan: 2, nombre: 'Plan' }], canCreate: true, canUpdate: true, csrfToken: 'csrf-token', filters: {}, error: null, notice: null });
  assert.match(html, /name="planId"/);
  assert.match(html, /action="\/actividades\/crear"/);
  assert.match(html, /action="\/actividades\/editar"/);
  assert.match(html, /href="\/actividades\/5"/);
  assert.match(html, /&lt;img src=x&gt;/);
  const restricted = ejs.render(template, { activities: [{ id_actividad: 5, id_plan: 2 }], plans: [], canCreate: false, canUpdate: false, csrfToken: 'csrf-token', filters: {}, error: null, notice: null });
  assert.doesNotMatch(restricted, /<form action="\/actividades\/(crear|editar)"/);
});

test('activity detail view escapes database values', async () => {
  const template = await readFile(new URL('../views/actividad-detalle.ejs', import.meta.url), 'utf8');
  const html = ejs.render(template, { activity: { id_actividad: 5, id_plan: 2, descripcion: '<script>x</script>', responsable: 'Ana', estado: 'En proceso' }, evidences: [], canReadEvidence: false, canUploadEvidence: false, csrfToken: 'csrf' });
  assert.match(html, /&lt;script&gt;x&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>x<\/script>/);
});

test('follow-up view exposes separate submit/review forms by effective capabilities', async () => {
  const template = await readFile(new URL('../views/seguimiento.ejs', import.meta.url), 'utf8');
  const html = ejs.render(template, { periods: [{ id_periodo: 3, anio: 2026, trimestre: 1, estado: 'open' }], selectedId: '3', activities: [{ id_actividad: 8, id_seguimiento_pendiente: null, fecha_fin: '2026-03-31' }], history: [{ id_seguimiento: 19, id_actividad: 8, anio: 2026, trimestre: 1, porcentaje: 75, estado: 'pending' }], summary: { period: { estado: 'open' }, activitiesDue: 1, activitiesApproved: 0, activitiesPending: 1, summary: { promedioAvance: { estado: 'no_aplica', explicacion: 'No aplica' }, coberturaTrimestral: 0 } }, canCreate: true, canApprove: true, canManagePeriods: true, csrfToken: 'csrf', error: null, notice: null });
  assert.match(html, /action="\/seguimiento\/crear"/);
  assert.match(html, /action="\/seguimiento\/decision"/);
  assert.match(html, /action="\/seguimiento\/periodos\/crear"/);
  const denied = ejs.render(template, { periods: [], selectedId: '', activities: [], history: [], summary: null, canCreate: false, canApprove: false, canManagePeriods: false, csrfToken: 'csrf', error: null, notice: null });
  assert.doesNotMatch(denied, /action="\/seguimiento\/(crear|decision)/);
});

test('reports view escapes stored observations and renders export only when allowed', async () => {
  const template = await readFile(new URL('../views/informes.ejs', import.meta.url), 'utf8');
  const html = ejs.render(template, { records: [{ id_calificacion: 1, nombre_plan: 'Plan', trimestre: 1, puntaje: 75, observaciones_planeacion: '<img src=x>' }], plans: [{ id_plan: 2, nombre: 'Plan' }], filters: {}, filterQuery: '', canExport: true, canReadFollowup: false, followupPeriods: [], followupSummary: null, selectedFollowupPeriodId: '' });
  assert.match(html, /calificaciones\.csv/);
  assert.match(html, /&lt;img src=x&gt;/);
  const hidden = ejs.render(template, { records: [], plans: [], filters: {}, filterQuery: '', canExport: false, canReadFollowup: false, followupPeriods: [], followupSummary: null, selectedFollowupPeriodId: '' });
  assert.doesNotMatch(hidden, /calificaciones\.csv/);
});

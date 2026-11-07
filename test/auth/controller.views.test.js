import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import ejs from 'ejs';
import { fileURLToPath } from 'node:url';

// Institutional draft writes use the existing CSRF-protected mutation handlers.

let apiResponse;
let fetchFailure = null;
const fetchCalls = [];

const fetchMock = async (...args) => {
  fetchCalls.push(args);
  if (fetchFailure) {
    throw fetchFailure;
  }
  if (typeof apiResponse === 'function') return apiResponse(...args);
  return apiResponse;
};

mock.module('node-fetch', { defaultExport: fetchMock });

const {
  postLogin,
  logout,
  getMenu,
  getPlanes,
  postCrearPlan,
  postActualizarPlan,
  getActividades,
  getDetalleActividad,
  postCrearActividad,
  postActualizarActividad,
  getInformes,
  getInformeCsv,
  getSeguimiento,
  postCrearPeriodo,
  postCerrarPeriodo,
  postCrearSeguimiento,
  postDecisionSeguimiento,
  postCargarEvidencia,
  postBinaryEvidence,
  postReopenRequest,
  getDescargarEvidencia,
  getUsuarios,
  getNuevoUsuario,
  postCrearUsuario,
  getEditarUsuario,
  postEditarUsuario,
  postEliminarUsuario,
  getRoleAdministration,
  postRoleConfiguration,
  postRolePermissions,
  postPermissionState,
  convertCsvToExcelSemicolon
} = await import('../../app/controllers/controller.views.js');

function createResponse() {
  return {
    rendered: null,
    redirectedTo: null,
    statusCode: null,
    sent: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(body) {
      this.sent = body;
      return this;
    },
    json(body) { this.sent = body; return this; },
    type(value) { this.contentType = value; return this; },
    attachment(value) { this.attachmentName = value; return this; },
    setHeader(name, value) { this.headers ??= {}; this.headers[name] = value; return this; },
    render(view, data) {
      this.rendered = { view, data };
      return this;
    },
    redirect(path) {
      this.redirectedTo = path;
      return this;
    }
  };
}

for (const [handler, kind, input] of [
  [postCrearPlan, 'plan', { nombre: 'Borrador', institucional: { problema: '<conservar>' }, objective_description: ['Objetivo'], objective_id: [''] }],
  [postActualizarPlan, 'plan', { id: '4', nombre: 'Edición', institucional: { revision: '2', meta_valor: '0.0000' } }],
  [postCrearActividad, 'actividad', { id_plan: '4', responsable: 'Responsable', institucional: { nombre: 'Nueva', prioridad: 'alta' }, resource_description: ['Equipo'], resource_id: [''], resource_quantity: ['1'], resource_cost: ['1.20'] }],
  [postActualizarActividad, 'actividad', { id: '5', descripcion: 'Conservar', institucional: { revision: '1', instrucciones: '<seguro>' } }]
]) {
  test(`institutional ${handler.name} preserves input after validation failure and clears it only after success`, async () => {
    fetchCalls.length = 0;
    fetchFailure = null;
    apiResponse = { status: 400, ok: false };
    const request = createProtectedRequest({ body: input }), res = createResponse();
    await handler(request.req, res);
    const sent = JSON.parse(fetchCalls[0][1].body);
    assert.ok(sent.institucional);
    assert.equal(sent.csrfToken, undefined);
    assert.deepEqual(request.req.session.recordDraft.value.institucional, sent.institucional);
    assert.equal(request.req.session.recordDraft.kind, kind);
    assert.match(res.redirectedTo, /error=operation_failed/);
    apiResponse = { status: 200, ok: true };
    await handler(request.req, createResponse());
    assert.equal(request.req.session.recordDraft, undefined);
  });
}

function createProtectedRequest({ body = {}, params = {} } = {}) {
  let destroyCalls = 0;
  const session = {
    token: 'simulated-jwt',
    roleCsrfToken: 'test-csrf-token',
    destroy(callback) {
      destroyCalls += 1;
      delete this.token;
      callback(null);
    }
  };
  return {
    req: { body: { csrfToken: 'test-csrf-token', ...body }, params, session },
    destroyCalls: () => destroyCalls
  };
}

function assertMessageDoesNotExpose(message, values) {
  for (const value of values) {
    assert.equal(message.includes(value), false);
  }
}

test('dashboard loads only real counts and follow-up indicators covered by effective permissions', async () => {
  fetchCalls.length = 0;
  fetchFailure = null;
  apiResponse = async (url) => {
    if (url.endsWith('/roles/capacidades')) return { status: 200, ok: true, async json() { return { permissions: ['M03.plans.read', 'M04.activities.read', 'M05.followup.read', 'M12.reports.read', 'M01.users.read', 'M01.roles.read'] }; } };
    if (url.endsWith('/planes')) return { status: 200, ok: true, async json() { return [{ id_plan: 1 }, { id_plan: 2 }]; } };
    if (url.endsWith('/actividades')) return { status: 200, ok: true, async json() { return [{ id_actividad: 5 }]; } };
    if (url.endsWith('/periodos')) return { status: 200, ok: true, async json() { return [{ id_periodo: 6 }]; } };
    if (url.endsWith('/informes/seguimiento?periodId=6')) return { status: 200, ok: true, async json() { return { activitiesPending: 3, summary: { promedioAvance: 42, coberturaTrimestral: 67 } }; } };
    return { status: 200, ok: true, async json() { return []; } };
  };
  const response = createResponse();
  await getMenu(createProtectedRequest().req, response);
  assert.equal(response.rendered.view, 'menu');
  assert.deepEqual(response.rendered.data.metrics, { plans: 2, activities: 1, pendingFollowups: 3, approvedProgress: 42, coverage: 67 });
  assert.deepEqual(response.rendered.data.navigation, { plans: true, activities: true, followup: true, reports: true, users: true, roles: true });
  assert.ok(fetchCalls.some(([url]) => url.endsWith('/informes/seguimiento?periodId=6')));
});

test('dashboard hides Control Interno unless all permissions required by its service are present', async () => {
  fetchCalls.length = 0;
  fetchFailure = null;
  apiResponse = async url => url.endsWith('/roles/capacidades')
    ? { status: 200, ok: true, async json() { return { permissions: ['M15.audit.read'] }; } }
    : { status: 200, ok: true, async json() { return []; } };

  const response = createResponse();
  await getMenu(createProtectedRequest().req, response);

  assert.equal(response.rendered.view, 'menu');
  assert.equal(Object.hasOwn(response.rendered.data.navigation, 'internalControl'), false);
  assert.equal(fetchCalls.some(([url]) => url.endsWith('/control-interno')), false);
});

async function postLoginAndCaptureLogs(req, res) {
  const logged = [];
  const originalConsoleError = console.error;
  console.error = (...args) => logged.push(args);
  try {
    await postLogin(req, res);
  } finally {
    console.error = originalConsoleError;
  }
  return logged;
}

test('successful simulated API response stores its token only in the server session', async () => {
  fetchCalls.length = 0;
  fetchFailure = null;
  apiResponse = {
    status: 200,    ok: true,
    async json() {
      return { token: 'simulated-jwt' };
    }
  };
  const req = {
    body: { correo: 'person@example.invalid', password: 'test-password' },
    session: {}
  };
  const res = createResponse();

  await postLogin(req, res);

  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0][0], 'http://localhost:3000/api/login');
  assert.equal(fetchCalls[0][1].method, 'POST');
  assert.deepEqual(JSON.parse(fetchCalls[0][1].body), req.body);
  assert.equal(typeof req.session.token, 'string');
  assert.equal(req.session.token.length > 0, true);
  assert.equal(req.session.token, 'simulated-jwt');
  assert.equal(res.redirectedTo, '/menu');
  assert.equal(res.rendered, null);
});

test('successful response trims a non-empty string token before storing it', async () => {
  fetchFailure = null;
  apiResponse = {
    status: 200,    ok: true,
    async json() {
      return { token: '  simulated-jwt  ' };
    }
  };
  const req = {
    body: { correo: 'person@example.invalid', password: 'test-password' },
    session: {}
  };
  const res = createResponse();

  await postLogin(req, res);

  assert.equal(req.session.token, 'simulated-jwt');
  assert.equal(res.redirectedTo, '/menu');
  assert.equal(res.rendered, null);
});

test('HTTP 503 shows a generic temporary error without reading backend details', async () => {
  fetchCalls.length = 0;
  fetchFailure = null;
  apiResponse = {
    status: 503,
    ok: false,
    async json() {
      throw new Error('internal backend diagnostic');
    }
  };
  const req = {
    body: { correo: 'person@example.invalid', password: 'test-password' },
    session: {}
  };
  const res = createResponse();

  await postLogin(req, res);

  assert.equal(fetchCalls.length, 1);
  assert.equal(Object.hasOwn(req.session, 'token'), false);
  assert.equal(res.rendered.view, 'login');
  assert.equal(res.rendered.data.error, 'El servicio de inicio de sesi\u00f3n no est\u00e1 disponible temporalmente. Int\u00e9ntalo de nuevo.');
  assert.equal(res.rendered.data.error.includes('internal backend diagnostic'), false);
  assert.equal(res.redirectedTo, null);
});

for (const [label, payload] of [
  ['error', { error: 'Internal account lookup detail simulated-jwt test-password scrypt$fake-hash' }],
  ['message', { message: 'Internal account lookup detail simulated-jwt test-password scrypt$fake-hash' }],
  ['both error fields', {
    error: 'Internal account lookup detail simulated-jwt test-password scrypt$fake-hash',
    message: 'Internal account lookup detail simulated-jwt test-password scrypt$fake-hash'
  }],
  ['neither error field', {}]
]) {
test(`HTTP error with ${label} does not authenticate or expose backend details`, async () => {
  fetchCalls.length = 0;
  fetchFailure = null;
  apiResponse = {
    status: 401,    ok: false,
    async json() {
      return payload;
    }
  };
  const req = {
    body: { correo: 'person@example.invalid', password: 'test-password' },
    session: {}
  };
  const res = createResponse();

  const logged = await postLoginAndCaptureLogs(req, res);

  assert.equal(Object.hasOwn(req.session, 'token'), false);
  assert.equal(res.rendered.view, 'login');
  assert.equal(res.rendered.data.error, 'Credenciales inválidas');
  assert.equal(logged.length, 0);
  assertMessageDoesNotExpose(res.rendered.data.error, [
    'Internal account lookup detail',
    'simulated-jwt',
    'test-password',
    'scrypt$fake-hash'
  ]);
  assert.equal(res.redirectedTo, null);
});
}

for (const [label, token] of [
  ['missing', undefined],
  ['empty', ''],
  ['whitespace only', '  \t '],
  ['non-string', { value: 'simulated-jwt' }],
  ['null', null]
]) {
test(`successful response with ${label} token does not authenticate or redirect`, async () => {
  fetchCalls.length = 0;
  fetchFailure = null;
  apiResponse = {
    status: 200,    ok: true,
    async json() {
      return token === undefined ? {} : { token };
    }
  };
  const req = {
    body: { correo: 'person@example.invalid', password: 'test-password' },
    session: {}
  };
  const res = createResponse();

  await postLogin(req, res);

  assert.equal(Object.hasOwn(req.session, 'token'), false);
  assert.equal(res.rendered.view, 'login');
  assert.equal(res.rendered.data.error, 'Credenciales inválidas');
  assert.equal(res.redirectedTo, null);
});
}

test('network failure leaves an initially empty session unauthenticated and renders a generic message', async () => {
  fetchCalls.length = 0;
  fetchFailure = new Error('Sensitive network diagnostic simulated-jwt test-password scrypt$fake-hash');
  const req = {
    body: { correo: 'person@example.invalid', password: 'test-password' },
    session: {}
  };
  const res = createResponse();

  const logged = await postLoginAndCaptureLogs(req, res);

  fetchFailure = null;
  assert.equal(fetchCalls.length, 1);
  assert.equal(Object.hasOwn(req.session, 'token'), false);
  assert.equal(res.rendered.view, 'login');
  assert.equal(res.rendered.data.error, 'El servicio de inicio de sesi\u00f3n no est\u00e1 disponible temporalmente. Int\u00e9ntalo de nuevo.');
  assert.equal(logged.length, 0);
  assertMessageDoesNotExpose(res.rendered.data.error, [
    'Sensitive network diagnostic',
    'simulated-jwt',
    'test-password',
    'scrypt$fake-hash'
  ]);
  assert.equal(res.redirectedTo, null);
});

test('invalid JSON leaves an initially empty session unauthenticated and hides parser details', async () => {
  fetchFailure = null;
  apiResponse = {
    status: 200,    ok: true,
    async json() {
      throw new SyntaxError('Sensitive JSON parser detail simulated-jwt test-password scrypt$fake-hash');
    }
  };
  const req = {
    body: { correo: 'person@example.invalid', password: 'test-password' },
    session: {}
  };
  const res = createResponse();

  const logged = await postLoginAndCaptureLogs(req, res);

  assert.equal(Object.hasOwn(req.session, 'token'), false);
  assert.equal(res.rendered.view, 'login');
  assert.equal(res.rendered.data.error, 'El servicio de inicio de sesi\u00f3n no est\u00e1 disponible temporalmente. Int\u00e9ntalo de nuevo.');
  assert.equal(logged.length, 0);
  assertMessageDoesNotExpose(res.rendered.data.error, [
    'Sensitive JSON parser detail',
    'simulated-jwt',
    'test-password',
    'scrypt$fake-hash'
  ]);
  assert.equal(res.redirectedTo, null);
});

for (const [name, handler, requestOptions] of [
  ['list users', getUsuarios, {}],
  ['get an editable user', getEditarUsuario, { params: { id: '7' } }],
  ['update a user', postEditarUsuario, { body: { id: '7', nombre: 'Test', email: 'test@example.invalid' } }],
  ['delete a user', postEliminarUsuario, { body: { id: '7' } }]
]) {
  test(`API 401 during ${name} destroys the web session and redirects to login`, async () => {
    fetchCalls.length = 0;
    fetchFailure = null;
    apiResponse = { status: 401, ok: false };
    const request = createProtectedRequest(requestOptions);
    const res = createResponse();

    await handler(request.req, res);

    assert.equal(request.destroyCalls(), 1);
    assert.equal(Object.hasOwn(request.req.session, 'token'), false);
    assert.equal(res.redirectedTo, '/');
    assert.equal(res.rendered, null);
  });
}

test('API 403 denies the web operation without destroying its session', async () => {
  fetchFailure = null;
  apiResponse = { status: 403, ok: false };
  const request = createProtectedRequest({ body: { id: '7', nombre: 'Test', email: 'test@example.invalid' } });
  const res = createResponse();

  await postEditarUsuario(request.req, res);

  assert.equal(request.destroyCalls(), 0);
  assert.equal(request.req.session.token, 'simulated-jwt');
  assert.equal(res.statusCode, 403);
  assert.equal(res.sent, 'No tienes permiso para realizar esta operación.');
  assert.equal(res.rendered, null);
});

test('user creation page is hidden when the authenticated account lacks its capability', async () => {
  fetchCalls.length = 0;
  fetchFailure = null;
  apiResponse = async (url) => ({ status: 200, ok: true, async json() {
    assert.equal(url, 'http://localhost:3000/api/roles/capacidades');
    return { permissions: ['M01.users.read'] };
  } });
  const request = createProtectedRequest();
  const res = createResponse();
  await getNuevoUsuario(request.req, res);
  assert.equal(res.statusCode, 403);
  assert.equal(res.rendered, null);
  assert.equal(fetchCalls.length, 1);
});

test('role administration page denies accounts without any role-management read capability', async () => {
  fetchCalls.length = 0;
  fetchFailure = null;
  apiResponse = async (url) => {
    assert.equal(url, 'http://localhost:3000/api/roles/capacidades');
    return { status: 200, ok: true, async json() { return { permissions: [] }; } };
  };
  const request = createProtectedRequest();
  const res = createResponse();
  await getRoleAdministration(request.req, res);
  assert.equal(res.statusCode, 403);
  assert.equal(res.rendered, null);
  assert.equal(fetchCalls.length, 1);
});

test('role administration loads its registered read endpoints with the session JWT', async () => {
  fetchCalls.length = 0;
  fetchFailure = null;
  apiResponse = async (url) => {
    if (url.endsWith('/roles/capacidades')) return { status: 200, ok: true, async json() {
      return { permissions: ['M01.roles.read', 'M01.permissions.read', 'M01.requests.read'] };
    } };
    if (url.endsWith('/roles/catalogo')) return { status: 200, ok: true, async json() { return { roles: [{ id: 1, name: 'Role' }] }; } };
    if (url.endsWith('/roles/permisos')) return { status: 200, ok: true, async json() { return { permissions: [{ id: 1, code: 'M01.roles.read' }] }; } };
    if (url.endsWith('/roles/solicitudes')) return { status: 200, ok: true, async json() { return { requests: [] }; } };
    assert.fail(`Unexpected role-administration endpoint: ${url}`);
  };

  const request = createProtectedRequest();
  const response = createResponse();
  response.locals = {};
  await getRoleAdministration(request.req, response);

  assert.equal(response.rendered.view, 'role-admin');
  assert.deepEqual(response.rendered.data.roles, [{ id: 1, name: 'Role' }]);
  assert.deepEqual(fetchCalls.map(([url]) => url), [
    'http://localhost:3000/api/roles/capacidades',
    'http://localhost:3000/api/roles/catalogo',
    'http://localhost:3000/api/roles/permisos',
    'http://localhost:3000/api/roles/solicitudes'
  ]);
  for (const [, options] of fetchCalls) {
    assert.equal(options.headers.Authorization, 'Bearer simulated-jwt');
  }
});

test('update validation errors use a controlled message instead of backend text', async () => {
  fetchFailure = null;
  apiResponse = {
    status: 400,
    ok: false,
    async json() {
      throw new Error('response body should not be read');
    },
    message: 'SQL error: sensitive details simulated-jwt'
  };
  const request = createProtectedRequest({ body: { id: '7', nombre: 'Test', email: 'test@example.invalid' } });
  const res = createResponse();

  await postEditarUsuario(request.req, res);

  assert.equal(res.rendered.view, 'editar');
  assert.equal(res.rendered.data.error, 'Revisa los datos ingresados e inténtalo de nuevo.');
  assert.equal(res.rendered.data.error.includes('SQL error'), false);
  assert.equal(res.rendered.data.error.includes('simulated-jwt'), false);
  assert.equal(request.req.session.token, 'simulated-jwt');
});

test('logout does not log the session store error object', async () => {
  const storedError = new Error('sensitive session store detail');
  const logged = [];
  const originalConsoleError = console.error;
  console.error = (...args) => logged.push(args);
  const req = {
    session: {
      destroy(callback) {
        callback(storedError);
      }
    }
  };
  const res = createResponse();

  try {
    logout(req, res);
  } finally {
    console.error = originalConsoleError;
  }

  assert.deepEqual(logged, [['No se pudo cerrar la sesión.']]);
  assert.equal(JSON.stringify(logged).includes('sensitive session store detail'), false);
  assert.equal(res.redirectedTo, '/');
});

test('API 503 does not render protected data and preserves the web session', async () => {
  fetchFailure = null;
  apiResponse = { status: 503, ok: false };
  const request = createProtectedRequest();
  const res = createResponse();

  await getUsuarios(request.req, res);

  assert.equal(request.destroyCalls(), 0);
  assert.equal(request.req.session.token, 'simulated-jwt');
  assert.equal(res.statusCode, 503);
  assert.equal(res.sent, 'No se pudo completar la solicitud. Inténtalo de nuevo.');
  assert.equal(res.rendered, null);
});

test('API 404 remains distinct from service unavailability and does not expose backend details', async () => {
  fetchFailure = null;
  apiResponse = {
    status: 404, ok: false,
    async text() { return 'internal SQL details'; }
  };
  const request = createProtectedRequest();
  const res = createResponse();

  await getPlanes(request.req, res);

  assert.equal(request.destroyCalls(), 0);
  assert.equal(request.req.session.token, 'simulated-jwt');
  assert.equal(res.statusCode, 404);
  assert.equal(res.sent, 'No se encontró la información solicitada.');
  assert.equal(String(res.sent).includes('internal SQL details'), false);
});

test('deactivation API 503 reports a generic users service failure without redirecting as success', async () => {
  fetchCalls.length = 0;
  fetchFailure = null;
  apiResponse = { status: 503, ok: false };
  const request = createProtectedRequest({ body: { id: '7' } });
  const res = createResponse();

  await postEliminarUsuario(request.req, res);

  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0][1].method, 'DELETE');
  assert.equal(request.destroyCalls(), 0);
  assert.equal(request.req.session.token, 'simulated-jwt');
  assert.equal(res.statusCode, 503);
  assert.equal(res.sent, 'La gesti\u00f3n de usuarios no est\u00e1 disponible temporalmente.');
  assert.equal(res.redirectedTo, null);
  assert.equal(res.rendered, null);
});

test('network failure on an API request returns a generic 503 without logging details', async () => {
  fetchFailure = new Error('sensitive API diagnostic');
  const request = createProtectedRequest();
  const res = createResponse();
  const logged = [];
  const originalConsoleError = console.error;
  console.error = (...args) => logged.push(args);
  try {
    await getUsuarios(request.req, res);
  } finally {
    console.error = originalConsoleError;
  }
  fetchFailure = null;

  assert.equal(logged.length, 0);
  assert.equal(request.destroyCalls(), 0);
  assert.equal(request.req.session.token, 'simulated-jwt');
  assert.equal(res.statusCode, 503);
  assert.equal(res.sent, 'No se pudo completar la solicitud. Inténtalo de nuevo.');
  assert.equal(String(res.sent).includes('sensitive API diagnostic'), false);
});

test('plans page loads authorized plans and derives mutation controls from backend capabilities', async () => {
  fetchCalls.length = 0;
  fetchFailure = null;
  apiResponse = async (url) => url.endsWith('/planes')
    ? { status: 200, ok: true, async json() { return [{ id_plan: 4, nombre: 'Plan' }]; } }
    : { status: 200, ok: true, async json() { return { permissions: ['M03.plans.create'] }; } };
  const request = createProtectedRequest();
  request.req.query = {};
  const res = createResponse();
  await getPlanes(request.req, res);
  assert.equal(res.rendered.view, 'planes');
  assert.equal(res.rendered.data.planes[0].id_plan, 4);
  assert.equal(res.rendered.data.canCreatePlans, true);
  assert.equal(res.rendered.data.canUpdatePlans, false);
  assert.equal(fetchCalls.length, 3);
  assert.ok(fetchCalls[2][0].endsWith('/planes/catalogo-institucional'));
});

test('plan creation forwards only allowed fields with JWT and CSRF validation', async () => {
  fetchCalls.length = 0;
  fetchFailure = null;
  apiResponse = { status: 201, ok: true };
  const request = createProtectedRequest({ body: { nombre: 'Plan', descripcion: 'Detalle', id_usuario: 999, estado: 'Activo' } });
  const res = createResponse();
  await postCrearPlan(request.req, res);
  assert.equal(fetchCalls[0][0], 'http://localhost:3000/api/planes');
  assert.equal(fetchCalls[0][1].method, 'POST');
  assert.deepEqual(JSON.parse(fetchCalls[0][1].body), { nombre: 'Plan', descripcion: 'Detalle' });
  assert.equal(fetchCalls[0][1].headers.Authorization, 'Bearer simulated-jwt');
  assert.equal(res.redirectedTo, '/planes?success=created');
});

test('plan update uses a parameterized API path and rejects invalid CSRF without calling API', async () => {
  fetchCalls.length = 0;
  fetchFailure = null;
  apiResponse = { status: 200, ok: true };
  const request = createProtectedRequest({ body: { id: '8', nombre: 'Actualizado', descripcion: '' } });
  request.req.body.csrfToken = 'wrong-token';
  const res = createResponse();
  await postActualizarPlan(request.req, res);
  assert.equal(res.statusCode, 403);
  assert.equal(fetchCalls.length, 0);
});

test('activities page applies API filters and exposes only capabilities returned by backend', async () => {
  fetchCalls.length = 0;
  fetchFailure = null;
  apiResponse = async (url) => {
    if (url.endsWith('/roles/capacidades')) return { status: 200, ok: true, async json() { return { permissions: ['M04.activities.read', 'M04.activities.create', 'M03.plans.read'] }; } };
    if (url.includes('/actividades?')) return { status: 200, ok: true, async json() { return [{ id_actividad: 5, id_plan: 2 }]; } };
    return { status: 200, ok: true, async json() { return [{ id_plan: 2, nombre: 'Plan' }]; } };
  };
  const request = createProtectedRequest();
  request.req.query = { planId: '2', estado: 'Activa' };
  const res = createResponse();
  await getActividades(request.req, res);
  assert.equal(res.rendered.view, 'actividades');
  assert.equal(res.rendered.data.canCreate, true);
  assert.equal(res.rendered.data.canUpdate, false);
  assert.match(fetchCalls[1][0], /planId=2&estado=Activa/);
});

test('activity creation whitelists schema fields and forwards the session JWT', async () => {
  fetchCalls.length = 0;
  fetchFailure = null;
  apiResponse = { status: 201, ok: true };
  const request = createProtectedRequest({ body: { id_plan: '2', descripcion: 'Tarea', responsable: 'Ana', fecha_inicio: '2026-01-01', fecha_fin: '', estado: 'Pendiente', actorId: 999 } });
  const res = createResponse();
  await postCrearActividad(request.req, res);
  assert.equal(fetchCalls[0][0], 'http://localhost:3000/api/actividades');
  assert.deepEqual(JSON.parse(fetchCalls[0][1].body), { id_plan: '2', descripcion: 'Tarea', responsable: 'Ana', fecha_inicio: '2026-01-01', fecha_fin: '', estado: 'Pendiente' });
  assert.equal(fetchCalls[0][1].headers.Authorization, 'Bearer simulated-jwt');
  assert.equal(res.redirectedTo, '/actividades?success=created');
});

test('activity detail checks capability before fetching the record', async () => {
  fetchCalls.length = 0;
  fetchFailure = null;
  apiResponse = async (url) => url.endsWith('/roles/capacidades')
    ? { status: 200, ok: true, async json() { return { permissions: [] }; } }
    : { status: 200, ok: true, async json() { return {}; } };
  const request = createProtectedRequest({ params: { id: '5' } });
  const res = createResponse();
  await getDetalleActividad(request.req, res);
  assert.equal(res.statusCode, 403);
  assert.equal(fetchCalls.length, 1);
});

test('activity update rejects invalid CSRF without contacting the API', async () => {
  fetchCalls.length = 0;
  const request = createProtectedRequest({ body: { id: '5', estado: 'Hecha' } });
  request.req.body.csrfToken = 'invalid';
  const res = createResponse();
  await postActualizarActividad(request.req, res);
  assert.equal(res.statusCode, 403);
  assert.equal(fetchCalls.length, 0);
});

test('report page uses existing stored assessments and filters without synthesizing metrics', async () => {
  fetchCalls.length = 0;
  fetchFailure = null;
  apiResponse = async (url) => {
    if (url.endsWith('/roles/capacidades')) return { status: 200, ok: true, async json() { return { permissions: ['M12.reports.read', 'M03.plans.read'] }; } };
    if (url.startsWith('http://localhost:3000/api/informes/')) return { status: 200, ok: true, async json() { return [{ id_calificacion: 4, trimestre: 2, puntaje: 70 }]; } };
    return { status: 200, ok: true, async json() { return [{ id_plan: 2, nombre: 'Plan' }]; } };
  };
  const request = createProtectedRequest();
  request.req.query = { planId: '2', trimestre: '2' };
  const res = createResponse();
  await getInformes(request.req, res);
  assert.equal(res.rendered.view, 'informes');
  assert.equal(res.rendered.data.records[0].puntaje, 70);
  assert.equal(res.rendered.data.canExport, false);
  assert.equal(res.rendered.data.filterQuery, 'planId=2&trimestre=2');
});

test('reports page integrates approved follow-up indicators only for accounts with follow-up read permission', async () => {
  fetchCalls.length = 0;
  fetchFailure = null;
  apiResponse = async (url) => {
    if (url.endsWith('/roles/capacidades')) return { status: 200, ok: true, async json() { return { permissions: ['M12.reports.read', 'M05.followup.read'] }; } };
    if (url.endsWith('/informes/calificaciones')) return { status: 200, ok: true, async json() { return []; } };
    if (url.endsWith('/periodos')) return { status: 200, ok: true, async json() { return [{ id_periodo: 6, anio: 2026, trimestre: 2, estado: 'open' }]; } };
    if (url.endsWith('/informes/seguimiento?periodId=6')) return { status: 200, ok: true, async json() { return { period: { id_periodo: 6 }, activitiesDue: 4, activitiesApproved: 3, activitiesPending: 1, summary: { promedioAvance: 75, coberturaTrimestral: 75 } }; } };
    throw new Error(`Unexpected API URL: ${url}`);
  };
  const request = createProtectedRequest();
  const res = createResponse();
  await getInformes(request.req, res);
  assert.equal(res.rendered.view, 'informes');
  assert.equal(res.rendered.data.canReadFollowup, true);
  assert.equal(res.rendered.data.selectedFollowupPeriodId, '6');
  assert.equal(res.rendered.data.followupSummary.activitiesDue, 4);
  assert.ok(fetchCalls.some(([url]) => url.endsWith('/informes/seguimiento?periodId=6')));
});

test('CSV export forwards only recognized filters and returns a download', async () => {
  fetchCalls.length = 0;
  fetchFailure = null;
  apiResponse = async (url) => url.endsWith('/roles/capacidades')
    ? { status: 200, ok: true, async json() { return { permissions: ['M12.reports.export'] }; } }
    : { status: 200, ok: true, async text() { return '\uFEFF"id_calificacion","observaciones"\r\n"1","Texto, con; comillas ""dobles"" y\nsalto"'; } };
  const request = createProtectedRequest();
  request.req.query = { trimestre: '3', injection: 'ignored' };
  const res = createResponse();
  await getInformeCsv(request.req, res);
  assert.match(fetchCalls[1][0], /export\.csv\?trimestre=3$/);
  assert.equal(res.attachmentName, 'calificaciones.csv');
  assert.equal(res.sent, '\uFEFF"id_calificacion";"observaciones"\r\n"1";"Texto, con; comillas ""dobles"" y\nsalto"');
});

test('CSV semicolon conversion preserves UTF-8 BOM, quoted delimiters, newlines and formula protection', () => {
  const source = `\uFEFF"uno","dos"\r\n"Plan, A; B","'=SUM(1,2)"`;
  assert.equal(convertCsvToExcelSemicolon(source), `\uFEFF"uno";"dos"\r\n"Plan, A; B";"'=SUM(1,2)"`);
  assert.equal(convertCsvToExcelSemicolon('\uFEFF"id","nombre"\r\n'), '\uFEFF"id";"nombre"');
});

test('follow-up page loads periods, activities, history and the existing summary', async () => {
  fetchCalls.length = 0;
  fetchFailure = null;
  apiResponse = async (url) => {
    if (url.endsWith('/roles/capacidades')) return { status: 200, ok: true, async json() { return { permissions: ['M05.followup.read', 'M05.followup.create', 'M05.followup.approve', 'M05.followup.update'] }; } };
    if (url.endsWith('/periodos')) return { status: 200, ok: true, async json() { return [{ id_periodo: 3, anio: 2026, trimestre: 1, estado: 'open' }]; } };
    if (url.endsWith('/periodos/3/actividades')) return { status: 200, ok: true, async json() { return { activities: [{ id_actividad: 8 }], period: { estado: 'open' } }; } };
    if (url.endsWith('/periodos/3/historial')) return { status: 200, ok: true, async json() { return [{ id_seguimiento: 2 }]; } };
    return { status: 200, ok: true, async json() { return { period: { estado: 'open' }, summary: {}, activitiesDue: 1 }; } };
  };
  const request = createProtectedRequest(); request.req.query = { periodId: '3' };
  const res = createResponse();
  await getSeguimiento(request.req, res);
  assert.equal(res.rendered.view, 'seguimiento');
  assert.equal(res.rendered.data.canApprove, false);
  assert.equal(res.rendered.data.activities[0].id_actividad, 8);
  assert.equal(fetchCalls.length, 6);
});

test('follow-up submission and decision handlers require CSRF and whitelist payload', async () => {
  fetchCalls.length = 0; fetchFailure = null; apiResponse = { status: 201, ok: true };
  const create = createProtectedRequest({ body: { id_actividad: '8', id_periodo: '3', porcentaje: '54.5', observaciones: 'Novedad', creado_por: 'spoof' } });
  const createRes = createResponse(); await postCrearSeguimiento(create.req, createRes);
  assert.deepEqual(JSON.parse(fetchCalls[0][1].body), { id_periodo: '3', porcentaje: '54.5', observaciones: 'Novedad' });
  assert.equal(fetchCalls[0][0], 'http://localhost:3000/api/actividades/8/seguimientos');
  apiResponse = { status: 200, ok: true };
  const decision = createProtectedRequest({ body: { id_seguimiento: '19', id_periodo: '3', resultado: 'approved', motivo: 'Revisado', actorId: 999 } });
  const decisionRes = createResponse(); await postDecisionSeguimiento(decision.req, decisionRes);
  assert.deepEqual(JSON.parse(fetchCalls[1][1].body), { resultado: 'approved', motivo: 'Revisado' });
});

test('follow-up self-decision denial explains that another authorized reviewer must decide', async () => {
  fetchCalls.length = 0; fetchFailure = null;
  apiResponse = { status: 403, ok: false, async json() { return { error: 'Quien registró el seguimiento no puede aprobarlo ni rechazarlo.' }; } };
  const decision = createProtectedRequest({ body: { id_seguimiento: '19', id_periodo: '3', resultado: 'approved', motivo: 'Revisado' } });
  const res = createResponse();
  await postDecisionSeguimiento(decision.req, res);
  assert.equal(res.statusCode, 403);
  assert.equal(res.sent, 'No puedes aprobar ni rechazar un seguimiento que enviaste. Otra persona autorizada debe revisarlo.');
  assert.equal(fetchCalls.length, 1);
});

test('evidence upload and download proxy authenticated API bytes', async () => {
  fetchCalls.length = 0; fetchFailure = null; apiResponse = { status: 201, ok: true };
  const upload = createProtectedRequest({ body: { id_actividad: '8', nombre_original: 'proof.pdf', mime_type: 'application/pdf', contenido_base64: 'JVBERi0=', observaciones: 'Proof', storagePath: 'fake' } });
  const uploadRes = createResponse(); await postCargarEvidencia(upload.req, uploadRes);
  assert.equal(fetchCalls[0][0], 'http://localhost:3000/api/evidencias');
  assert.equal(JSON.parse(fetchCalls[0][1].body).storagePath, undefined);
  assert.equal(uploadRes.statusCode, 201);
  apiResponse = { status: 200, ok: true, headers: { get: (key) => key === 'content-type' ? 'application/pdf' : 'attachment; filename="proof.pdf"' }, async arrayBuffer() { return Uint8Array.from([112, 100, 102]).buffer; } };
  const download = createProtectedRequest({ params: { id: '7' } });
  const downloadRes = createResponse(); await getDescargarEvidencia(download.req, downloadRes);
  assert.equal(downloadRes.headers['Content-Type'], 'application/pdf');
  assert.equal(downloadRes.sent.toString(), 'pdf');
});

test('role configuration and permission forms use the backend PUT contracts', async () => {
  fetchCalls.length = 0;
  fetchFailure = null;
  apiResponse = { status: 200, ok: true };

  const configuration = createProtectedRequest({ body: {
    roleId: '12', classification: 'ordinary', requiresScope: 'false',
    allowOpenEndedAssignment: 'true', reason: 'Update test role'
  } });
  await postRoleConfiguration(configuration.req, createResponse());
  assert.equal(fetchCalls[0][0], 'http://localhost:3000/api/roles/catalogo/12/configuracion');
  assert.equal(fetchCalls[0][1].method, 'PUT');
  assert.deepEqual(JSON.parse(fetchCalls[0][1].body), {
    classification: 'ordinary', requiresScope: false,
    allowOpenEndedAssignment: true, reason: 'Update test role'
  });

  const permissions = createProtectedRequest({ body: {
    roleId: '12', permissionCodes: 'M03.plans.read', reason: 'Set test permission'
  } });
  await postRolePermissions(permissions.req, createResponse());
  assert.equal(fetchCalls[1][0], 'http://localhost:3000/api/roles/catalogo/12/permisos');
  assert.equal(fetchCalls[1][1].method, 'PUT');
  assert.deepEqual(JSON.parse(fetchCalls[1][1].body), {
    permissionCodes: ['M03.plans.read'], reason: 'Set test permission'
  });

  const state = createProtectedRequest({ body: {
    code: 'M03.plans.read', active: 'false', reason: 'Disable test permission'
  } });
  await postPermissionState(state.req, createResponse());
  assert.equal(fetchCalls[2][0], 'http://localhost:3000/api/roles/permisos/M03.plans.read/estado');
  assert.equal(fetchCalls[2][1].method, 'PUT');
  assert.deepEqual(JSON.parse(fetchCalls[2][1].body), {
    active: false, reason: 'Disable test permission'
  });
});

// Etapa 1: estados de consulta y recuperación segura de formularios.
const fullNavigationPermissions = ['M03.plans.read', 'M04.activities.read', 'M05.followup.read', 'M12.reports.read', 'M01.users.read', 'M01.roles.read'];
const okJson = (data) => ({ status: 200, ok: true, async json() { return data; } });
const renderCaptured = (response) => ejs.renderFile(fileURLToPath(new URL(`../../views/${response.rendered.view}.ejs`, import.meta.url)), response.rendered.data);

for (const scenario of ['records', 'empty', 'plans-http', 'activities-network', 'plans-json', 'activities-shape', 'periods-failure', 'summary-failure', 'no-periods', 'missing-summary-values', 'forbidden', 'restricted', 'caps-network', 'caps-json', 'caps-shape', 'expired']) {
  test(`dashboard distinguishes states without losing valid metrics: ${scenario}`, async () => {
    fetchCalls.length = 0; fetchFailure = null;
    apiResponse = async (url) => {
      if (url.endsWith('/roles/capacidades')) {
        if (scenario === 'caps-network') throw Error('private network diagnostic');
        if (scenario === 'caps-json') return { status: 200, ok: true, async json() { throw Error('invalid json'); } };
        return okJson({ permissions: scenario === 'caps-shape' ? 'M03.plans.read' : scenario === 'restricted' ? ['M05.followup.read'] : fullNavigationPermissions });
      }
      if (url.endsWith('/planes')) {
        if (scenario === 'expired') return { status: 401, ok: false };
        if (scenario === 'forbidden') return { status: 403, ok: false };
        if (scenario === 'plans-http') return { status: 503, ok: false };
        if (scenario === 'plans-json') return { status: 200, ok: true, async json() { throw Error('private JSON error'); } };
        return okJson(scenario === 'empty' ? [] : [{ id_plan: 1 }, { id_plan: 2 }]);
      }
      if (url.endsWith('/actividades')) {
        if (scenario === 'activities-network') throw Error('private network diagnostic');
        return okJson(scenario === 'activities-shape' ? {} : scenario === 'empty' ? [] : [{ id_actividad: 1 }]);
      }
      if (url.endsWith('/periodos')) return scenario === 'periods-failure' ? { status: 503, ok: false } : okJson(scenario === 'no-periods' ? [] : [{ id_periodo: 3 }]);
      if (url.includes('/informes/seguimiento?')) {
        if (scenario === 'summary-failure') throw Error('private network diagnostic');
        return okJson(scenario === 'missing-summary-values' ? {} : { activitiesPending: 0, summary: { promedioAvance: 0, coberturaTrimestral: 42.5 } });
      }
      return okJson([]);
    };
    const request = createProtectedRequest(), response = createResponse();
    await getMenu(request.req, response);
    if (scenario === 'expired') { assert.equal(response.redirectedTo, '/'); assert.equal(request.destroyCalls(), 1); return; }
    const data = response.rendered.data, html = await renderCaptured(response);
    assert.equal(response.rendered.view, 'menu');
    assert.doesNotMatch(html, /private network|private JSON/);
    if (scenario.startsWith('caps-')) {
      assert.ok(data.dashboardError); assert.equal(fetchCalls.length, 1);
      assert.ok(Object.values(data.navigation).every(value => value === false));
      assert.doesNotMatch(html, /No hay m[o\u00f3]dulos habilitados|href="\/planes"/);
      return;
    }
    if (scenario === 'restricted') {
      assert.equal(data.metrics.plans, null); assert.equal(data.canReadPlans, false);
      assert.equal(data.canReadActivities, false);
      assert.doesNotMatch(html, /Planes registrados|Actividades existentes|href="\/usuarios"/);
      assert.ok(fetchCalls.every(([url]) => !/\/(planes|actividades|usuarios|roles\/catalogo)$/.test(url)));
    } else if (scenario === 'forbidden') {
      assert.equal(data.canReadPlans, false); assert.equal(data.metrics.plans, null);
      assert.equal(data.metricStates.plans, 'forbidden'); assert.doesNotMatch(html, /Planes registrados/);
    } else if (scenario.startsWith('plans-')) {
      assert.equal(data.metrics.plans, null); assert.equal(data.metricStates.plans, 'error');
      assert.equal(data.metrics.activities, 1); assert.match(html, /No fue posible consultar esta informaci/);
    } else if (scenario.startsWith('activities-')) {
      assert.equal(data.metrics.activities, null); assert.equal(data.metricStates.activities, 'error');
      assert.equal(data.metrics.plans, 2);
    } else {
      assert.equal(data.metrics.plans, scenario === 'empty' ? 0 : 2);
      assert.equal(data.metrics.activities, scenario === 'empty' ? 0 : 1);
    }
    if (['periods-failure', 'summary-failure', 'no-periods', 'missing-summary-values'].includes(scenario)) {
      assert.equal(data.metrics.pendingFollowups, null); assert.equal(data.metrics.approvedProgress, null);
      assert.equal(data.metricStates.pendingFollowups, scenario.endsWith('failure') ? 'error' : 'unavailable');
      assert.equal(data.metrics.plans, 2);
    } else {
      assert.equal(data.metrics.pendingFollowups, 0); assert.equal(data.metrics.approvedProgress, 0);
      assert.equal(data.metrics.coverage, 42.5);
    }
    if (scenario === 'empty') {
      assert.equal(data.metricStates.plans, 'empty'); assert.match(html, /No hay registros disponibles/);
      assert.match(html, /metric-value">0</);
    }
  });
}

for (const handler of [postCrearUsuario, postEditarUsuario]) {
  test(`${handler.name} preserves successful submission without capability lookup or resubmission`, async () => {
    fetchCalls.length = 0; fetchFailure = null; apiResponse = { status: 201, ok: true };
    const request = createProtectedRequest({ body: { id: '7', nombre: 'Ana', email: 'ana@example.invalid', password: 'simulated-password', reason: 'Test' } });
    const response = createResponse();
    await handler(request.req, response);
    assert.equal(response.redirectedTo, '/usuarios'); assert.equal(response.rendered, null);
    assert.equal(fetchCalls.length, 1);
    assert.equal(JSON.parse(fetchCalls[0][1].body).nombre, 'Ana');
  });
  for (const failure of ['validation', 'http', 'network']) {
    for (const permissions of [fullNavigationPermissions, ['M01.users.read']]) {
      test(`${handler.name} restores authorized navigation and non-sensitive values after ${failure} (${permissions.length} permissions)`, async () => {
        fetchCalls.length = 0; fetchFailure = null;
        apiResponse = async (url) => {
          if (url.endsWith('/roles/capacidades')) return okJson({ permissions });
          if (failure === 'network') throw Error('private connection failure');
          return { status: failure === 'http' ? 503 : 422, ok: false };
        };
        const body = { id: '7', nombre: '<script>alert(1)</script>', email: 'person" autofocus="test@example.invalid', reason: '</textarea><script>alert(2)</script>', password: 'NEVER-RENDER-THIS-PASSWORD', extra: 'do-not-copy' };
        const request = createProtectedRequest({ body }), response = createResponse();
        await handler(request.req, response);
        const data = response.rendered.data, html = await renderCaptured(response);
        assert.equal(data.formValues.nombre, body.nombre); assert.equal(data.formValues.email, body.email);
        assert.equal(data.formValues.reason, body.reason); assert.equal(data.csrfToken, 'test-csrf-token');
        assert.equal(data.navigation.users, true); assert.equal(data.navigation.plans, permissions.length > 1);
        assert.equal(response.statusCode, failure === 'validation' ? 400 : 503);
        assert.match(html, /name="csrfToken" value="test-csrf-token"/);
        assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
        assert.doesNotMatch(html, /<script>alert\(|NEVER-RENDER-THIS-PASSWORD|do-not-copy|autofocus="test/);
        assert.doesNotMatch(JSON.stringify(data), /NEVER-RENDER-THIS-PASSWORD/);
        assert.doesNotMatch(JSON.stringify(request.req.session), /NEVER-RENDER-THIS-PASSWORD/);
        if (handler === postCrearUsuario) assert.doesNotMatch(html.match(/<input[^>]*type="password"[^>]*>/)[0], /\bvalue=/);
        if (permissions.length === 1) assert.doesNotMatch(html, /href="\/(planes|roles|actividades|informes)"/);
        assert.equal(fetchCalls.filter(([, options]) => options.method === (handler === postCrearUsuario ? 'POST' : 'PUT')).length, 1);
        assert.equal(fetchCalls.length, 2);
      });
    }
  }
  for (const failure of ['http', 'network', 'malformed', 'json', 'expired']) {
    test(`${handler.name} fails closed when capability recovery fails: ${failure}`, async () => {
      fetchCalls.length = 0; fetchFailure = null;
      apiResponse = async url => {
        if (!url.endsWith('/roles/capacidades')) return { status: 400, ok: false };
        if (failure === 'network') throw Error('private error');
        if (failure === 'http' || failure === 'expired') return { status: failure === 'expired' ? 401 : 503, ok: false };
        if (failure === 'json') return { status: 200, ok: true, async json() { throw Error('invalid JSON'); } };
        return okJson({ permissions: 'M01.users.read' });
      };
      const request = createProtectedRequest({ body: { id: '7', nombre: 'Ana', email: 'ana@example.invalid', password: 'not-retained' } }), response = createResponse();
      await handler(request.req, response);
      if (failure === 'expired') { assert.equal(response.redirectedTo, '/'); assert.equal(request.destroyCalls(), 1); return; }
      assert.ok(Object.values(response.rendered.data.navigation).every(value => value === false));
      assert.equal(response.rendered.data.formValues.nombre, 'Ana');
      const html = await renderCaptured(response);
      assert.doesNotMatch(html.match(/<aside[\s\S]*?<\/aside>/)[0], /href="\/(usuarios|planes|actividades|roles|informes)"/);
    });
  }
  test(`${handler.name} rejects invalid CSRF before any service call`, async () => {
    fetchCalls.length = 0; fetchFailure = null;
    const request = createProtectedRequest({ body: { csrfToken: 'invalid' } }), response = createResponse();
    await handler(request.req, response); assert.equal(response.statusCode, 403); assert.equal(fetchCalls.length, 0);
  });
}

for (const [label, period, expected] of [
  ['valid', { id_periodo: 3, anio: 2026, trimestre: 4 }, { year: 2026, quarter: 4 }],
  ['numeric strings', { id_periodo: '3', anio: '2026', trimestre: '1' }, { year: 2026, quarter: 1 }],
  ['missing', undefined, null],
  ['other period', { id_periodo: 9, anio: 2026, trimestre: 4 }, null],
  ['missing id', { anio: 2026, trimestre: 4 }, null],
  ['invalid quarter', { id_periodo: 3, anio: 2026, trimestre: 5 }, null],
  ['invalid year', { id_periodo: 3, anio: 'unknown', trimestre: 4 }, null],
  ['boolean', { id_periodo: 3, anio: 2026, trimestre: true }, null]
]) {
  test(`dashboard labels only the verified summary period: ${label}`, async () => {
    fetchFailure = null; fetchCalls.length = 0;
    apiResponse = async url => {
      if (url.endsWith('/roles/capacidades')) return okJson({ permissions: ['M05.followup.read'] });
      if (url.endsWith('/periodos')) return okJson([{ id_periodo: 3, anio: 1999, trimestre: 2 }]);
      return okJson({ period, activitiesPending: 0, summary: { promedioAvance: 12.5, coberturaTrimestral: 0 } });
    };
    const res = createResponse(); await getMenu(createProtectedRequest().req, res);
    assert.deepEqual(res.rendered.data.followupPeriod, expected);
    assert.equal(res.rendered.data.metrics.approvedProgress, 12.5);
    assert.equal(res.rendered.data.metrics.pendingFollowups, 0);
    const html = await renderCaptured(res);
    assert.doesNotMatch(html, /1999/);
    if (!expected) assert.equal((html.match(/Per\u00edodo no disponible/g) ?? []).length, 3);
    else assert.equal((html.match(/trimestre de 2026/g) ?? []).length, 3);
    assert.equal(fetchCalls.length, 3);
  });
}

test('binary BFF checks header CSRF and forwards only bounded bytes and file metadata',async()=>{
 fetchCalls.length=0;fetchFailure=null;apiResponse={status:201,ok:true};
 const request=createProtectedRequest({params:{id:'8'}});request.req.headers={'x-csrf-token':'test-csrf-token','x-evidence-name':'proof.txt','x-evidence-type':'text/plain','x-evil-authority':'spoof'};request.req.body=Buffer.from('Evidence');
 const result=createResponse();await postBinaryEvidence(request.req,result);
 assert.equal(result.statusCode,201);assert.ok(Buffer.isBuffer(fetchCalls[0][1].body));assert.equal(fetchCalls[0][1].headers['x-evil-authority'],undefined);assert.equal(request.req.session.file,undefined);
 fetchCalls.length=0;request.req.headers['x-csrf-token']='wrong';const denied=createResponse();await postBinaryEvidence(request.req,denied);assert.equal(denied.statusCode,403);assert.equal(fetchCalls.length,0);
});
test('reopen BFF preserves reason without presenting it as a granted authority',async()=>{
 fetchCalls.length=0;fetchFailure=null;apiResponse={status:409,ok:false};const request=createProtectedRequest({params:{id:'3'},body:{motivo:'Conservar motivo',client_id:'fixture',estado:'open',approved:true}}),result=createResponse();
 await postReopenRequest(request.req,result);assert.deepEqual(JSON.parse(fetchCalls[0][1].body),{motivo:'Conservar motivo',client_id:'fixture'});assert.equal(request.req.session.reopenDraft.motivo,'Conservar motivo');assert.match(result.redirectedTo,/error=reopen_request/);
});

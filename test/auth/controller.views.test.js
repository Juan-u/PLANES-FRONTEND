import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

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
  getDescargarEvidencia,
  getUsuarios,
  getNuevoUsuario,
  getEditarUsuario,
  postEditarUsuario,
  postEliminarUsuario,
  getRoleAdministration
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
  assert.equal(fetchCalls.length, 2);
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
    : { status: 200, ok: true, async text() { return 'id_calificacion\r\n1'; } };
  const request = createProtectedRequest();
  request.req.query = { trimestre: '3', injection: 'ignored' };
  const res = createResponse();
  await getInformeCsv(request.req, res);
  assert.match(fetchCalls[1][0], /export\.csv\?trimestre=3$/);
  assert.equal(res.attachmentName, 'calificaciones.csv');
  assert.equal(res.sent, 'id_calificacion\r\n1');
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
  assert.equal(res.rendered.data.canApprove, true);
  assert.equal(res.rendered.data.activities[0].id_actividad, 8);
  assert.equal(fetchCalls.length, 5);
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

import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

let apiResponse;
let fetchFailure = null;
const fetchCalls = [];
const fetchMock = async (...args) => {
  fetchCalls.push(args);
  if (fetchFailure) throw fetchFailure;
  return apiResponse;
};

mock.module('node-fetch', { defaultExport: fetchMock });
const { verificarSesion } = await import('../../app/middleware/auth.middleware.js');

function createRequest(token = 'simulated-jwt', destroyError = null) {
  let destroyCalls = 0;
  const session = {
    token,
    destroy(callback) {
      destroyCalls += 1;
      if (!destroyError) delete this.token;
      callback(destroyError);
    }
  };
  return {
    req: { session },
    destroyCalls: () => destroyCalls
  };
}

function createResponse() {
  return {
    statusCode: null,
    body: null,
    redirectedTo: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
    redirect(path) {
      this.redirectedTo = path;
      return this;
    }
  };
}

async function invoke(request) {
  const res = createResponse();
  let nextCalled = false;
  await verificarSesion(request.req, res, () => {
    nextCalled = true;
  });
  return { res, nextCalled };
}

function resetFetch({ response = { status: 200, async json() { return { ok: true }; } }, failure = null } = {}) {
  apiResponse = response;
  fetchFailure = failure;
  fetchCalls.length = 0;
}

test('a missing token redirects without contacting the API', async () => {
  resetFetch();
  const request = createRequest();
  delete request.req.session.token;
  const { res, nextCalled } = await invoke(request);

  assert.equal(nextCalled, false);
  assert.equal(res.redirectedTo, '/');
  assert.equal(fetchCalls.length, 0);
  assert.equal(request.destroyCalls(), 1);
});

test('a 200 verification response permits access using the stored bearer token', async () => {
  resetFetch({ response: { status: 200, async json() { return { ok: true }; } } });
  const request = createRequest();
  const { res, nextCalled } = await invoke(request);

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, null);
  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0][0], 'http://localhost:3000/api/session');
  assert.equal(fetchCalls[0][1].headers.Authorization, 'Bearer simulated-jwt');
  assert.equal(request.destroyCalls(), 0);
});

test('empty, whitespace, and non-string session tokens are cleared without contacting the API', async () => {
  for (const token of ['', '  \t ', 123, { value: 'truthy-token' }]) {
    resetFetch();
    const request = createRequest(token);
    const { res, nextCalled } = await invoke(request);

    assert.equal(nextCalled, false);
    assert.equal(request.destroyCalls(), 1);
    assert.equal(res.redirectedTo, '/');
    assert.equal(fetchCalls.length, 0);
  }
});

test('a 200 response without the success marker fails closed', async () => {
  resetFetch({ response: { status: 200, async json() { return { message: 'unexpected' }; } } });
  const request = createRequest();
  const { res, nextCalled } = await invoke(request);

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body, 'No se pudo verificar la sesión. Inténtalo de nuevo.');
  assert.equal(request.destroyCalls(), 0);
});

test('invalid JSON in a 200 response fails closed with a generic message', async () => {
  resetFetch({ response: { status: 200, async json() { throw new SyntaxError('internal parse detail'); } } });
  const request = createRequest();
  const { res, nextCalled } = await invoke(request);

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body, 'No se pudo verificar la sesión. Inténtalo de nuevo.');
  assert.equal(String(res.body).includes('internal parse detail'), false);
  assert.equal(request.destroyCalls(), 0);
});

test('a 401 destroys the web session and redirects to login', async () => {
  resetFetch({ response: { status: 401 } });
  const request = createRequest();
  const { res, nextCalled } = await invoke(request);

  assert.equal(nextCalled, false);
  assert.equal(request.destroyCalls(), 1);
  assert.equal(Object.hasOwn(request.req.session, 'token'), false);
  assert.equal(res.redirectedTo, '/');
});

test('a 403 denies access without destroying the web session', async () => {
  resetFetch({ response: { status: 403 } });
  const request = createRequest();
  const { res, nextCalled } = await invoke(request);

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body, 'No tienes permiso para realizar esta operación.');
  assert.equal(request.destroyCalls(), 0);
  assert.equal(request.req.session.token, 'simulated-jwt');
});

test('a 503 fails closed with a generic message and preserves the session', async () => {
  resetFetch({ response: { status: 503 } });
  const request = createRequest();
  const { res, nextCalled } = await invoke(request);

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body, 'No se pudo verificar la sesión. Inténtalo de nuevo.');
  assert.equal(request.destroyCalls(), 0);
  assert.equal(request.req.session.token, 'simulated-jwt');
});

test('a network failure fails closed without exposing details or clearing the session', async () => {
  resetFetch({ failure: new Error('sensitive backend diagnostic') });
  const request = createRequest();
  const { res, nextCalled } = await invoke(request);

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body, 'No se pudo verificar la sesión. Inténtalo de nuevo.');
  assert.equal(res.body.includes('sensitive backend diagnostic'), false);
  assert.equal(request.destroyCalls(), 0);
  assert.equal(request.req.session.token, 'simulated-jwt');
});

test('failure to destroy a session after a 401 still denies access with a generic 503', async () => {
  resetFetch({ response: { status: 401 } });
  const request = createRequest('simulated-jwt', new Error('session store details'));
  const { res, nextCalled } = await invoke(request);

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body, 'No se pudo verificar la sesión. Inténtalo de nuevo.');
  assert.equal(res.body.includes('session store details'), false);
  assert.equal(request.destroyCalls(), 1);
});

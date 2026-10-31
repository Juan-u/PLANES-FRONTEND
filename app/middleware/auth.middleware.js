import fetch from 'node-fetch';

const SESSION_CHECK_URL = 'http://localhost:3000/api/session';
const TEMPORARY_ERROR = 'No se pudo verificar la sesión. Inténtalo de nuevo.';

function respondUnavailable(res) {
  return res.status(503).send(TEMPORARY_ERROR);
}

function endWebSession(req, res) {
  return new Promise((resolve) => {
    req.session.destroy((error) => {
      if (error) {
        resolve(respondUnavailable(res));
        return;
      }

      resolve(res.redirect('/'));
    });
  });
}

export async function verificarSesion(req, res, next) {
  const token = req.session?.token;
  if (typeof token !== 'string' || token.trim().length === 0) {
    if (req.session) {
      return await endWebSession(req, res);
    }
    return res.redirect('/');
  }

  try {
    const response = await fetch(SESSION_CHECK_URL, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.status === 200) {
      const result = await response.json();
      if (result?.ok === true) {
        return next();
      }
      return respondUnavailable(res);
    }

    if (response.status === 401) {
      return await endWebSession(req, res);
    }

    if (response.status === 403) {
      return res.status(403).send('No tienes permiso para realizar esta operación.');
    }

    return respondUnavailable(res);
  } catch {
    return respondUnavailable(res);
  }
}

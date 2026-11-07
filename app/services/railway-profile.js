import session from 'express-session';
import mysqlSession from 'express-mysql-session';

export function railwayConfiguration(env = process.env) {
  if (!env.DEPLOYMENT_PROFILE) return null;
  if (env.DEPLOYMENT_PROFILE !== 'railway-private-test') throw new Error('Perfil de despliegue desconocido.');
  const api = new URL(env.BACKEND_API_URL);
  const origin = new URL(env.PUBLIC_ORIGIN);
  if (api.protocol !== 'http:' || !api.hostname.endsWith('.railway.internal') || api.pathname !== '/api' || api.username || api.password || api.search || api.hash) throw new Error('El backend debe usar la red privada de Railway.');
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('PUBLIC_ORIGIN debe ser un origen HTTPS.');
  if (!/^[A-Za-z0-9_-]{43,}$/.test(env.SESSION_SECRET || '') || new Set(env.SESSION_SECRET).size < 16) throw new Error('Se requiere un secreto nuevo y robusto para sesiones.');
  if (!env.SESSION_DB_HOST?.endsWith('.railway.internal') || env.SESSION_DB_NAME !== 'planes_accion_railway_test' || env.SESSION_DB_PORT !== '3306' || env.SESSION_DB_USER !== 'planes_web_sessions' || !env.SESSION_DB_PASSWORD) throw new Error('Destino de sesiones privado no válido.');
  return {origin: origin.origin, database: {host: env.SESSION_DB_HOST, port: 3306, database: env.SESSION_DB_NAME, user: env.SESSION_DB_USER, password: env.SESSION_DB_PASSWORD}};
}

export async function persistentSessions(config) {
  const Store = mysqlSession(session);
  const store = new Store({...config.database, createDatabaseTable: false, connectionLimit: 2, expiration: 7200000, schema: {tableName: 'web_sessions'}});
  store.on('error', () => console.error('Almacenamiento de sesiones no disponible.'));
  await store.onReady();
  // onReady alone does not check a pre-existing table when automatic DDL is disabled.
  try { await store.query('SELECT session_id FROM web_sessions LIMIT 0'); }
  catch { await store.close(); throw new Error('La tabla privada de sesiones no está preparada.'); }
  return store;
}

export function enforceHttps(origin) {
  return (req, res, next) => {
    if (!req.secure) {
      if (!['GET', 'HEAD'].includes(req.method)) return res.sendStatus(400);
      return res.redirect(308, origin + req.originalUrl);
    }
    res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    return next();
  };
}

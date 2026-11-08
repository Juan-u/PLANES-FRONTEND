import express from "express";
import session from "express-session";
import rutas from "./app/routes/routes.views.js";
import {runtimePort} from './app/services/runtime-config.js';
import {railwayConfiguration, persistentSessions, enforceHttps} from './app/services/railway-profile.js';
import {decisionReasonForDisplay, labelForDisplay, permissionDetailsForDisplay, permissionLabelForDisplay, roleDescriptionForDisplay} from './app/services/role-labels.js';

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
    console.error("No se puede iniciar la aplicación: falta configurar SESSION_SECRET.");
    process.exit(1);
}

const app = express();
const PORT = runtimePort();
const railway = railwayConfiguration();
const sessionStore = railway ? await persistentSessions(railway) : undefined;
if (railway) {
    app.disable('x-powered-by');
    app.set('trust proxy', 1);
    app.get('/health/ready', async (_req, res) => {
        try { await sessionStore.query('SELECT session_id FROM web_sessions LIMIT 0'); res.json({status: 'ready'}); }
        catch { res.status(503).json({status: 'unavailable'}); }
    });
    app.use(enforceHttps(railway.origin));
}

// Configurar EJS como motor de plantillas
app.set("view engine", "ejs");
app.set("views", "./views");
app.locals.timeZone = process.env.APP_TIME_ZONE || "America/Bogota";
app.locals.labelForDisplay = labelForDisplay;
app.locals.decisionReasonForDisplay = decisionReasonForDisplay;
app.locals.permissionDetailsForDisplay = permissionDetailsForDisplay;
app.locals.permissionLabelForDisplay = permissionLabelForDisplay;
app.locals.roleDescriptionForDisplay = roleDescriptionForDisplay;

// Archivos estáticos (CSS, imágenes)
app.use(express.static("public"));

// Parseo de datos de formularios y JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuración de sesiones (2 horas de duración)
app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    ...(sessionStore ? {store: sessionStore, name: '__Host-planes.sid'} : {}),
    cookie: { maxAge: 2 * 60 * 60 * 1000, ...(railway ? {secure: true, httpOnly: true, sameSite: 'lax', path: '/'} : {}) }
}));

// Registrar rutas
app.use("/", rutas);
if (railway) app.use((error, _req, res, _next) => { console.error('Solicitud frontend fallida.'); res.status(error?.type === 'entity.too.large' ? 413 : 500).send('No se pudo completar la solicitud.'); });
app.use((error,_req,res,next)=>{if(error?.type==='entity.too.large')return res.status(413).json({error:'La solicitud supera el tama?o permitido.'});return next(error);});

// Iniciar servidor
app.listen(PORT,process.env.APP_HOST||'0.0.0.0', () => {
    console.log(`Servidor frontend corriendo en http://localhost:${PORT}`);
    console.log('Backend configurado mediante BACKEND_API_URL o su valor local predeterminado.');
});

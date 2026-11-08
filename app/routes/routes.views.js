import {postBinaryEvidence,postLinkEvidence,postReopenRequest} from '../controllers/controller.views.js';
import {getInstitutionalReport,postInstitutionalExport,getInternalControl,getInternalControlContext,postInternalControl} from '../controllers/controller.views.js';
import { getPlaneacion,getPlanGestion,postPlanFicha,postPlanActuacion } from '../controllers/controller.views.js';
import { raw, Router } from "express";
import { 
    getLogin, postLogin,
    getMenu, getPlanes, postCrearPlan, postActualizarPlan, getActividades, getDetalleActividad, postCrearActividad, postActualizarActividad, getSeguimiento, postCrearPeriodo, postCerrarPeriodo, postCrearSeguimiento, postDecisionSeguimiento, postCargarEvidencia, getDescargarEvidencia, getInformes, getInformeCsv, logout,
    getRoleAdministration,
    getWeather, getLoginWeather,
    postCreateRole, postRoleConfiguration, postRolePermissions, postPermissionState,
    postRoleAssignment, postRoleRevocation, postRoleDecision,
    getUsuarios,
    getNuevoUsuario, postCrearUsuario,
    getEditarUsuario, postEditarUsuario,
    postEliminarUsuario, postReactivarUsuario
} from "../controllers/controller.views.js";
import { verificarSesion } from "../middleware/auth.middleware.js";

const router = Router();

// ============================================
// RUTAS DE AUTENTICACIÓN (sin protección)
// ============================================
router.get("/", getLogin);
router.post("/login", postLogin);
router.get("/api/clima-publico", getLoginWeather);

// ============================================
// RUTAS PROTEGIDAS (requieren sesión)
// ============================================
router.get("/menu", verificarSesion, getMenu);
router.get("/api/clima", verificarSesion, getWeather);
router.get("/planes", verificarSesion, getPlanes);
router.get("/planeacion",verificarSesion,getPlaneacion);
router.get("/planes/:id/gestion",verificarSesion,getPlanGestion);
router.post("/planes/:id/gestion/ficha",verificarSesion,postPlanFicha);
router.post("/planes/:id/gestion/actuacion",verificarSesion,postPlanActuacion);
router.post("/planes/crear", verificarSesion, postCrearPlan);
router.post("/planes/editar", verificarSesion, postActualizarPlan);
router.get("/actividades", verificarSesion, getActividades);
router.get("/actividades/:id", verificarSesion, getDetalleActividad);
router.post('/actividades/:id/evidencias',verificarSesion,raw({type:'application/octet-stream',limit:10*1024*1024}),postBinaryEvidence);
router.post('/evidencias/:id/vinculo',verificarSesion,postLinkEvidence);
router.post('/seguimiento/periodos/:id/reapertura-solicitud',verificarSesion,postReopenRequest);
router.post("/actividades/crear", verificarSesion, postCrearActividad);
router.post("/actividades/editar", verificarSesion, postActualizarActividad);
router.get("/seguimiento", verificarSesion, getSeguimiento);
router.post("/seguimiento/periodos/crear", verificarSesion, postCrearPeriodo);
router.post("/seguimiento/periodos/cerrar", verificarSesion, postCerrarPeriodo);
router.post("/seguimiento/crear", verificarSesion, postCrearSeguimiento);
router.post("/seguimiento/decision", verificarSesion, postDecisionSeguimiento);
router.post("/evidencias/cargar", verificarSesion, postCargarEvidencia);
router.get("/evidencias/:id/descargar", verificarSesion, getDescargarEvidencia);
router.get("/informes", verificarSesion, getInformes);
router.get('/informes/institucional',verificarSesion,getInstitutionalReport);
router.post('/informes/institucional/exportar/:format',verificarSesion,postInstitutionalExport);
router.get('/control-interno',verificarSesion,getInternalControl);
router.get('/control-interno/contexto',verificarSesion,getInternalControlContext);
router.get('/control-interno/:id',verificarSesion,getInternalControl);
router.post('/control-interno/actuaciones/:action',verificarSesion,postInternalControl);
router.get("/informes/calificaciones.csv", verificarSesion, getInformeCsv);
router.get("/logout", logout);
router.get("/roles", verificarSesion, getRoleAdministration);
router.post("/roles", verificarSesion, postCreateRole);
router.post("/roles/configuracion", verificarSesion, postRoleConfiguration);
router.post("/roles/permisos", verificarSesion, postRolePermissions);
router.post("/roles/permisos/estado", verificarSesion, postPermissionState);
router.post("/roles/asignaciones", verificarSesion, postRoleAssignment);
router.post("/roles/revocaciones", verificarSesion, postRoleRevocation);
router.post("/roles/solicitudes/decision", verificarSesion, postRoleDecision);

// CRUD de Usuarios
router.get("/usuarios", verificarSesion, getUsuarios);
router.get("/usuarios/nuevo", verificarSesion, getNuevoUsuario);
router.post("/usuarios/crear", verificarSesion, postCrearUsuario);
router.get("/usuarios/editar/:id", verificarSesion, getEditarUsuario);
router.post("/usuarios/editar", verificarSesion, postEditarUsuario);
router.post("/usuarios/eliminar", verificarSesion, postEliminarUsuario);
router.post("/usuarios/reactivar", verificarSesion, postReactivarUsuario);

export default router;

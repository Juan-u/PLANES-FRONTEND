import { Router } from "express";
import { 
    getLogin, postLogin,
    getMenu, getPlanes, postCrearPlan, postActualizarPlan, getActividades, getDetalleActividad, postCrearActividad, postActualizarActividad, getSeguimiento, postCrearPeriodo, postCerrarPeriodo, postCrearSeguimiento, postDecisionSeguimiento, postCargarEvidencia, getDescargarEvidencia, getInformes, getInformeCsv, logout,
    getRoleAdministration,
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

// ============================================
// RUTAS PROTEGIDAS (requieren sesión)
// ============================================
router.get("/menu", verificarSesion, getMenu);
router.get("/planes", verificarSesion, getPlanes);
router.post("/planes/crear", verificarSesion, postCrearPlan);
router.post("/planes/editar", verificarSesion, postActualizarPlan);
router.get("/actividades", verificarSesion, getActividades);
router.get("/actividades/:id", verificarSesion, getDetalleActividad);
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

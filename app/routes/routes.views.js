import { Router } from 'express';
import verificarSesion from '../middleware/auth.middleware.js';
import {
    getLogin, postLogin, logout,
    getMenu,
    getPlanes, getNuevoPlan, postCrearPlan, getEditarPlan, postEditarPlan, postEliminarPlan,
    getActividades, getNuevaActividad, postCrearActividad, getEditarActividad, postEditarActividad, postEliminarActividad,
    getUsuarios, getNuevoUsuario, postCrearUsuario, getEditarUsuario, postEditarUsuario, postEliminarUsuario,
    getPeriodos, getNuevoPeriodo, postCrearPeriodo, getEditarPeriodo, postEditarPeriodo,
    getAreas,  getNuevoArea, postCrearArea, getEditarArea, postEditarArea,
    getRoles, getNuevoRol, postCrearRol, getEditarRol, postEditarRol, postEliminarRol,
    getDashboardSeguimiento, getSeguimiento, postCrearPlaneacion, postCrearCalificacion, postRevisionCalificacion, postSubirEvidencia, getAuditoria, getDescargarEvidencia,
} from '../controllers/controller.views.js';

const router = Router();

// Auth
router.get ('/',      getLogin);
router.post('/login', postLogin);
router.get ('/logout', logout);

// Menú y dashboard
router.get('/menu', verificarSesion, getMenu);
router.get('/dashboard', verificarSesion, getDashboardSeguimiento);
router.get('/seguimiento', verificarSesion, getSeguimiento);
router.post('/seguimiento/planeacion/crear', verificarSesion, postCrearPlaneacion);
router.post('/seguimiento/calificaciones/crear', verificarSesion, postCrearCalificacion);
router.post('/seguimiento/calificaciones/revision', verificarSesion, postRevisionCalificacion);
router.post('/seguimiento/evidencias/subir', verificarSesion, postSubirEvidencia);
router.get('/seguimiento/evidencias/:id/descargar', verificarSesion, getDescargarEvidencia);
router.get('/auditoria', verificarSesion, getAuditoria);

// Planes de acción
router.get ('/planes',                  verificarSesion, getPlanes);
router.get ('/planes/nuevo',            verificarSesion, getNuevoPlan);
router.post('/planes/crear',            verificarSesion, postCrearPlan);
router.get ('/planes/editar/:id',       verificarSesion, getEditarPlan);
router.post('/planes/editar',           verificarSesion, postEditarPlan);
router.post('/planes/eliminar',         verificarSesion, postEliminarPlan);

// Actividades
router.get ('/planes/:id_plan/actividades',        verificarSesion, getActividades);
router.get ('/planes/:id_plan/actividades/nueva',  verificarSesion, getNuevaActividad);
router.post('/actividades/crear',                  verificarSesion, postCrearActividad);
router.get ('/actividades/editar/:id',             verificarSesion, getEditarActividad);
router.post('/actividades/editar',                 verificarSesion, postEditarActividad);
router.post('/actividades/eliminar',               verificarSesion, postEliminarActividad);

// Usuarios
router.get ('/usuarios',                  verificarSesion, getUsuarios);
router.get ('/usuarios/nuevo',            verificarSesion, getNuevoUsuario);
router.post('/usuarios/crear',            verificarSesion, postCrearUsuario); 
router.get ('/usuarios/editar/:id',       verificarSesion, getEditarUsuario); 
router.post('/usuarios/editar',           verificarSesion, postEditarUsuario); 
router.post('/usuarios/eliminar',         verificarSesion, postEliminarUsuario); 

// Periodos
router.get ('/periodos',                  verificarSesion, getPeriodos);
router.get ('/periodos/nuevo',            verificarSesion, getNuevoPeriodo); 
router.post('/periodos/crear',            verificarSesion, postCrearPeriodo); 
router.get ('/periodos/editar/:id',       verificarSesion, getEditarPeriodo); 
router.post('/periodos/editar',           verificarSesion, postEditarPeriodo);  

// Areas
router.get ('/areas',                       verificarSesion, getAreas);
router.get ('/areas/nuevo',            verificarSesion, getNuevoArea); 
router.post('/areas/crear',            verificarSesion, postCrearArea); 
router.get ('/areas/editar/:id',       verificarSesion, getEditarArea); 
router.post('/areas/editar',           verificarSesion, postEditarArea);  

// Roles
router.get ('/roles',                       verificarSesion, getRoles);
router.get ('/roles/nuevo',            verificarSesion, getNuevoRol); 
router.post('/roles/crear',            verificarSesion, postCrearRol); 
router.get ('/roles/editar/:id',       verificarSesion, getEditarRol); 
router.post('/roles/editar',           verificarSesion, postEditarRol);
router.post('/roles/eliminar',         verificarSesion, postEliminarRol);

export default router;

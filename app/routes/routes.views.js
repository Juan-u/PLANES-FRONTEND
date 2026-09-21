import { Router } from 'express';
import verificarSesion from '../middleware/auth.middleware.js';
import {
    getLogin, postLogin, logout,
    getMenu,
    getPlanes, getNuevoPlan, postCrearPlan, getEditarPlan, postEditarPlan, postEliminarPlan,
    getActividades, getNuevaActividad, postCrearActividad, getEditarActividad, postEditarActividad, postEliminarActividad,
    getUsuarios, getNuevoUsuario, postCrearUsuario, getEditarUsuario, postEditarUsuario, postEliminarUsuario,
    getPeriodos, getNuevoPeriodo, postCrearPeriodo, getEditarPeriodo, postEditarPeriodo,
} from '../controllers/controller.views.js';

const router = Router();

// Auth
router.get ('/',      getLogin);
router.post('/login', postLogin);
router.get ('/logout', logout);

// Menú
router.get('/menu', verificarSesion, getMenu);

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
router.get ('/periodos',                  verificarSesion, getPeriodos); //
router.get ('/periodos/nuevo',            verificarSesion, getNuevoPeriodo); //
router.post('/periodos/crear',            verificarSesion, postCrearPeriodo); //
router.get ('/periodos/editar/:id',       verificarSesion, getEditarPeriodo); //
router.post('/periodos/editar',           verificarSesion, postEditarPeriodo); // 

export default router;

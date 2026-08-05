import { Router } from 'express';
import verificarSesion from '../middleware/auth.middleware.js';
import {
    getLogin, postLogin, logout,
    getMenu,
    getPlanes, getNuevoPlan, postCrearPlan, getEditarPlan, postEditarPlan, postEliminarPlan,
    getActividades, getNuevaActividad, postCrearActividad, getEditarActividad, postEditarActividad, postEliminarActividad
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

export default router;

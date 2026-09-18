import fetch from 'node-fetch';

const API_URL = `${process.env.BACKEND_URL}/api`;

// ============================================================
// AUTH
// ============================================================

export const getLogin = (req, res) => {
    if (req.session.token) return res.redirect('/menu');
    res.render('login', { error: null });
};

export const postLogin = async (req, res) => {
    const { correo, contraseña } = req.body;
    try {
        const response = await fetch(`${API_URL}/login`, {
            method : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body   : JSON.stringify({ correo, contraseña })
        });
        const data = await response.json();

        if (!response.ok) {
            return res.render('login', { error: data.message || 'Credenciales inválidas' });
        }

        req.session.token   = data.token;
        req.session.usuario = data.usuario;
        res.redirect('/menu');
    } catch (error) {
        console.error('Error en login:', error);
        res.render('login', { error: 'Error de conexión con el servidor' });
    }
};

export const logout = (req, res) => {
    req.session.destroy(() => res.redirect('/'));
};

// ============================================================
// MENÚ
// ============================================================

export const getMenu = (req, res) => {
    res.render('menu', { usuario: req.session.usuario });
};

// ============================================================
// PLANES DE ACCIÓN
// ============================================================

export const getPlanes = async (req, res) => {
    try {
        const response = await fetch(`${API_URL}/planes`, {
            headers: { 'Authorization': `Bearer ${req.session.token}` }
        });
        const planes = await response.json();
        res.render('planes/listar', { planes, usuario: req.session.usuario });
    } catch (error) {
        console.error('Error:', error);
        res.render('planes/listar', { planes: [], usuario: req.session.usuario });
    }
};

export const getNuevoPlan = (req, res) => {
    res.render('planes/crear', { error: null, usuario: req.session.usuario });
};

export const postCrearPlan = async (req, res) => {
    const { nombre, descripcion, estado } = req.body;
    try {
        const response = await fetch(`${API_URL}/planes`, {
            method : 'POST',
            headers: {
                'Content-Type' : 'application/json',
                'Authorization': `Bearer ${req.session.token}`
            },
            body: JSON.stringify({ nombre, descripcion, estado })
        });

        if (!response.ok) {
            const data = await response.json();
            return res.render('planes/crear', { error: data.message || 'Error al crear plan', usuario: req.session.usuario });
        }

        res.redirect('/planes');
    } catch (error) {
        console.error('Error:', error);
        res.render('planes/crear', { error: 'Error de conexión', usuario: req.session.usuario });
    }
};

export const getEditarPlan = async (req, res) => {
    const { id } = req.params;
    try {
        const response = await fetch(`${API_URL}/planes/${id}`, {
            headers: { 'Authorization': `Bearer ${req.session.token}` }
        });
        if (!response.ok) return res.redirect('/planes');
        const plan = await response.json();
        res.render('planes/editar', { plan, error: null, usuario: req.session.usuario });
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/planes');
    }
};

export const postEditarPlan = async (req, res) => {
    const { id, nombre, descripcion, estado } = req.body;
    try {
        const response = await fetch(`${API_URL}/planes/${id}`, {
            method : 'PUT',
            headers: {
                'Content-Type' : 'application/json',
                'Authorization': `Bearer ${req.session.token}`
            },
            body: JSON.stringify({ nombre, descripcion, estado })
        });

        if (!response.ok) {
            const data = await response.json();
            return res.render('planes/editar', {
                plan   : { id_plan: id, nombre, descripcion, estado },
                error  : data.message || 'Error al actualizar',
                usuario: req.session.usuario
            });
        }

        res.redirect('/planes');
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/planes');
    }
};

export const postEliminarPlan = async (req, res) => {
    const { id } = req.body;
    try {
        await fetch(`${API_URL}/planes/${id}`, {
            method : 'DELETE',
            headers: { 'Authorization': `Bearer ${req.session.token}` }
        });
    } catch (error) {
        console.error('Error:', error);
    }
    res.redirect('/planes');
};

// ============================================================
// ACTIVIDADES
// ============================================================

export const getActividades = async (req, res) => {
    const { id_plan } = req.params;
    try {
        const [resActividades, resPlan] = await Promise.all([
            fetch(`${API_URL}/actividades?id_plan=${id_plan}`, {
                headers: { 'Authorization': `Bearer ${req.session.token}` }
            }),
            fetch(`${API_URL}/planes/${id_plan}`, {
                headers: { 'Authorization': `Bearer ${req.session.token}` }
            })
        ]);

        const actividades = await resActividades.json();
        const plan        = await resPlan.json();

        res.render('actividades/listar', { actividades, plan, usuario: req.session.usuario });
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/planes');
    }
};

export const getNuevaActividad = async (req, res) => {
    const { id_plan } = req.params;
    try {
        const resPlan = await fetch(`${API_URL}/planes/${id_plan}`, {
            headers: { 'Authorization': `Bearer ${req.session.token}` }
        });
        const plan = await resPlan.json();
        res.render('actividades/crear', { plan, error: null, usuario: req.session.usuario });
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/planes');
    }
};

export const postCrearActividad = async (req, res) => {
    const { descripcion, responsable, fecha_inicio, fecha_fin, estado, id_plan } = req.body;
    try {
        const response = await fetch(`${API_URL}/actividades`, {
            method : 'POST',
            headers: {
                'Content-Type' : 'application/json',
                'Authorization': `Bearer ${req.session.token}`
            },
            body: JSON.stringify({ descripcion, responsable, fecha_inicio, fecha_fin, estado, id_plan })
        });

        if (!response.ok) {
            const data  = await response.json();
            const plan  = { id_plan };
            return res.render('actividades/crear', { plan, error: data.message, usuario: req.session.usuario });
        }

        res.redirect(`/planes/${id_plan}/actividades`);
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/planes');
    }
};

export const getEditarActividad = async (req, res) => {
    const { id } = req.params;
    try {
        const resAct = await fetch(`${API_URL}/actividades/${id}`, {
            headers: { 'Authorization': `Bearer ${req.session.token}` }
        });
        if (!resAct.ok) return res.redirect('/planes');
        const actividad = await resAct.json();

        const resPlan = await fetch(`${API_URL}/planes/${actividad.id_plan}`, {
            headers: { 'Authorization': `Bearer ${req.session.token}` }
        });
        const plan = await resPlan.json();

        res.render('actividades/editar', { actividad, plan, error: null, usuario: req.session.usuario });
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/planes');
    }
};

export const postEditarActividad = async (req, res) => {
    const { id, descripcion, responsable, fecha_inicio, fecha_fin, estado, id_plan } = req.body;
    try {
        const response = await fetch(`${API_URL}/actividades/${id}`, {
            method : 'PUT',
            headers: {
                'Content-Type' : 'application/json',
                'Authorization': `Bearer ${req.session.token}`
            },
            body: JSON.stringify({ descripcion, responsable, fecha_inicio, fecha_fin, estado })
        });

        if (!response.ok) {
            const data      = await response.json();
            const actividad = { id_actividad: id, descripcion, responsable, fecha_inicio, fecha_fin, estado, id_plan };
            const plan      = { id_plan };
            return res.render('actividades/editar', { actividad, plan, error: data.message, usuario: req.session.usuario });
        }

        res.redirect(`/planes/${id_plan}/actividades`);
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/planes');
    }
};

export const postEliminarActividad = async (req, res) => {
    const { id, id_plan } = req.body;
    try {
        await fetch(`${API_URL}/actividades/${id}`, {
            method : 'DELETE',
            headers: { 'Authorization': `Bearer ${req.session.token}` }
        });
    } catch (error) {
        console.error('Error:', error);
    }
    res.redirect(`/planes/${id_plan}/actividades`);
};

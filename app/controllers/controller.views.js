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
            headers: {
                'Authorization': `Bearer ${req.session.token}`
            }
        });

        const data = await response.json();

        console.log('==============================');
        console.log('GET /api/planes');
        console.log('Status:', response.status);
        console.log('Respuesta:', data);
        console.log('Es array:', Array.isArray(data));
        console.log('==============================');

        if (!response.ok) {
            return res.status(response.status).render('planes/listar', {
                planes: [],
                usuario: req.session.usuario,
                error: data.message || 'Error al obtener los planes'
            });
        }

        res.render('planes/listar', {
            planes: data,
            usuario: req.session.usuario,
            error: null
        });

    } catch (error) {
        console.error('Error obteniendo planes:', error);

        res.status(500).render('planes/listar', {
            planes: [],
            usuario: req.session.usuario,
            error: 'Error de conexión con el servidor'
        });
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

// usuarios
export const getUsuarios = async (req, res) => {
    try {
        const response = await fetch(`${API_URL}/usuarios`, {
            headers: {
                "Authorization": `Bearer ${req.session.token}`
            }
        });
        const data = await response.json();

        console.log('GET /api/usuarios:', response.status);
        console.log('Respuesta usuarios:', data);

        if (!response.ok) {
            return res.status(response.status).render('usuarios/listar', {
                usuarios: [],
                usuario: req.session.usuario,
                error: data.message || 'Error al obtener los usuarios'
            });
        }

        const usuarios = Array.isArray(data)
            ? data
            : data.usuarios || [];

        res.render('usuarios/listar', {
            usuarios,
            usuario: req.session.usuario,
            error: null
        });

    } catch (error) {
        console.error('Error obteniendo usuarios:', error);

        res.status(500).render('usuarios/listar', {
            usuarios: [],
            usuario: req.session.usuario,
            error: 'Error de conexión con el servidor'
        });
    }
};
// GET /usuarios/nuevo - Muestra formulario de creación
export const getNuevoUsuario = (req, res) => {
    res.render("usuarios/crear", { error: null, usuario: req.session.usuario }); ;
};

// POST /usuarios/crear - Procesa la creación
export const postCrearUsuario = async (req, res) => {
    const { nombre, correo } = req.body;
console.log("Creando usuario:", { nombre, correo });
console.log("Token:", req.session.token);
    
    try {
        const response = await fetch(`${API_URL}/usuarios`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${req.session.token}`
            },
            body: JSON.stringify({ nombre, correo, password: "123456" })
        });

        if (!response.ok) {
            const data = await response.json();
            return res.render("usuarios/crear", { error: data.message || "Error al crear usuario", usuario: req.session.usuario });
        }

        res.redirect("/usuarios");

    } catch (error) {
        console.error("Error:", error);
        res.render("usuarios/crear", { error: "Error de conexión con el servidor", usuario: req.session.usuario });
    }
};
// ============================================
// VISTA 5: EDITAR REGISTRO
// ============================================

// GET /usuarios/editar/:id - Muestra formulario de edición
export const getEditarUsuario = async (req, res) => {
    const { id } = req.params;
    
    try {
        const response = await fetch(`${API_URL}/usuarios/${id}`, {
            headers: {
                "Authorization": `Bearer ${req.session.token}`
            }
        });

        if (!response.ok) {
            return res.redirect("/usuarios");
        }

        const usuario = await response.json();
        res.render("usuarios/editar", { usuario, error: null, usuario: req.session.usuario });

    } catch (error) {
        console.error("Error:", error);
        res.redirect("/usuarios");
    }
};

// POST /usuarios/editar - Procesa la actualización
export const postEditarUsuario = async (req, res) => {
    const { id, nombre, correo } = req.body;
    
    try {
        const response = await fetch(`${API_URL}/usuarios/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${req.session.token}`
            },
            body: JSON.stringify({ nombre, correo })
        });

        if (!response.ok) {
            const data = await response.json();
            const usuario = { id, nombre, correo };
            return res.render("usuarios/editar", { usuario, error: data.message || "Error al actualizar" });
        }

        res.redirect("/usuarios");

    } catch (error) {
        console.error("Error:", error);
        const usuario = { id, nombre, correo };
        res.render("usuarios/editar", { usuario, error: "Error de conexión" });
    }
};
// ============================================
// VISTA 6: ELIMINAR REGISTRO
// ============================================

/**
 * POST /usuarios/eliminar - Elimina un usuario
 * Nota: Usamos POST en lugar de DELETE porque los formularios HTML
 * solo soportan GET y POST. El servidor internamente usa DELETE.
 */
export const postEliminarUsuario = async (req, res) => {
    const { id } = req.body;
    
    try {
        const response = await fetch(`${API_URL}/usuarios/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${req.session.token}`
            }
        });

        if (!response.ok) {
            console.error("Error al eliminar usuario");
        }

        res.redirect("/usuarios");

    } catch (error) {
        console.error("Error:", error);
        res.redirect("/usuarios");
    }
};

// Periodos
export const getPeriodos = async (req, res) => {
    try {
        const response = await fetch(`${API_URL}/periodos`, {
            headers: {
                "Authorization": `Bearer ${req.session.token}`
            }
        });
                const data = await response.json();

        console.log('GET /api/periodos:', response.status);
        console.log('Respuesta periodos:', data);

        if (!response.ok) {
            return res.status(response.status).render('periodos/listar', {
                periodos: [],
                usuario: req.session.usuario,
                error: data.message || 'Error al obtener los periodos'
            });
        }

        const periodos = Array.isArray(data)
            ? data
            : data.periodos || [];

        res.render('periodos/listar', {
            periodos,
            usuario: req.session.usuario,
            error: null
        });

    } catch (error) {
        console.error('Error obteniendo periodos:', error);

        res.status(500).render('periodos/listar', {
            periodos: [],
            usuario: req.session.usuario,
            error: 'Error de conexión con el servidor'
        });
    }
};

//crear periodo
export const getNuevoPeriodo = (req, res) => {
    res.render("periodos/crear", { error: null, usuario: req.session.usuario }); ;
};

// POST /periodos/crear - Procesa la creación
export const postCrearPeriodo = async (req, res) => {
    const { nombre, fechas } = req.body;
console.log("Creando periodo:", { nombre, fechas });
console.log("Token:", req.session.token);
    
    try {
        const response = await fetch(`${API_URL}/periodos`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${req.session.token}`
            },
            body: JSON.stringify({ nombre, fechas })
        });

        if (!response.ok) {
            const data = await response.json();
            return res.render("periodos/crear", { error: data.message || "Error al crear periodo", usuario: req.session.usuario });
        }

        res.redirect("/periodos");

    } catch (error) {
        console.error("Error:", error);
        res.render("periodos/crear", { error: "Error de conexión con el servidor", usuario: req.session.usuario });
    }

};

// editar periodo
export const getEditarPeriodo = async (req, res) => {
    const { id } = req.params;
    
    try {
        const response = await fetch(`${API_URL}/periodos/${id}`, {
            headers: {
                "Authorization": `Bearer ${req.session.token}`
            }
        });

        if (!response.ok) {
            return res.redirect("/periodos");
        }

        const periodo = await response.json();
        res.render("periodos/editar", { periodo, error: null, usuario: req.session.usuario });

    } catch (error) {
        console.error("Error:", error);
        res.redirect("/periodos");
    }
};

// POST /periodos/editar - Procesa la actualización
export const postEditarPeriodo = async (req, res) => {
    const { id, nombre, fechas } = req.body;
    
    try {
        const response = await fetch(`${API_URL}/periodos/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${req.session.token}`
            },
            body: JSON.stringify({ nombre, fechas })
        });

        if (!response.ok) {
            const data = await response.json();
            const periodo = { id, nombre, fechas };
            return res.render("periodos/editar", { periodo, error: data.message || "Error al actualizar" });
        }

        res.redirect("/periodos");

    } catch (error) {
        console.error("Error:", error);
        const periodo = { id, nombre, fechas };
        res.render("periodos/editar", { periodo, error: "Error de conexión" });
    }   
};
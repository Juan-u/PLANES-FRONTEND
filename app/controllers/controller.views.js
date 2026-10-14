import fetch from 'node-fetch';

const API_URL = `${(process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '')}/api`;

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

// USUARIOS

export const getUsuarios = async (req, res) => {
    try {
        const response = await fetch(`${API_URL}/usuarios`, {
            headers: {
                Authorization: `Bearer ${req.session.token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).render('usuarios/listar', {
                usuarios: [],
                usuario: req.session.usuario,
                error: data.message || 'Error al obtener los usuarios'
            });
        }

        res.render('usuarios/listar', {
            usuarios: Array.isArray(data) ? data : [],
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


// NUEVO USUARIO

export const getNuevoUsuario = async (req, res) => {
    try {
        const [responseAreas, responseRoles] = await Promise.all([
            fetch(`${API_URL}/areas`, {
                headers: {
                    Authorization: `Bearer ${req.session.token}`
                }
            }),

            fetch(`${API_URL}/roles`, {
                headers: {
                    Authorization: `Bearer ${req.session.token}`
                }
            })
        ]);

        const areas = await responseAreas.json();
        const roles = await responseRoles.json();

        if (!responseAreas.ok) {
            return res.render('usuarios/crear', {
                areas: [],
                roles: [],
                error: areas.message || 'Error al obtener las áreas',
                usuario: req.session.usuario
            });
        }

        if (!responseRoles.ok) {
            return res.render('usuarios/crear', {
                areas,
                roles: [],
                error: roles.message || 'Error al obtener los roles',
                usuario: req.session.usuario
            });
        }

        res.render('usuarios/crear', {
            areas,
            roles,
            error: null,
            usuario: req.session.usuario
        });

    } catch (error) {
        console.error('Error obteniendo áreas y roles:', error);

        res.render('usuarios/crear', {
            areas: [],
            roles: [],
            error: 'Error de conexión con el servidor',
            usuario: req.session.usuario
        });
    }
};


// CREAR USUARIO

export const postCrearUsuario = async (req, res) => {

    const {
        nombre,
        correo,
        password,
        area_id,
        rol_id
    } = req.body;

    try {

        const response = await fetch(`${API_URL}/usuarios`, {
            method: 'POST',

            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${req.session.token}`
            },

            body: JSON.stringify({
                nombre,
                correo,
                password,
                area_id,
                rol_id
            })
        });

        if (!response.ok) {

            const data = await response.json();

            return res.render('usuarios/crear', {
                areas: [],
                roles: [],
                error: data.message || 'Error al crear usuario',
                usuario: req.session.usuario
            });
        }

        res.redirect('/usuarios');

    } catch (error) {

        console.error('Error creando usuario:', error);

        res.render('usuarios/crear', {
            areas: [],
            roles: [],
            error: 'Error de conexión con el servidor',
            usuario: req.session.usuario
        });
    }
};


// EDITAR USUARIO

export const getEditarUsuario = async (req, res) => {

    const { id } = req.params;

    try {

        const [responseUsuario, responseAreas, responseRoles] =
            await Promise.all([

                fetch(`${API_URL}/usuarios/${id}`, {
                    headers: {
                        Authorization: `Bearer ${req.session.token}`
                    }
                }),

                fetch(`${API_URL}/areas`, {
                    headers: {
                        Authorization: `Bearer ${req.session.token}`
                    }
                }),

                fetch(`${API_URL}/roles`, {
                    headers: {
                        Authorization: `Bearer ${req.session.token}`
                    }
                })
            ]);

        if (!responseUsuario.ok) {
            return res.redirect('/usuarios');
        }

        const usuarioEditar = await responseUsuario.json();
        const areas = await responseAreas.json();
        const roles = await responseRoles.json();

        res.render('usuarios/editar', {
            usuario: usuarioEditar,
            areas,
            roles,
            error: null,
            usuarioSesion: req.session.usuario
        });

    } catch (error) {

        console.error('Error obteniendo usuario:', error);

        res.redirect('/usuarios');
    }
};


// ACTUALIZAR USUARIO

export const postEditarUsuario = async (req, res) => {

    const {
        id,
        nombre,
        correo,
        password,
        area_id,
        rol_id
    } = req.body;

    try {

        const response = await fetch(`${API_URL}/usuarios/${id}`, {
            method: 'PUT',

            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${req.session.token}`
            },

            body: JSON.stringify({
                nombre,
                correo,
                password,
                area_id,
                rol_id
            })
        });

        if (!response.ok) {

            const data = await response.json();

            return res.render('usuarios/editar', {
                usuario: {
                    id,
                    nombre,
                    correo,
                    area_id,
                    rol_id,
                    estado: req.body.estado || 'Activo'
                },
                areas: [],
                roles: [],
                error: data.message || 'Error al actualizar usuario',
                usuarioSesion: req.session.usuario
            });
        }

        res.redirect('/usuarios');

    } catch (error) {

        console.error('Error actualizando usuario:', error);

        res.render('usuarios/editar', {
            usuario: {
                id_usuario: id,
                nombre,
                correo,
                area_id,
                rol_id
            },
            areas: [],
            roles: [],
            error: 'Error de conexión',
            usuarioSesion: req.session.usuario
        });
    }
};


// ELIMINAR USUARIO

export const postEliminarUsuario = async (req, res) => {

    const { id } = req.body;

    try {

        const response = await fetch(`${API_URL}/usuarios/${id}`, {
            method: 'DELETE',

            headers: {
                Authorization: `Bearer ${req.session.token}`
            }
        });

        if (!response.ok) {
            console.error('Error al eliminar usuario');
        }

    } catch (error) {

        console.error('Error eliminando usuario:', error);
    }

    res.redirect('/usuarios');
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
    const { nombre, fecha_inicio, fecha_fin } = req.body;
console.log("Creando periodo:", { nombre, fecha_inicio, fecha_fin });
console.log("Token:", req.session.token);
    
    try {
        const response = await fetch(`${API_URL}/periodos`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${req.session.token}`
            },
            body: JSON.stringify({ nombre, fecha_inicio, fecha_fin })
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
    const { id, nombre, fecha_inicio, fecha_fin } = req.body;
    
    try {
        const response = await fetch(`${API_URL}/periodos/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${req.session.token}`
            },
            body: JSON.stringify({ nombre, fecha_inicio, fecha_fin })
        });

        if (!response.ok) {
            const data = await response.json();
            const periodo = { id, nombre, fecha_inicio, fecha_fin };
            return res.render("periodos/editar", { periodo, error: data.message || "Error al actualizar" });
        }

        res.redirect("/periodos");

    } catch (error) {
        console.error("Error:", error);
        const periodo = { id, nombre, fecha_inicio, fecha_fin };
        res.render("periodos/editar", { periodo, error: "Error de conexión" });
    }   
};
// Areas
export const getAreas = async (req, res) => {
    try {
        const response = await fetch(`${API_URL}/areas`, {
            headers: {
                "Authorization": `Bearer ${req.session.token}`
            }
        });
                const data = await response.json();

        console.log('GET /api/areas:', response.status);
        console.log('Respuesta areas:', data);

        if (!response.ok) {
            return res.status(response.status).render('areas/listar', {
                areas: [],
                usuario: req.session.usuario,
                error: data.message || 'Error al obtener los areas'
            });
        }

        const areas = Array.isArray(data)
            ? data
            : data.areas || [];

        res.render('areas/listar', {
            areas,
            usuario: req.session.usuario,
            error: null
        });

    } catch (error) {
        console.error('Error obteniendo areas:', error);

        res.status(500).render('areas/listar', {
            areas: [],
            usuario: req.session.usuario,
            error: 'Error de conexión con el servidor'
        });
    }
};

//crear periodo
export const getNuevoArea = (req, res) => {
    res.render("areas/crear", { error: null, usuario: req.session.usuario }); ;
};

// POST /periodos/crear - Procesa la creación
export const postCrearArea = async (req, res) => {
    const { nombre } = req.body;
console.log("Creando area:", { nombre });
console.log("Token:", req.session.token);
    
    try {
        const response = await fetch(`${API_URL}/areas`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${req.session.token}`
            },
            body: JSON.stringify({ nombre})
        });

        if (!response.ok) {
            const data = await response.json();
            return res.render("areas/crear", { error: data.message || "Error al crear areas", usuario: req.session.usuario });
        }

        res.redirect("/areas");

    } catch (error) {
        console.error("Error:", error);
        res.render("areas/crear", { error: "Error de conexión con el servidor", usuario: req.session.usuario });
    }

};

// editar periodo
export const getEditarArea = async (req, res) => {
    const { id } = req.params;
    
    try {
        const response = await fetch(`${API_URL}/areas/${id}`, {
            headers: {
                "Authorization": `Bearer ${req.session.token}`
            }
        });

        if (!response.ok) {
            return res.redirect("/areas");
        }

        const area = await response.json();
        res.render('areas/editar', { area, error: null, usuario: req.session.usuario });

    } catch (error) {
        console.error("Error:", error);
        res.redirect("/areas");
    }
};

// POST /periodos/editar - Procesa la actualización
export const postEditarArea = async (req, res) => {
    const { id, nombre } = req.body;
    
    try {
        const response = await fetch(`${API_URL}/areas/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${req.session.token}`
            },
            body: JSON.stringify({ nombre })
        });

        if (!response.ok) {
            const data = await response.json();
            const area = { id, nombre };
            return res.render('areas/editar', { area, error: data.message || 'Error al actualizar', usuario: req.session.usuario });
        }

        res.redirect("/areas");

    } catch (error) {
        console.error("Error:", error);
        const area = { id, nombre};
        res.render('areas/editar', { area, error: 'Error de conexión', usuario: req.session.usuario });
    }   

};

// ROLES

// GET /roles
export const getRoles = async (req, res) => {
    try {
        const response = await fetch(`${API_URL}/roles`, {
            headers: {
                "Authorization": `Bearer ${req.session.token}`
            }
        });

        const data = await response.json();

        console.log('GET /api/roles:', response.status);
        console.log('Respuesta roles:', data);

        if (!response.ok) {
            return res.status(response.status).render('roles/listar', {
                roles: [],
                usuario: req.session.usuario,
                error: data.message || 'Error al obtener los roles'
            });
        }

        const roles = Array.isArray(data)
            ? data
            : data.roles || [];

        res.render('roles/listar', {
            roles,
            usuario: req.session.usuario,
            error: null
        });

    } catch (error) {
        console.error('Error obteniendo roles:', error);

        res.status(500).render('roles/listar', {
            roles: [],
            usuario: req.session.usuario,
            error: 'Error de conexión con el servidor'
        });
    }
};


// NUEVO ROL

export const getNuevoRol = (req, res) => {
    res.render("roles/crear", {
        error: null,
        usuario: req.session.usuario
    });
};


// POST /roles/crear
export const postCrearRol = async (req, res) => {
    const { nombre } = req.body;

    console.log("Creando rol:", { nombre });

    try {
        const response = await fetch(`${API_URL}/roles`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${req.session.token}`
            },
            body: JSON.stringify({
                nombre
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.render("roles/crear", {
                error: data.message || "Error al crear el rol",
                usuario: req.session.usuario
            });
        }

        res.redirect("/roles");

    } catch (error) {
        console.error("Error creando rol:", error);

        res.render("roles/crear", {
            error: "Error de conexión con el servidor",
            usuario: req.session.usuario
        });
    }
};


// EDITAR ROL

// GET /roles/editar/:id
export const getEditarRol = async (req, res) => {
    const { id } = req.params;

    try {
        const response = await fetch(`${API_URL}/roles/${id}`, {
            headers: {
                "Authorization": `Bearer ${req.session.token}`
            }
        });

        if (!response.ok) {
            return res.redirect("/roles");
        }

        // AQUÍ estaba el error:
        // antes tenías "const roles"
        // pero después utilizabas "rol"
        const rol = await response.json();

        res.render("roles/editar", {
            rol,
            error: null,
            usuario: req.session.usuario
        });

    } catch (error) {
        console.error("Error obteniendo rol:", error);

        res.redirect("/roles");
    }
};


// POST /roles/editar
export const postEditarRol = async (req, res) => {
    const { id, nombre } = req.body;

    const rol = {
        id,
        nombre
    };

    try {
        const response = await fetch(`${API_URL}/roles/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${req.session.token}`
            },
            body: JSON.stringify({
                nombre
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.render("roles/editar", {
                rol,
                error: data.message || "Error al actualizar el rol",
                usuario: req.session.usuario
            });
        }

        res.redirect("/roles");

    } catch (error) {
        console.error("Error actualizando rol:", error);

        res.render("roles/editar", {
            rol,
            error: "Error de conexión con el servidor",
            usuario: req.session.usuario
        });
    }
};


// ELIMINAR ROL

export const postEliminarRol = async (req, res) => {
    const { id } = req.body;

    try {
        const response = await fetch(`${API_URL}/roles/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${req.session.token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).render("roles/listar", {
                roles: [],
                usuario: req.session.usuario,
                error: data.message || "Error al eliminar el rol"
            });
        }

        res.redirect("/roles");

    } catch (error) {
        console.error("Error eliminando rol:", error);

        res.status(500).render("roles/listar", {
            roles: [],
            usuario: req.session.usuario,
            error: "Error de conexión con el servidor"
        });
    }
};

// ============================================================
// SEGUIMIENTO TRIMESTRAL, EVIDENCIAS, REVISIÓN Y AUDITORÍA
// ============================================================
const apiFetch = (path, req, options = {}) => fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${req.session.token}` }
});

export const getDashboardSeguimiento = async (req, res) => {
    try {
        const [dashRes, notifRes] = await Promise.all([
            apiFetch('/dashboard', req), apiFetch('/notificaciones', req)
        ]);
        const dashboard = dashRes.ok ? await dashRes.json() : null;
        const notificaciones = notifRes.ok ? await notifRes.json() : [];
        res.render('seguimiento/dashboard', { usuario: req.session.usuario, dashboard, notificaciones, error: dashboard ? null : 'No fue posible cargar el resumen.' });
    } catch (error) {
        console.error('Dashboard seguimiento:', error);
        res.render('seguimiento/dashboard', { usuario: req.session.usuario, dashboard: null, notificaciones: [], error: 'No hay conexión con el backend.' });
    }
};

export const getSeguimiento = async (req, res) => {
    try {
        const [calRes, planRes, periodoRes, areaRes] = await Promise.all([
            apiFetch('/seguimiento/calificaciones', req), apiFetch('/seguimiento/planeacion', req),
            apiFetch('/periodos', req), apiFetch('/areas', req)
        ]);
        const [calificaciones, planeaciones, periodos, areas] = await Promise.all([calRes.json(), planRes.json(), periodoRes.json(), areaRes.json()]);
        res.render('seguimiento/listar', { usuario: req.session.usuario, calificaciones: Array.isArray(calificaciones) ? calificaciones : [], planeaciones: Array.isArray(planeaciones) ? planeaciones : [], periodos: Array.isArray(periodos) ? periodos : [], areas: Array.isArray(areas) ? areas : [], error: null, mensaje: req.query.mensaje || null });
    } catch (error) {
        console.error('Seguimiento:', error);
        res.render('seguimiento/listar', { usuario: req.session.usuario, calificaciones: [], planeaciones: [], periodos: [], areas: [], error: 'No fue posible cargar el seguimiento.', mensaje: null });
    }
};

export const postCrearPlaneacion = async (req, res) => {
    try {
        const response = await apiFetch('/seguimiento/planeacion', req, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req.body) });
        const data = await response.json();
        if (!response.ok) return res.redirect('/seguimiento?mensaje=' + encodeURIComponent(data.message || 'No se pudo crear la actividad'));
        res.redirect('/seguimiento?mensaje=' + encodeURIComponent('Actividad de planeación creada correctamente'));
    } catch (error) { console.error(error); res.redirect('/seguimiento?mensaje=' + encodeURIComponent('Error de conexión')); }
};

export const postCrearCalificacion = async (req, res) => {
    try {
        const response = await apiFetch('/seguimiento/calificaciones', req, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req.body) });
        const data = await response.json();
        res.redirect('/seguimiento?mensaje=' + encodeURIComponent(data.message || (response.ok ? 'Guardado' : 'No se pudo guardar')));
    } catch (error) { console.error(error); res.redirect('/seguimiento?mensaje=' + encodeURIComponent('Error de conexión')); }
};

export const postRevisionCalificacion = async (req, res) => {
    try {
        const response = await apiFetch(`/seguimiento/calificaciones/${req.body.id}/revision`, req, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: req.body.estado, observacion: req.body.observacion }) });
        const data = await response.json();
        res.redirect('/seguimiento?mensaje=' + encodeURIComponent(data.message || 'Revisión procesada'));
    } catch (error) { console.error(error); res.redirect('/seguimiento?mensaje=' + encodeURIComponent('Error de conexión')); }
};

export const postSubirEvidencia = async (req, res) => {
    try {
        const { calificacion_id, filename, filedata, mimetype } = req.body;
        if (!filedata) return res.redirect('/seguimiento?mensaje=' + encodeURIComponent('Selecciona un archivo primero'));
        const buffer = Buffer.from(filedata, 'base64');
        const response = await apiFetch(`/seguimiento/evidencias?calificacion_id=${encodeURIComponent(calificacion_id)}&filename=${encodeURIComponent(filename || 'evidencia')}`, req, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream', 'X-Original-Mime': mimetype || 'application/octet-stream' }, body: buffer });
        const data = await response.json();
        res.redirect('/seguimiento?mensaje=' + encodeURIComponent(data.message || 'Carga procesada'));
    } catch (error) { console.error(error); res.redirect('/seguimiento?mensaje=' + encodeURIComponent('Error al cargar evidencia')); }
};

export const getAuditoria = async (req, res) => {
    try {
        const response = await apiFetch('/auditoria', req);
        const logs = response.ok ? await response.json() : [];
        res.render('seguimiento/auditoria', { usuario: req.session.usuario, logs: Array.isArray(logs) ? logs : [], error: response.ok ? null : 'No tienes permisos o no se pudo cargar la auditoría.' });
    } catch (error) { console.error(error); res.render('seguimiento/auditoria', { usuario: req.session.usuario, logs: [], error: 'Error de conexión con el backend.' }); }
};


export const getDescargarEvidencia = async (req, res) => {
    try {
        const response = await apiFetch(`/seguimiento/evidencias/${req.params.id}/descargar`, req);
        if (!response.ok) return res.status(response.status).send('No fue posible descargar la evidencia.');
        const disposition = response.headers.get('content-disposition');
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        if (disposition) res.setHeader('Content-Disposition', disposition);
        res.setHeader('Content-Type', contentType);
        response.body.pipe(res);
    } catch (error) { console.error(error); res.status(500).send('Error descargando evidencia.'); }
};

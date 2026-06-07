import fetch from "node-fetch";

const API_URL = "http://localhost:3000/api";

// ============================================
// VISTA 1: LOGIN
// ============================================

// GET / - Muestra el formulario de login
export const getLogin = (req, res) => {
    // Si ya hay sesión activa, redirigir al menú
    if (req.session.token) {
        return res.redirect("/menu");
    }
    // Renderizar vista de login sin errores
    res.render("login", { error: null });
};

// POST /login - Procesa el formulario de login
export const postLogin = async (req, res) => {
    const { usuario, contraseña } = req.body;
    
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuario, contraseña })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.render("login", { error: data.message || "Credenciales inválidas" });
        }

        // Login exitoso: guardar token en sesión
        req.session.token = data.token;
        res.redirect("/menu");
        
    } catch (error) {
        console.error("Error en login:", error);
        res.render("login", { error: "Error de conexión con el servidor" });
    }
};
// ============================================
// VISTA 2: MENÚ PRINCIPAL
// ============================================

// GET /menu - Muestra el menú principal
export const getMenu = (req, res) => {
    res.render("menu");
};

// GET /logout - Cierra la sesión
export const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) console.error("Error al cerrar sesión:", err);
        res.redirect("/");
    });
};
// ============================================
// VISTA 3: LISTAR REGISTROS
// ============================================

// GET /usuarios - Muestra la lista de usuarios
export const getUsuarios = async (req, res) => {
    try {
        const response = await fetch(`${API_URL}/usuarios`, {
            headers: {
                "Authorization": `Bearer ${req.session.token}`
            }
        });

        if (!response.ok) {
            throw new Error("Error al obtener usuarios");
        }

        const usuarios = await response.json();
        res.render("listar", { usuarios });

    } catch (error) {
        console.error("Error:", error);
        res.render("listar", { usuarios: [] });
    }
};
// ============================================
// VISTA 4: CREAR REGISTRO
// ============================================

// GET /usuarios/nuevo - Muestra formulario de creación
export const getNuevoUsuario = (req, res) => {
    res.render("crear", { error: null });
};

// POST /usuarios/crear - Procesa la creación
export const postCrearUsuario = async (req, res) => {
    const { nombre, email } = req.body;
console.log("Creando usuario:", { nombre, email });
console.log("Token:", req.session.token);
    
    try {
        const response = await fetch(`${API_URL}/usuarios`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${req.session.token}`
            },
            body: JSON.stringify({ nombre, email, password: "123456" })
        });

        if (!response.ok) {
            const data = await response.json();
            return res.render("crear", { error: data.message || "Error al crear usuario" });
        }

        res.redirect("/usuarios");

    } catch (error) {
        console.error("Error:", error);
        res.render("crear", { error: "Error de conexión con el servidor" });
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
        res.render("editar", { usuario, error: null });

    } catch (error) {
        console.error("Error:", error);
        res.redirect("/usuarios");
    }
};

// POST /usuarios/editar - Procesa la actualización
export const postEditarUsuario = async (req, res) => {
    const { id, nombre, email } = req.body;
    
    try {
        const response = await fetch(`${API_URL}/usuarios/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${req.session.token}`
            },
            body: JSON.stringify({ nombre, email })
        });

        if (!response.ok) {
            const data = await response.json();
            const usuario = { id, nombre, email };
            return res.render("editar", { usuario, error: data.message || "Error al actualizar" });
        }

        res.redirect("/usuarios");

    } catch (error) {
        console.error("Error:", error);
        const usuario = { id, nombre, email };
        res.render("editar", { usuario, error: "Error de conexión" });
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
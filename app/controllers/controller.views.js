import fetch from "node-fetch";
import { randomBytes, timingSafeEqual } from "node:crypto";

const API_URL = "http://localhost:3000/api";
const API_TEMPORARY_ERROR = "No se pudo completar la solicitud. Inténtalo de nuevo.";
const LOGIN_CREDENTIALS_ERROR = "Credenciales inválidas";
const LOGIN_TEMPORARY_ERROR = "El servicio de inicio de sesión no está disponible temporalmente. Inténtalo de nuevo.";

function destroySessionAndRedirect(req, res) {
    return new Promise((resolve) => {
        req.session.destroy((error) => {
            if (error) {
                resolve(res.status(503).send(API_TEMPORARY_ERROR));
                return;
            }

            resolve(res.redirect("/"));
        });
    });
}

async function handleApiRejection(response, req, res) {
    if (response.status === 401) {
        return destroySessionAndRedirect(req, res);
    }

    if (response.status === 403) {
        return res.status(403).send("No tienes permiso para realizar esta operación.");
    }

    if (response.status === 503 || response.status >= 500) {
        return res.status(503).send(API_TEMPORARY_ERROR);
    }

    return null;
}

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
    const { correo, password } = req.body ?? {};
    
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ correo, password })
        });

        if (!response.ok) {
            delete req.session.token;
            const error = response.status === 503 || response.status >= 500
                ? LOGIN_TEMPORARY_ERROR
                : LOGIN_CREDENTIALS_ERROR;
            return res.render("login", { error });
        }

        let data;
        try {
            data = await response.json();
        } catch {
            delete req.session.token;
            return res.render("login", { error: LOGIN_TEMPORARY_ERROR });
        }

        const token = typeof data?.token === "string" ? data.token.trim() : "";
        if (!token) {
            delete req.session.token;
            return res.render("login", { error: LOGIN_CREDENTIALS_ERROR });
        }

        // Login exitoso: guardar token en sesión
        req.session.token = token;
        res.redirect("/menu");
        
    } catch {
        delete req.session.token;
        res.render("login", { error: LOGIN_TEMPORARY_ERROR });
    }
};
// ============================================
// VISTA 2: MENÚ PRINCIPAL
// ============================================

// GET /menu - Muestra el menú principal
export const getMenu = (req, res) => {
    return Promise.all([
        fetch(`${API_URL}/usuarios`, { headers: { Authorization: `Bearer ${req.session.token}` } }),
        fetch(`${API_URL}/roles/catalogo`, { headers: { Authorization: `Bearer ${req.session.token}` } }),
        fetch(`${API_URL}/roles/capacidades`, { headers: { Authorization: `Bearer ${req.session.token}` } }),
        fetch(`${API_URL}/planes`, { headers: { Authorization: `Bearer ${req.session.token}` } })
    ]).then(async ([usersResponse, rolesResponse, capabilityResponse, plansResponse]) => {
        if ([usersResponse, rolesResponse, capabilityResponse, plansResponse].some((response) => response.status === 401)) return destroySessionAndRedirect(req, res);
        let permissions = [];
        if (capabilityResponse.ok) permissions = (await capabilityResponse.json()).permissions ?? [];
        return res.render("menu", {
            canManageUsers: usersResponse.status === 200 && permissions.includes('M01.users.read'),
            canManageRoles: rolesResponse.status === 200 && permissions.some((permission) =>
                ['M01.roles.read', 'M01.permissions.read', 'M01.requests.read', 'M01.assignments.read'].includes(permission)),
            canReadPlans: plansResponse.status === 200 && permissions.includes('M03.plans.read'),
            canReadActivities: permissions.includes('M04.activities.read'),
            canReadReports: permissions.includes('M12.reports.read'),
            canReadFollowup: permissions.includes('M05.followup.read')
        });
    }).catch(() => res.render("menu", { canManageUsers: false, canManageRoles: false, canReadPlans: false, canReadActivities: false, canReadReports: false, canReadFollowup: false }));
};

export const getPlanes = async (req, res) => {
    try {
        const response = await fetch(`${API_URL}/planes`, {
            headers: { Authorization: `Bearer ${req.session.token}` }
        });
        const rejection = await handleApiRejection(response, req, res);
        if (rejection) return rejection;
        if (!response.ok) return res.status(response.status === 403 ? 403 : 503).send(
            response.status === 403 ? "No tienes permiso para consultar los planes." : API_TEMPORARY_ERROR);
        const planes = await response.json();
        const capabilityResponse = await roleApi(req, "/roles/capacidades");
        const capabilityRejection = await handleApiRejection(capabilityResponse, req, res);
        if (capabilityRejection) return capabilityRejection;
        if (!capabilityResponse.ok) return res.status(503).send(API_TEMPORARY_ERROR);
        const permissions = new Set((await capabilityResponse.json()).permissions ?? []);
        return res.render("planes", {
            planes: Array.isArray(planes) ? planes : [],
            canCreatePlans: permissions.has("M03.plans.create"),
            canUpdatePlans: permissions.has("M03.plans.update"),
            canReadActivities: permissions.has("M04.activities.read"),
            csrfToken: ensureRoleCsrf(req),
            notice: req.query?.success === "created" ? "Plan creado correctamente." : req.query?.success === "updated" ? "Plan actualizado correctamente." : null,
            error: req.query?.error ? "No se pudo completar la operación. Revisa los datos y tus permisos." : null
        });
    } catch { return res.status(503).send(API_TEMPORARY_ERROR); }
};

export const getActividades = async (req, res) => {
    try {
        const caps = await roleApi(req, "/roles/capacidades");
        const capRejection = await handleApiRejection(caps, req, res);
        if (capRejection) return capRejection;
        if (!caps.ok) return res.status(503).send(API_TEMPORARY_ERROR);
        const permissions = new Set((await caps.json()).permissions ?? []);
        if (!permissions.has("M04.activities.read")) return res.status(403).send("No tienes permiso para consultar actividades.");
        const query = new URLSearchParams();
        for (const key of ["planId", "estado", "responsable"]) {
            const value = req.query?.[key];
            if (typeof value === "string" && value.trim()) query.set(key, value);
        }
        const activitiesResponse = await roleApi(req, `/actividades${query.size ? `?${query}` : ""}`);
        const activityRejection = await handleApiRejection(activitiesResponse, req, res);
        if (activityRejection) return activityRejection;
        if (!activitiesResponse.ok) return res.status(503).send(API_TEMPORARY_ERROR);
        let plans = [];
        if (permissions.has("M03.plans.read")) {
            const plansResponse = await roleApi(req, "/planes");
            const plansRejection = await handleApiRejection(plansResponse, req, res);
            if (plansRejection) return plansRejection;
            if (plansResponse.ok) plans = await plansResponse.json();
        }
        return res.render("actividades", {
            activities: await activitiesResponse.json(), plans: Array.isArray(plans) ? plans : [],
            canCreate: permissions.has("M04.activities.create") && plans.length > 0,
            canUpdate: permissions.has("M04.activities.update"), csrfToken: ensureRoleCsrf(req),
            filters: req.query ?? {}, error: req.query?.error ? "No se pudo completar la operación." : null,
            notice: req.query?.success ? "La actividad se guardó correctamente." : null
        });
    } catch { return res.status(503).send(API_TEMPORARY_ERROR); }
};

export const getDetalleActividad = async (req, res) => {
    const id = req.params?.id;
    if (!roleId(String(id ?? ""))) return res.status(400).send("Identificador de actividad inválido.");
    try {
        const caps = await roleApi(req, "/roles/capacidades");
        const rejection = await handleApiRejection(caps, req, res);
        if (rejection) return rejection;
        if (!caps.ok) return res.status(503).send(API_TEMPORARY_ERROR);
        const permissions = (await caps.json()).permissions ?? [];
        if (!permissions.includes("M04.activities.read")) return res.status(403).send("No tienes permiso para consultar actividades.");
        const response = await roleApi(req, `/actividades/${id}`);
        const apiRejection = await handleApiRejection(response, req, res);
        if (apiRejection) return apiRejection;
        if (response.status === 404) return res.status(404).send("Actividad no encontrada.");
        if (!response.ok) return res.status(503).send(API_TEMPORARY_ERROR);
        const activity = await response.json();
        let evidences = [];
        if (permissions.includes("M13.evidence.read")) {
            const evidenceResponse = await roleApi(req, `/evidencias/actividad/${id}`);
            const evidenceRejection = await handleApiRejection(evidenceResponse, req, res);
            if (evidenceRejection) return evidenceRejection;
            if (evidenceResponse.ok) evidences = await evidenceResponse.json();
        }
        return res.render("actividad-detalle", { activity, evidences, canReadEvidence: permissions.includes("M13.evidence.read"),
            canUploadEvidence: permissions.includes("M13.evidence.upload"), csrfToken: ensureRoleCsrf(req) });
    } catch { return res.status(503).send(API_TEMPORARY_ERROR); }
};

export const postCrearActividad = async (req, res) => {
    if (!validRoleCsrf(req)) return res.status(403).send("La solicitud del formulario expiró. Recarga la página.");
    const { id_plan, descripcion, responsable, fecha_inicio, fecha_fin, estado } = req.body ?? {};
    try {
        const response = await roleApi(req, "/actividades", { method: "POST", body: { id_plan, descripcion, responsable, fecha_inicio, fecha_fin, estado } });
        const rejection = await handleApiRejection(response, req, res);
        if (rejection) return rejection;
        return res.redirect(response.ok ? "/actividades?success=created" : "/actividades?error=operation_failed");
    } catch { return res.status(503).send(API_TEMPORARY_ERROR); }
};

export const postActualizarActividad = async (req, res) => {
    if (!validRoleCsrf(req)) return res.status(403).send("La solicitud del formulario expiró. Recarga la página.");
    const { id, descripcion, responsable, fecha_inicio, fecha_fin, estado } = req.body ?? {};
    if (!roleId(String(id ?? ""))) return res.redirect("/actividades?error=operation_failed");
    try {
        const response = await roleApi(req, `/actividades/${id}`, { method: "PUT", body: { descripcion, responsable, fecha_inicio, fecha_fin, estado } });
        const rejection = await handleApiRejection(response, req, res);
        if (rejection) return rejection;
        return res.redirect(response.ok ? "/actividades?success=updated" : "/actividades?error=operation_failed");
    } catch { return res.status(503).send(API_TEMPORARY_ERROR); }
};

export const getSeguimiento = async (req, res) => {
    try {
        const caps = await roleApi(req, "/roles/capacidades");
        const rejection = await handleApiRejection(caps, req, res);
        if (rejection) return rejection;
        if (!caps.ok) return res.status(503).send(API_TEMPORARY_ERROR);
        const permissions = new Set((await caps.json()).permissions ?? []);
        if (!permissions.has("M05.followup.read")) return res.status(403).send("No tienes permiso para consultar seguimientos.");
        const periodsResponse = await roleApi(req, "/periodos");
        const periodsRejection = await handleApiRejection(periodsResponse, req, res);
        if (periodsRejection) return periodsRejection;
        if (!periodsResponse.ok) return res.status(503).send(API_TEMPORARY_ERROR);
        const periods = await periodsResponse.json();
        const selectedId = String(req.query?.periodId ?? periods[0]?.id_periodo ?? "");
        let activities = [], history = [], summary = null;
        if (roleId(selectedId)) {
            const [activityResponse, historyResponse, summaryResponse] = await Promise.all([
                roleApi(req, `/periodos/${selectedId}/actividades`),
                roleApi(req, `/periodos/${selectedId}/historial`),
                roleApi(req, `/periodos/${selectedId}/resumen`)
            ]);
            for (const response of [activityResponse, historyResponse, summaryResponse]) {
                const result = await handleApiRejection(response, req, res);
                if (result) return result;
                if (!response.ok) return res.status(503).send(API_TEMPORARY_ERROR);
            }
            activities = (await activityResponse.json()).activities ?? [];
            history = await historyResponse.json();
            summary = await summaryResponse.json();
        }
        return res.render("seguimiento", { periods, selectedId, activities, history, summary,
            canCreate: permissions.has("M05.followup.create"), canApprove: permissions.has("M05.followup.approve"),
            canManagePeriods: permissions.has("M05.followup.update"), csrfToken: ensureRoleCsrf(req),
            error: req.query?.error ? "No se pudo completar la operación. Verifica el período y los datos." : null,
            notice: req.query?.success ? "La operación se completó correctamente." : null });
    } catch { return res.status(503).send(API_TEMPORARY_ERROR); }
};

export const postCrearPeriodo = async (req, res) => {
    if (!validRoleCsrf(req)) return res.status(403).send("La solicitud del formulario expiró. Recarga la página.");
    const { anio, trimestre, fecha_inicio, fecha_fin } = req.body ?? {};
    try {
        const response = await roleApi(req, "/periodos", { method: "POST", body: { anio, trimestre, fecha_inicio, fecha_fin } });
        const rejection = await handleApiRejection(response, req, res);
        if (rejection) return rejection;
        return res.redirect(response.ok ? "/seguimiento?success=period_created" : `/seguimiento?error=period&periodId=${encodeURIComponent(req.body?.id_periodo ?? "")}`);
    } catch { return res.status(503).send(API_TEMPORARY_ERROR); }
};

export const postCerrarPeriodo = async (req, res) => {
    if (!validRoleCsrf(req)) return res.status(403).send("La solicitud del formulario expiró. Recarga la página.");
    const id = req.body?.id_periodo;
    if (!roleId(String(id ?? ""))) return res.redirect("/seguimiento?error=period");
    try {
        const response = await roleApi(req, `/periodos/${id}/cierre`, { method: "POST", body: {} });
        const rejection = await handleApiRejection(response, req, res);
        if (rejection) return rejection;
        return res.redirect(`/seguimiento?periodId=${encodeURIComponent(id)}&${response.ok ? "success=period_closed" : "error=period"}`);
    } catch { return res.status(503).send(API_TEMPORARY_ERROR); }
};

export const postCrearSeguimiento = async (req, res) => {
    if (!validRoleCsrf(req)) return res.status(403).send("La solicitud del formulario expiró. Recarga la página.");
    const { id_actividad, id_periodo, porcentaje, observaciones } = req.body ?? {};
    if (!roleId(String(id_actividad ?? "")) || !roleId(String(id_periodo ?? ""))) return res.redirect("/seguimiento?error=followup");
    try {
        const response = await roleApi(req, `/actividades/${id_actividad}/seguimientos`, { method: "POST", body: { id_periodo, porcentaje, observaciones: observaciones || null } });
        const rejection = await handleApiRejection(response, req, res);
        if (rejection) return rejection;
        return res.redirect(`/seguimiento?periodId=${encodeURIComponent(id_periodo)}&${response.ok ? "success=submitted" : "error=followup"}`);
    } catch { return res.status(503).send(API_TEMPORARY_ERROR); }
};

export const postDecisionSeguimiento = async (req, res) => {
    if (!validRoleCsrf(req)) return res.status(403).send("La solicitud del formulario expiró. Recarga la página.");
    const { id_seguimiento, id_periodo, resultado, motivo } = req.body ?? {};
    if (!roleId(String(id_seguimiento ?? "")) || !roleId(String(id_periodo ?? ""))) return res.redirect("/seguimiento?error=decision");
    try {
        const response = await roleApi(req, `/seguimientos/${id_seguimiento}/decision`, { method: "POST", body: { resultado, motivo } });
        const rejection = await handleApiRejection(response, req, res);
        if (rejection) return rejection;
        return res.redirect(`/seguimiento?periodId=${encodeURIComponent(id_periodo)}&${response.ok ? "success=decision" : "error=decision"}`);
    } catch { return res.status(503).send(API_TEMPORARY_ERROR); }
};

export const postCargarEvidencia = async (req, res) => {
    if (!validRoleCsrf(req)) return res.status(403).json({ error: "La solicitud del formulario expiró. Recarga la página." });
    const { id_actividad, nombre_original, mime_type, contenido_base64, observaciones } = req.body ?? {};
    if (!roleId(String(id_actividad ?? ""))) return res.status(400).json({ error: "Actividad inválida." });
    try {
        const response = await roleApi(req, "/evidencias", { method: "POST", body: { id_actividad, nombre_original, mime_type, contenido_base64, observaciones } });
        const rejection = await handleApiRejection(response, req, res);
        if (rejection) return rejection;
        if (!response.ok) return res.status(response.status === 400 ? 400 : response.status === 409 ? 409 : 503).json({ error: "No se pudo almacenar la evidencia." });
        return res.status(201).json({ success: true });
    } catch { return res.status(503).json({ error: API_TEMPORARY_ERROR }); }
};

export const getDescargarEvidencia = async (req, res) => {
    const id = req.params?.id;
    if (!roleId(String(id ?? ""))) return res.status(400).send("Identificador de evidencia inválido.");
    try {
        const response = await roleApi(req, `/evidencias/${id}/descarga`);
        const rejection = await handleApiRejection(response, req, res);
        if (rejection) return rejection;
        if (response.status === 404) return res.status(404).send("Evidencia no encontrada.");
        if (!response.ok) return res.status(503).send(API_TEMPORARY_ERROR);
        res.status(200);
        res.setHeader("Content-Type", response.headers.get("content-type") || "application/octet-stream");
        res.setHeader("Content-Disposition", response.headers.get("content-disposition") || `attachment; filename="evidencia-${id}"`);
        return res.send(Buffer.from(await response.arrayBuffer()));
    } catch { return res.status(503).send(API_TEMPORARY_ERROR); }
};

export const getInformes = async (req, res) => {
    try {
        const caps = await roleApi(req, "/roles/capacidades");
        const rejection = await handleApiRejection(caps, req, res);
        if (rejection) return rejection;
        if (!caps.ok) return res.status(503).send(API_TEMPORARY_ERROR);
        const permissions = new Set((await caps.json()).permissions ?? []);
        if (!permissions.has("M12.reports.read")) return res.status(403).send("No tienes permiso para consultar informes.");
        const query = new URLSearchParams();
        for (const key of ["planId", "trimestre"]) {
            const value = req.query?.[key];
            if (typeof value === "string" && value.trim()) query.set(key, value);
        }
        const response = await roleApi(req, `/informes/calificaciones${query.size ? `?${query}` : ""}`);
        const apiRejection = await handleApiRejection(response, req, res);
        if (apiRejection) return apiRejection;
        if (!response.ok) return res.status(503).send(API_TEMPORARY_ERROR);
        let plans = [];
        if (permissions.has("M03.plans.read")) {
            const plansResponse = await roleApi(req, "/planes");
            const plansRejection = await handleApiRejection(plansResponse, req, res);
            if (plansRejection) return plansRejection;
            if (plansResponse.ok) plans = await plansResponse.json();
        }
        let followupPeriods = [], followupSummary = null, selectedFollowupPeriodId = "";
        const canReadFollowup = permissions.has("M05.followup.read");
        if (canReadFollowup) {
            const periodsResponse = await roleApi(req, "/periodos");
            const periodsRejection = await handleApiRejection(periodsResponse, req, res);
            if (periodsRejection) return periodsRejection;
            if (!periodsResponse.ok) return res.status(503).send(API_TEMPORARY_ERROR);
            followupPeriods = await periodsResponse.json();
            selectedFollowupPeriodId = String(req.query?.periodId ?? followupPeriods[0]?.id_periodo ?? "");
            if (roleId(selectedFollowupPeriodId)) {
                const summaryResponse = await roleApi(req, `/informes/seguimiento?periodId=${encodeURIComponent(selectedFollowupPeriodId)}`);
                const summaryRejection = await handleApiRejection(summaryResponse, req, res);
                if (summaryRejection) return summaryRejection;
                if (!summaryResponse.ok) return res.status(503).send(API_TEMPORARY_ERROR);
                followupSummary = await summaryResponse.json();
            }
        }
        return res.render("informes", { records: await response.json(), plans: Array.isArray(plans) ? plans : [], filters: req.query ?? {}, filterQuery: query.toString(), canExport: permissions.has("M12.reports.export"), canReadFollowup, followupPeriods, followupSummary, selectedFollowupPeriodId });
    } catch { return res.status(503).send(API_TEMPORARY_ERROR); }
};

export const getInformeCsv = async (req, res) => {
    try {
        const caps = await roleApi(req, "/roles/capacidades");
        const rejection = await handleApiRejection(caps, req, res);
        if (rejection) return rejection;
        if (!caps.ok || !(await caps.json()).permissions?.includes("M12.reports.export")) return res.status(403).send("No tienes permiso para exportar informes.");
        const query = new URLSearchParams();
        for (const key of ["planId", "trimestre"]) {
            const value = req.query?.[key];
            if (typeof value === "string" && value.trim()) query.set(key, value);
        }
        const response = await roleApi(req, `/informes/calificaciones/export.csv${query.size ? `?${query}` : ""}`);
        const apiRejection = await handleApiRejection(response, req, res);
        if (apiRejection) return apiRejection;
        if (!response.ok) return res.status(503).send(API_TEMPORARY_ERROR);
        const csv = await response.text();
        return res.type("text/csv; charset=utf-8").attachment("calificaciones.csv").send(csv);
    } catch { return res.status(503).send(API_TEMPORARY_ERROR); }
};

export const postCrearPlan = async (req, res) => {
    if (!validRoleCsrf(req)) return res.status(403).send("La solicitud del formulario expiró. Recarga la página.");
    const { nombre, descripcion } = req.body ?? {};
    try {
        const response = await roleApi(req, "/planes", { method: "POST", body: { nombre, descripcion: descripcion || null } });
        const rejection = await handleApiRejection(response, req, res);
        if (rejection) return rejection;
        if (!response.ok) return res.redirect("/planes?error=operation_failed");
        return res.redirect("/planes?success=created");
    } catch { return res.status(503).send(API_TEMPORARY_ERROR); }
};

export const postActualizarPlan = async (req, res) => {
    if (!validRoleCsrf(req)) return res.status(403).send("La solicitud del formulario expiró. Recarga la página.");
    const { id, nombre, descripcion } = req.body ?? {};
    if (!roleId(String(id ?? ""))) return res.redirect("/planes?error=operation_failed");
    try {
        const response = await roleApi(req, `/planes/${id}`, { method: "PUT", body: { nombre, descripcion: descripcion || null } });
        const rejection = await handleApiRejection(response, req, res);
        if (rejection) return rejection;
        if (!response.ok) return res.redirect("/planes?error=operation_failed");
        return res.redirect("/planes?success=updated");
    } catch { return res.status(503).send(API_TEMPORARY_ERROR); }
};

// GET /logout - Cierra la sesión
export const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) console.error("No se pudo cerrar la sesión.");
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

        const rejection = await handleApiRejection(response, req, res);
        if (rejection) return rejection;

        if (!response.ok) {
            return res.status(503).send(API_TEMPORARY_ERROR);
        }

        const usuarios = await response.json();
        const capabilityResponse = await roleApi(req, "/roles/capacidades");
        const capabilityRejection = await handleApiRejection(capabilityResponse, req, res);
        if (capabilityRejection) return capabilityRejection;
        if (!capabilityResponse.ok) return res.status(503).send(API_TEMPORARY_ERROR);
        const permissions = (await capabilityResponse.json()).permissions ?? [];
        let canReadRoles = permissions.includes('M01.roles.read');
        if (canReadRoles) {
            const catalogResponse = await roleApi(req, "/roles/catalogo");
            const catalogRejection = await handleApiRejection(catalogResponse, req, res);
            if (catalogRejection) return catalogRejection;
            canReadRoles = catalogResponse.ok;
        }
        let canReadPlans = permissions.includes('M03.plans.read');
        if (canReadPlans) {
            const plansResponse = await roleApi(req, "/planes");
            const plansRejection = await handleApiRejection(plansResponse, req, res);
            if (plansRejection) return plansRejection;
            canReadPlans = plansResponse.ok;
        }
        return res.render("listar", { usuarios, csrfToken: ensureRoleCsrf(req),
            canCreateUsers: permissions.includes('M01.users.create'), canUpdateUsers: permissions.includes('M01.users.update'),
            canDeactivateUsers: permissions.includes('M01.users.deactivate'), canReadRoles, canReadPlans });

    } catch {
        return res.status(503).send(API_TEMPORARY_ERROR);
    }
};
// ============================================
// VISTA 4: CREAR REGISTRO
// ============================================

// GET /usuarios/nuevo - Muestra formulario de creación
export const getNuevoUsuario = async (req, res) => {
    try {
        const capabilityResponse = await roleApi(req, "/roles/capacidades");
        const rejection = await handleApiRejection(capabilityResponse, req, res);
        if (rejection) return rejection;
        if (!capabilityResponse.ok) return res.status(503).send(API_TEMPORARY_ERROR);
        if (!(await capabilityResponse.json()).permissions?.includes('M01.users.create')) return res.status(403).send("No tienes permiso para crear usuarios.");
        return res.render("crear", { error: null, csrfToken: ensureRoleCsrf(req) });
    } catch { return res.status(503).send(API_TEMPORARY_ERROR); }
};

// POST /usuarios/crear - Procesa la creación
export const postCrearUsuario = async (req, res) => {
    if (!validRoleCsrf(req)) return res.status(403).send("La solicitud del formulario expiró. Recarga la página.");
    const { nombre, email, password, reason } = req.body ?? {};
    try {
        const response = await fetch(`${API_URL}/usuarios`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${req.session.token}` },
            body: JSON.stringify({ nombre, email, password, reason })
        });
        const rejection = await handleApiRejection(response, req, res);
        if (rejection) return rejection;
        if (!response.ok) return res.status(response.status === 403 ? 403 : response.status >= 500 ? 503 : 400)
            .render("crear", { error: "No se pudo crear el usuario. Verifica los datos y tus permisos.", csrfToken: ensureRoleCsrf(req) });
        return res.redirect("/usuarios");
    } catch {
        return res.status(503).render("crear", { error: API_TEMPORARY_ERROR, csrfToken: ensureRoleCsrf(req) });
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

        const rejection = await handleApiRejection(response, req, res);
        if (rejection) return rejection;

        if (!response.ok) {
            return res.redirect("/usuarios");
        }

        const usuario = await response.json();
        const capabilityResponse = await roleApi(req, "/roles/capacidades");
        const capabilityRejection = await handleApiRejection(capabilityResponse, req, res);
        if (capabilityRejection) return capabilityRejection;
        if (!capabilityResponse.ok) return res.status(503).send(API_TEMPORARY_ERROR);
        if (!(await capabilityResponse.json()).permissions?.includes('M01.users.update')) return res.status(403).send("No tienes permiso para editar usuarios.");
        return res.render("editar", { usuario, error: null, csrfToken: ensureRoleCsrf(req) });

    } catch {
        return res.status(503).send(API_TEMPORARY_ERROR);
    }
};

// POST /usuarios/editar - Procesa la actualización
export const postEditarUsuario = async (req, res) => {
    if (!validRoleCsrf(req)) return res.status(403).send("La solicitud del formulario expiró. Recarga la página.");
    const { id, nombre, email, reason } = req.body;
    
    try {
        const response = await fetch(`${API_URL}/usuarios/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${req.session.token}`
            },
            body: JSON.stringify({ nombre, email, reason })
        });

        const rejection = await handleApiRejection(response, req, res);
        if (rejection) return rejection;

        if (!response.ok) {
            const usuario = { id, nombre, email };
            const error = [400, 422].includes(response.status)
                ? "Revisa los datos ingresados e inténtalo de nuevo."
                : "No se pudo actualizar el usuario. Inténtalo de nuevo.";
            return res.render("editar", { usuario, error, csrfToken: ensureRoleCsrf(req) });
        }

        res.redirect("/usuarios");

    } catch {
        return res.status(503).send(API_TEMPORARY_ERROR);
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
    if (!validRoleCsrf(req)) return res.status(403).send("La solicitud del formulario expiró. Recarga la página.");
    const { id, reason } = req.body;
    
    try {
        const response = await fetch(`${API_URL}/usuarios/${id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${req.session.token}` },
            body: JSON.stringify({ reason })
        });

        if (response.status === 503) {
            return res.status(503).send("La gesti\u00f3n de usuarios no est\u00e1 disponible temporalmente.");
        }

        const rejection = await handleApiRejection(response, req, res);
        if (rejection) return rejection;

        if (!response.ok) {
            console.error("Error al eliminar usuario");
        }

        res.redirect("/usuarios");

    } catch {
        return res.status(503).send(API_TEMPORARY_ERROR);
    }
};

export const postReactivarUsuario = async (req, res) => {
    if (!validRoleCsrf(req)) return res.status(403).send("La solicitud del formulario expiró. Recarga la página.");
    const { id, reason } = req.body ?? {};
    try {
        const response = await fetch(`${API_URL}/usuarios/${id}/reactivacion`, {
            method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${req.session.token}` },
            body: JSON.stringify({ reason })
        });
        const rejection = await handleApiRejection(response, req, res);
        if (rejection) return rejection;
        if (!response.ok) return res.status(response.status >= 500 ? 503 : 400).send("No se pudo reactivar el usuario.");
        return res.redirect("/usuarios");
    } catch { return res.status(503).send(API_TEMPORARY_ERROR); }
};

function ensureRoleCsrf(req) {
    if (!req.session.roleCsrfToken) req.session.roleCsrfToken = randomBytes(32).toString("base64url");
    return req.session.roleCsrfToken;
}

function validRoleCsrf(req) {
    const expected = req.session?.roleCsrfToken;
    const supplied = req.body?.csrfToken;
    if (typeof expected !== "string" || typeof supplied !== "string") return false;
    const left = Buffer.from(expected);
    const right = Buffer.from(supplied);
    return left.length === right.length && timingSafeEqual(left, right);
}

async function roleApi(req, path, { method = "GET", body } = {}) {
    const options = { method, headers: { Authorization: `Bearer ${req.session.token}` } };
    if (body !== undefined) {
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(body);
    }
    return fetch(`${API_URL}${path}`, options);
}

async function rolePost(req, res, path, body) {
    if (!validRoleCsrf(req)) return res.status(403).send("La solicitud del formulario expiró. Recarga la página.");
    try {
        const response = await roleApi(req, path, { method: "POST", body });
        const rejection = await handleApiRejection(response, req, res);
        if (rejection) return rejection;
        if (!response.ok) return res.redirect("/roles?error=operation_failed");
        return res.redirect("/roles");
    } catch {
        return res.status(503).send(API_TEMPORARY_ERROR);
    }
}

function formBoolean(value) { return value === "true"; }
function roleId(value) { return typeof value === "string" && /^[1-9]\d{0,9}$/.test(value) && Number(value) <= 2147483647; }

export const getRoleAdministration = async (req, res) => {
    try {
        const capabilityResponse = await roleApi(req, "/roles/capacidades");
        const capabilityRejection = await handleApiRejection(capabilityResponse, req, res);
        if (capabilityRejection) return capabilityRejection;
        if (!capabilityResponse.ok) return res.status(503).send(API_TEMPORARY_ERROR);
        const permissions = new Set((await capabilityResponse.json()).permissions ?? []);
        const canReadRoles = permissions.has('M01.roles.read');
        const canReadPermissions = permissions.has('M01.permissions.read');
        const canReadRequests = permissions.has('M01.requests.read');
        const canReadAssignments = permissions.has('M01.assignments.read');
        if (!canReadRoles && !canReadPermissions && !canReadRequests && !canReadAssignments) return res.status(403).send("No tienes permiso para consultar la administraciÃ³n de roles.");
        const [catalogResponse, permissionResponse, requestResponse] = await Promise.all([
            canReadRoles ? roleApi(req, "/roles/catalogo") : null,
            canReadPermissions ? roleApi(req, "/roles/permisos") : null,
            canReadRequests ? roleApi(req, "/roles/solicitudes") : null
        ]);
        for (const response of [catalogResponse, permissionResponse, requestResponse].filter(Boolean)) {
            const rejection = await handleApiRejection(response, req, res);
            if (rejection) return rejection;
            if (!response.ok) return res.status(response.status === 404 ? 503 : response.status).send(
                response.status === 403 ? "No tienes permiso para consultar la administración de roles." : API_TEMPORARY_ERROR);
        }
        const [catalog, permissionCatalog, requests] = await Promise.all([
            catalogResponse ? catalogResponse.json() : { roles: [] },
            permissionResponse ? permissionResponse.json() : { permissions: [] },
            requestResponse ? requestResponse.json() : { requests: [] }
        ]);
        const userId = req.query?.userId;
        let assignments = [];
        if (canReadAssignments && roleId(String(userId ?? ""))) {
            const assignmentResponse = await roleApi(req, `/roles/usuarios/${userId}/asignaciones`);
            const rejection = await handleApiRejection(assignmentResponse, req, res);
            if (rejection) return rejection;
            if (assignmentResponse.ok) assignments = (await assignmentResponse.json()).assignments ?? [];
        }
        const csrfToken = ensureRoleCsrf(req);
        const data = { roles: catalog.roles ?? [], permissions: permissionCatalog.permissions ?? [],
            requests: requests.requests ?? [], assignments, selectedUserId: userId ?? "", csrfToken,
            capabilities: Object.freeze(Object.fromEntries([...permissions].map((code) => [code, true]))),
            error: req.query?.error === "operation_failed" ? "No se pudo completar el cambio. Verifica los datos y los permisos." : null };
        res.locals.roleAdminData = data;
        return res.render("role-admin", data);
    } catch {
        return res.status(503).send(API_TEMPORARY_ERROR);
    }
};

export const postCreateRole = (req, res) => {
    const body = req.body ?? {};
    return rolePost(req, res, "/roles/catalogo", {
        name: body.name, description: body.description || null, classification: body.classification,
        requiresScope: formBoolean(body.requiresScope), allowOpenEndedAssignment: formBoolean(body.allowOpenEndedAssignment), reason: body.reason
    });
};

export const postRoleConfiguration = (req, res) => {
    const body = req.body ?? {};
    if (!roleId(body.roleId)) return res.status(400).send("Identificador de rol inválido.");
    return rolePost(req, res, `/roles/catalogo/${body.roleId}/configuracion`, {
        classification: body.classification, requiresScope: formBoolean(body.requiresScope),
        allowOpenEndedAssignment: formBoolean(body.allowOpenEndedAssignment), reason: body.reason
    });
};

export const postRolePermissions = (req, res) => {
    const body = req.body ?? {};
    if (!roleId(body.roleId)) return res.status(400).send("Identificador de rol inválido.");
    const raw = body.permissionCodes;
    const permissionCodes = raw == null ? [] : Array.isArray(raw) ? raw : [raw];
    return rolePost(req, res, `/roles/catalogo/${body.roleId}/permisos`, { permissionCodes, reason: body.reason });
};

export const postPermissionState = (req, res) => {
    const body = req.body ?? {};
    return rolePost(req, res, `/roles/permisos/${encodeURIComponent(body.code ?? "")}/estado`, {
        active: formBoolean(body.active), reason: body.reason
    });
};

export const postRoleAssignment = (req, res) => {
    const body = req.body ?? {};
    let scopeRef = null;
    if (body.scopeRef !== "") {
        if (body.scopeKind === "number") {
            if (!/^[1-9]\d*$/.test(body.scopeRef ?? "") || !Number.isSafeInteger(Number(body.scopeRef))) return res.status(400).send("Referencia de ámbito inválida.");
            scopeRef = Number(body.scopeRef);
        } else if (body.scopeKind === "string" && typeof body.scopeRef === "string" && body.scopeRef.trim() !== "") {
            scopeRef = body.scopeRef;
        } else return res.status(400).send("Selecciona el tipo exacto de ámbito.");
    }
    return rolePost(req, res, "/roles/asignaciones", {
        targetUserId: body.targetUserId, roleId: body.roleId, scopeRef,
        validFrom: body.validFrom || undefined, validUntil: body.validUntil || null, reason: body.reason
    });
};

export const postRoleRevocation = (req, res) => {
    const body = req.body ?? {};
    if (typeof body.assignmentId !== "string") return res.status(400).send("Identificador de asignación inválido.");
    return rolePost(req, res, `/roles/asignaciones/${encodeURIComponent(body.assignmentId)}/revocacion`, { reason: body.reason });
};

export const postRoleDecision = (req, res) => {
    const body = req.body ?? {};
    if (typeof body.requestId !== "string") return res.status(400).send("Identificador de solicitud inválido.");
    return rolePost(req, res, `/roles/solicitudes/${encodeURIComponent(body.requestId)}/decision`, {
        decision: body.decision, reason: body.reason
    });
};

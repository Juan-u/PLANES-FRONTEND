import { createPlanWorkflowViews } from './plan-workflow.views.js';
import {createInstitutionalReportViews} from './institutional-reports.views.js';
import { institutionalBody, retainDraft, recoveredRecord } from './institutional-form.js';
import fetch from "node-fetch";
import {backendApiUrl} from '../services/runtime-config.js';
import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { createWeatherService } from "../services/weather.service.js";

const API_URL = backendApiUrl();
const weatherService = createWeatherService({ apiKey: process.env.OPEN_METEO_API_KEY, fetchImpl: fetch, defaultCity: process.env.WEATHER_CITY || "Villavicencio, Meta, Colombia", latitude: process.env.WEATHER_LATITUDE || "-4.142", longitude: process.env.WEATHER_LONGITUDE || "-73.626" });

function navigationFor(permissions = []) {
    const values = new Set(permissions);
    const canReadInternalControl = ['M15.audit.read', 'M03.plans.read', 'M04.activities.read', 'M05.followup.read']
        .every((permission) => values.has(permission));
    return { ...(canReadInternalControl ? { internalControl: true } : {}), plans: values.has("M03.plans.read"), activities: values.has("M04.activities.read"), followup: values.has("M05.followup.read"), reports: values.has("M12.reports.read"), users: values.has("M01.users.read"), roles: ["M01.roles.read", "M01.permissions.read", "M01.requests.read", "M01.assignments.read"].some((permission) => values.has(permission)) };
}

export async function getWeather(req, res) {
    const city = typeof req.query?.city === "string" ? req.query.city : "";
    if (city.length > 100 || /[<>\u0000-\u001f]/.test(city)) return res.status(400).json({ available: false });
    return res.json(await weatherService.current(city));
}

export function convertCsvToExcelSemicolon(csv) {
    const source = String(csv ?? "").replace(/^\uFEFF/, "");
    const rows = [];
    let row = [], field = "", quoted = false;
    for (let index = 0; index < source.length; index++) {
        const character = source[index];
        if (quoted) {
            if (character === '"' && source[index + 1] === '"') { field += '"'; index++; }
            else if (character === '"') quoted = false;
            else field += character;
        } else if (character === '"' && field.length === 0) quoted = true;
        else if (character === ',') { row.push(field); field = ""; }
        else if (character === "\r" || character === "\n") {
            row.push(field); rows.push(row); row = []; field = "";
            if (character === "\r" && source[index + 1] === "\n") index++;
        } else field += character;
    }
    if (field.length || row.length || rows.length === 0) { row.push(field); rows.push(row); }
    const output = rows.map((values) => values.map((value) => `"${value.replaceAll('"', '""')}"`).join(";")).join("\r\n");
    return `\uFEFF${output}`;
}
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

async function handleApiRejection(response, req, res, { notFoundMessage = "No se encontró la información solicitada." } = {}) {
    if (response.status === 401) {
        return destroySessionAndRedirect(req, res);
    }

    if (response.status === 403) {
        return res.status(403).send("No tienes permiso para realizar esta operación.");
    }

    if (response.status === 404) {
        return res.status(404).send(notFoundMessage);
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
export const getMenu = async (req, res) => {
    let sessionExpired = false;
    const query = async (path, validate = null) => {
        try {
            const response = await roleApi(req, path);
            if (response.status === 401) { sessionExpired = true; return { state: "error" }; }
            if (response.status === 403) return { state: "forbidden" };
            if (!response.ok) return { state: "error" };
            if (!validate) return { state: "ok" };
            const data = await response.json();
            return validate(data) ? { state: "ok", data } : { state: "error" };
        } catch { return { state: "error" }; }
    };
    const capabilities = await query("/roles/capacidades", (data) => Array.isArray(data?.permissions) && data.permissions.every((value) => typeof value === "string"));
    if (sessionExpired) return destroySessionAndRedirect(req, res);
    const nav = navigationFor(capabilities.data?.permissions ?? []);
    const skipped = { state: "forbidden" };
    const [users, roles, plans, activities, periods] = await Promise.all([
        nav.users ? query("/usuarios") : skipped,
        nav.roles ? query("/roles/catalogo") : skipped,
        nav.plans ? query("/planes", Array.isArray) : skipped,
        nav.activities ? query("/actividades", Array.isArray) : skipped,
        nav.followup ? query("/periodos", Array.isArray) : skipped
    ]);
    let followup = { state: periods.state === "ok" ? "unavailable" : periods.state };
    if (periods.data?.[0]?.id_periodo) {
        followup = await query(`/informes/seguimiento?periodId=${encodeURIComponent(periods.data[0].id_periodo)}`,
            (data) => data !== null && typeof data === "object" && !Array.isArray(data));
    }
    if (sessionExpired) return destroySessionAndRedirect(req, res);
    let followupPeriod = null;
    const period = followup.data?.period;
    const year = Number(period?.anio), quarter = Number(period?.trimestre);
    const isPeriodNumber = (value) => typeof value === "number" || (typeof value === "string" && /^\d+$/.test(value));
    if (followup.state === "ok" && period?.id_periodo != null &&
        String(period.id_periodo) === String(periods.data?.[0]?.id_periodo) &&
        isPeriodNumber(period.anio) && isPeriodNumber(period.trimestre) &&
        Number.isInteger(year) && year >= 1000 && year <= 9999 &&
        Number.isInteger(quarter) && quarter >= 1 && quarter <= 4) {
        followupPeriod = { year, quarter };
    }
    const metrics = { plans: null, activities: null, pendingFollowups: null, approvedProgress: null, coverage: null };
    const metricStates = {};
    for (const [key, result] of [["plans", plans], ["activities", activities]]) {
        metricStates[key] = result.state;
        if (result.state === "ok") {
            metrics[key] = result.data.length;
            if (result.data.length === 0) metricStates[key] = "empty";
        }
    }
    for (const [key, value] of [
        ["pendingFollowups", followup.data?.activitiesPending],
        ["approvedProgress", followup.data?.summary?.promedioAvance],
        ["coverage", followup.data?.summary?.coberturaTrimestral]
    ]) {
        const available = (typeof value === "number" && Number.isFinite(value)) ||
            (key !== "pendingFollowups" && typeof value?.explicacion === "string");
        metricStates[key] = followup.state === "ok" && !available ? "unavailable" : followup.state;
        if (followup.state === "ok" && available) metrics[key] = value;
    }
    return res.render("menu", {
        canManageUsers: nav.users && users.state === "ok", canManageRoles: nav.roles && roles.state === "ok",
        canReadPlans: nav.plans && plans.state !== "forbidden", canReadActivities: nav.activities && activities.state !== "forbidden",
        canReadFollowup: nav.followup, canReadReports: nav.reports, navigation: nav, metrics, metricStates, followupPeriod,
        dashboardError: capabilities.state !== "ok" ? "No fue posible consultar los permisos de tu cuenta. Intenta recargar la página." : null
    });
};

export const getPlanes = async (req, res) => {
    if (req.query?.discardDraft === '1' && req.session.recordDraft?.kind === 'plan') delete req.session.recordDraft;
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
        let processes = [], catalogUnavailable = false, workflowAvailable = false;
        try {
            const catalog = await roleApi(req, "/planes/catalogo-institucional");
            const catalogRejection = await handleApiRejection(catalog, req, res);
            if (catalogRejection) return catalogRejection;
            if (catalog.ok) { const data = await catalog.json(); processes = Array.isArray(data.procesos) ? data.procesos : []; workflowAvailable = data.workflowAvailable === true; }
            else catalogUnavailable = true;
        } catch { catalogUnavailable = true; }
        return res.render("planes", {
            planes: (Array.isArray(planes) ? planes : []).map(p => String(p.id_plan) === recoveredRecord(req, 'plan')?.id ? { ...p, ...recoveredRecord(req, 'plan') } : p),
            recordRecovery: recoveredRecord(req, 'plan'), processes, catalogUnavailable, workflowAvailable,
            canCreatePlans: permissions.has("M03.plans.create"),
            canUpdatePlans: permissions.has("M03.plans.update"),
            canReadActivities: permissions.has("M04.activities.read"),
            navigation: navigationFor([...permissions]),
            csrfToken: ensureRoleCsrf(req),
            notice: req.query?.success === "created" ? "Plan creado correctamente." : req.query?.success === "updated" ? "Plan actualizado correctamente." : null,
            error: req.session.recordDraft?.kind === 'plan' ? req.session.recordDraft.message : req.query?.error ? "No se pudo completar la operación. Revisa los datos y tus permisos." : null
        });
    } catch { return res.status(503).send(API_TEMPORARY_ERROR); }
};

export const getActividades = async (req, res) => {
    if (req.query?.discardDraft === '1' && req.session.recordDraft?.kind === 'actividad') delete req.session.recordDraft;
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
            activities: (await activitiesResponse.json()).map(a => String(a.id_actividad) === recoveredRecord(req, 'actividad')?.id ? { ...a, ...recoveredRecord(req, 'actividad') } : a),
            recordRecovery: recoveredRecord(req, 'actividad'), plans: Array.isArray(plans) ? plans : [],
            canCreate: permissions.has("M04.activities.create") && plans.length > 0,
            canUpdate: permissions.has("M04.activities.update"), csrfToken: ensureRoleCsrf(req),
            navigation: navigationFor([...permissions]),
            filters: req.query ?? {}, error: req.session.recordDraft?.kind === 'actividad' ? req.session.recordDraft.message : req.query?.error ? "No se pudo completar la operación." : null,
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
        const apiRejection = await handleApiRejection(response, req, res, { notFoundMessage: "Actividad no encontrada." });
        if (apiRejection) return apiRejection;
        if (!response.ok) return res.status(503).send(API_TEMPORARY_ERROR);
        const activity = await response.json();
        let evidences = [];
        if (permissions.includes("M13.evidence.read")) {
            const evidenceResponse = await roleApi(req, `/evidencias/actividad/${id}`);
            const evidenceRejection = await handleApiRejection(evidenceResponse, req, res);
            if (evidenceRejection) return evidenceRejection;
            if (evidenceResponse.ok) evidences = await evidenceResponse.json();
        }
        let evidenceIntegration=null,quarterlyContext=null,integrationError=null;
        if(permissions.includes('M13.evidence.upload')){try{const options=await roleApi(req,'/evidencias/opciones');if(options.ok){const value=await options.json();if(value.ready)evidenceIntegration=value;}else integrationError=API_TEMPORARY_ERROR;}catch{integrationError=API_TEMPORARY_ERROR;}}
        if(permissions.includes('M05.followup.read')){try{const context=await roleApi(req,'/seguimiento/integrado?activityId='+id);const value=await context.json();if(context.ok&&value.ready)quarterlyContext=value;else if(value.code!=='INTEGRATION_NOT_ACTIVATED')integrationError=API_TEMPORARY_ERROR;}catch{integrationError=API_TEMPORARY_ERROR;}}
        return res.render("actividad-detalle", { activity, evidences,evidenceIntegration,quarterlyContext,evidenceError:req.session.evidenceFlash||integrationError, canReadEvidence: permissions.includes("M13.evidence.read"),
            canUploadEvidence: permissions.includes("M13.evidence.upload"), csrfToken: ensureRoleCsrf(req), navigation: navigationFor(permissions) });
    } catch { return res.status(503).send(API_TEMPORARY_ERROR); }
};

export const postCrearActividad = async (req, res) => {
    if (!validRoleCsrf(req)) return res.status(403).send("La solicitud del formulario expiró. Recarga la página.");
    const { id_plan, descripcion, responsable, fecha_inicio, fecha_fin, estado } = req.body ?? {};
    try {
        const response = await roleApi(req, "/actividades", { method: "POST", body: { ...institutionalBody(req.body, 'actividad'), id_plan, descripcion, responsable, fecha_inicio, fecha_fin, estado } });
        if (!response.ok) retainDraft(req, 'actividad', req.body, response.status);
        else if (req.session.recordDraft?.kind === 'actividad') delete req.session.recordDraft;
        const rejection = await handleApiRejection(response, req, res);
        if (rejection) return rejection;
        return res.redirect(response.ok ? "/actividades?success=created" : "/actividades?error=operation_failed");
    } catch { retainDraft(req, 'actividad', req.body); return res.redirect('/actividades?error=connection'); }
};

export const postActualizarActividad = async (req, res) => {
    if (!validRoleCsrf(req)) return res.status(403).send("La solicitud del formulario expiró. Recarga la página.");
    const { id, descripcion, responsable, fecha_inicio, fecha_fin, estado } = req.body ?? {};
    if (!roleId(String(id ?? ""))) return res.redirect("/actividades?error=operation_failed");
    try {
        const response = await roleApi(req, `/actividades/${id}`, { method: "PUT", body: { ...institutionalBody(req.body, 'actividad'), descripcion, responsable, fecha_inicio, fecha_fin, estado } });
        if (!response.ok) retainDraft(req, 'actividad', req.body, response.status);
        else if (req.session.recordDraft?.kind === 'actividad') delete req.session.recordDraft;
        const rejection = await handleApiRejection(response, req, res);
        if (rejection) return rejection;
        return res.redirect(response.ok ? "/actividades?success=updated" : "/actividades?error=operation_failed");
    } catch { retainDraft(req, 'actividad', req.body); return res.redirect('/actividades?error=connection'); }
};

export const getSeguimiento = async (req, res) => {
    if(req.query?.discardReopen==='1'){delete req.session.reopenDraft;delete req.session.reopenClientId;}
    try {
        const caps = await roleApi(req, "/roles/capacidades");
        const rejection = await handleApiRejection(caps, req, res);
        if (rejection) return rejection;
        if (!caps.ok) return res.status(503).send(API_TEMPORARY_ERROR);
        const permissions = new Set((await caps.json()).permissions ?? []);
        if (!permissions.has("M05.followup.read")) return res.status(403).send("No tienes permiso para consultar seguimientos.");
        const integrationQuery=new URLSearchParams();
        for(const key of ['periodId','planId','activityId','anio','trimestre','estado','after','before'])if(typeof req.query?.[key]==='string'&&req.query[key])integrationQuery.set(key,req.query[key]);
        const integrated=await roleApi(req,'/seguimiento/integrado'+(integrationQuery.size?'?'+integrationQuery:''));
        if(integrated.status===401||integrated.status===403){const denied=await handleApiRejection(integrated,req,res);if(denied)return denied;}
        let integratedData=null;try{integratedData=await integrated.json();}catch{}
        if(integrated.ok&&integratedData?.ready){
            req.session.reopenClientId??=randomUUID();
            return res.render('seguimiento-integrado',{data:integratedData,filters:req.query||{},csrfToken:ensureRoleCsrf(req),navigation:navigationFor([...permissions]),canCreate:permissions.has('M05.followup.create'),canRequestReopen:permissions.has('M05.followup.update'),canUploadEvidence:permissions.has('M13.evidence.upload'),clientId:req.session.reopenClientId,recovery:String(req.session.followupDraft?.id_periodo)===String(integratedData.period?.id_periodo)?req.session.followupDraft:null,reopenRecovery:String(req.session.reopenDraft?.id_periodo)===String(integratedData.period?.id_periodo)?req.session.reopenDraft:null,error:req.query?.error?'No se pudo completar la operación. Conservamos los datos introducidos.':null,notice:req.query?.success?'Solicitud registrada; no equivale a una aprobación institucional.':null});
        }
        if(!integrated.ok&&integratedData?.code!=='INTEGRATION_NOT_ACTIVATED'){
            if(integrated.status===400)return res.status(400).send('Revisa los filtros de la consulta trimestral.');
            if(integrated.status===404)return res.status(404).send('No se encontró la información trimestral solicitada.');
            return res.status(503).send('No se pudo consultar la integración trimestral.');
        }
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
            canCreate: permissions.has("M05.followup.create"), canApprove: false,
            canManagePeriods: false, csrfToken: ensureRoleCsrf(req), navigation: navigationFor([...permissions]),
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
        if(!response.ok)req.session.followupDraft={id_actividad,id_periodo,porcentaje,observaciones};else delete req.session.followupDraft;
        const rejection = await handleApiRejection(response, req, res);
        if (rejection) return rejection;
        return res.redirect(`/seguimiento?periodId=${encodeURIComponent(id_periodo)}&${response.ok ? "success=submitted" : "error=followup"}`);
    } catch { req.session.followupDraft={id_actividad,id_periodo,porcentaje,observaciones};return res.redirect('/seguimiento?error=followup&periodId='+encodeURIComponent(id_periodo)); }
};

export const postDecisionSeguimiento = async (req, res) => {
    if (!validRoleCsrf(req)) return res.status(403).send("La solicitud del formulario expiró. Recarga la página.");
    const { id_seguimiento, id_periodo, resultado, motivo } = req.body ?? {};
    if (!roleId(String(id_seguimiento ?? "")) || !roleId(String(id_periodo ?? ""))) return res.redirect("/seguimiento?error=decision");
    try {
        const response = await roleApi(req, `/seguimientos/${id_seguimiento}/decision`, { method: "POST", body: { resultado, motivo } });
        if (response.status === 403) {
            const payload = await response.json().catch(() => null);
            if (payload?.error === "Quien registró el seguimiento no puede aprobarlo ni rechazarlo.") {
                return res.status(403).send("No puedes aprobar ni rechazar un seguimiento que enviaste. Otra persona autorizada debe revisarlo.");
            }
        }
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
        const rejection = await handleApiRejection(response, req, res, { notFoundMessage: "Evidencia no encontrada." });
        if (rejection) return rejection;
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
        return res.render("informes", { records: await response.json(), plans: Array.isArray(plans) ? plans : [], filters: req.query ?? {}, filterQuery: query.toString(), canExport: permissions.has("M12.reports.export"), canReadFollowup, followupPeriods, followupSummary, selectedFollowupPeriodId, navigation: navigationFor([...permissions]) });
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
        const csv = convertCsvToExcelSemicolon(await response.text());
        return res.type("text/csv; charset=utf-8").attachment("calificaciones.csv").send(csv);
    } catch { return res.status(503).send(API_TEMPORARY_ERROR); }
};

export const postCrearPlan = async (req, res) => {
    if (!validRoleCsrf(req)) return res.status(403).send("La solicitud del formulario expiró. Recarga la página.");
    const { nombre, descripcion } = req.body ?? {};
    try {
        const response = await roleApi(req, "/planes", { method: "POST", body: { ...institutionalBody(req.body, 'plan'), nombre, descripcion: descripcion || null } });
        if (!response.ok) retainDraft(req, 'plan', req.body, response.status);
        else if (req.session.recordDraft?.kind === 'plan') delete req.session.recordDraft;
        const rejection = await handleApiRejection(response, req, res);
        if (rejection) return rejection;
        if (!response.ok) return res.redirect("/planes?error=operation_failed");
        return res.redirect("/planes?success=created");
    } catch { retainDraft(req, 'plan', req.body); return res.redirect('/planes?error=connection'); }
};

export const postActualizarPlan = async (req, res) => {
    if (!validRoleCsrf(req)) return res.status(403).send("La solicitud del formulario expiró. Recarga la página.");
    const { id, nombre, descripcion } = req.body ?? {};
    if (!roleId(String(id ?? ""))) return res.redirect("/planes?error=operation_failed");
    try {
        const response = await roleApi(req, `/planes/${id}`, { method: "PUT", body: { ...institutionalBody(req.body, 'plan'), nombre, descripcion: descripcion || null } });
        if (!response.ok) retainDraft(req, 'plan', req.body, response.status);
        else if (req.session.recordDraft?.kind === 'plan') delete req.session.recordDraft;
        const rejection = await handleApiRejection(response, req, res);
        if (rejection) return rejection;
        if (!response.ok) return res.redirect("/planes?error=operation_failed");
        return res.redirect("/planes?success=updated");
    } catch { retainDraft(req, 'plan', req.body); return res.redirect('/planes?error=connection'); }
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
            canDeactivateUsers: permissions.includes('M01.users.deactivate'), canReadRoles, canReadPlans, navigation: navigationFor(permissions) });

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
        const permissions = (await capabilityResponse.json()).permissions ?? [];
        if (!permissions.includes('M01.users.create')) return res.status(403).send("No tienes permiso para crear usuarios.");
        return res.render("crear", { error: null, csrfToken: ensureRoleCsrf(req), navigation: navigationFor(permissions) });
    } catch { return res.status(503).send(API_TEMPORARY_ERROR); }
};

function userFormValues(body = {}) {
    return Object.fromEntries(["nombre", "email", "reason"].map((key) => [key, typeof body[key] === "string" ? body[key] : ""]));
}

async function renderUserFormError(req, res, view, error, statusCode) {
    let navigation = navigationFor();
    try {
        const response = await roleApi(req, "/roles/capacidades");
        if (response.status === 401) return destroySessionAndRedirect(req, res);
        if (response.ok) {
            const permissions = (await response.json())?.permissions;
            if (Array.isArray(permissions) && permissions.every((value) => typeof value === "string")) navigation = navigationFor(permissions);
        }
    } catch { /* Sin capacidades verificadas, no se muestran accesos adicionales. */ }
    const formValues = userFormValues(req.body);
    return res.status(statusCode).render(view, {
        error, navigation, formValues, csrfToken: ensureRoleCsrf(req),
        ...(view === "editar" ? { usuario: { id: req.body?.id, nombre: formValues.nombre, email: formValues.email } } : {})
    });
}

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
        const rejection = [401, 403].includes(response.status) ? await handleApiRejection(response, req, res) : null;
        if (rejection) return rejection;
        if (!response.ok) return renderUserFormError(req, res, "crear",
            response.status >= 500 ? API_TEMPORARY_ERROR : "No se pudo crear el usuario. Verifica los datos y tus permisos.",
            response.status >= 500 ? 503 : 400);
        return res.redirect("/usuarios");
    } catch {
        return renderUserFormError(req, res, "crear", API_TEMPORARY_ERROR, 503);
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
        const permissions = (await capabilityResponse.json()).permissions ?? [];
        if (!permissions.includes('M01.users.update')) return res.status(403).send("No tienes permiso para editar usuarios.");
        return res.render("editar", { usuario, error: null, csrfToken: ensureRoleCsrf(req), navigation: navigationFor(permissions) });

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

        const rejection = [401, 403].includes(response.status) ? await handleApiRejection(response, req, res) : null;
        if (rejection) return rejection;

        if (!response.ok) {
            const error = [400, 422].includes(response.status)
                ? "Revisa los datos ingresados e inténtalo de nuevo."
                : "No se pudo actualizar el usuario. Inténtalo de nuevo.";
            return renderUserFormError(req, res, "editar", error, response.status >= 500 ? 503 : 400);
        }

        res.redirect("/usuarios");

    } catch {
        return renderUserFormError(req, res, "editar", API_TEMPORARY_ERROR, 503);
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

async function rolePost(req, res, path, body, method = "POST") {
    if (!validRoleCsrf(req)) return res.status(403).send("La solicitud del formulario expiró. Recarga la página.");
    try {
        const response = await roleApi(req, path, { method, body });
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
            navigation: navigationFor([...permissions]),
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
    }, "PUT");
};

export const postRolePermissions = (req, res) => {
    const body = req.body ?? {};
    if (!roleId(body.roleId)) return res.status(400).send("Identificador de rol inválido.");
    const raw = body.permissionCodes;
    const permissionCodes = raw == null ? [] : Array.isArray(raw) ? raw : [raw];
    return rolePost(req, res, `/roles/catalogo/${body.roleId}/permisos`, { permissionCodes, reason: body.reason }, "PUT");
};

export const postPermissionState = (req, res) => {
    const body = req.body ?? {};
    return rolePost(req, res, `/roles/permisos/${encodeURIComponent(body.code ?? "")}/estado`, {
        active: formBoolean(body.active), reason: body.reason
    }, "PUT");
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

const planWorkflowViews=createPlanWorkflowViews({api:roleApi,validCsrf:validRoleCsrf,csrf:ensureRoleCsrf,navigation:navigationFor,reject:handleApiRejection});
const institutionalReports=createInstitutionalReportViews({api:roleApi,validCsrf:validRoleCsrf,csrf:ensureRoleCsrf,navigation:navigationFor,reject:handleApiRejection});
export const getInstitutionalReport=institutionalReports.report;
export const postInstitutionalExport=institutionalReports.exportReport;
export const getInternalControl=institutionalReports.control;
export const getInternalControlContext=institutionalReports.controlContext;
export const postInternalControl=institutionalReports.act;
export const getPlaneacion=planWorkflowViews.list;
export const getPlanGestion=planWorkflowViews.detail;
export const postPlanFicha=planWorkflowViews.saveProfile;
export const postPlanActuacion=planWorkflowViews.act;

export async function postBinaryEvidence(req,res){
    if(!validRoleCsrf({session:req.session,body:{csrfToken:req.headers['x-csrf-token']}}))return res.status(403).json({error:'La solicitud expiró. Recarga la página.'});
    const id=String(req.params?.id||'');if(!roleId(id)||!Buffer.isBuffer(req.body))return res.status(400).json({error:'Archivo o actividad inválidos.'});
    const headers={'Content-Type':'application/octet-stream',Authorization:`Bearer ${req.session.token}`};
    for(const key of ['x-evidence-name','x-evidence-type','x-evidence-notes','x-followup-id'])if(typeof req.headers[key]==='string')headers[key]=req.headers[key];
    try{const response=await fetch(`${API_URL}/actividades/${id}/evidencias`,{method:'POST',headers,body:req.body});
      if(!response.ok)return res.status([400,401,403,404,409,413].includes(response.status)?response.status:503).json({error:response.status===409?'No se puede asociar evidencia a un seguimiento decidido o período cerrado.':response.status===413?'El archivo supera 10 MB.':'No se pudo cargar. Verifica PDF, PNG, JPEG o TXT, contenido, tamaño y permisos.'});
      return res.status(201).json({success:true});
    }catch{return res.status(503).json({error:'No se pudo completar la carga. El formulario conserva tu selección.'});}
}
export async function postLinkEvidence(req,res){
    if(!validRoleCsrf(req))return res.status(403).send('La solicitud expiró.');
    const id=String(req.params?.id||''),activity=String(req.body?.id_actividad||'');if(!roleId(id)||!roleId(activity))return res.status(400).send('Referencia inválida.');
    try{const result=await roleApi(req,`/evidencias/${id}/vinculo`,{method:'POST',body:{id_actividad:activity,id_seguimiento:req.body?.id_seguimiento}});req.session.evidenceFlash=result.ok?null:'No se pudo asociar la evidencia. Comprueba actividad, seguimiento pendiente y período abierto.';}catch{req.session.evidenceFlash='No se pudo conectar. La evidencia existente permanece conservada.';}
    return res.redirect('/actividades/'+activity);
}
export async function postReopenRequest(req,res){
    if(!validRoleCsrf(req))return res.status(403).send('La solicitud expiró.');
    const id=String(req.params?.id||'');if(!roleId(id))return res.status(400).send('Per?odo inválido.');
    const input={motivo:typeof req.body?.motivo==='string'?req.body.motivo:'',client_id:typeof req.body?.client_id==='string'?req.body.client_id:''};
    let ok=false;try{const response=await roleApi(req,`/periodos/${id}/solicitudes-reapertura`,{method:'POST',body:input});ok=response.ok;}catch{}
    if(ok){delete req.session.reopenDraft;delete req.session.reopenClientId;}else req.session.reopenDraft={...input,id_periodo:id};
    return res.redirect('/seguimiento?periodId='+id+(ok?'&success=reopen_requested':'&error=reopen_request'));
}

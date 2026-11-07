const array = value => value == null ? [] : Array.isArray(value) ? value : [value];
export function institutionalBody(body = {}, kind) {
  if (!Object.hasOwn(body, 'institucional')) return {};
  const raw = body.institucional;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { institucional: null };
  const allowed = kind === 'plan'
    ? ['revision','id_proceso','problema','causas','consecuencias','objetivo_general','meta_descripcion','meta_valor','meta_unidad','responsable_principal']
    : ['revision','nombre','resultado_esperado','id_objetivo','id_indicador','metodo_verificacion','prioridad','evidencias_esperadas','observaciones','instrucciones'];
  const draft = Object.fromEntries(allowed.filter(k => Object.hasOwn(raw, k)).map(k => [k, raw[k]]));
  if (kind === 'plan' && raw.indicador && typeof raw.indicador === 'object' && !Array.isArray(raw.indicador)) {
    draft.indicador = Object.fromEntries(['nombre','descripcion','formula','unidad','fuente'].filter(k => Object.hasOwn(raw.indicador, k)).map(k => [k, raw.indicador[k]]));
  }
  const prefix = kind === 'plan' ? 'objective' : 'resource';
  if (Object.hasOwn(body, `${prefix}_description`)) {
    const descriptions = array(body[`${prefix}_description`]);
    const ids = array(body[`${prefix}_id`]);
    const items = descriptions.map((descripcion, index) => ({ id: ids[index] || null, descripcion,
      ...(kind === 'plan' ? {} : { cantidad: array(body.resource_quantity)[index] ?? '', costo_estimado: array(body.resource_cost)[index] ?? '' })
    })).filter(item => item.id || item.descripcion || item.cantidad || item.costo_estimado);
    draft[kind === 'plan' ? 'objetivos' : 'recursos'] = items;
  }
  return { institucional: draft };
}

// Session storage is server-side. No credentials are accepted or retained here.
export function retainDraft(req, kind, input, status = 503) {
  const keys = kind === 'plan' ? ['id','nombre','descripcion'] : ['id','id_plan','descripcion','responsable','fecha_inicio','fecha_fin','estado'];
  const value = Object.fromEntries(keys.filter(k => typeof input[k] === 'string').map(k => [k, input[k]]));
  Object.assign(value, institutionalBody(input, kind));
  const message = status === 409
    ? 'El registro cambió en otra sesión. Conservamos tu borrador; compáralo antes de cargar la versión actualizada.'
    : status === 400 ? 'Revisa las fechas, longitudes, valores decimales y referencias al plan. Conservamos los datos introducidos.'
    : status === 403 ? 'La operación no está autorizada para esta cuenta. Conservamos el borrador sin guardar cambios.'
    : 'No se pudo guardar. Conservamos tu borrador. Comprueba el servicio y la disponibilidad de la ficha institucional antes de reintentar.';
  req.session.recordDraft = { kind, value, message };
}
export function recoveredRecord(req, kind) {
  return req.session.recordDraft?.kind === kind ? req.session.recordDraft.value : null;
}

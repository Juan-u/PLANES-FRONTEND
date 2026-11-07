// BFF boundaries: no roles, state, identity or authority references from form bodies.
const messages=Object.freeze({
  AUTHORITY_NOT_CONFIGURED:'La autoridad institucional de esta operación todavía no está confirmada. No se realizó ningún cambio.',
  FORBIDDEN:'Tu cuenta no tiene autorización para esta operación.',
  REVISION_CONFLICT:'El expediente cambió en otra sesión. Compara lo escrito y carga la versión vigente.',
  CONTENT_CONFLICT:'La formulación cambió desde tu consulta. Revisa el contenido actualizado antes de actuar.',
  INVALID_TRANSITION:'La actuación no corresponde al estado actual del plan.',
  PRESENTATION_INCOMPLETE:'El plan tiene datos pendientes antes de presentarse.',
  WORKFLOW_SCHEMA_MISSING:'El Bloque D requiere su activación local. La formulación del Bloque C sigue disponible.',
  INVALID_DATE:'Revisa las fechas de calendario.', INVALID_DATE_RANGE:'El inicio debe ser anterior o igual al fin.',
  INVALID_RESPONSIBLE:'El ID propuesto debe corresponder a una cuenta activa.',
  REASON_REQUIRED:'Escribe la observación o el motivo de devolución.',
  PLAN_LOCKED_BY_WORKFLOW:'El plan está bloqueado por su estado institucional.',
  LEGACY_STATE_REQUIRES_REVIEW:'El estado heredado necesita revisión institucional antes de incorporarse al flujo.'
});
export function createPlanWorkflowViews({api,validCsrf,csrf,navigation,reject}) {
  const validId=value=>typeof value==='string'&&/^[1-9]\d{0,9}$/.test(value)&&Number(value)<=2147483647;
  const validCursor=value=>typeof value==='string'&&/^[1-9]\d{0,19}$/.test(value)&&BigInt(value)<=18446744073709551615n;
  const flash=req=>req.session.planWorkflowFlash || null;
  const save=(req,id,input,kind,message,validation)=>{
    const allowed=kind==='profile'?['revision','fecha_inicio','fecha_fin','responsable_propuesto_id']:['revision','contentVersion','action','observacion'];
    req.session.planWorkflowFlash={id,kind,message,validation,input:Object.fromEntries(allowed.filter(k=>typeof input?.[k]==='string').map(k=>[k,input[k]]))};
  };
  async function capabilities(req,res) {
    const response=await api(req,'/roles/capacidades');const denied=await reject(response,req,res);if(denied)return null;
    if(!response.ok)throw new Error('CAPABILITIES_UNAVAILABLE');const permissions=(await response.json()).permissions;
    if(!Array.isArray(permissions)||!permissions.every(p=>typeof p==='string'))throw new Error('CAPABILITIES_UNAVAILABLE');
    return {permissions,navigation:navigation(permissions)};
  }
  async function detail(req,res) {
    const id=String(req.params?.id??'');if(!validId(id))return res.status(400).send('Identificador de plan inválido.');
    if(req.query?.discard==='1'&&req.session.planWorkflowFlash?.id===id)delete req.session.planWorkflowFlash;
    try {
      const caps=await capabilities(req,res);if(!caps)return;
      if(req.query?.before!=null&&!validCursor(req.query.before))return res.status(400).send('Cursor de historial inválido.');
      const before=req.query?.before?`?before=${encodeURIComponent(req.query.before)}`:'';
      const response=await api(req,`/planes/${id}/flujo${before}`),denied=[401,403].includes(response.status)?await reject(response,req,res):null;if(denied)return denied;
      const body=await response.json();if(!response.ok)return res.status(response.status===404?404:503).render('plan-gestion',{data:null,error:messages[body.code]||'No se pudo consultar el expediente.',csrfToken:csrf(req),navigation:caps.navigation,recovery:flash(req)?.id===id?flash(req):null,notice:null});
      return res.render('plan-gestion',{data:body,error:flash(req)?.id===id?flash(req).message:null,recovery:flash(req)?.id===id?flash(req):null,csrfToken:csrf(req),navigation:caps.navigation,notice:req.query?.success==='saved'?'Datos de formulación guardados; no se designó una autoridad ni se aprobó el plan.':req.query?.success==='acted'?'Actuación registrada.':null});
    }catch{return res.status(503).send('No se pudo consultar el expediente. El borrador conservado seguirá disponible al recuperarse el servicio.');}
  }
  async function list(req,res) {
    try {
      const caps=await capabilities(req,res);if(!caps)return;
      const params=new URLSearchParams();for(const key of ['estado','q','after'])if(typeof req.query?.[key]==='string')params.set(key,req.query[key]);
      const response=await api(req,`/planeacion${params.size?'?'+params:''}`),denied=[401,403].includes(response.status)?await reject(response,req,res):null;if(denied)return denied;
      const body=await response.json();return res.status(response.ok?200:response.status===400?400:response.status===404?404:503).render('planeacion',{data:response.ok?body:null,filters:req.query||{},error:response.ok?null:messages[body.code]||'No se pudo consultar la bandeja institucional.',navigation:caps.navigation});
    }catch{return res.status(503).send('No se pudo consultar la bandeja institucional.');}
  }
  function post(kind){return async(req,res)=>{
    if(!validCsrf(req))return res.status(403).send('La solicitud del formulario expiró. Recarga la página.');
    const id=String(req.params?.id??'');if(!validId(id))return res.status(400).send('Identificador de plan inválido.');
    const keys=kind==='profile'?['revision','fecha_inicio','fecha_fin','responsable_propuesto_id']:['revision','contentVersion','action','observacion'];
    const body=Object.fromEntries(keys.filter(k=>typeof req.body?.[k]==='string').map(k=>[k,req.body[k]]));
    try {
      const response=await api(req,`/planes/${id}/flujo/${kind==='profile'?'ficha':'acciones'}`,{method:'POST',body});
      if(!response.ok){let output={};try{output=await response.json();}catch{}save(req,id,body,kind,messages[output.code]||'No se pudo guardar. Se conserva lo escrito.',output.code==='PRESENTATION_INCOMPLETE'?output.validation:null);}
      const denied=response.status===401?await reject(response,req,res):null;if(denied)return denied;
      if(response.ok){delete req.session.planWorkflowFlash;return res.redirect(`/planes/${id}/gestion?success=${kind==='profile'?'saved':'acted'}`);}
    }catch{save(req,id,body,kind,'No se pudo completar la conexión. Se conserva lo escrito.');}
    return res.redirect(`/planes/${id}/gestion`);
  };}
  return Object.freeze({detail,list,saveProfile:post('profile'),act:post('action')});
}

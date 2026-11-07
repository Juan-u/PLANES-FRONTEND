import assert from'node:assert/strict';import{test}from'node:test';import ejs from'ejs';import{fileURLToPath}from'node:url';
const render=(name,data)=>ejs.renderFile(fileURLToPath(new URL('../views/'+name+'.ejs',import.meta.url)),data);
const data=()=>({ready:true,periods:[{id_periodo:1,anio:2026,trimestre:1,estado:'open'}],period:{id_periodo:1,anio:2026,trimestre:1,estado:'open',fecha_inicio:'2026-01-01',fecha_fin:'2026-03-31',creado_por:1,creado_en:'2026-01-01T00:00:00Z'},activePeriodId:1,activities:[{id_actividad:1,id_plan:3,descripcion:'<actividad>',estado:'Suspendida',progress:{quarterApproved:0,lastApproved:40},plan:{nombre:'<plan>',objetivo:'<objetivo>',indicador:{nombre:'I',formula:'<formula>'}},formulation:{evidencias_esperadas:'<informe>'}}],summary:{activitiesDue:2,activitiesApproved:1,activitiesPending:1,summary:{promedioAvance:0,coberturaTrimestral:50}},generalAverage:40,completion:{complete:false,reason:'Falta verificación'},history:[],files:[],canEvidence:false,requests:[],periodHistory:[]});
const locals=d=>({data:d,filters:{},csrfToken:'test-csrf',navigation:{},canCreate:true,canRequestReopen:true,clientId:'fixture',recovery:null,reopenRecovery:null,error:null,notice:null});
test('quarterly view preserves approved zero, escapes context and offers no approval buttons',async()=>{
  const html=await render('seguimiento-integrado',locals(data()));assert.match(html,/0 %/);assert.match(html,/&lt;actividad&gt;/);assert.match(html,/&lt;formula&gt;/);assert.match(html,/&lt;informe&gt;/);assert.doesNotMatch(html,/value="approved"[^>]*>Aprobar|seguimiento\/decision/);assert.match(html,/no cierra el plan/);
});
test('closed quarter has no new follow-up form and a request never claims to reopen',async()=>{
  const d=data();d.period.estado='closed';const html=await render('seguimiento-integrado',locals(d));assert.doesNotMatch(html,/action="\/seguimiento\/crear"/);assert.match(html,/reapertura-solicitud/);assert.match(html,/no abre el período/);
});
test('no period is a real empty state, not a fabricated current quarter',async()=>{
  const d=data();d.period=null;d.periods=[];const html=await render('seguimiento-integrado',locals(d));assert.match(html,/No hay períodos/);assert.doesNotMatch(html,/Avance del trimestre/);
});
test('binary evidence form explains private storage, max size, association and no approval',async()=>{
  const html=await render('partials/evidence-upload',{activity:{id_actividad:1},evidences:[],evidenceIntegration:{maxBytes:10485760},quarterlyContext:null,csrfToken:'test-csrf'});assert.match(html,/data-max-bytes="10485760"/);assert.match(html,/hasta 10 MB/);assert.match(html,/sin vínculo trimestral/);assert.match(html,/no supone aprobación/);assert.doesNotMatch(html,/base64/);
});

import assert from 'node:assert/strict';import {test}from'node:test';import ejs from'ejs';import {fileURLToPath}from'node:url';
import {createPlanWorkflowViews}from'../app/controllers/plan-workflow.views.js';
import vm from 'node:vm';import {readFile}from'node:fs/promises';
const labels={borrador:'Borrador',presentado:'Presentado a Planeación',en_revision:'En revisión',devuelto:'Devuelto para correcciones',aprobado:'Aprobado'};
const data=()=>({plan:{id_plan:3,nombre:'Plan <prueba>',estado:null},profile:{estado:'borrador',revision:0},contentVersion:'digest',labels,validation:{complete:false,missing:[{field:'causas',message:'Completa <causas>'}],unresolved:[{message:'Autoridad pendiente'}]},actions:[{action:'presentar',enabled:false,reason:'AUTHORITY_NOT_CONFIGURED'}],canEditProfile:true,history:[],nextHistoryCursor:null});
const render=(view,locals)=>ejs.renderFile(fileURLToPath(new URL('../views/'+view+'.ejs',import.meta.url)),locals);
test('workflow renders field-level gaps, optional draft controls, immutable history and disabled authority',async()=>{
  const html=await render('plan-gestion',{data:data(),csrfToken:'csrf-test',navigation:{},recovery:null,error:null,notice:null});
  assert.match(html,/Completa &lt;causas&gt;/);assert.match(html,/Plan &lt;prueba&gt;/);
  assert.match(html,/name="revision" value="0"/);assert.match(html,/name="csrfToken" value="csrf-test"/);
  assert.match(html,/<button[^>]+disabled[^>]*[^]*?Presentar a Planeación/);
  const profile=html.match(/<form method="post" action="\/planes\/3\/gestion\/ficha"[^]*?<\/form>/)[0];assert.doesNotMatch(profile,/ required/);
});
test('restricted read has no draft edit form and displays previous observations safely',async()=>{
  const d=data();d.canEditProfile=false;d.profile.estado='devuelto';d.history=[{revision:2,accion:'devolver',actor_id:4,creado_en:'2026-11-03T00:00:00.000000Z',estado_anterior:'en_revision',estado_nuevo:'devuelto',observacion:'<script>observación</script>'}];
  const html=await render('plan-gestion',{data:d,csrfToken:'c',navigation:{},recovery:null,error:null,notice:null});
  assert.doesNotMatch(html,/gestion\/ficha/);assert.match(html,/&lt;script&gt;observación&lt;\/script&gt;/);assert.match(html,/datetime="2026-11-03T00:00:00.000000Z"/);
});
test('missing migration is a visible unavailable state, never a fabricated empty inbox',async()=>{
  const html=await render('planeacion',{data:null,error:'Activación pendiente',filters:{},navigation:{}});assert.match(html,/role="alert">Activación pendiente/);assert.doesNotMatch(html,/No hay expedientes/);
});
test('planning filters, cursor and names are escaped',async()=>{
  const html=await render('planeacion',{data:{labels,items:[{id_plan:3,nombre:'<plan>',estado:'presentado',responsable_propuesto_id:4}],nextCursor:3},error:null,filters:{q:'<buscar>',estado:'presentado'},navigation:{}});
  assert.match(html,/value="&lt;buscar&gt;"/);assert.match(html,/&lt;plan&gt;/);assert.match(html,/after=3/);
});
const response=()=>({statusCode:200,status(n){this.statusCode=n;return this;},send(v){this.sent=v;return this;},redirect(v){this.redirected=v;return this;}});
test('BFF rejects CSRF before API access',async()=>{
  const views=createPlanWorkflowViews({validCsrf:()=>false,api:()=>{throw new Error('unexpected');}}),res=response();await views.act({params:{id:'3'}},res);assert.equal(res.statusCode,403);
});
test('BFF whitelists decision payload and preserves text/revision after denial',async()=>{
  let sent;const views=createPlanWorkflowViews({validCsrf:()=>true,api:async(_r,_p,options)=>{sent=options.body;return {ok:false,status:403,async json(){return{code:'AUTHORITY_NOT_CONFIGURED'};}};},reject:async()=>null});
  const req={params:{id:'3'},session:{},body:{action:'devolver',observacion:'<conservar>',revision:'2',contentVersion:'digest',actorId:'999',authority:'forged',csrfToken:'excluded'}},res=response();
  await views.act(req,res);assert.deepEqual(sent,{revision:'2',contentVersion:'digest',action:'devolver',observacion:'<conservar>'});assert.equal(req.session.planWorkflowFlash.input.observacion,'<conservar>');assert.match(res.redirected,/\/planes\/3\/gestion/);
});
test('BFF renders a missing migration explicitly without treating 503 as an empty inbox',async()=>{
  const views=createPlanWorkflowViews({api:async(_r,path)=>path==='/roles/capacidades'?{ok:true,status:200,async json(){return{permissions:['M03.plans.read']};}}:{ok:false,status:503,async json(){return{code:'WORKFLOW_SCHEMA_MISSING'};}},navigation:()=>({plans:true}),reject:async response=>{if(response.status===503)throw new Error('must use structured workflow error');return null;}});
  const res=response();res.render=function(view,locals){this.rendered={view,locals};return this;};
  await views.list({query:{},session:{}},res);assert.equal(res.statusCode,503);assert.equal(res.rendered.view,'planeacion');assert.equal(res.rendered.locals.data,null);assert.match(res.rendered.locals.error,/activación local/);
});
test('workflow does not expose edit controls for frozen plans and activities',async()=>{
  const html=await render('planes',{planes:[{id_plan:3,nombre:'P',flujo:{estado:'presentado'}}],canCreatePlans:false,canUpdatePlans:true,canReadActivities:true,csrfToken:'c',notice:null,error:null,workflowAvailable:true});
  assert.doesNotMatch(html,/data-record-editor|data-record-open/);assert.match(html,/Gesti&#243;n institucional/);
});
test('unsaved profile input blocks formal submissions without enabling any previously disabled action',async()=>{
  const source=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
  const profileEvents={},actionEvents={},buttons=[{disabled:false},{disabled:true}],notice={hidden:true,removeAttribute(){this.hidden=false;}};
  const form={addEventListener(name,fn){profileEvents[name]=fn;}};
  const action={querySelectorAll(){return buttons;},addEventListener(name,fn){actionEvents[name]=fn;}};
  const document={querySelectorAll(selector){return selector==='[data-workflow-profile]'?[form]:selector==='[data-workflow-action]'?[action]:[];},querySelector(){return notice;}};
  vm.runInNewContext(source.slice(source.indexOf('// A formal action must not silently abandon')), {document});
  profileEvents.input();let prevented=false;actionEvents.submit({preventDefault(){prevented=true;}});
  assert.equal(prevented,true);assert.equal(notice.hidden,false);assert.ok(buttons.every(b=>b.disabled));
});

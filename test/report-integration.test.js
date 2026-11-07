import{test}from'node:test';import assert from'node:assert/strict';import ejs from'ejs';
import{readFile}from'node:fs/promises';import vm from'node:vm';
import{reportQuery}from'../app/controllers/report-navigation.js';
import{createInstitutionalReportViews}from'../app/controllers/institutional-reports.views.js';
const response=()=>({statusCode:200,status(code){this.statusCode=code;return this;},render(view,locals){this.view=view;this.locals=locals;return this;},set(){},send(){return this;}});
const factory=api=>createInstitutionalReportViews({api,validCsrf:()=>true,csrf:()=> 'fixture',navigation:()=>({reports:true}),reject:async()=>null});
for(const input of [{anio:['2026']},{planId:'0'},{trimestre:'5'},{responsable:'x'.repeat(151)},{planState:'desconocido'}])test('invalid filters stop before any broad query '+Object.keys(input),async()=>{
 let calls=0;const views=factory(async()=>{calls++;}),res=response();await views.report({query:input},res);assert.equal(calls,0);assert.equal(res.statusCode,400);assert.equal(res.view,'report-error');
 await views.exportReport({body:input,params:{format:'csv'}},res);assert.equal(calls,0);assert.equal(res.statusCode,400);
});
test('valid filters and CSRF reach export unchanged',async()=>{const calls=[],api=async(_r,path)=>{calls.push(path);return path==='/roles/capacidades'?{ok:true,json:async()=>({permissions:['M12.reports.export']})}:{ok:true,text:async()=> 'csv'};},res=response();res.type=res.attachment=()=>res;res.send=text=>{res.text=text;return res;};await factory(api).exportReport({body:{planId:'3',anio:'2026',trimestre:'2',responsable:'Ana & José'},params:{format:'csv'}},res);const query=new URL('http://local'+calls[1]).searchParams;assert.equal(query.get('responsable'),'Ana & José');assert.equal(query.get('planId'),'3');assert.equal(res.text,'csv');});
test('service failure preserves query values in a recoverable screen',async()=>{const views=factory(async(_r,path)=>path==='/roles/capacidades'?{ok:true,json:async()=>({permissions:[]})}:{ok:false,status:503,json:async()=>({code:'REPORTS_NOT_ACTIVATED'})});const res=response();await views.report({query:{planId:'4',responsable:'<script>x</script>'}},res);assert.equal(res.statusCode,503);assert.equal(res.locals.filters.planId,'4');const html=await ejs.renderFile('views/report-error.ejs',res.locals);assert.doesNotMatch(html,/<script>x/);assert.match(html,/&lt;script&gt;/);assert.match(html,/Revisar y consultar/);});
const fixture={meta:{id:'test',actorId:1,generatedAt:'2026-11-03T12:00:00Z',institution:'Prueba',contentSha256:'x',exportReady:false},filters:{planId:3,processId:2,anio:2026,trimestre:2,responsable:'Ana & José',followupState:'pending'},summary:[],activities:[{id_actividad:8,id_plan:3,id_periodo:2,anio:2026,trimestre:2,descripcion:'Actividad',progress:{quarterApproved:null}}],followups:[],evidence:[],history:[]};
test('activity drill-down retains every applied filter and context',async()=>{
 const html=await ejs.renderFile('views/informe-institucional.ejs',{data:fixture,filters:{},csrfToken:'t',printMode:false,canExport:false,navigation:{},contextMode:true});
 const href=html.match(/href="([^\"]*activityId=8[^\"]*)"/)[1].replaceAll('&amp;','&');const url=new URL(href,'http://local');assert.equal(url.pathname,'/control-interno/contexto');assert.equal(url.searchParams.get('processId'),'2');assert.equal(url.searchParams.get('responsable'),'Ana & José');assert.equal(url.searchParams.get('followupState'),'pending');assert.match(html,/Consulta de Control Interno/);assert.match(html,/exportaciones requieren activar/);
});
test('related navigation obeys permissions and carries plan/activity/period',async()=>{
 const view='views/partials/related-views.ejs',contextFilters={planId:3,activityId:8,periodId:2};
 const restricted=await ejs.renderFile(view,{navigation:{followup:true},contextFilters});assert.doesNotMatch(restricted,/informes\/institucional|control-interno/);
 const full=await ejs.renderFile(view,{navigation:{plans:true,activities:true,followup:true,reports:true,internalControl:true},contextFilters});assert.match(full,/Informe del contexto/);assert.match(full,/Consulta de Control Interno/);assert.match(full,/periodId=2/);
});
test('query progress announces loading and recovers when returning from history',async()=>{
 const source=await readFile('public/app.js','utf8'),handlers={},button={disabled:false},status={hidden:true};let busy=false;
 const form={querySelector:s=>s.startsWith('button')?button:status,addEventListener:(e,fn)=>handlers[e]=fn,setAttribute:()=>{busy=true;},removeAttribute:()=>{busy=false;}};
 vm.runInNewContext(source.slice(source.lastIndexOf('// Report query progress')),{document:{querySelectorAll:()=>[form]},window:{addEventListener:(e,fn)=>handlers[e]=fn}});
 handlers.submit();assert.equal(busy,true);assert.equal(status.hidden,false);assert.equal(button.disabled,true);
 handlers.pageshow();assert.equal(busy,false);assert.equal(status.hidden,true);assert.equal(button.disabled,false);
});

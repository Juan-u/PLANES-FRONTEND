import{test}from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import ejs from'ejs';
import{createInstitutionalReportViews,reportQuery}from'../app/controllers/institutional-reports.views.js';
const report={meta:{id:'fixture',generatedAt:'2026-11-02T12:00:00Z',actorId:9,institution:'Institución',contentSha256:'0'.repeat(64),summaryScope:'Alcance',temporalBasis:'Histórico'},filters:{planId:1},summary:[],activities:[],followups:[],evidence:[],history:[]};
const locals={data:report,filters:{},filterQuery:'',csrfToken:'fixture',canExport:true,printMode:false,navigation:{reports:true}};
test('analytical report has provenance and protected exports without official controls',async()=>{const html=await ejs.renderFile('views/informe-institucional.ejs',locals);assert.match(html,/Consulta analítica/);assert.match(html,/Información no disponible/);assert.match(html,/name="csrfToken"/);assert.match(html,/exportar\/pdf/);assert.doesNotMatch(html,/action="[^\"]*publicar/);});
test('print view contains entire filtered content and explicit browser PDF control',async()=>{const html=await ejs.renderFile('views/informe-institucional.ejs',{...locals,printMode:true,canExport:false});assert.match(html,/data-report-print/);assert.doesNotMatch(html,/action="\/informes\/institucional\/exportar/);assert.match(html,/Guardar como PDF/);});
test('escapes untrusted report and control content',async()=>{const html=await ejs.renderFile('views/informe-institucional.ejs',{...locals,data:{...report,meta:{...report.meta,institution:'<script>bad</script>'}}});assert.doesNotMatch(html,/<script>bad/);assert.match(html,/&lt;script&gt;/);const control=await ejs.renderFile('views/control-interno.ejs',{data:{finding:{titulo:'<script>x</script>',id_plan:1,descripcion:'Texto'},recommendations:[],history:[],truncated:false},detail:true,filters:{},navigation:{},csrfToken:'c'});assert.match(control,/&lt;script&gt;/);assert.match(control,/<fieldset disabled>/);});
test('Control Interno context keeps its own consultation route',async()=>{const html=await ejs.renderFile('views/informe-institucional.ejs',{...locals,contextMode:true,canExport:false});assert.match(html,/action="\/control-interno\/contexto"/);});
test('BFF rejects CSRF before network or export generation',async()=>{let calls=0;const views=createInstitutionalReportViews({validCsrf:()=>false,api(){calls++;}}),res={status(c){this.code=c;return this;},send(){return this;}};await views.exportReport({params:{format:'pdf'}},res);await views.act({params:{action:'create'}},res);assert.equal(res.code,403);assert.equal(calls,0);});
for(const [status,message] of [[404,'No se encontró información para la consulta seleccionada.'],[503,'El servicio de informes no está disponible temporalmente.']]){
 test(`institutional reports preserve safe HTTP ${status} failure status`,async()=>{
  let reportRequest=false;
  const views=createInstitutionalReportViews({
   api:async(_req,path)=>path==='/roles/capacidades'
    ?{status:200,ok:true,async json(){return{permissions:['M12.reports.read']};}}
    :(reportRequest=true,{status,ok:false,async json(){return{code:'PRIVATE_DATABASE_ERROR'};}}),
   reject:async()=>false,navigation:()=>({reports:true})
  });
  const res={status(code){this.code=code;return this;},set(){return this;},render(view,data){this.view=view;this.data=data;return this;}};
  await views.report({query:{}},res);
  assert.equal(reportRequest,true);
  assert.equal(res.code,status);
  assert.equal(res.view,'report-error');
  assert.equal(res.data.message,message);
  assert.doesNotMatch(res.data.message,/PRIVATE_DATABASE_ERROR|DATABASE/);
 });
}
test('BFF only forwards combinable known filters',()=>{assert.equal(reportQuery({planId:'1',authority:'yes',sql:'x'}).toString(),'planId=1');assert.throws(()=>reportQuery({anio:['2026']}));});
test('PDF print styling is scoped and preserves readable tables',async()=>{const css=await readFile('public/style.css','utf8');assert.match(css,/@media print/);assert.match(css,/\.report-print \.table-wrap table/);});

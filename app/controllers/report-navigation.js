export const REPORT_FILTERS=Object.freeze({planId:'Plan',activityId:'Actividad',processId:'Proceso',objectiveId:'Objetivo específico',periodId:'Período',anio:'Año',trimestre:'Trimestre',responsable:'Responsable',planState:'Estado del plan',followupState:'Estado del seguimiento'});
export class ReportFilterError extends Error {constructor(){super('Revisa los filtros: cada campo debe contener un único valor válido.');this.status=400;}}
export function reportQuery(input={}){
 const query=new URLSearchParams();
 for(const key of Object.keys(REPORT_FILTERS)){
  const value=input[key];if(value==null||value==='')continue;
  if(typeof value!=='string'||value.length>150||/[\x00-\x1f]/.test(value))throw new ReportFilterError();
  if(['planId','activityId','processId','objectiveId','periodId','anio','trimestre'].includes(key)){
   const min=key==='anio'?1000:1,max=key==='anio'?9999:key==='trimestre'?4:2147483647;
   if(!/^\d+$/.test(value)||Number(value)<min||Number(value)>max)throw new ReportFilterError();
  }
  if(key==='planState'&&!['sin_expediente','borrador','presentado','en_revision','devuelto','aprobado'].includes(value))throw new ReportFilterError();
  if(key==='followupState'&&!['pending','approved','rejected','missing'].includes(value))throw new ReportFilterError();
  query.set(key,value);
 }
 return query;
}

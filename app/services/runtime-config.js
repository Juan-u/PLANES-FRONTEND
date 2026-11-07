export function runtimePort(value=process.env.PORT??'4000') {
 if(!/^\d+$/.test(String(value))||Number(value)<1||Number(value)>65535)throw new Error('PORT debe ser un puerto válido.');
 return Number(value);
}
export function backendApiUrl(value=process.env.BACKEND_API_URL??'http://localhost:3000/api') {
 const url=new URL(value);
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||url.pathname.replace(/\/$/,'')!=='/api')throw new Error('BACKEND_API_URL debe identificar una API HTTP sin credenciales.');
 return url.toString().replace(/\/$/,'');
}

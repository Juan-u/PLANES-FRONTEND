import{test,mock}from'node:test';import assert from'node:assert/strict';let requested;
mock.module('../../app/services/runtime-config.js',{namedExports:{backendApiUrl:()=> 'http://127.0.0.1:3010/api'}});
mock.module('node-fetch',{defaultExport:async url=>{requested=url;return{status:200,json:async()=>({ok:true})};}});
const{verificarSesion}=await import('../../app/middleware/auth.middleware.js');
test('session validation uses the same configured backend as login',async()=>{let next=false;await verificarSesion({session:{token:'unit-only'}},{},()=>{next=true;});assert.equal(requested,'http://127.0.0.1:3010/api/session');assert.equal(next,true);});

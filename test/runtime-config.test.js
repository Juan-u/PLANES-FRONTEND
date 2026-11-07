import{test}from'node:test';import assert from'node:assert/strict';
import{runtimePort,backendApiUrl}from'../app/services/runtime-config.js';
test('isolated frontend port preserves defaults and rejects invalid ports',()=>{assert.equal(runtimePort('4010'),4010);for(const value of ['0','65536','4000x',''])assert.throws(()=>runtimePort(value));});
test('backend address supports parallel local instance without credentials or query parameters',()=>{assert.equal(backendApiUrl('http://127.0.0.1:3010/api/'),'http://127.0.0.1:3010/api');for(const value of ['file:///api','http://user:secret@localhost/api','http://localhost/api?token=x','http://localhost/wrong'])assert.throws(()=>backendApiUrl(value));});

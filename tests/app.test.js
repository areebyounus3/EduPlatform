'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createApp}=require('../app');
async function withServer(t,fn){
 const server=createApp({version:'test-version',commit:'test-commit'});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 await fn(`http://127.0.0.1:${server.address().port}`);
}
test('home page serves app and version',async t=>withServer(t,async base=>{
 const r=await fetch(base);const html=await r.text();assert.equal(r.status,200);assert.match(html,/Searchable Study Platform/);assert.match(html,/test-version/);
}));
test('health endpoint returns status, version and commit',async t=>withServer(t,async base=>{
 const r=await fetch(base+'/health');assert.deepEqual(await r.json(),{status:'ok',application:'Searchable Study Platform',version:'test-version',commit:'test-commit'});
}));
test('search returns matching documents',async t=>withServer(t,async base=>{
 const r=await fetch(base+'/api/documents?q=aws');const body=await r.json();assert.equal(body.count,2);assert.ok(body.documents.every(d=>JSON.stringify(d).toLowerCase().includes('aws')));
}));
test('document listing returns all sample notes',async t=>withServer(t,async base=>{
 const r=await fetch(base+'/api/documents');assert.equal((await r.json()).count,4);
}));
test('unknown route returns 404',async t=>withServer(t,async base=>{
 const r=await fetch(base+'/missing');assert.equal(r.status,404);
}));

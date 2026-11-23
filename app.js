'use strict';
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { URL } = require('node:url');
const documents = [
  {id:'doc-001',title:'Introduction to Software Architecture',course:'Software Engineering',description:'An overview of application architecture and system design.',tags:['architecture','software','design']},
  {id:'doc-002',title:'Continuous Integration and Continuous Delivery',course:'DevOps',description:'Automated tests, build artifacts and deployment pipelines.',tags:['ci','cd','github actions','testing']},
  {id:'doc-003',title:'Amazon S3 Fundamentals',course:'Cloud Computing',description:'Buckets, objects, access policies and private artifact storage.',tags:['aws','s3','cloud','storage']},
  {id:'doc-004',title:'Deploying Applications to EC2',course:'Cloud Computing',description:'Virtual machines, Linux services and production health checks.',tags:['aws','ec2','linux','deployment']}
];
function read(file,fallback){try{return fs.readFileSync(path.join(__dirname,file),'utf8').trim()||fallback;}catch{return fallback;}}
function createApp(options={}) {
 const version=options.version||read('VERSION','development');
 const commit=options.commit||read('COMMIT_SHA','local');
 return http.createServer((req,res)=>{
  const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);
  const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
  if(req.method==='GET'&&url.pathname==='/health')return json(200,{status:'ok',application:'Searchable Study Platform',version,commit});
  if(req.method==='GET'&&url.pathname==='/api/documents'){
   const q=(url.searchParams.get('q')||'').trim().toLowerCase();
   const found=q?documents.filter(d=>[d.title,d.course,d.description,...d.tags].join(' ').toLowerCase().includes(q)):documents;
   return json(200,{query:q,count:found.length,documents:found});
  }
  if(req.method==='GET'&&url.pathname==='/'){
   res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'"});
   return res.end(fs.readFileSync(path.join(__dirname,'public','index.html'),'utf8').replaceAll('__APP_VERSION__',version));
  }
  if(req.method==='GET'&&url.pathname==='/favicon.ico'){res.writeHead(204);return res.end();}
  return json(404,{error:'Not found'});
 });
}
module.exports={createApp};

'use strict';
const {createApp}=require('./app');
const port=Number(process.env.PORT||3000);
const host=process.env.HOST||'127.0.0.1';
const server=createApp();
server.listen(port,host,()=>console.log(`Searchable Study Platform listening on http://${host}:${port}`));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close());

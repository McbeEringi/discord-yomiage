#!/bin/bun
import{token}from'./token.mjs';
import CFG from'./config.toml';


await(async()=>await(await fetch(new URL('version',CFG.vv_http))).text())().catch(async(e,td=new TextDecoder())=>(
	console.log('Engine booting...'),
	e=Bun.spawn([CFG.vv_bin],{stderr:'pipe'}).stderr.getReader(),
	await new Promise(async f=>{while(1)td.decode((await e.read()).value).includes(CFG.vv_http)?f():await new Promise(f=>setTimeout(f,100));}),
	e.cancel(),
	console.log('Engine ready!')
));

const sid=(await(await fetch(new URL('speakers',CFG.vv_http))).json()).flatMap(x=>x.styles.map(y=>[y.id,[y.name,x.name]])).reduce((a,[k,v])=>(a[k]=v,a),{});
// console.log(sid);

Object.entries(token).map(([k,v])=>Bun.spawn({
	cmd:['bun','--install=force','./cli.mjs',v],
	ipc:(msg,proc)=>console.log(k,msg)
}));

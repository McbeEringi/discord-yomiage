#!/bin/bun
import{token}from'./config/token.mjs';
import{engines}from'./config/engines.mjs';
import{dl,boot}from'./src/engine_util.mjs';

const
log=((a={},l=0,s)=>(k,v,o=a)=>(
	o[k]=v,
	a=o,
	s=JSON.stringify(a,0,'\t')+'\n',
	process.stdout.write(Array(l).fill('\x1b[2K').join('\x1b[1A')),
	l=s.split('\n').length,
	process.stdout.write(s),
	a
))();

await dl({engines,log});
await boot({engines,log});


// const sid=(await(await fetch(new URL('speakers',CFG.vv_http))).json()).flatMap(x=>x.styles.map(y=>[y.id,[y.name,x.name]])).reduce((a,[k,v])=>(a[k]=v,a),{});
// console.log(sid);

Object.entries(token).map(([k,v])=>Bun.spawn({
	cmd:['bun','--install=force','./src/cli.mjs',v],
	ipc:(msg,proc)=>log(k,msg)
}));

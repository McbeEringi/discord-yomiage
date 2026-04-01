#!/bin/bun
import{token}from'./config/token.mjs';
import{engines}from'./config/engines.mjs';
import{dl,boot}from'./src/engine_util.mjs';

const
log=process.stdout.isTTY?((a={},l=0,s)=>(k=[],v,o=a)=>(
	k.reduce((a,k,i,{length:l})=>(i==l-1?(a[k]=v):a[k]??(a[k]={})),o),
	a=o,
	s=JSON.stringify(a,0,'\t')+'\n',
	process.stdout.write(Array(l).fill('\x1b[2K').join('\x1b[1A')+s),
	l=s.split('\n').length,
	a
))():(k,v)=>console.log(`${k.join('.')}:\t${v}`);

await dl({engines,log});
await boot({engines,log});


// const sid=(await(await fetch(new URL('speakers','http://localhost:50021'))).json()).flatMap(x=>x.styles.map(y=>[y.id,[y.name,x.name]])).reduce((a,[k,v])=>(a[k]=v,a),{});
// log('sid',sid);

Object.entries(token).map(([k,v],w)=>(
	w=Bun.spawn({
		cmd:['bun','--install=force','./src/cli.mjs',k],
		ipc:(msg,proc)=>(
			msg.log&&log(['bot',k,...msg.log[0]??[]],...msg.log?.slice(1))
		)
	}),
	w.send({name:k,token:v,debug:0})
));

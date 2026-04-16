#!/bin/bun
import{token}from'./config/token.mjs';
import{engines}from'./config/engines.mjs';
import{dl,boot,check,spk}from'./src/engine_util.mjs';

const
log=process.stdout.isTTY?((a={},l=0,s)=>(k=[],v,o=a)=>(
	k.reduce((a,k,i,{length:l})=>(i==l-1?(a[k]=v):a[k]??(a[k]={})),o),
	a=o,
	s=JSON.stringify(a,0,'\t')+'\n',
	process.stdout.write(
		Array(l).fill('\x1b[2K').join('\x1b[1A')+
		s
	),
	l=s.split('\n').length,
	a
))():(k,v)=>console.log(`${k.join('.')}:\t${v}`),
netwait=_=>(x=>x??(x=(async()=>{
	while(await fetch('http://connectivitycheck.gstatic.com/generate_204').then(_=>0,_=>1))await Bun.sleep(4000);
	x=null
})()))();


await Promise.all(Object.entries(engines.engines).map(async(engine,i)=>(
	i=engine[0],
	await dl({engine,dir:engines.dir,log:x=>log(['engine',i,'dl'],x)}),
	await boot({engine,dir:engines.dir,log:x=>log(['engine',i,'boot'],x)}),
	await check({engine,log:x=>log(['engine',i,'check'],x)}),
	// console.log(
	// await spk({engine})
	// ),
	0
)));


Object.entries(token).map(async([k,v],w)=>{
	while(1){
		log(['bot',k,'msg'],'network...');
		await netwait();
		w=Bun.spawn({
			cmd:['bun','--install=force','./src/cli.mjs',k],
			// stdout:'inherit',
			ipc:(msg,proc)=>(
				msg.log&&log(['bot',k,...msg.log[0]??[]],...msg.log?.slice(1))
			)
		});
		w.send({name:k,token:v});
		await w.exited
	}
});

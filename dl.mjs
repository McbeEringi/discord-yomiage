#!/bin/bun
import{join}from'node:path';
import{open}from'node:fs/promises';
import{progress}from'@mcbeeringi/petit/zip';
const
engines_dir='engines',
dl_dir=x=>join(engines_dir,x,'dl'),
repos={
	voicevox:'voicevox/voicevox_engine',
	sharevox:'sharevox/sharevox_engine',
},
filter=[
	/\.vvpp$/,
	/cpu/,
	new RegExp((_=>({win32:'windows',darwin:'macos'}[_]??_))(process.platform)),
	new RegExp(process.arch)
],

prog=(a=>(k,v)=>(
	a[k]=v,
	console.clear(),
	console.log(a),
	a
))({});


await Promise.all(
	Object.entries(repos).map(async([i,x])=>(
		x=filter.reduce((a,r,b)=>(
			b=a.filter(({name:x})=>r.test(x)),
			b.length?b:a
		),(await(
			await fetch(`https://api.github.com/repos/${x}/releases/latest`)
		).json()).assets)[0],
		x&&(
			x.file=Bun.file(join(dl_dir(i),x.name)),
			await x.file.exists()||(
				x.tmp_file=Bun.file(`${x.file.name}.part`),
				await x.tmp_file.exists()||await x.tmp_file.write(''),
				x.writer=(await open(x.tmp_file.name,{flags:'a'})).createWriteStream(),
				// x.writer=x.tmp_file.writer({append:true}),
				await(async o=>progress(
					await(x=>x.status==416?new Response(''):x.status==206&&x.headers.get('content-range').startsWith(`bytes ${o}-`)?x:(
						console.log(x),Promise.reject('Illegal response!')
					))(await fetch(x.browser_download_url,{headers:{Range:`bytes=${o}-`}})),
					([a,b])=>prog(i,`${((o+a)/(o+b)*100).toFixed(3)}%`)
				).body.pipeTo(new WritableStream({
					write:w=>x.writer.write(w),
					close:w=>x.writer.close()
					// close:w=>x.writer.end()
				})))(x.tmp_file.size),
				await Bun.$`mv ${x.tmp_file.name} ${x.file.name}`
			),
			x.file=Bun.file(x.file.name),
			x
		)
	))
)

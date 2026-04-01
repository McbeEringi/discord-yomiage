import{join}from'node:path';
import{open}from'node:fs/promises';
import{progress}from'@mcbeeringi/petit/zip';

const
dl=async({engines,log,li=i=>['engine',i,'dl']})=>await Promise.all(
	Object.entries(engines.engines).map(async([i,x])=>(
		log(li(i),'checking...'),
		x=engines.filter.reduce((a,r,b)=>(
			b=a.filter(({name:x})=>r.test(x)),
			b.length?b:a
		),(await(
			await fetch(`https://api.github.com/repos/${x.repo}/releases/latest`)
		).json()).assets)[0],
		x&&(
			x.file=Bun.file(join(engines.dir.dl(i),x.name)),
			await x.file.exists()||(
				log(li(i),'new version found!'),
				x.tmp_file=Bun.file(`${x.file.name}.part`),
				await x.tmp_file.exists()||await x.tmp_file.write(''),
				x.writer=(await open(x.tmp_file.name,{flags:'a'})).createWriteStream(),
				// x.writer=x.tmp_file.writer({append:true}),// https://github.com/oven-sh/bun/issues/10473
				await(async o=>progress(
					await(x=>x.status==206&&x.headers.get('content-range').startsWith(`bytes ${o}-`)?x:(
						console.log(x),Promise.reject('Illegal response!')
					))(await fetch(x.browser_download_url,{headers:{Range:`bytes=${o}-`}})),
					([a,b])=>log(li(i),`${((o+a)/(o+b)*100).toFixed(2).padStart(6,' ')}%`)
				).body.pipeTo(new WritableStream({
					write:w=>x.writer.write(w),
					close:w=>x.writer.close()
					// close:w=>x.writer.end()
				})))(x.tmp_file.size),
				await Bun.$`mv ${x.tmp_file.name} ${x.file.name}`,
				x.file=Bun.file(x.file.name)
			),
			await Bun.file(join(engines.dir.bin(i),'engine_manifest.json')).exists()||(
				log(li(i),'extracting...'),
				await Bun.$`mkdir -p ${engines.dir.bin(i)}`,
				await Bun.$`${process.platform=='win32'?'tar':'bsdtar'} -xf ${x.file.name} -C ${engines.dir.bin(i)}`
			),
			log(li(i),`OK latest=${x.name}`),
			x
		)
	))
),
boot=async({log,engines,li=i=>['engine',i,'boot']})=>await Promise.all(Object.entries(engines.engines).map(async([i,x])=>(
	await fetch(new URL('version',`http://localhost:${x.port}`))
	.then(
		async r=>log(li(i),`already running? version=${await r.text()}`),
		async(e,td=new TextDecoder())=>(
			log(li(i),'booting...'),
			e=Bun.spawn([join(engines.dir.bin(i),x.bin)],{stderr:'pipe'}).stderr.getReader(),
			await new Promise(async f=>{while(1){if(td.decode((await e.read()).value).includes('startup complete')){f();break;}else await new Promise(f=>setTimeout(f,100));}}),
			e.cancel(),
			e=await(await fetch(new URL('version',`http://localhost:${x.port}`))).json(),
			log(li(i),`OK version=${e}`)
		)
	)
)));
export{dl,boot};


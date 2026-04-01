#!/bin/bun
import{join}from'node:path';
import{open}from'node:fs/promises';
import{progress}from'@mcbeeringi/petit/zip';
const
engines_dir='engines',
dl_dir=x=>join(engines_dir,x,'dl'),
bin_dir=x=>join(engines_dir,x,'bin'),
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

prog=((a={},l=0,s)=>(k,v,o=a)=>(
	o[k]=v,
	a=o,
	s=JSON.stringify(a,0,'\t'),
	process.stdout.write(Array(l).fill('\x1b[2K').join('\x1b[1A')),
	l=s.split('\n').length,
	process.stdout.write(s),
	a
))();


await Promise.all(
	Object.entries(repos).map(async([i,x])=>(
		prog(i,'checking...'),
		x=filter.reduce((a,r,b)=>(
			b=a.filter(({name:x})=>r.test(x)),
			b.length?b:a
		),(await(
			await fetch(`https://api.github.com/repos/${x}/releases/latest`)
		).json()).assets)[0],
		x&&(
			x.file=Bun.file(join(dl_dir(i),x.name)),
			await x.file.exists()||(
				prog(i,'new version found!'),
				x.tmp_file=Bun.file(`${x.file.name}.part`),
				await x.tmp_file.exists()||await x.tmp_file.write(''),
				x.writer=(await open(x.tmp_file.name,{flags:'a'})).createWriteStream(),
				// x.writer=x.tmp_file.writer({append:true}),
				await(async o=>progress(
					await(x=>x.status==206&&x.headers.get('content-range').startsWith(`bytes ${o}-`)?x:(
						console.log(x),Promise.reject('Illegal response!')
					))(await fetch(x.browser_download_url,{headers:{Range:`bytes=${o}-`}})),
					([a,b])=>prog(i,`dl... ${((o+a)/(o+b)*100).toFixed(2).padStart(6,' ')}%`)
				).body.pipeTo(new WritableStream({
					write:w=>x.writer.write(w),
					close:w=>x.writer.close()
					// close:w=>x.writer.end()
				})))(x.tmp_file.size),
				await Bun.$`mv ${x.tmp_file.name} ${x.file.name}`
			),
			x.file=Bun.file(x.file.name),
			prog(i,'extracting...'),
			await Bun.$`mkdir -p ${bin_dir(i)}`,
			await Bun.$`${process.platform=='win32'?'tar':'bsdtar'} -xf ${x.file.name} -C ${bin_dir(i)}`,
			prog(i,'done!'),
			x
		)
	))
)

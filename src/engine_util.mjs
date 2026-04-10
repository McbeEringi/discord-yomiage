import{join}from'node:path';
import{open}from'node:fs/promises';
import{progress}from'@mcbeeringi/petit/zip';

const
fuj=port=>async path=>await(await fetch(new URL(path,`http://localhost:${port}`))).json(),

dl=async({engine:[i,x],log,dir})=>x.dl?.repo&&x.dl?.filter?(
	log('checking...'),
	x=x.dl.filter.reduce((a,r,b)=>(
		b=a.filter(({name:x})=>r.test(x)),
		b.length?b:a
	),(await(
		await fetch(`https://api.github.com/repos/${x.dl.repo}/releases/latest`)
	).json()).assets)[0],
	x?(
		x.file=Bun.file(join(dir.dl(i),x.name)),
		await x.file.exists()||(
			log('new version found!'),
			x.tmp_file=Bun.file(`${x.file.name}.part`),
			await x.tmp_file.exists()||await x.tmp_file.write(''),
			x.writer=(await open(x.tmp_file.name,{flags:'a'})).createWriteStream(),
			// x.writer=x.tmp_file.writer({append:true}),// https://github.com/oven-sh/bun/issues/10473
			await(async o=>progress(
				await(x=>x.status==206&&x.headers.get('content-range').startsWith(`bytes ${o}-`)?x:(
					console.log(x),Promise.reject('Illegal response!')
				))(await fetch(x.browser_download_url,{headers:{Range:`bytes=${o}-`}})),
				([a,b])=>log(`${((o+a)/(o+b)*100).toFixed(2).padStart(6,' ')}%`)
			).body.pipeTo(new WritableStream({
				write:w=>x.writer.write(w),
				close:w=>x.writer.close()
				// close:w=>x.writer.end()
			})))(x.tmp_file.size),
			await Bun.$`mv ${x.tmp_file.name} ${x.file.name}`,
			x.file=Bun.file(x.file.name)
		),
		await Bun.file(join(dir.bin(i),'engine_manifest.json')).exists()||(
			log('extracting...'),
			await Bun.$`mkdir -p ${dir.bin(i)}`,
			await Bun.$`${process.platform=='win32'?'tar':'bsdtar'} -xf ${x.file.name} -C ${dir.bin(i)}`
		),
		log(`OK latest=${x.name}`),
		x
	):log('no match assett!')
):log('dl empty or illegal. download skipped.'),

boot=async({
	log,engine:[i,x],dir
})=>x.port?(
	await fuj(x.port)('version')
	.then(
		async r=>log(`already running?`),
		async(e,td=new TextDecoder())=>x.bin?(
			log('booting...'),
			e=Bun.spawn([join(dir.bin(i),x.bin)],{stderr:'pipe'}),
			await new Promise(f=>e.stderr.pipeTo(new WritableStream({write:x=>td.decode(x).includes('Uvicorn running')&&f()}))),
			log(`OK`)
		):log('bin empty. boot skipped.')
	)
):log('port empty. check skipped.'),

check=async({
	log,engine:[i,x],y
})=>(
	y=await fuj(x.port)('version'),
	y.detail=='Not Found'?(
		x.type='coeiroink',
		y=(await fuj(x.port)('v1/engine_info')).version
	):(
		x.type='voicevox'
	),
	log(`version=${y} type=${x.type}`)
),

spk=async({
	engine:[i,x]
})=>(
	(await fuj(x.port)({
		voicevox:'speakers',
		coeiroink:'v1/speakers_path_variant'
	}[x.type])).flatMap(x=>x.styles.map(y=>({
		name:[x.speakerName??x.name,y.styleName??y.name],
		id:[x.speakerUuid??x.speaker_uuid,y.styleId??y.id]
	})))//.sort((a,b)=>a.id[1]-b.id[1])
);

export{dl,boot,check,spk};

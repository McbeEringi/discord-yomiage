#!/bin/bun
const
repos=[
	'voicevox/voicevox_engine',
	'sharevox/sharevox_engine',
],
filter=[
	/\.vvpp$/,
	/-cpu-/,
	new RegExp(`-${(_=>({win32:'windows',darwin:'macos'}[_]??_))(process.platform)}-`),
	new RegExp(`-${process.arch}-`)
];


console.log(
	await Promise.all(
		repos.map(async x=>
			filter.reduce((a,r,b)=>(
				b=a.filter(({name:x})=>r.test(x)),
				b.length?b:a
			),(await(
				await fetch(`https://api.github.com/repos/${x}/releases/latest`)
			).json()).assets)
		)
	)
)

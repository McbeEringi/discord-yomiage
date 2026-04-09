import{join}from'node:path';
const
filter=[
	/\.vvpp$/,
	/cpu/,
	new RegExp((_=>({win32:'windows',darwin:'macos'}[_]??_))(process.platform)),
	new RegExp(process.arch)
],
engines={
	engines:{
		voicevox:{dl:{repo:'voicevox/voicevox_engine',filter},port:50021,bin:'./run'},
		// sharevox:{dl:{repo:'sharevox/sharevox_engine',filter},port:50025,bin:'./run'},
		// coeiroink:{port:50032,bin:'./engine/engine'},
	},
	dir:{
		dl:x=>join('engines',x,'dl'),
		bin:x=>join('engines',x,'bin'),
	},
};
export{engines};

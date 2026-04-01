import{join}from'node:path';
const engines={
	engines:{
		voicevox:{repo:'voicevox/voicevox_engine',port:50021,bin:'./run'},
		// sharevox:{repo:'sharevox/sharevox_engine',port:50025,bin:'./run'},
	},
	dir:{
		dl:x=>join('engines',x,'dl'),
		bin:x=>join('engines',x,'bin'),
	},
	filter:[
		/\.vvpp$/,
		/cpu/,
		new RegExp((_=>({win32:'windows',darwin:'macos'}[_]??_))(process.platform)),
		new RegExp(process.arch)
	]
};
export{engines};

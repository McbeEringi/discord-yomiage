#!/bin/bun
import{annotations as _cldr}from'cldr-annotations-full/annotations/ja/annotations.json';

const
cldr=_cldr.annotations,
tts=(x,f)=>((x=cldr[x]?.tts[0])?f(x):''),
seg=(s=>x=>s.segment(x))(new Intl.Segmenter()),
dn=(n=>x=>n.of(x))(new Intl.DisplayNames(['ja'],{type:'region'})),
demoji=(w,f=x=>`:${x}:`)=>(
	seg(w)[Symbol.iterator]().reduce((a,{segment:x})=>(
		a+(
			/\p{Extended_Pictographic}/u.test(x)?(
				tts(x,f)||[...x].map(x=>tts(x,f)).join('')
			):/^\p{Regional_Indicator}{2}$/u.test(x)?(
				f(dn(String.fromCharCode(...[...x].map(x=>x.codePointAt()-0x1f1a5))))
			):x
		)
	),'')
);

/*
console.log(
	demoji(`今日は☎️で連絡して、あとで✊🏻してから😄で締めた。
		👩‍💻がコードを書いて、🧑‍🔬が実験し、👨‍🚀が宇宙へ行った。
		👨🏻‍🔧と👩🏽‍🍳が協力して🍳を作った。
		👨‍👩‍👧‍👦で公園に行き、みんなで🎉した。
		🇯🇵と🇺🇸のニュースを見て📺で話題になった。
		✈︎と✈️は見た目が違うけど意味は同じ。
		👩‍❤️‍👨がデートして💖になった。
		👨🏻‍🔧と👩🏽‍🍳が👨‍👩‍👧‍👦で🇯🇵へ行き、☎️して✈️で帰り😄🎉
		`)
);
*/

export{demoji};

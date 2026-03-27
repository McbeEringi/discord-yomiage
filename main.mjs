#!/bin/bun
import{Client,GatewayIntentBits,Events}from'discord.js';
import{joinVoiceChannel,createAudioPlayer,createAudioResource,AudioPlayerStatus}from'@discordjs/voice';
import{encode}from'emoji-to-short-name';
import CFG from'./config.toml';
import token from'./token.json';

const
cli=new Client({intents:[
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildVoiceStates,
	GatewayIntentBits.GuildMessages,
	GatewayIntentBits.MessageContent
]}),
gd={},

disconn=g=>(gd[g]?.conn.destroy(),[gd[g]?.ch,delete gd[g]][0]),
cmds={
	con:{
		desc:'参加中のボイスチャンネルに接続します',
		exec:async(
			intr,
			g=intr.guild,
			ch=intr?.member?.voice?.channel
		)=>(
			!g?await intr.reply('サーバでのみ有効です'):
			!ch?await intr.reply('ボイスチャンネルに接続していないようです'):(
				((
					conn=joinVoiceChannel({channelId:ch.id,guildId:g.id,adapterCreator:g.voiceAdapterCreator}),
					p=createAudioPlayer(),
					script_q=[],running=false,run_ev=new EventTarget(),
					pl_q=[],lk=_=>_,
					url=({path,params,base=CFG.vv_http})=>Object.assign(new URL(path,base),{search:new URLSearchParams(params)}),
					pl=async({w,e})=>(
						running=true,
						await e.reduce(async(a,x)=>(
							await a,
							pl_q.length>2&&await new Promise(f=>lk=f),// queue lengt keeper
							x=await fetch(url({path:'synthesis',params:w}),{
								headers:{'Content-Type':'application/json'},
								method:'POST',
								body:JSON.stringify(x)
							}),
							x=createAudioResource(x.body),
							p.state.status==AudioPlayerStatus.Idle?p.play(x):pl_q.push(x),
							0
						),0),
						run_ev.dispatchEvent(new CustomEvent('done'))
					)
				)=>(
					p.on('stateChange',(_,x)=>x.status==AudioPlayerStatus.Idle&&pl_q.length&&p.play(pl_q.shift(),lk())),
					conn.subscribe(p),
					run_ev.addEventListener('done',_=>script_q.length?pl(script_q.shift()):(running=false)),
					gd[g.id]={
						conn,p,ch,
						play:async w=>(e=>(
							e=e.accent_phrases.reduce((a,x)=>(
								a.at(-1).push(x),x.pause_mora&&a.push([]),a
							),[[]]).map(x=>({
								...e,accent_phrases:x
							})),
							running?script_q.push({w,e}):pl({w,e})
						))({
								...await(await fetch(url({path:'audio_query',params:w}),{method:'POST'})).json(),
								prePhonemeLength:0,postPhonemeLength:0
						})
					}
				))().play({
					speaker:0,
					text:'接続しました'
				}),
				await intr.reply(`<#${ch.id}>に接続しました`)
			)
		)
	},
	dc:{
		desc:'ボイスチャンネルから切断します',
		exec:async(
			intr,
			g=intr.guild,
		)=>(
			!g?await intr.reply('サーバでのみ有効です'):
			await intr.reply(`<#${disconn(g.id)?.id}>から切断しました`)
		)
	}
};


await(async()=>await(await fetch(new URL('version',CFG.vv_http))).text())().catch(e=>(
	console.log('booting engine...'),
	Bun.spawn([CFG.vv_bin])
));


cli.on(Events.InteractionCreate,async intr=>intr.isChatInputCommand()&&await cmds[intr.commandName]?.exec(intr));
cli.on(Events.MessageCreate,async msg=>msg.author.bot||msg.guild&&await gd[msg.guildId]?.play({
	speaker:0,
	text:encode(
		msg.content.replace(/https?:\/\/[\w\-_\.!~*')(%]*/g,'URL省略')
	)+(w=>!w?'':' '+Object.entries(w).map(([x,n])=>(
		(1<n?`${n}${x=='image'?'枚':'個'}の`:'')+{
			pdf:'PDF',zip:'ZIPファイル',json:'JSONファイル',
			audio:'オーディオファイル',image:'写真',video:'ビデオ',text:'テキストファイル',
			file:'その他のファイル'
		}[x]
	)).join('、')+'。')([...msg.attachments.values()].reduce((a,x)=>(
		x=x.contentType?.split(';')[0].split('/'),
		x={pdf:1,zip:1,json:1}[x?.[1]]?x[1]:{audio:1,image:1,video:1,text:1}[x?.[0]]?x[0]:'file',
		a[x]?a[x]++:(a[x]=1),
		a
	),{}))
}));
cli.on(Events.VoiceStateUpdate,async(a,b)=>b.member.user.bot||(
	(!a.channel&&b.channel)&&await gd[a.guild.id]?.play({
		speaker:0,
		text:`${b.member.user.displayName} さんが入室しました`
	}),
	(a.channel&&!b.channel)&&(
		a.channel.members.filter(x=>!x.user.bot).size?await gd[a.guild.id]?.play({
			speaker:0,
			text:`${b.member.user.displayName} さんが退室しました`
		}):disconn(a.guild.id)
	)
));

cli.once(Events.ClientReady,async cli=>(
	console.log(`Ready! Logged in as ${cli.user.tag}`),
	await cli.application.commands.set(
		Object.entries(cmds).map(([k,v])=>({name:k,description:v.desc}))
	)
));

cli.login(token);

#!/bin/bun
import{Client,GatewayIntentBits,Events,ChannelType}from'discord.js';
import{joinVoiceChannel,createAudioPlayer,createAudioResource,AudioPlayerStatus}from'@discordjs/voice';
import{encode}from'emoji-to-short-name';
import CFG from'./config.toml';
import{token}from'./token.mjs';


const
reltime=t=>(
	t=t-Math.round(Date.now()/1000),
	Object.entries({
		year:31536000,quarter:7884000,month:2592000,
		week:345600,day:86400,hour:3600,minute:60
	}).reduce((a,[k,v])=>(
		a||v<=Math.abs(t)&&[t/v|0,k]
	),0)||[t,'second']
),
cmds={
	con:{
		desc:'参加中のボイスチャンネルに接続します',
		exec:async(
			{intr,gd},
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
						disconn:_=>(conn.destroy(),delete gd[g.id],ch),
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
				))().play((i=>({
					speaker:i,
					text:i&1?'接続したのだ':'接続しました'
				}))(Math.random()*4|0)),
				await intr.reply(`<#${ch.id}>に接続しました`)
			)
		)
	},
	dc:{
		desc:'ボイスチャンネルから切断します',
		exec:async(
			{intr,gd},
			g=intr.guild,
		)=>(
			!g?await intr.reply('サーバでのみ有効です'):
			await intr.reply(`<#${gd[g.id]?.disconn()?.id}>から切断しました`)
		)
	}
};


await(async()=>await(await fetch(new URL('version',CFG.vv_http))).text())().catch(async(e,td=new TextDecoder())=>(
	console.log('Engine booting...'),
	e=Bun.spawn([CFG.vv_bin],{stderr:'pipe'}).stderr.getReader(),
	await new Promise(async f=>{while(1)td.decode((await e.read()).value).includes(CFG.vv_http)?f():await new Promise(f=>setTimeout(f,100));}),
	e.cancel(),
	console.log('Engine ready!')
));

const sid=(await(await fetch(new URL('speakers',CFG.vv_http))).json()).flatMap(x=>x.styles.map(y=>[y.id,[y.name,x.name]])).reduce((a,[k,v])=>(a[k]=v,a),{});
// console.log(sid);



((
	cli=new Client({intents:[
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent
	]}),
	gd={}
)=>(
	cli.on(Events.InteractionCreate,async intr=>intr.isChatInputCommand()&&await cmds[intr.commandName]?.exec({intr,gd})),
	cli.on(Events.MessageCreate,async msg=>msg.author.bot||msg.guild&&await gd[msg.guildId]?.play({
		speaker:msg.author.id%4,
		text:encode(
			msg.content
				.replace(/\n/g,' ')
				.replace(/https?:\/\/([^?#\/\s]+)\S*/g,(_,x)=>x.replace(/\./g,'ドット'))
				.replace(/<@!?(\d+)>/g,(_,x)=>msg.mentions?.members.get(x)?.displayName)
				.replace(/<#(\d+)>/g,(_,x)=>(
					x=msg.mentions?.channels.get(x),
					(x?.type==ChannelType.GuildVoice?'ボイチャ':'')+x?.name
				))
				.replace(/<@&(\d+)>/g,(_,x)=>'@'+msg.mentions?.roles.get(x)?.name)
				.replace(/<a?(:[\w_]+:)\d+>/g,'$1')
				.replace(/<t:(\d+)(:([tTdDfFsSR]))?>/g,(_,x,__,y)=>y=='R'?(
					new Intl.RelativeTimeFormat('ja').format(...reltime(x)).replace(/\s/g,'')
				):new Intl.DateTimeFormat('ja',{
					t:{timeStyle:"full"},d:{dateStyle:"full"}
				}[y?.toLowerCase()]??{dateStyle:"full",timeStyle:"full"}).format(new Date(x*1000)))
		)+(w=>!w?'':' '+Object.entries(w).map(([x,n])=>(
			(1<n?`${n}${x=='image'?'枚':'個'}の`:'')+{
				pdf:'PDF',zip:'ZIPファイル',json:'JSONファイル',
				audio:'オーディオファイル',image:'写真',video:'ビデオ',text:'テキストファイル',
				file:'その他のファイル'
			}[x]
		)).join('、')+'。')([...msg.attachments.values()].reduce((a,x)=>(
			x=x.contentType?.split(';')[0].split('/'),
			x={pdf:1,zip:1,json:1}[x?.[1]]?x[1]:{audio:1,image:1,video:1,text:1}[x?.[0]]?x[0]:'file',
			a[x]=(a[x]??0)+1,
			a
		),{}))
	})),
	cli.on(Events.VoiceStateUpdate,async(a,b)=>b.member.user.bot||(
		(!a.channel&&b.channel&&b.channel.id==gd[a.guild.id]?.ch.id)&&await gd[a.guild.id]?.play({
			// speaker:0,
			speaker:b.member.id%4,
			text:`${b.member.user.displayName} さんが入室し${b.member.id%2?'たのだ':'ました'}`
		}),
		(a.channel&&!b.channel&&a.channel.id==gd[a.guild.id]?.ch.id)&&(
			a.channel.members.filter(x=>!x.user.bot).size?await gd[a.guild.id]?.play({
				// speaker:0,
				speaker:b.member.id%4,
				text:`${b.member.user.displayName} さんが退室し${b.member.id%2?'たのだ':'ました'}`
			}):gd[a.guild.id]?.disconn()
		)
	)),
	cli.once(Events.ClientReady,async cli=>(
		console.log(`Logged in as ${cli.user.tag}`),
		await cli.application.commands.set(
			Object.entries(cmds).map(([k,v])=>({name:k,description:v.desc}))
		)
	)),
	cli.login(token),
	cli
))();

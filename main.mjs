#!/bin/bun
import{Client,GatewayIntentBits,Events}from'discord.js';
import{joinVoiceChannel,createAudioPlayer,createAudioResource,AudioPlayerStatus}from'@discordjs/voice';
import CFG from'./config.toml';
import token from'./token.json';

const
cli=new Client({intents:[
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildVoiceStates,
	GatewayIntentBits.GuildMessages,
	GatewayIntentBits.MessageContent
]}),
p=createAudioPlayer(),

query=({path,params,base=CFG.vv_http})=>Object.assign(new URL(path,base),{search:new URLSearchParams(params)}),
post=async({path,params,body,method='POST',headers})=>await fetch(query({path,params}),{headers,method,body}),
getAudioQuery=async w=>await(await post({path:'audio_query',params:w})).json(),
synth=async w=>await post({
	path:'synthesis',params:w,
	headers:{'Content-Type':'application/json'},
	body:JSON.stringify(await getAudioQuery(w))
}),
play=async w=>p.play(createAudioResource((await synth(w)).body)),

disconn=_=>(conn&&conn.disconnect(),conn=null),
cmds={
	con:Object.assign(async intr=>{
		const ch=intr?.member?.voice?.channel;
		if(!ch)return intr.reply('VCに接続していないようです');

		conn=joinVoiceChannel({
			channelId:ch.id,
			guildId:ch.guild.id,
			adapterCreator:ch.guild.voiceAdapterCreator
		});
		conn.subscribe(p);

		await play({
			speaker:0,
			text:'接続しました'
		});

		await intr.reply('ok');
	},{desc:'connect to vc'}),
	dc:Object.assign(intr=>(disconn(),intr.reply('ok')),{desc:'disconnect from vc'})
};
let conn;


await(async()=>await(await fetch(new URL('version',CFG.vv_http))).text())().catch(e=>(
	console.log('booting vv-engine...'),
	Bun.spawn([CFG.vv_bin])
));


cli.on(Events.InteractionCreate,async intr=>intr.isChatInputCommand()&&await cmds[intr.commandName]?.(intr));
cli.on(Events.MessageCreate,async msg=>msg.author.bot||await play({
	speaker:0,
	text:msg.content
}));
cli.on(Events.VoiceStateUpdate,async(a,b)=>b.member.user.bot||(
	(!a.channel&&b.channel)&&await play({
		speaker:0,
		text:`${b.member.user.tag} さんが入室しました`
	}),
	(a.channel&&!b.channel)&&
		a.channel.members.filter(x=>!x.user.bot).size?await play({
			speaker:0,
			text:`${b.member.user.tag} さんが退室しました`
		}):disconn()
));

cli.once(Events.ClientReady,async cli=>(
	console.log(`Ready! Logged in as ${cli.user.tag}`),
	await cli.application.commands.set(
		Object.entries(cmds).map(([k,v])=>({name:k,description:v.desc}))
	)
));

cli.login(token);

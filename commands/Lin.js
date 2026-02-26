

// 機器人問候master
const replies = [
    "有什麼需求嗎?",
    "主人請喝茶!",
    "請吩咐，主人!"
]

export function Lin(msg){
    msg.reply("您好! 主人");
    const index = Math.floor(Math.random() * replies.length);
    msg.channel.send(replies[index]);
}



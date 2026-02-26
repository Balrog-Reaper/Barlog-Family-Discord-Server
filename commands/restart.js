
// 機器人重啟指令
export function restart(msg){
    if (msg.author.id !== process.env.MYUSERID) return; // 只有你能關掉它
        msg.reply("正在關閉系統並重啟...").then(() => {
        console.log("Restarting...");
        process.exit(); // 結束目前程序
    });
}

import { gif } from "./commands/gif.js";
import { Lin } from "./commands/Lin.js";
import { restart } from "./commands/restart.js";


const commands = {
    Lin,
    gif,
    restart,
}

export async function gotMessage(msg) {

    // 排除機器人自己的訊息，防止無限循環
    if (msg.author.bot) return;

    // 表示有收到訊息
    console.log(`收到訊息: ${msg.content}`);


    // 讀取標註機器人的訊息
    const botMention = new RegExp(`^<@!?${msg.client.user.id}>`);

    // 設定機器人在特定頻道活動
    if (msg.channel.id == process.env.CHANNELID && botMention.test(msg.content)) {

        // 初步擷取訊息並且設定指令類型
        msg.content = msg.content.replace(botMention, "").trim();
        let tokens = msg.content.split(" ");
        let command = tokens.shift();

        // 正式辨識指令類類並執行
        try {
            if (command.charAt(0) === "!") {
                command = command.substring(1);
                commands[command](msg, tokens);
            }
        } catch (error) {
            // 報錯並且檢視錯誤資訊
            console.error("❌ 發生錯誤了：", error.message);
        }
    }
}
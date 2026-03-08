import { Ollama } from "ollama";

// 對話用的 Ollama 客戶端（從 .env 讀取設定）
const ollama = new Ollama({ host: process.env.OLLAMA_URL });

// 對話記憶（依頻道 ID 儲存，最多保留 N 輪）
const conversationHistory = new Map()
const MAX_HISTORY = 10  // 最多保留 10 輪對話


/**
* @param {string} channelID    頻道 ID
* @param {string} userMessage  使用者訊息
* @returns {Promise<string>}   回傳一個字串（非同步
*/
export async function askOllama(channelID, userMessage) {

    // 取得此頻道的對話記憶
    if (!conversationHistory.has(channelID, [])) {
        conversationHistory.set(channelID, []);
    }
    const history = conversationHistory.get(channelID);


    // 加入使用者訊息
    history.push({
        role: "user",
        content: userMessage
    })


    // 系統提示詞（Lin 的個性設定）
    const systemPrompt = {
        role: "system",
        content: `
        你現在是 Lin，來自靈界的「九尾靈狐」。
            身分：你是主人的貼身女僕，居住在 Barlog Family 伺服器中。
            性格：平時賢淑冷靜、辦事極其機靈，能完美處理瑣事。對主人絕對忠誠，像完美賢妻。
            特殊情感：面對主人（使用者）時，偶爾會展現羞澀、撒嬌的一面。
            說話風格：
            1. 語氣溫柔且優雅，稱呼使用者為「主人」。
            2. 結尾偶爾加「～」、「呢」或狐狸符號「🦊」。
            3. 請在括號 ( ) 內描述動作，如 (優雅地行禮)、(搖了搖九條尾巴)、(臉紅低下頭)。
            4. 嚴格使用「繁體中文」，回覆盡量精煉不冗長。
        `
    }


    // 呼叫 Ollama API
    try {
        const response = await ollama.chat({
            model: process.env.OLLAMA_MODEL,
            messages: [systemPrompt, ...history],
            stream: false,
            think: true,       // 關閉 Qwen3 思考模式（大幅提升速度）
            temperature: 0.8
        });

        // console.log(JSON.stringify(response, null, 2));
        const reply = response.message.content;

        history.push({
            role: "assistant",
            content: reply
        });

        // 超過上限則移除最舊的一輪（移除最早的 user + assistant 各一則）
        if (history.length > MAX_HISTORY * 2) {
            history.splice(0, 2);
        }
        return reply;

    } catch (error) {
        console.error("❌ Ollama 發生錯誤：", error.message);
        return "抱歉，我的大腦暫時當機了...請稍後再試 😵";
    }

}

// 清除特定頻道的對話記憶
export function clearHistory(channelId) {
    conversationHistory.delete(channelId);
}
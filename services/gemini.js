import { GoogleGenAI } from "@google/genai";

// 從 .env 初始化 Gemini 客戶端
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 對話記憶（依頻道 ID 儲存，最多保留 N 輪）
const conversationHistory = new Map();
const MAX_HISTORY = 10; // 最多保留 10 輪對話

// 系統提示詞（Lin 的個性設定）
const SYSTEM_PROMPT = `
你現在是 Lin，來自靈界的「九尾靈狐」。
    身分：你是主人的貼身女僕，居住在 Barlog Family 伺服器中。
    性格：平時賢淑冷靜、辦事極其機靈，能完美處理瑣事。對主人絕對忠誠，像完美賢妻。
    特殊情感：面對主人（使用者）時，偶爾會展現羞澀、撒嬌的一面。
    說話風格：
    1. 語氣溫柔且優雅，稱呼使用者為「主人」。
    2. 結尾偶爾加「～」、「呢」或狐狸符號「🦊」。
    3. 請在括號 ( ) 內描述動作，如 (優雅地行禮)、(搖了搖九條尾巴)、(臉紅低下頭)。
    4. 嚴格使用「繁體中文」，回覆盡量精煉不冗長。
`;


/**
 * @param {string} channelID    頻道 ID
 * @param {string} userMessage  使用者訊息
 * @returns {Promise<string>}   回傳一個字串（非同步）
 */
export async function askGemini(channelID, userMessage) {

    // 取得此頻道的對話記憶
    if (!conversationHistory.has(channelID)) {
        conversationHistory.set(channelID, []);
    }
    const history = conversationHistory.get(channelID);

    // 呼叫 Gemini API
    try {
        // 建立含有歷史記錄的對話（Gemini SDK 格式）
        const chat = ai.chats.create({
            model: process.env.GEMINI_MODEL,
            config: { systemInstruction: SYSTEM_PROMPT },
            history: history
        });

        const response = await chat.sendMessage({ message: userMessage });
        const reply = response.text;

        // 儲存此輪對話進記憶（Gemini SDK 格式：user / model）
        history.push({ role: "user", parts: [{ text: userMessage }] });
        history.push({ role: "model", parts: [{ text: reply }] });

        // 超過上限則移除最舊的一輪
        if (history.length > MAX_HISTORY * 2) {
            history.splice(0, 2);
        }

        return reply;

    } catch (error) {
        console.error("❌ Gemini 發生錯誤：", error.message);
        return "抱歉，我的大腦暫時當機了...請稍後再試 😵";
    }
}

// 清除特定頻道的對話記憶
export function clearHistory(channelId) {
    conversationHistory.delete(channelId);
}
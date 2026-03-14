# 🦊 LinBot — Barlog Family Discord 機器人

> Lin 是居住於 Barlog Family 伺服器的九尾靈狐，身兼賢淑女僕與 AI 對話夥伴。  
> 本文件說明 LinBot 的程式架構、指令設計與 LLM 整合方式。

---

## 📁 專案結構

```
LinBot/
├── index.js              # 機器人主入口，建立 Discord Client 並啟動
├── commands.js           # 訊息路由邏輯（指令分派 ＆ AI 對話觸發）
├── commands/
│   ├── Lin.js            # !Lin 問候指令
│   ├── gif.js            # !gif GIF 搜尋指令
│   ├── restart.js        # !restart 重啟指令（限管理員）
│   └── chat.js           # AI 對話入口（非指令訊息）
├── services/
│   ├── ollama.js         # （已棄用）Ollama LLM 服務封裝
│   └── gemini.js         # Google Gemini LLM 服務封裝（對話記憶 ＆ API 呼叫）
├── documents/
│   └── README.md         # 本文件
├── implements/           # 實作計畫紀錄
├── .env                  # 環境變數（不納入版控）
└── package.json
```

---

## ⚙️ 環境變數設定（`.env`）

| 變數名稱          | 說明                                      |
| ----------------- | ----------------------------------------- |
| `BOTTOKEN`        | Discord Bot Token                         |
| `CHANNELID`       | 機器人監聽的目標頻道 ID                    |
| `MYUSERID`        | 管理員（你）的 Discord 使用者 ID           |
| `GEMINI_API_KEY`  | Google Gemini API 金鑰（Google AI Studio） |
| `GEMINI_MODEL`    | 使用的模型名稱，例如 `gemini-2.5-flash`    |
| `KLIPYTOKEN`      | Klipy GIF API 金鑰                        |

---

## 🚀 啟動方式

```bash
# 安裝依賴
npm install

# 啟動機器人
node index.js
```

> **前提**：需先至 [Google AI Studio](https://aistudio.google.com/apikey) 取得 Gemini API Key 並填入 `.env`。

---

## 🏗️ 架構說明

### 1. 入口初始化（`index.js`）

建立 Discord `Client`，並宣告所需的 Gateway Intents：

| Intent                   | 用途               |
| ------------------------ | ------------------ |
| `Guilds`                 | 伺服器基本事件     |
| `GuildMessages`          | 監聽伺服器訊息     |
| `MessageContent`         | 讀取訊息文字內容   |
| `GuildMembers`           | 成員加入／離開事件 |
| `DirectMessages`         | 私訊處理           |
| `GuildVoiceStates`       | 語音頻道狀態       |

機器人上線後監聽 `messageCreate` 事件，交由 `commands.js` 處理。

---

### 2. 訊息路由（`commands.js`）

```
收到訊息
  └─ 是機器人自己？ → 忽略
  └─ 在目標頻道 & 有 @Lin？
        ├─ 指令（! 開頭）→ 分派至對應 command function
        └─ 純文字           → 交給 chat() 進行 AI 對話
```

**路由流程：**
1. 過濾機器人自身訊息，防止無限循環。
2. 以 `CHANNELID` 限定活動頻道；以 `@Lin` 標註作為觸發條件。
3. 去除 `@Lin` 後解析訊息：首個 token 若以 `!` 開頭則視為指令，否則整段文字送入 AI。

---

## 📜 指令列表

### `!Lin`
- **描述**：問候指令，Lin 會回應問候語。
- **用法**：`@Lin !Lin`
- **回應範例**：`您好! 主人` + 隨機從以下選一句：
  - 「有什麼需求嗎?」
  - 「主人請喝茶!」
  - 「請吩咐，主人!」

---

### `!gif [關鍵字]`
- **描述**：搜尋並傳送 GIF 圖片。
- **用法**：`@Lin !gif 貓咪`
- **說明**：
  - 未輸入關鍵字時，預設搜尋 `Barlog`。
  - 透過 [Klipy API](https://klipy.com/) 搜尋，從前五筆結果隨機傳送一張。

---

### `!restart`
- **描述**：重啟機器人程序（僅限管理員）。
- **用法**：`@Lin !restart`
- **權限**：僅 `MYUSERID` 對應的使用者可執行；執行後呼叫 `process.exit()` 結束程序。

---

### AI 對話（無指令前綴）
- **描述**：對 Lin 說任何話，她都會用 AI 回應。
- **用法**：`@Lin 今天天氣怎麼樣？`
- **流程**：
  1. 立刻回覆「🦊 *（Lin 正在思考中...）*」作為佔位訊息。
  2. 將文字送入 `askOllama()`（封裝 Gemini API）。
  3. 收到回應後以 `thinkingMsg.edit()` 更新訊息內容。

---

## 🤖 LLM 模型整合（`services/gemini.js`）

### 使用技術
- **SDK**：`@google/genai`（Google Gen AI JavaScript SDK）
- **模型**：`gemini-2.5-flash`（透過 `GEMINI_MODEL` 環境變數設定，可替換）
- **API**：Google Gemini API（免費方案：1500 次/天）

### 對話記憶機制

| 項目         | 說明                                                         |
| ------------ | ------------------------------------------------------------ |
| 儲存方式     | `Map<channelID, message[]>`，以頻道 ID 為鍵值               |
| 最大輪數     | `MAX_HISTORY = 10`（10 輪，即 20 則訊息）                    |
| 超限處理     | 超過上限後移除最早一輪（1 則 user + 1 則 model）              |
| 記憶清除     | `clearHistory(channelId)` 可清除指定頻道的所有對話記憶        |

### API 呼叫方式

```js
const chat = ai.chats.create({
    model: process.env.GEMINI_MODEL,
    config: { systemInstruction: SYSTEM_PROMPT },
    history: history   // 傳入頻道的對話歷史
});
const response = await chat.sendMessage({ message: userMessage });
```

### Lin 的角色設定（System Prompt）

| 項目     | 設定內容                                          |
| -------- | ------------------------------------------------- |
| 身分     | 九尾靈狐，Barlog Family 伺服器的貼身女僕           |
| 性格     | 平時賢淑冷靜、機靈辦事；對主人忠誠，偶爾羞澀撒嬌   |
| 稱謂     | 稱使用者為「主人」                                 |
| 語言     | 嚴格使用繁體中文                                   |
| 說話風格 | 語氣溫柔優雅，結尾加「～」「呢」或「🦊」           |
| 動作描述 | 以括號 `( )` 包裹動作，例如：`(優雅地行禮)`        |

---

## 📦 依賴套件

| 套件             | 版本       | 用途                        |
| ---------------- | ---------- | --------------------------- |
| `discord.js`     | ^14.25.1   | Discord Bot 核心框架        |
| `dotenv`         | ^17.3.1    | 讀取 `.env` 環境變數        |
| `node-fetch`     | ^3.3.2     | HTTP 請求（Klipy GIF API）  |
| `ollama`         | ^0.6.3     | （已棄用）Ollama LLM SDK     |
| `@google/genai`  | latest     | Google Gemini AI SDK        |

---

## 🔒 注意事項

- `.env` 已加入 `.gitignore`，請勿將 Token 或 API Key 上傳至版控。
- `!restart` 指令僅限 `MYUSERID` 使用，可防止任意使用者關閉機器人。
- LLM 對話記憶僅儲存在記憶體中，機器人重啟後歷史記錄將清空。
- Gemini 免費方案限制：`gemini-2.5-flash` 為 **1500 次/天、15 次/分**。

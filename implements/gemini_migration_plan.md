# 🔄 LinBot AI 引擎遷移：Ollama → Google Gemini

> 作成日期：2026-03-14  
> 目標：將 LinBot 的 AI 對話後端從本機 Ollama 改為雲端 Google Gemini API，提升穩定性與回應速度。

---

## 📋 遷移背景

| 項目 | 原方案（Ollama） | 新方案（Gemini） |
|------|----------------|----------------|
| 執行環境 | 本機 GPU（RTX 4050 6GB） | Google 雲端 |
| 模型 | `qwen3.5:4b`（本地） | `gemini-2.5-flash`（雲端） |
| 需要本機啟動 | ✅ 需要 `ollama serve` | ❌ 不需要 |
| 速度問題 | VRAM 不足時 CPU 混跑 | 雲端統一快速 |
| 費用 | 免費（耗電） | 免費方案 1500 次/天 |

---

## 📁 檔案變更清單

### 🆕 新增檔案

#### `services/gemini.js`
- 使用 `@google/genai` SDK 與 Google Gemini API 溝通
- 保留與 `services/ollama.js` 完全相同的 export 介面（`askOllama`、`clearHistory`）
- 對話記憶機制不變：`Map<channelID, message[]>`，最多保留 10 輪

```js
// 使用 ai.chats.create() 建立多輪對話會話
const chat = ai.chats.create({
    model: process.env.GEMINI_MODEL,
    config: { systemInstruction: SYSTEM_PROMPT },
    history: history
});
```

> **注意**：Gemini 訊息格式中 `parts` 為陣列（設計上支援多種內容混合，如文字＋圖片）

#### `implements/gemini_migration_plan.md`（本文件）

---

### 🔧 修改檔案

#### `.env`
```diff
-# Ollama 設定
-OLLAMA_URL=http://localhost:11434
-OLLAMA_MODEL=qwen3.5:4b

+# Google Gemini 設定
+GEMINI_API_KEY=gen-lang-client-xxxxxxxx
+GEMINI_MODEL=gemini-2.5-flash
```

#### `commands/chat.js`
- 更新 import 來源：`services/ollama.js` → `services/gemini.js`
- 改用「立刻回覆佔位訊息 + 完成後 edit」方式，提升使用者體驗：
```js
const thinkingMsg = await msg.reply("🦊 *（Lin 正在思考中...）*");
// ... 等待 AI 回應 ...
await thinkingMsg.edit(replyResult);
```

#### `documents/README.md`
- 更新專案結構（新增 `services/gemini.js`）
- 更新環境變數說明（`OLLAMA_*` → `GEMINI_*`）
- 更新 LLM 整合章節（Ollama → Gemini SDK）
- 更新依賴套件表格

---

## 📦 套件異動

```bash
# 新增
npm install @google/genai

# 保留（暫未移除，避免破壞相容性）
# npm uninstall ollama
```

---

## ✅ 實作進度追蹤

- [x] **Step 1**：安裝 `@google/genai` 套件
- [x] **Step 2**：建立 `services/gemini.js`（Gemini API 封裝）
- [x] **Step 3**：更新 `commands/chat.js`（import 改為 gemini.js）
- [x] **Step 4**：更新 `.env`（Ollama 設定 → Gemini 設定）
- [x] **Step 5**：更新 `documents/README.md`
- [ ] **Step 6**：Discord 實機測試

---

## 🧪 驗證計畫

| # | 測試情境 | 預期結果 |
|---|----------|----------|
| 1 | `@Lin 你好！` | Lin 用 Gemini AI 回覆自然對話 |
| 2 | 連續對話 `@Lin 你剛才說什麼？` | Lin 依記憶回答前一輪內容 |
| 3 | `@Lin !gif 貓咪` | 仍然正常執行 gif 指令 |
| 4 | `@Lin !Lin` | 仍然正常回覆固定問候語 |
| 5 | `@Lin !restart` | 仍然正常重啟（限管理員） |
| 6 | API Key 錯誤時 `@Lin 測試` | Lin 回覆友善的錯誤訊息，不崩潰 |

---

## 🔮 未來擴充（Optional）

- `!clear` 指令：清除對話記憶
- 支援私訊（DM）對話
- 接入 Google Search Grounding（讓 Gemini 能搜尋即時資訊）
- 對話記憶持久化（寫入 JSON 或資料庫）

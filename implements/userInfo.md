# 🦊 userInfo 指令實作計畫

> **實作目標**：新增 `>userInfo [標註某人]` 指令，讓使用者能取得某人的 Discord 資訊，但該資訊「**只有傳訊者（下指令的人）才能看見**」。

---

## ⚠️ 重要前提：「只有傳訊者看見」的技術限制
在 Discord.js 開發中，若想達成「只有自己才看得到的回覆 (Ephemeral Message / 隱藏訊息)」，通常需要使用 **斜線指令 (Slash / Application Commands)** 搭配 `interaction.reply({ ephemeral: true })` 屬性。

但由於目前 LinBot 的設計是基於**監聽一般文字訊息 (Text Message)**，且使用 `> 指令` 為前綴，因此無法在公開頻道回覆所謂的隱藏訊息。
為了解決這項限制，**我們可以使用「私訊 (Direct Message)」的方式作為替代方案。**機器人會擷取該資料並在私底下偷偷寄給主人，這樣就別人看不見了！

---

## 1. 撰寫方式與架構
- **抓取對象**：運用 Discord.js 提供的 `msg.mentions` 功能來捕捉指令中標註 (@) 的成員。
- **資料提取**：從 `GuildMember` 與 `User` 物件提取資訊，包含名稱、ID、加入伺服器時間及頭像。
- **組合回傳**：透過 `EmbedBuilder` 排好版面，接著經由 `msg.author.send()` 將其發送為私訊。

## 2. 會用到的套件工具與物件
- **核心框架**：`discord.js`
- **關鍵物件**：
  1. `Mentions`：`msg.mentions.members.first()`，負責讀取第一個被 tag 的人。
  2. `GuildMember` / `User`：獲取包含 `id`, `username`, `displayName`, `joinedTimestamp`, `displayAvatarURL()` 等使用者屬性。
  3. `EmbedBuilder`：建構右方附帶側邊顏色的美美卡片訊息格式 (Embed)。
  4. `Message`：透過 `msg.author.send({ ... })` 來達成「只有自己看得見」的私訊效果。

---

## 3. 實作內容 (Implementation Details)

### 檔案一：`commands/userInfo.js`
請在 `commands` 資料夾內建立此檔案並貼上以下原始碼：

```javascript
import { EmbedBuilder } from "discord.js";

export async function userInfo(msg, args) {
    // 1. 取得指令中被標註的對手 (第一位)
    const targetMember = msg.mentions.members.first();
    
    // 如果沒有標註對象，提醒主人
    if (!targetMember) {
        return await msg.reply("主人，請標註一位您想調查的對象喔！例如：`>userInfo @某人` 🦊");
    }

    // 2. 獲取代查對象的基礎 User 屬性
    const user = targetMember.user;
    
    // 把時間戳轉換成 Discord 的「當地時間顯示標籤」格式 <t:Timestamp:d> (短日期格式，例如 2026/03/17)
    const joinedTimeStr = `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:d>`;
    
    // 3. 繪製精美的調查報告 (嵌入訊息)
    const embed = new EmbedBuilder()
        .setTitle(`📌 秘密調查報告：${user.username}`)
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
        .setColor(0x9B59B6) // 採用調和區的色系
        .addFields(
            { name: "👤 伺服器暱稱", value: targetMember.displayName || "無", inline: true },
            { name: "🆔 使用者 ID", value: user.id, inline: true },
            { name: "🤖 機器人判定", value: user.bot ? "是" : "否", inline: true },
            { name: "📥 加入伺服器時間", value: joinedTimeStr, inline: false }
        )
        .setFooter({ text: "Lin 為您悄悄準備的調查結果 🦊" })
        .setTimestamp();

    try {
        // 4. 以「私訊」方式傳送出去 (達成只有傳送者可看的條件)
        await msg.author.send({ embeds: [embed] });
        
        // 可選：在原對話處用打勾符號回應，表示成功完成指令
        await msg.react("✅"); 
    } catch (error) {
        console.error("無法發送私訊給使用者:", error);
        await msg.reply("主人... 您的「允許來自伺服器成員的私人訊息」似乎被關閉了呢，Lin 無法悄悄地把資料遞給您 😢");
    }
}
```

### 檔案二：`commands.js` (註冊指令)
接著在 `commands.js` 最上方將 `userInfo.js` 引用進來，並註冊進入指令池中。

```javascript
// ... 其他引入
import { userInfo } from "./commands/userInfo.js"; // <--- 新增這行

const commands = {
    Lin,
    gif,
    restart,
    help,
    userInfo, // <--- 新增這行
}
// ... 後方針對純文字指令的分派邏輯保持不變即可
```

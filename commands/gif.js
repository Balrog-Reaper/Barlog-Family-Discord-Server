
// 機器人search GIF
export async function gif(msg, args) {
    // search GIF 的關鍵詞
    let keywords = "Barlog"
    if (args.length > 0) {
        keywords = args.join(" ");
    }

    // API連線抓取gif圖片
    let url = `https://api.klipy.com/api/v1/${process.env.KLIPYTOKEN}/gifs/search?page=1&per_page=5&q=${keywords}&locale=zh-TW&content_filter=null`
    let response = await fetch(url);
    let json = await response.json();

    // 傳送gif圖片至discord伺服器的頻道
    const index = Math.floor(Math.random() * json.data.data.length);
    const targetGif = json.data.data[index].file.hd.gif.url;
    msg.channel.send(targetGif);
    msg.channel.send(`GIF from Klipy： ${keywords}`)
}


const { google } = require("googleapis");

module.exports = async (req, res) => {
  try {
    const code = req.query.code;
    const state = req.query.state;

    if (!code || !state) {
      return res.status(400).send("Invalid authorization request.");
    }

    let stateData;

    try {
      stateData = JSON.parse(
        Buffer.from(state, "base64url").toString("utf8")
      );
    } catch (e) {
      return res.status(400).send("Invalid state.");
    }

    const telegramId = stateData.telegram_id;

    if (!telegramId) {
      return res.status(400).send("Telegram user ID missing.");
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const youtube = google.youtube({
      version: "v3",
      auth: oauth2Client
    });

    const channelResult = await youtube.channels.list({
      part: "id",
      forHandle: "@modskaadda"
    });

    if (
      !channelResult.data.items ||
      channelResult.data.items.length === 0
    ) {
      return res.status(404).send("YouTube channel not found.");
    }

    const targetChannelId = channelResult.data.items[0].id;

    const subResult = await youtube.subscriptions.list({
      part: "snippet",
      mine: true,
      maxResults: 50
    });

    const subscribed = (subResult.data.items || []).some(
      item =>
        item.snippet &&
        item.snippet.resourceId &&
        item.snippet.resourceId.channelId === targetChannelId
    );

    if (!subscribed) {
      return res.send(`
        <html>
          <body style="font-family:Arial;text-align:center;padding:40px">
            <h2>❌ YouTube Subscription Required</h2>
            <p>Please subscribe to @modskaadda first.</p>
            <p>Then come back and try again.</p>
          </body>
        </html>
      `);
    }

    // YouTube verified successfully
    // Send verification button back to Telegram
    const telegramApi =
      "https://api.telegram.org/bot" +
      process.env.BOT_TOKEN +
      "/sendMessage";

    const tgResponse = await fetch(telegramApi, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: telegramId,
        text:
          "<b>╭━━━〔 ✅ YOUTUBE VERIFIED 〕━━━╮</b>\n" +
          "<b>┃</b>\n" +
          "<b>┃  YouTube subscription verified successfully.</b>\n" +
          "<b>┃</b>\n" +
          "<b>┃  अब नीचे Verify Now दबाओ.</b>\n" +
          "<b>┃</b>\n" +
          "<b>╰━━━━━━━━━━━━━━━━━━━━━━━━╯</b>",
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "I Joined — Verify Now",
                callback_data: "/yt_verified"
              }
            ]
          ]
        }
      })
    });

    if (!tgResponse.ok) {
      throw new Error("Telegram message failed.");
    }

    return res.send(`
      <html>
        <body style="font-family:Arial;text-align:center;padding:40px">
          <h2>✅ YouTube Verified</h2>
          <p>Verification successful.</p>
          <p>Return to Telegram and press Verify Now.</p>
        </body>
      </html>
    `);

  } catch (error) {
    console.error(error);
    return res.status(500).send("YouTube verification failed.");
  }
};

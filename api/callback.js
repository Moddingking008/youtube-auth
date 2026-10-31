const { google } = require("googleapis");

module.exports = async (req, res) => {
  try {
    const code = req.query.code;
    const state = req.query.state;

    if (!code || !state) {
      return res.status(400).send("Invalid authorization request.");
    }

    // Telegram user ID recover
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

    // MODS KA ADDA channel
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

    // Check user's YouTube subscriptions
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
            <p>Please subscribe to @modskaadda.</p>
            <p>Then return to Telegram and press Verify Now again.</p>
          </body>
        </html>
      `);
    }

    // Successful verification
    return res.send(`
      <html>
        <body style="font-family:Arial;text-align:center;padding:40px">
          <h2>✅ YouTube Verified</h2>
          <p>Your YouTube subscription has been verified.</p>
          <p>You can return to Telegram now.</p>
        </body>
      </html>
    `);

  } catch (error) {
    console.error(error);
    return res.status(500).send("YouTube verification failed.");
  }
};

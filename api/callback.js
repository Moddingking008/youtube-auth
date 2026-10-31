const { google } = require("googleapis");

module.exports = async (req, res) => {
  try {
    const code = req.query.code;

    if (!code) {
      return res.status(400).send("Authorization code missing.");
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Google se access token lena
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const youtube = google.youtube({
      version: "v3",
      auth: oauth2Client
    });

    // @modskaadda ka channel ID
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

    // User ki subscriptions check
    const subResult = await youtube.subscriptions.list({
      part: "snippet",
      mine: true,
      maxResults: 50
    });

    const subscribed =
      (subResult.data.items || []).some(
        item =>
          item.snippet &&
          item.snippet.resourceId &&
          item.snippet.resourceId.channelId === targetChannelId
      );

    if (!subscribed) {
      return res.send(`
        <html>
          <body style="font-family:Arial;text-align:center;padding:40px">
            <h2>❌ YouTube Subscription Not Found</h2>
            <p>Please subscribe to @modskaadda and try verification again.</p>
          </body>
        </html>
      `);
    }

    return res.send(`
      <html>
        <body style="font-family:Arial;text-align:center;padding:40px">
          <h2>✅ YouTube Verified</h2>
          <p>Your subscription has been verified successfully.</p>
          <p>You can return to Telegram now.</p>
        </body>
      </html>
    `);

  } catch (error) {
    console.error(error);
    return res.status(500).send("YouTube verification failed.");
  }
};

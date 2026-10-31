const crypto = require("crypto");

module.exports = async (req, res) => {
try {
const telegramId = req.query.telegram_id;

if (!telegramId) {
  return res.status(400).send("Telegram user ID missing.");
}

const state = Buffer.from(
  JSON.stringify({
    telegram_id: String(telegramId),
    nonce: crypto.randomBytes(16).toString("hex")
  })
).toString("base64url");

const params = new URLSearchParams({
  client_id: process.env.GOOGLE_CLIENT_ID,
  redirect_uri: process.env.GOOGLE_REDIRECT_URI,
  response_type: "code",
  access_type: "offline",
  prompt: "consent",
  scope: "https://www.googleapis.com/auth/youtube.readonly",
  state
});

return res.redirect(
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  params.toString()
);

} catch (error) {
console.error(error);
return res.status(500).send("Authorization failed.");
}
};

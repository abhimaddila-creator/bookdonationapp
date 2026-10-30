// InstaClone Cloud Functions
//
// exchangeIgCode: lets users sign in "with Instagram".
//
// Flow (the app never sees the Instagram app secret):
//   1. The browser sends Instagram's one-time code to this function.
//   2. This function swaps the code for an Instagram access token
//      (proving who the user is), using the secret stored on the server.
//   3. It fetches the user's Instagram username.
//   4. It returns a Firebase Custom Token so the user is signed in.

const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

const IG_APP_ID = process.env.IG_APP_ID || "";
const IG_APP_SECRET = process.env.IG_APP_SECRET || "";

exports.exchangeIgCode = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Use POST");
    return;
  }

  const { code, redirectUri } = req.body || {};
  if (!code || !redirectUri) {
    res.status(400).json({ error: "Missing required fields: code, redirectUri" });
    return;
  }
  if (!IG_APP_ID || !IG_APP_SECRET) {
    res
      .status(500)
      .json({ error: "Instagram app credentials are not configured. Ask the developer to set IG_APP_ID and IG_APP_SECRET in functions/.env." });
    return;
  }

  try {
    // 1) Exchange the one-time code for an Instagram access token.
    const tokenParams = new URLSearchParams({
      code,
      client_id: IG_APP_ID,
      client_secret: IG_APP_SECRET,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    });

    const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams,
    });
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_message || tokenData.error?.message || "Instagram rejected the code");
    }

    // 2) Fetch the user's Instagram identity.
    const meRes = await fetch(
      `https://graph.instagram.com/me?fields=id,username,account_type&access_token=${tokenData.access_token}`
    );
    const me = await meRes.json();
    if (!meRes.ok || !me.id) {
      throw new Error(me.error?.message || "Could not read your Instagram profile");
    }

    // 3) Sign this Instagram identity into Firebase.
    //    The uid is stable ("ig_<instagram user id>"), so logging in
    //    again later logs you into the same InstaClone account.
    const uid = `ig_${me.id}`;
    const customToken = await admin.auth().createCustomToken(uid, {
      igUsername: me.username,
      igAccountType: me.account_type,
    });

    res.json({ token: customToken, uid, username: me.username, accountType: me.account_type });
  } catch (err) {
    res.status(500).json({ error: err.message || "Instagram login failed" });
  }
});
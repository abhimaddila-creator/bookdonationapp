// InstaClone Instagram login (hosted on a free Cloudflare Worker).
//
// The browser can never hold the Instagram app secret, so the exchange
// happens here. This worker:
//   1. Receives Instagram's one-time code from the browser
//   2. Swaps it for an access token using the app secret (kept secret here)
//   3. Reads the user's Instagram username
//   4. Signs a Firebase Custom Token with the project's service account
//   5. Returns the token so the browser can call signInWithCustomToken()

import { SignJWT, importPKCS8 } from "jose";

const AUDIENCE =
  "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

// Turns the Firebase service-account key into a signed JWT custom token.
async function mintCustomToken(serviceAccountJson, uid) {
  const { client_email, private_key } = JSON.parse(serviceAccountJson);
  const key = await importPKCS8(private_key, "RS256");
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({ uid })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(client_email)
    .setSubject(client_email)
    .setAudience(AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(now + 60 * 60)
    .sign(key);
}

export default {
  async fetch(request, env) {
    // Preflight for the browser.
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }
    if (request.method !== "POST") {
      return json(405, { error: "Use POST" });
    }

    const { code, redirectUri } = await request.json().catch(() => ({}));
    if (!code || !redirectUri) {
      return json(400, { error: "Missing required fields: code, redirectUri" });
    }
    if (!env.IG_APP_ID || !env.IG_APP_SECRET || !env.FIREBASE_SERVICE_ACCOUNT) {
      return json(500, { error: "Worker secrets are not configured." });
    }

    try {
      // 1) Exchange the code for an Instagram access token.
      const tokenParams = new URLSearchParams({
        code,
        client_id: env.IG_APP_ID,
        client_secret: env.IG_APP_SECRET,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      });

      const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: tokenParams,
      });
      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        return json(502, {
          error: tokenData.error_message || "Instagram rejected the login code.",
        });
      }

      // 2) Read the user's Instagram identity.
      const meRes = await fetch(
        `https://graph.instagram.com/me?fields=id,username,account_type&access_token=${tokenData.access_token}`
      );
      const me = await meRes.json();
      if (!me.id) {
        return json(502, { error: me.error?.message || "Could not read your Instagram profile." });
      }

      // 3) Sign the user into Firebase with a stable id ("ig_<instagram id>").
      const uid = `ig_${me.id}`;
      const token = await mintCustomToken(env.FIREBASE_SERVICE_ACCOUNT, uid);

      return json(200, {
        token,
        uid,
        username: me.username,
        accountType: me.account_type,
      });
    } catch (err) {
      return json(500, { error: err.message || "Instagram login failed." });
    }
  },
};
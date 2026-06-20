// api/dropbox-token.js
//
// Vercel serverless function — runs on the server, never in the browser.
// Its only job: swap a long-lived refresh token for a short-lived access token
// and hand ONLY the access token back to the browser.
// The refresh token, app key, and app secret never leave this file.

export default async function handler(req, res) {
  // Only allow POST requests. Anything else gets a 405 "Method Not Allowed".
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Pull the three secrets from environment variables set in Vercel's dashboard.
  // These are never written into the code or committed to the repo.
  const { DROPBOX_APP_KEY, DROPBOX_APP_SECRET, DROPBOX_REFRESH_TOKEN } =
    process.env;

  // If any secret is missing, something is misconfigured — fail loudly on the
  // server side and return a generic error to the browser.
  if (!DROPBOX_APP_KEY || !DROPBOX_APP_SECRET || !DROPBOX_REFRESH_TOKEN) {
    console.error(
      "[dropbox-token] Missing one or more required environment variables: " +
        "DROPBOX_APP_KEY, DROPBOX_APP_SECRET, DROPBOX_REFRESH_TOKEN"
    );
    return res.status(500).json({ error: "Server configuration error" });
  }

  try {
    // Call the Dropbox OAuth endpoint to exchange the refresh token for a
    // fresh, short-lived access token (typically valid for 4 hours).
    //
    // Basic auth: Dropbox expects "app_key:app_secret" encoded as base64.
    const credentials = Buffer.from(
      `${DROPBOX_APP_KEY}:${DROPBOX_APP_SECRET}`
    ).toString("base64");

    const dropboxResponse = await fetch(
      "https://api.dropbox.com/oauth2/token",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        // Tell Dropbox we want to use our refresh token to get a new access token.
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: DROPBOX_REFRESH_TOKEN,
        }),
      }
    );

    const data = await dropboxResponse.json();

    // If Dropbox returned an error (e.g. invalid refresh token), log it
    // server-side and send a clean message to the browser.
    if (!dropboxResponse.ok || data.error) {
      console.error("[dropbox-token] Dropbox returned an error:", data);
      return res
        .status(dropboxResponse.status || 502)
        .json({ error: data.error_description || "Failed to refresh token" });
    }

    // Return ONLY what the browser needs to upload: the access token and when
    // it expires. Everything else (refresh token, keys) stays on the server.
    return res.status(200).json({
      access_token: data.access_token,
      expires_in: data.expires_in, // seconds until the token expires (usually 14400 = 4 hours)
    });
  } catch (err) {
    // Network or unexpected error — log the full error on the server, send a
    // safe generic message to the browser.
    console.error("[dropbox-token] Unexpected error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

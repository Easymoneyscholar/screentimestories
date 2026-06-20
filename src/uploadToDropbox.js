// src/uploadToDropbox.js
//
// Uploads a video file to Dropbox using a "chunked upload session."
// This lets us handle large files (up to several GB) by sending the file
// in pieces instead of one giant request that might time out.
//
// The three Dropbox endpoints used here work like this:
//   1. upload_session/start  — "I'm starting an upload; here's the first piece."
//                              Dropbox hands back a session_id to track it.
//   2. upload_session/append_v2 — "Here's the next piece." (Repeated for middle chunks.)
//   3. upload_session/finish — "Here's the last piece; please save the file at this path."

const CHUNK_SIZE = 8 * 1024 * 1024; // 8 MB per chunk

// ─── Main export ──────────────────────────────────────────────────────────────
//
// file      — a browser File object (e.g. from an <input type="file">)
// record_id — the UUID that ties this submission to all other vendor records
// onProgress — optional function called with a number 0-100 as each chunk lands
//
export async function uploadVideoToDropbox(file, record_id, onProgress) {
  // ── Step 0: get a short-lived Dropbox access token from our server ──────────
  //
  // We never put the Dropbox credentials in the browser. Instead we call our
  // own Vercel function (/api/dropbox-token) which holds the secrets and
  // returns a temporary token that's only good for a few hours.
  let accessToken;
  try {
    const tokenRes = await fetch('/api/dropbox-token', { method: 'POST' });
    if (!tokenRes.ok) {
      const body = await tokenRes.json().catch(() => ({}));
      throw new Error(body.error || `Token request failed (HTTP ${tokenRes.status})`);
    }
    const tokenData = await tokenRes.json();
    accessToken = tokenData.access_token;
    if (!accessToken) throw new Error('Token response was missing access_token');
  } catch (err) {
    throw new Error(`Could not get Dropbox access token: ${err.message}`);
  }

  // Helper: makes a Dropbox API call with the right auth header.
  // All three upload endpoints follow the same pattern:
  //   - Authorization header carries the access token
  //   - Dropbox-API-Arg header carries JSON metadata (path, offset, etc.)
  //   - Body is the raw binary chunk
  async function dropboxFetch(endpoint, apiArg, chunkBody) {
    const res = await fetch(`https://content.dropboxapi.com/2/${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify(apiArg),
      },
      body: chunkBody,
    });

    // Parse the response. Even errors come back as JSON from Dropbox.
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }

    if (!res.ok) {
      // Dropbox error objects include an "error_summary" field that's readable.
      const summary = json?.error_summary || json?.error || text;
      throw new Error(`Dropbox ${endpoint} failed (HTTP ${res.status}): ${summary}`);
    }
    return json;
  }

  // ── Step 1: Split the file into chunks ─────────────────────────────────────
  //
  // File.slice(start, end) gives us a Blob (a piece of the file) without
  // loading the whole file into memory at once.
  const chunks = [];
  let offset = 0;
  while (offset < file.size) {
    chunks.push(file.slice(offset, offset + CHUNK_SIZE));
    offset += CHUNK_SIZE;
  }

  // Edge case: a completely empty file shouldn't happen here (validation
  // should have caught it), but guard anyway.
  if (chunks.length === 0) {
    throw new Error('File appears to be empty.');
  }

  let bytesUploaded = 0;

  function reportProgress() {
    if (typeof onProgress === 'function') {
      onProgress(Math.min(100, Math.round((bytesUploaded / file.size) * 100)));
    }
  }

  // ── Step 2: Start the upload session with the first chunk ──────────────────
  //
  // Dropbox creates a temporary "session" to collect the pieces we'll send.
  // It gives us back a session_id that we must include with every subsequent call.
  const startResult = await dropboxFetch(
    'files/upload_session/start',
    { close: false },
    chunks[0]
  );
  const sessionId = startResult.session_id;
  if (!sessionId) {
    throw new Error('Dropbox did not return a session_id on start.');
  }

  bytesUploaded += chunks[0].size;
  reportProgress();

  // ── Step 3: Append middle chunks (if any) ──────────────────────────────────
  //
  // For a file larger than two chunks, we send pieces 1 through N-2 here.
  // "offset" tells Dropbox where in the overall file this piece begins,
  // so it can assemble them in the right order.
  for (let i = 1; i < chunks.length - 1; i++) {
    try {
      await dropboxFetch(
        'files/upload_session/append_v2',
        {
          cursor: { session_id: sessionId, offset: bytesUploaded },
          close: false,
        },
        chunks[i]
      );
    } catch (err) {
      throw new Error(
        `Upload failed on chunk ${i + 1} of ${chunks.length} at offset ${bytesUploaded} bytes: ${err.message}`
      );
    }

    bytesUploaded += chunks[i].size;
    reportProgress();
  }

  // ── Step 4: Finish — send last chunk and commit ────────────────────────────
  //
  // The "finish" call does two things at once: it delivers the final piece
  // of data AND tells Dropbox where to save the assembled file.
  //
  // If the file fit in exactly one chunk, chunks.length === 1, so the last
  // chunk is chunks[0] which we already sent. In that case we send an empty
  // Blob here (the file is already fully uploaded).
  // new Blob([]) is used instead of new Uint8Array(0) because Blob has a
  // .size property, keeping the progress math correct.
  const lastChunk = chunks.length === 1 ? new Blob([]) : chunks[chunks.length - 1];

  const destination = `/videos/${record_id}.mp4`;

  let finishResult;
  try {
    finishResult = await dropboxFetch(
      'files/upload_session/finish',
      {
        cursor: { session_id: sessionId, offset: bytesUploaded },
        commit: {
          path: destination,
          mode: 'add',         // never overwrite; always create a new file
          autorename: true,    // if the path exists, Dropbox adds " (1)" etc.
          mute: false,
        },
      },
      lastChunk
    );
  } catch (err) {
    throw new Error(`Upload failed on finish at offset ${bytesUploaded} bytes: ${err.message}`);
  }

  bytesUploaded += lastChunk.size;
  reportProgress(); // should hit 100 here

  // finishResult contains the saved file metadata from Dropbox
  return {
    success: true,
    path: finishResult.path_display ?? destination,
    dropboxFileId: finishResult.id,
  };
}

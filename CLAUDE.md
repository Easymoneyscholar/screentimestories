# Screen Time Stories — submission form

## Purpose
A streamlined single-page React form that collects a student's info and routes
by age, generating a `record_id` that is the join key across every later vendor
(Dropbox, Kit.com, JotForm, Zapier, Google Sheets). Every submitter is a
student — there is no role selector. Phase A builds the form and routing
skeleton only; video upload, consent emails, and external integrations come
later.

## record_id (the spine)
- Generated once with `crypto.randomUUID()` in a `useState` initializer on
  first mount. Never regenerates on re-render or step change.
- `console.log`'d on mount so stability can be verified in DevTools.
- Every downstream vendor matches on this id — not on name or email.

## Fields collected
| Field  | Type   | Notes                          |
|--------|--------|--------------------------------|
| name   | text   | required                       |
| email  | text   | required                       |
| school | text   | which school the student attends |
| age    | number | required; drives the age branch |

## Status field
Tracked in React state. Possible values:
- `"usable"` — submitter is 18+
- `"pending_consent"` — submitter is under 18
- `"expired"` — set later by a scheduled backend job, never set by this form

## Flow
1. Student fills in name, email, school, age on a single step.
2. On submit, branch on age:
   - **≥ 18** → `status = "usable"` → proceed to placeholder Upload step.
   - **< 18** → `status = "pending_consent"` → prompt for parent/guardian email,
     then proceed to placeholder Upload step. (Consent runs in parallel with
     upload later — minors still reach the Upload step now.)
3. Upload step: file picker with native browser validation (resolution + duration),
   chunked Dropbox upload with progress bar. Minors see their `pending_consent`
   status displayed.

## Tech constraints
- create-react-app; React 19. Use only libraries in `package.json` plus React
  built-ins. Do not add dependencies without asking.
- No backend calls in Phase A. No `localStorage` / `sessionStorage`.
- Keep it minimal, clean, readable — intentionally not bloated.

## File scope
Only `src/App.js` (and any component/style files it imports) should be
modified. All project plumbing (`package.json`, build scripts, `public/`,
`src/index.js`, etc.) stays untouched.

## Phase B placeholders
Leave clearly-commented stubs for:
- Video upload (Dropbox integration)
- Parental consent email (via backend/Zapier)
- External record creation (Google Sheets / Kit.com row write)

## Current state

**Built:**
- Phase A form: name / email / school / age collection, client-side validation
- `record_id` generated via `crypto.randomUUID()` on mount; stable across steps
- Age branch: ≥18 → `status = "usable"`, <18 → parent email prompt → `status = "pending_consent"`
- Native HTMLVideoElement validation (no ffmpeg/WASM): `Math.min(videoWidth, videoHeight) >= 1080`
  (orientation-aware — passes both landscape 1920×1080 and portrait 1080×1920) and `duration <= 300s`
  (5 min max, no minimum). Runs entirely in the browser before any upload.
- Chunked Dropbox upload via `src/uploadToDropbox.js` (8 MB chunks, upload session API) with
  progress bar; token minted server-side via `api/dropbox-token.js` (Vercel serverless function).
  **Built but not yet live-tested** — requires `DROPBOX_REFRESH_TOKEN` set in Vercel env vars
  before the first real upload can run.

**Not built yet:**
- Parental consent email send
- Kit.com / Google Sheets row write on submission
- `"expired"` status (set by scheduled backend job, not this form)

**Next steps:**
- Dropbox: add `DROPBOX_APP_KEY`, `DROPBOX_APP_SECRET`, `DROPBOX_REFRESH_TOKEN` to Vercel env vars, then live-test a real upload
- Kit.com: survival-test the subscriber link flow end-to-end
- Open question for boss: does Kit support transactional sending, or do we need a separate tool for consent emails?

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
3. Placeholder Upload step: labeled "Upload video (Phase B — not yet built)".
   Minors see their `pending_consent` status displayed so the branch is
   verifiable.

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

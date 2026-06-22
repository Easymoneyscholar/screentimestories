import { useState, useEffect } from 'react';
import './App.css';
import { uploadVideoToDropbox } from './uploadToDropbox';

const ZAPIER_WEBHOOK_URL = 'https://hooks.zapier.com/hooks/catch/12457099/43vpwme/';

async function sendToZapier({ recordId, name, email, school, age, status, parentEmail }) {
  try {
    await fetch(ZAPIER_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ record_id: recordId, name, email, school, age, status, parentEmail }),
    });
    console.log('Submission sent', recordId);
  } catch (err) {
    console.log('Zapier send failed:', err);
  }
}

// ─── STEPS ────────────────────────────────────────────────────────────────────
// Step 1: info form  →  (if minor) Step 2: parent email  →  Step 3: upload placeholder

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  // record_id is the permanent join key for every downstream vendor
  // (Dropbox, Kit.com, JotForm, Zapier, Google Sheets). Generated once on
  // mount; never changes for the lifetime of this submission.
  const [recordId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    // Verify stability: this should print exactly once per page load.
    console.log('[Screen Time Stories] record_id:', recordId);
  }, [recordId]);

  const [step, setStep] = useState(1);

  // Form fields
  const [fields, setFields] = useState({
    name: '',
    email: '',
    school: '',
    age: '',
  });

  // "usable" | "pending_consent"
  // ("expired" is set later by a scheduled backend job — not set here)
  const [status, setStatus] = useState(null);

  const [parentEmail, setParentEmail] = useState('');
  const [errors, setErrors] = useState({});

  // ── Step 1 submit ────────────────────────────────────────────────────────
  function handleInfoSubmit() {
    const errs = validateInfo(fields);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setErrors({});
    const age = Number(fields.age);

    if (age >= 18) {
      // Adult path: mark usable, skip to upload
      setStatus('usable');
      sendToZapier({ recordId, name: fields.name, email: fields.email, school: fields.school, age: fields.age, status: 'usable', parentEmail: '' });
      setStep(3);
    } else {
      // Minor path: mark pending_consent, collect parent email first
      setStatus('pending_consent');
      setStep(2);
    }
  }

  // ── Step 2 submit (parent email, minors only) ────────────────────────────
  function handleParentSubmit() {
    const errs = validateParentEmail(parentEmail);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setErrors({});
    sendToZapier({ recordId, name: fields.name, email: fields.email, school: fields.school, age: fields.age, status: 'pending_consent', parentEmail });
    setStep(3);
  }

  return (
    <div className="shell">
      <div className="header">
        <p className="header__eyebrow">Screen Time Stories</p>
        <h1 className="header__title">Share your story.</h1>
        <p className="header__subtitle">
          Tell us how technology has shaped your life.
        </p>
      </div>

      {step === 1 && (
        <StepInfo
          fields={fields}
          onChange={setFields}
          errors={errors}
          onSubmit={handleInfoSubmit}
        />
      )}

      {step === 2 && (
        <StepParentEmail
          parentEmail={parentEmail}
          onChange={setParentEmail}
          errors={errors}
          onBack={() => { setErrors({}); setStep(1); }}
          onSubmit={handleParentSubmit}
        />
      )}

      {step === 3 && (
        <StepUploadPlaceholder
          status={status}
          name={fields.name}
          recordId={recordId}
          onBack={() => { setErrors({}); setStep(status === 'pending_consent' ? 2 : 1); }}
        />
      )}
    </div>
  );
}

// ─── STEP 1: Info form ────────────────────────────────────────────────────────
function StepInfo({ fields, onChange, errors, onSubmit }) {
  function set(key, val) { onChange(prev => ({ ...prev, [key]: val })); }

  return (
    <div>
      <div className="card">
        <p className="card__title">About you</p>

        <div className="field">
          <label className="field__label field__label--required" htmlFor="name">Name</label>
          <input
            id="name"
            className={`field__input${errors.name ? ' error' : ''}`}
            type="text"
            autoComplete="name"
            value={fields.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Your full name"
          />
          {errors.name && <p className="field__error">{errors.name}</p>}
        </div>

        <div className="field">
          <label className="field__label field__label--required" htmlFor="email">Email</label>
          <input
            id="email"
            className={`field__input${errors.email ? ' error' : ''}`}
            type="email"
            autoComplete="email"
            value={fields.email}
            onChange={e => set('email', e.target.value)}
            placeholder="you@example.com"
          />
          {errors.email && <p className="field__error">{errors.email}</p>}
        </div>

        <div className="field">
          <label className="field__label field__label--required" htmlFor="school">School</label>
          <input
            id="school"
            className={`field__input${errors.school ? ' error' : ''}`}
            type="text"
            value={fields.school}
            onChange={e => set('school', e.target.value)}
            placeholder="Your school name"
          />
          {errors.school && <p className="field__error">{errors.school}</p>}
        </div>

        <div className="field">
          <label className="field__label field__label--required" htmlFor="age">Age</label>
          <input
            id="age"
            className={`field__input${errors.age ? ' error' : ''}`}
            type="number"
            min="1"
            max="120"
            value={fields.age}
            onChange={e => set('age', e.target.value)}
            placeholder="Your age"
          />
          {errors.age && <p className="field__error">{errors.age}</p>}
        </div>
      </div>

      <div className="nav">
        <button className="btn btn--primary" onClick={onSubmit}>Continue</button>
      </div>
    </div>
  );
}

// ─── STEP 2: Parent email (minors only) ───────────────────────────────────────
function StepParentEmail({ parentEmail, onChange, errors, onBack, onSubmit }) {
  return (
    <div>
      <div className="card">
        <p className="card__title">Parental consent</p>
        <div className="notice notice--info">
          Because you're under 18, a parent or guardian must approve your
          submission before it goes live. Enter their email below — they'll
          receive a one-time consent request.
        </div>

        <div className="field">
          <label className="field__label field__label--required" htmlFor="parentEmail">
            Parent / guardian email
          </label>
          <input
            id="parentEmail"
            className={`field__input${errors.parentEmail ? ' error' : ''}`}
            type="email"
            value={parentEmail}
            onChange={e => onChange(e.target.value)}
            placeholder="parent@example.com"
          />
          {errors.parentEmail && <p className="field__error">{errors.parentEmail}</p>}
        </div>
      </div>

      <div className="nav">
        <button className="btn btn--secondary" onClick={onBack}>Back</button>
        <button className="btn btn--primary" onClick={onSubmit}>Continue</button>
      </div>
    </div>
  );
}

// ─── STEP 3: Video upload ─────────────────────────────────────────────────────
function StepUploadPlaceholder({ status, name, recordId, onBack }) {
  // All state here is local to this component only.
  // Nothing below touches the App-level step machine, sendToZapier, or recordId creation.
  const [file, setFile] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [isValid, setIsValid] = useState(false);
  // Stores the video's width, height, and duration after validation passes,
  // so we can display them in the file confirmation line.
  const [videoMeta, setVideoMeta] = useState(null);
  // uploadState drives the four visible states: idle → uploading → success | error
  const [uploadState, setUploadState] = useState('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);

  // Converts raw seconds to "M:SS" for the duration error message.
  function formatDuration(secs) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // Runs every time the student picks a file.
  function handleFileChange(e) {
    const picked = e.target.files[0];
    if (!picked) return;

    // Reset all upload/validation state so a previous pick never bleeds through.
    setFile(picked);
    setValidationError(null);
    setIsValid(false);
    setVideoMeta(null);
    setUploadState('idle');
    setUploadError(null);
    setUploadProgress(0);

    // Validate using a hidden, off-screen video element.
    // This reads metadata (resolution, duration) entirely in the browser —
    // nothing is sent to any server at this point.
    const url = URL.createObjectURL(picked);
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.addEventListener('loadedmetadata', () => {
      // Release the temporary URL as soon as we've read what we need.
      URL.revokeObjectURL(url);

      const { videoWidth, videoHeight, duration } = video;

      // Orientation-aware resolution check: Math.min handles both landscape
      // (1920×1080) and vertical phone video (1080×1920).
      if (Math.min(videoWidth, videoHeight) < 1080) {
        setValidationError(
          `Video must be at least 1080p — yours is ${videoWidth}×${videoHeight}`
        );
        return;
      }

      // Duration check: 5 minutes maximum, no minimum.
      if (duration > 300) {
        setValidationError(
          `Video must be 5 minutes or shorter — yours is ${formatDuration(duration)}`
        );
        return;
      }

      // Both checks passed — enable the upload button and store metadata
      // so the file confirmation line can display resolution and duration.
      setIsValid(true);
      setVideoMeta({ width: videoWidth, height: videoHeight, duration });
    });

    video.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      setValidationError('Could not read this video file. Please try a different file.');
    });

    video.src = url;
  }

  // Called when the student clicks "Upload video".
  async function handleUpload() {
    if (!file || !isValid || uploadState === 'uploading') return;

    setUploadState('uploading');
    setUploadProgress(0);
    setUploadError(null);

    try {
      // Calls our audited upload module. Chunks the file, mints a token from
      // /api/dropbox-token, and streams to Dropbox. onProgress fires 0→100.
      await uploadVideoToDropbox(file, recordId, (percent) => {
        setUploadProgress(percent);
      });
      setUploadState('success');
    } catch (err) {
      setUploadState('error');
      setUploadError(err.message);
    }
  }

  const uploading = uploadState === 'uploading';
  const succeeded = uploadState === 'success';

  return (
    <div>
      <div className="card">
        <p className="card__title">Upload your video</p>

        {/* Status badge — unchanged from placeholder */}
        <p style={{ fontSize: 14, marginBottom: 16 }}>
          Status:{' '}
          <span className={`status-badge status-badge--${status === 'usable' ? 'usable' : 'pending'}`}>
            {status === 'usable' ? 'usable' : 'pending consent'}
          </span>
        </p>

        {status === 'pending_consent' && (
          <div className="notice notice--warning">
            Your video will go live once a parent or guardian approves your
            submission. You can still upload now.
          </div>
        )}

        {/* ── STATE: idle / validating / validation error ── */}
        {/* File picker is hidden after a successful upload (can't re-upload). */}
        {!succeeded && (
          <div className="field">
            <label className="field__label field__label--required" htmlFor="videoFile">
              Video file
            </label>
            <input
              id="videoFile"
              className="field__input"
              type="file"
              accept="video/*"
              disabled={uploading}
              onChange={handleFileChange}
            />

            {/* Shown briefly while the browser reads the video's metadata. */}
            {file && !isValid && !validationError && (
              <p style={{ fontSize: 13, color: '#666', marginTop: 6 }}>Checking video…</p>
            )}

            {/* Shown when resolution or duration check fails. */}
            {validationError && (
              <p className="field__error">{validationError}</p>
            )}

            {/* Shown when all checks pass — file name, size in MB, resolution, duration. */}
            {isValid && videoMeta && (
              <p style={{ fontSize: 13, color: '#16a34a', marginTop: 6 }}>
                ✓ {file.name} · {(file.size / (1024 * 1024)).toFixed(1)} MB
                {' · '}{Math.min(videoMeta.width, videoMeta.height)}p
                {' · '}{formatDuration(videoMeta.duration)}
              </p>
            )}
          </div>
        )}

        {/* ── STATE: uploading — progress bar ── */}
        {uploading && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              Uploading… {uploadProgress}%
            </p>
            {/* Light grey track so the bar looks real even at 0% */}
            <div style={{ background: '#e5e7eb', borderRadius: 4, height: 10, overflow: 'hidden' }}>
              {/* Coloured fill — glides smoothly between percentages via CSS transition */}
              <div
                role="progressbar"
                aria-valuenow={uploadProgress}
                aria-valuemin="0"
                aria-valuemax="100"
                style={{
                  background: '#3b82f6',
                  height: '100%',
                  width: `${uploadProgress}%`,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* ── STATE: success ── */}
        {succeeded && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            {/* Inline SVG checkmark — no image files or packages required */}
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
              <circle cx="28" cy="28" r="28" fill="#dcfce7" />
              <path
                d="M16 28l9 9 15-15"
                stroke="#16a34a"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#111', margin: '12px 0 6px' }}>
              Video received
            </p>
            <p style={{ fontSize: 15, color: '#444' }}>
              Thanks, {name} — your submission is in.
            </p>
            {status === 'pending_consent' && (
              <p style={{ fontSize: 14, color: '#666', marginTop: 8 }}>
                We'll send a consent request to the email you provided.
              </p>
            )}
          </div>
        )}

        {/* ── STATE: error — show message, allow retry ── */}
        {uploadState === 'error' && uploadError && (
          <div className="notice notice--warning" style={{ marginTop: 12 }}>
            Upload failed: {uploadError}
          </div>
        )}

        {/* Upload button — hidden after success to prevent double-submit. */}
        {!succeeded && (
          <button
            className="btn btn--primary"
            style={{ marginTop: 12 }}
            onClick={handleUpload}
            disabled={!isValid || uploading}
          >
            {uploading ? 'Uploading…' : 'Upload video'}
          </button>
        )}
      </div>

      {/* Zapier webhook already fired in handleInfoSubmit / handleParentSubmit — not called here. */}

      <div className="nav">
        {/* Disabled during upload to avoid navigating away mid-transfer. */}
        <button className="btn btn--secondary" onClick={onBack} disabled={uploading}>
          Back
        </button>
      </div>
    </div>
  );
}

// ─── VALIDATION ───────────────────────────────────────────────────────────────
function validateInfo({ name, email, school, age }) {
  const errs = {};
  if (!name.trim())   errs.name   = 'Name is required.';
  if (!email.trim())  errs.email  = 'Email is required.';
  else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email.';
  if (!school.trim()) errs.school = 'School is required.';
  if (!age)           errs.age    = 'Age is required.';
  else if (isNaN(Number(age)) || Number(age) < 1) errs.age = 'Enter a valid age.';
  return errs;
}

function validateParentEmail(email) {
  const errs = {};
  if (!email.trim()) errs.parentEmail = 'Parent email is required.';
  else if (!/\S+@\S+\.\S+/.test(email)) errs.parentEmail = 'Enter a valid email.';
  return errs;
}

import { useState, useEffect } from 'react';
import './App.css';

const ZAPIER_WEBHOOK_URL = 'https://hooks.zapier.com/hooks/catch/12457099/43vpwme/';

async function sendToZapier({ recordId, name, email, school, age, status, parentEmail }) {
  try {
    await fetch(ZAPIER_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

// ─── STEP 3: Upload placeholder ───────────────────────────────────────────────
function StepUploadPlaceholder({ status, name, onBack }) {
  return (
    <div>
      <div className="card">
        <p className="card__title">Your submission</p>

        {/* Status visible here so the age branch can be confirmed in the UI */}
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

        <div className="placeholder-box">
          <strong>Upload video (Phase B — not yet built)</strong>
          {/* PHASE B PLACEHOLDER: wire Dropbox Chooser / upload here.
              Pass record_id as the file metadata key so Dropbox rows
              can be joined back to this submission. */}
          This is where the video uploader will appear.
          <br />
          <span style={{ fontSize: 13 }}>record_id is logged to the console.</span>
        </div>
      </div>

      {/* Zapier webhook fired in handleInfoSubmit / handleParentSubmit on step transition. */}

      <div className="nav">
        <button className="btn btn--secondary" onClick={onBack}>Back</button>
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

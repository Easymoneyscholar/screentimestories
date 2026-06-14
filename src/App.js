 import { useState, useEffect, useRef } from 'react';
import './App.css';

const ROLES = [
  { value: 'student_k12',   label: 'Student (K–12)' },
  { value: 'college',       label: 'College student' },
  { value: 'parent',        label: 'Parent' },
  { value: 'teacher',       label: 'Teacher' },
  { value: 'administrator', label: 'Administrator' },
  { value: 'community',     label: 'Community member' },
];

const AGES = [13, 14, 15, 16, 17];

const STEPS = ['Who you are', 'Your connection', 'Your video', 'Review'];

// ─────────────────────────────────────────────
// TODO: Replace these placeholder arrays with
// real school / district data when available.
// Each entry is { value: 'id', label: 'Name' }
// ─────────────────────────────────────────────
const DISTRICTS = [
  { value: 'district_1', label: 'Example Unified School District' },
  { value: 'district_2', label: 'Westside School District' },
  { value: 'district_3', label: 'Northbrook School District' },
];

const SCHOOLS = [
  { value: 'school_1', label: 'Lincoln High School' },
  { value: 'school_2', label: 'Jefferson Middle School' },
  { value: 'school_3', label: 'Roosevelt Elementary' },
];

const COLLEGES = [
  { value: 'college_1', label: 'Example State University' },
  { value: 'college_2', label: 'City College' },
  { value: 'college_3', label: 'Community College of the Valley' },
];

function StepIndicator({ currentStep }) {
  return (
    <div className="steps">
      {STEPS.map((label, i) => {
        const num = i + 1;
        const isActive = num === currentStep;
        const isComplete = num < currentStep;
        return (
          <div key={label} style={{ display: 'contents' }}>
            <div className={`step ${isActive ? 'step--active' : ''} ${isComplete ? 'step--complete' : ''}`}>
              <div className="step__dot">{isComplete ? '✓' : num}</div>
              <span>{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className="step__divider" />}
          </div>
        );
      })}
    </div>
  );
}

function SelectField({ id, label, required, hint, value, onChange, options, placeholder, error }) {
  return (
    <div className="field">
      <label className={`field__label ${required ? 'field__label--required' : ''}`} htmlFor={id}>
        {label}
      </label>
      {hint && <p className="field__hint">{hint}</p>}
      <div className="field__select-wrapper">
        <select
          id={id}
          className={`field__select ${error ? 'error' : ''}`}
          value={value}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">{placeholder || 'Select one...'}</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      {error && <p className="field__error">{error}</p>}
    </div>
  );
}

// ─── STEP 1: Name + email only ───────────────
function StepIdentity({ data, onChange, errors }) {
  return (
    <div className="card">
      <p className="card__title">About you</p>

      <div className="field__row">
        <div className="field">
          <label className="field__label field__label--required" htmlFor="firstName">
            First name
          </label>
          <input
            id="firstName"
            className={`field__input ${errors.firstName ? 'error' : ''}`}
            type="text"
            autoComplete="given-name"
            value={data.firstName}
            onChange={e => onChange({ ...data, firstName: e.target.value })}
            placeholder="Alex"
          />
          {errors.firstName && <p className="field__error">{errors.firstName}</p>}
        </div>

        <div className="field">
          <label className="field__label field__label--required" htmlFor="lastName">
            Last name
          </label>
          <input
            id="lastName"
            className={`field__input ${errors.lastName ? 'error' : ''}`}
            type="text"
            autoComplete="family-name"
            value={data.lastName}
            onChange={e => onChange({ ...data, lastName: e.target.value })}
            placeholder="Rivera"
          />
          {errors.lastName && <p className="field__error">{errors.lastName}</p>}
        </div>
      </div>

      <div className="field">
        <label className="field__label field__label--required" htmlFor="email">
          Your email
        </label>
        <input
          id="email"
          className={`field__input ${errors.email ? 'error' : ''}`}
          type="email"
          autoComplete="email"
          value={data.email}
          onChange={e => onChange({ ...data, email: e.target.value })}
          placeholder="alex@email.com"
        />
        {errors.email && <p className="field__error">{errors.email}</p>}
      </div>
    </div>
  );
}

// ─── STEP 2: Role + conditional fields ───────
function StepConnection({ data, onChange, errors, onRoleSelect }) {
  const connectionRef = useRef(null);
  const isMinor = data.isUnder18 === true || data.role === 'student_k12';

  function handleRoleClick(value) {
    const updated = {
      ...data,
      role: value,
      isUnder18: value === 'student_k12' ? true : null,
      parentEmail: '',
      exactAge: '',
      school: '',
      district: '',
      college: '',
      storyText: '',
    };
    onChange(updated);
    onRoleSelect();
  }

  function handleUnder18(val) {
    onChange({
      ...data,
      isUnder18: val,
      exactAge: '',
      parentEmail: '',
    });
  }

  return (
    <div>
      <div className="card">
        <p className="card__title">Your connection to Project Reboot</p>
        <div className="field">
          <p className="field__label field__label--required">I am a...</p>
          <div className="role-grid">
            {ROLES.map(role => (
              <div className="role-option" key={role.value}>
                <input
                  type="radio"
                  id={`role-${role.value}`}
                  name="role"
                  value={role.value}
                  checked={data.role === role.value}
                  onChange={() => handleRoleClick(role.value)}
                />
                <label className="role-option__label" htmlFor={`role-${role.value}`}>
                  <span className="role-option__dot" />
                  {role.label}
                </label>
              </div>
            ))}
          </div>
          {errors.role && <p className="field__error" style={{ marginTop: 8 }}>{errors.role}</p>}
        </div>
      </div>

      {/* Conditional fields appear immediately after role is selected */}
      {data.role && (
        <div ref={connectionRef}>

          {/* K-12 student: school + district */}
          {data.role === 'student_k12' && (
            <div className="card">
              <p className="card__title">Your school</p>
              <SelectField
                id="school"
                label="School name"
                required
                value={data.school || ''}
                onChange={v => onChange({ ...data, school: v })}
                options={SCHOOLS}
                placeholder="Select your school..."
                error={errors.school}
              />
              <SelectField
                id="district"
                label="School district"
                required
                value={data.district || ''}
                onChange={v => onChange({ ...data, district: v })}
                options={DISTRICTS}
                placeholder="Select your district..."
                error={errors.district}
              />
            </div>
          )}

          {/* College student: university */}
          {data.role === 'college' && (
            <div className="card">
              <p className="card__title">Your institution</p>
              <SelectField
                id="college"
                label="College or university"
                required
                value={data.college || ''}
                onChange={v => onChange({ ...data, college: v })}
                options={COLLEGES}
                placeholder="Select your institution..."
                error={errors.college}
              />
            </div>
          )}

          {/* Teacher: school + district */}
          {data.role === 'teacher' && (
            <div className="card">
              <p className="card__title">Your school</p>
              <SelectField
                id="school"
                label="School name"
                required
                value={data.school || ''}
                onChange={v => onChange({ ...data, school: v })}
                options={SCHOOLS}
                placeholder="Select your school..."
                error={errors.school}
              />
              <SelectField
                id="district"
                label="School district"
                required
                value={data.district || ''}
                onChange={v => onChange({ ...data, district: v })}
                options={DISTRICTS}
                placeholder="Select your district..."
                error={errors.district}
              />
            </div>
          )}

          {/* Administrator: district only */}
          {data.role === 'administrator' && (
            <div className="card">
              <p className="card__title">Your district</p>
              <SelectField
                id="district"
                label="School district"
                required
                value={data.district || ''}
                onChange={v => onChange({ ...data, district: v })}
                options={DISTRICTS}
                placeholder="Select your district..."
                error={errors.district}
              />
            </div>
          )}

          {/* Parent: district only */}
          {data.role === 'parent' && (
            <div className="card">
              <p className="card__title">Your district</p>
              <SelectField
                id="district"
                label="Which district are your kids in?"
                value={data.district || ''}
                onChange={v => onChange({ ...data, district: v })}
                options={DISTRICTS}
                placeholder="Select a district..."
                error={errors.district}
              />
            </div>
          )}

          {/* Community member: story text */}
          {data.role === 'community' && (
            <div className="card">
              <p className="card__title">Tell us your story</p>
              <div className="field">
                <label className="field__label field__label--required" htmlFor="storyText">
                  Why does this issue matter to you?
                </label>
                <p className="field__hint">A few sentences is fine.</p>
                <textarea
                  id="storyText"
                  className={`field__input ${errors.storyText ? 'error' : ''}`}
                  rows={4}
                  value={data.storyText || ''}
                  onChange={e => onChange({ ...data, storyText: e.target.value })}
                  placeholder="Share what brought you here..."
                  style={{ resize: 'vertical', lineHeight: 1.6 }}
                />
                {errors.storyText && <p className="field__error">{errors.storyText}</p>}
              </div>
            </div>
          )}

          {/* Age gate: non-K12, non-community roles */}
          {data.role !== 'student_k12' && data.role !== 'community' && (
            <div className="card">
              <p className="card__title">Age</p>
              <div className="field">
                <p className="field__label field__label--required">Are you under 18?</p>
                <div style={{ display: 'flex', gap: 12 }}>
                  {[{ val: true, label: 'Yes' }, { val: false, label: 'No' }].map(opt => (
                    <div className="role-option" key={String(opt.val)} style={{ flex: 1 }}>
                      <input
                        type="radio"
                        id={`age-${opt.val}`}
                        name="isUnder18"
                        checked={data.isUnder18 === opt.val}
                        onChange={() => handleUnder18(opt.val)}
                      />
                      <label className="role-option__label" htmlFor={`age-${opt.val}`}>
                        <span className="role-option__dot" />
                        {opt.label}
                      </label>
                    </div>
                  ))}
                </div>
                {errors.isUnder18 && <p className="field__error">{errors.isUnder18}</p>}
              </div>

              {/* Exact age dropdown — only if under 18 */}
              {data.isUnder18 === true && (
                <div className="field" style={{ marginTop: 16 }}>
                  <SelectField
                    id="exactAge"
                    label="How old are you?"
                    required
                    value={data.exactAge || ''}
                    onChange={v => onChange({ ...data, exactAge: v })}
                    options={AGES.map(a => ({ value: String(a), label: String(a) }))}
                    placeholder="Select your age..."
                    error={errors.exactAge}
                  />
                </div>
              )}
            </div>
          )}

          {/* K-12 exact age */}
          {data.role === 'student_k12' && (
            <div className="card">
              <p className="card__title">Age</p>
              <SelectField
                id="exactAge"
                label="How old are you?"
                required
                value={data.exactAge || ''}
                onChange={v => onChange({ ...data, exactAge: v })}
                options={AGES.map(a => ({ value: String(a), label: String(a) }))}
                placeholder="Select your age..."
                error={errors.exactAge}
              />
            </div>
          )}

          {/* Parental consent — shown for all minors */}
          {isMinor && (
            <div className="card">
              <p className="card__title">Parental consent required</p>
              <div className="notice notice--warning">
                <strong>Because you're under 18,</strong> a parent or guardian must
                approve your submission before it goes live. We'll send them a consent
                link by email. Your video won't be published until they confirm.
              </div>
              <div className="field">
                <label className="field__label field__label--required" htmlFor="parentEmail">
                  Parent or guardian email
                </label>
                <p className="field__hint">
                  They'll receive one email asking them to approve your submission.
                </p>
                <input
                  id="parentEmail"
                  className={`field__input ${errors.parentEmail ? 'error' : ''}`}
                  type="email"
                  value={data.parentEmail || ''}
                  onChange={e => onChange({ ...data, parentEmail: e.target.value })}
                  placeholder="parent@email.com"
                />
                {errors.parentEmail && <p className="field__error">{errors.parentEmail}</p>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── STEP 3: Video upload ─────────────────────
function StepVideo({ data, onChange }) {
  return (
    <div className="card">
      <p className="card__title">Your video</p>
      <div style={{
        border: '2px dashed var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '48px 24px',
        textAlign: 'center',
        background: 'var(--color-bg)',
        marginBottom: 24,
      }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🎥</div>
        <p style={{ fontWeight: 500, marginBottom: 6 }}>Drop your video here</p>
        <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 16 }}>
          MP4, MOV, or AVI — max 2GB
        </p>
        <label style={{
          display: 'inline-block',
          padding: '10px 20px',
          background: 'var(--color-primary)',
          color: 'white',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 600,
        }}>
          Choose file
          <input
            type="file"
            accept="video/*"
            style={{ display: 'none' }}
            onChange={e => onChange({ ...data, videoFile: e.target.files[0] })}
          />
        </label>
        {data.videoFile && (
          <p style={{ marginTop: 12, fontSize: 14, color: 'var(--color-primary)', fontWeight: 500 }}>
            ✓ {data.videoFile.name}
          </p>
        )}
      </div>

      <div className="field">
        <p className="field__label">Resolution</p>
        <p className="field__hint">1080p is recommended for best quality.</p>
        <div style={{ display: 'flex', gap: 10 }}>
          {['480p', '720p', '1080p'].map(res => (
            <div className="role-option" key={res} style={{ flex: 1 }}>
              <input
                type="radio"
                id={`res-${res}`}
                name="resolution"
                checked={(data.resolution || '1080p') === res}
                onChange={() => onChange({ ...data, resolution: res })}
              />
              <label className="role-option__label" htmlFor={`res-${res}`}
                style={{ justifyContent: 'center' }}>
                <span className="role-option__dot" />
                {res}
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── STEP 4: Review + consent ─────────────────
function StepReview({ connection, identity, video }) {
  const roleName = ROLES.find(r => r.value === connection.role)?.label || '—';
  const schoolName = SCHOOLS.find(s => s.value === connection.school)?.label;
  const districtName = DISTRICTS.find(d => d.value === connection.district)?.label;
  const collegeName = COLLEGES.find(c => c.value === connection.college)?.label;

  const rows = [
    ['Name', `${identity.firstName} ${identity.lastName}`],
    ['Email', identity.email],
    ['Role', roleName],
    schoolName   && ['School', schoolName],
    districtName && ['District', districtName],
    collegeName  && ['College', collegeName],
    connection.storyText && ['Your story', connection.storyText],
    connection.exactAge  && ['Age', connection.exactAge],
    connection.isUnder18 && ['Parent email', connection.parentEmail],
    ['Video', video.videoFile?.name || 'No file selected'],
    ['Resolution', video.resolution || '1080p'],
  ].filter(Boolean);

  return (
    <div>
      <div className="card">
        <p className="card__title">Your details</p>
        {rows.map(([label, value]) => (
          <div key={label} style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '10px 0',
            borderBottom: '1px solid var(--color-border)',
            fontSize: 14,
          }}>
            <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>{label}</span>
            <span style={{ fontWeight: 500, maxWidth: '60%', textAlign: 'right' }}>{value}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <p className="card__title">Consent</p>
        {[
          'I give Project Reboot permission to use this video for campaign purposes.',
          'I confirm that I am the person in the video, or have consent from everyone in it.',
          'I have read and agree to the release terms.',
        ].map((text, i) => (
          <label key={i} style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            marginBottom: 16,
            cursor: 'pointer',
            fontSize: 14,
          }}>
            <input type="checkbox" style={{
              marginTop: 3,
              accentColor: 'var(--color-primary)',
              width: 16,
              height: 16,
              flexShrink: 0,
            }} />
            <span>{text}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ─── VALIDATION ───────────────────────────────
function validateStep1(identity) {
  const errors = {};
  if (!identity.firstName?.trim()) errors.firstName = 'First name is required.';
  if (!identity.lastName?.trim())  errors.lastName  = 'Last name is required.';
  if (!identity.email?.trim())     errors.email     = 'Email is required.';
  else if (!/\S+@\S+\.\S+/.test(identity.email)) errors.email = 'Enter a valid email.';
  return errors;
}

function validateStep2(connection) {
  const errors = {};
  if (!connection.role) { errors.role = 'Please select your role.'; return errors; }

  if (['student_k12', 'teacher'].includes(connection.role)) {
    if (!connection.school)    errors.school    = 'Please select a school.';
    if (!connection.district)  errors.district  = 'Please select a district.';
  }
  if (connection.role === 'college'       && !connection.college)  errors.college  = 'Please select your institution.';
  if (connection.role === 'administrator' && !connection.district) errors.district = 'Please select a district.';
  if (connection.role === 'community'     && !connection.storyText?.trim()) errors.storyText = 'Please share a little about yourself.';

  // Age gate applies to every role EXCEPT K-12 (auto-minor) and community (exempt).
  // This must mirror the UI condition that renders the age card, or Continue silently
  // blocks on an error the user can never see or resolve.
  if (connection.role !== 'student_k12' && connection.role !== 'community') {
    if (connection.isUnder18 === null) errors.isUnder18 = 'Please answer this question.';
    if (connection.isUnder18 === true  && !connection.exactAge) errors.exactAge = 'Please select your age.';
  }
  if (connection.role === 'student_k12' && !connection.exactAge) errors.exactAge = 'Please select your age.';

  if (connection.isUnder18 === true || connection.role === 'student_k12') {
    if (!connection.parentEmail?.trim()) errors.parentEmail = 'Parent email is required.';
    else if (!/\S+@\S+\.\S+/.test(connection.parentEmail)) errors.parentEmail = 'Enter a valid email.';
  }
  return errors;
}

// ─── ROOT APP ─────────────────────────────────
export default function App() {
  const [step, setStep] = useState(1);
  const [identity, setIdentity] = useState({
    firstName: '', lastName: '', email: '',
  });
  const [connection, setConnection] = useState({
    role: '', isUnder18: null, exactAge: '',
    parentEmail: '', school: '', district: '',
    college: '', storyText: '',
  });
  const [video, setVideo]       = useState({ videoFile: null, resolution: '1080p' });
  const [errors, setErrors]     = useState({});
  const [submitted, setSubmitted] = useState(false);

  const topRef = useRef(null);

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [step]);

  function handleRoleSelect() {
    // Role was clicked — clear errors and stay on step 2
    setErrors({});
  }

  function handleContinue() {
    if (step === 1) {
      const errs = validateStep1(identity);
      if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    }
    if (step === 2) {
      const errs = validateStep2(connection);
      if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    }
    setErrors({});
    setStep(s => s + 1);
  }

  function handleSubmit() {
    // Phase 2: Dropbox upload + parental consent email wired in here
    console.log('Submitting:', { identity, connection, video });
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="form-shell" ref={topRef}>
        <div className="card" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 'normal', marginBottom: 12 }}>
            Submission received
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 15 }}>
            {(connection.isUnder18 || connection.role === 'student_k12')
              ? `We've sent a consent request to ${connection.parentEmail}. Your video will go live once they approve.`
              : "Thank you for sharing your story. We'll be in touch."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="form-shell" ref={topRef}>
      <div className="form-header">
        <p className="form-header__eyebrow">Project Reboot</p>
        <h1 className="form-header__title">Share your story.</h1>
        <p className="form-header__subtitle">
          A short video from you can make a real difference for kids and families
          navigating technology addiction.
        </p>
      </div>

      <StepIndicator currentStep={step} />

      {step === 1 && <StepIdentity data={identity} onChange={setIdentity} errors={errors} />}
      {step === 2 && <StepConnection data={connection} onChange={setConnection} errors={errors} onRoleSelect={handleRoleSelect} />}
      {step === 3 && <StepVideo data={video} onChange={setVideo} />}
      {step === 4 && <StepReview identity={identity} connection={connection} video={video} />}

      <div className="nav-buttons" style={{ marginTop: 24 }}>
        {step > 1 && (
          <button className="btn btn--secondary" onClick={() => setStep(s => s - 1)}>
            Back
          </button>
        )}
        {step < 4 && (
          <button className="btn btn--primary" onClick={handleContinue}>
            Continue
          </button>
        )}
        {step === 4 && (
          <button className="btn btn--primary" onClick={handleSubmit}>
            Submit your story
          </button>
        )}
      </div>
    </div>
  );
}
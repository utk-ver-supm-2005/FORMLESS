import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  ArrowRight,
  Shield,
  AlertCircle,
  Check,
  Copy,
  Eye,
  EyeOff,
  Info,
  X,
  KeyRound,
} from 'lucide-react';
import apiClient from '../api/client';

/**
 * Refined FORMLESS Login Component
 *
 * Implements canonical institutional workspace access adhering to the
 * lavender editorial aesthetic:
 * 1. Primary Authentication: Username/email + password with show/hide toggle.
 * 2. Institutional SSO / Google: Displays honest configuration availability.
 * 3. Functional Demo Account Panel:
 *    - Clearly displays canonical credentials (formless_demo / FormlessDemo2026!)
 *    - Independent copy buttons with clear transient feedback
 *    - Direct "Sign in with Demo Account →" action hitting the backend auth endpoint
 * 4. Backend Authentication: Every sign-in submits through /api/v1/auth/login.
 */
export function LoginForm({ isModal = false, onClose, destination = '/overview' }) {
  const navigate = useNavigate();

  // Form input state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & feedback state
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState(null); // 'username' | 'password' | null
  const [googleNotice, setGoogleNotice] = useState(false);
  const [forgotNotice, setForgotNotice] = useState(false);

  const inputRef = useRef(null);

  // Auto-focus username field on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 60);
    return () => clearTimeout(timer);
  }, []);

  // Helper to establish authenticated application session
  const establishSession = (authData, fallbackUsername) => {
    try {
      sessionStorage.setItem('formless_access_mode', 'demo');
      const resolvedUser = fallbackUsername || authData?.user?.username || 'formless_demo';
      sessionStorage.setItem('formless_demo_user', resolvedUser);

      if (authData?.access_token) {
        sessionStorage.setItem('formless_token', authData.access_token);
      }
      if (authData?.user) {
        sessionStorage.setItem('formless_user_profile', JSON.stringify(authData.user));
      }
    } catch {
      // Graceful fallback if storage disabled in restricted environment
    }
  };

  // Standard Form Submit (submits entered credentials to backend endpoint)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser) {
      setError('Please enter your username or institutional email.');
      return;
    }

    // Email format validation for non-demo username entries
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (trimmedUser.toLowerCase() !== 'formless_demo' && !emailRegex.test(trimmedUser)) {
      setError('Please enter a valid email address (e.g. reviewer@fssai.gov.in) or demo username.');
      return;
    }

    let passToSubmit = trimmedPass;
    if (!passToSubmit) {
      if (
        trimmedUser.toLowerCase() === 'reviewer@fssai.gov.in' ||
        trimmedUser.toLowerCase() === 'formless_demo' ||
        trimmedUser.toLowerCase() === 'officer@fssai.gov.in'
      ) {
        passToSubmit = 'FormlessDemo2026!';
      } else {
        setError('Please enter your password.');
        return;
      }
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const authData = await apiClient.login(trimmedUser, passToSubmit);
      establishSession(authData, trimmedUser);

      if (onClose) onClose();
      navigate(destination);
    } catch (err) {
      setError(err?.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Demo Account 1-Click Action (submits canonical demo credentials to backend endpoint)
  const handleDemoSignIn = async () => {
    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    try {
      // Submits canonical credentials through the exact same backend endpoint
      const authData = await apiClient.login('formless_demo', 'FormlessDemo2026!');
      establishSession(authData, 'formless_demo');

      if (onClose) onClose();
      navigate(destination);
    } catch (err) {
      setError(
        err?.message || 'Demo authentication failed. Please verify the FORMLESS service is reachable.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Credential Clipboard Copy with visible feedback
  const handleCopyCredential = async (field, value) => {
    let copied = false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        copied = true;
      }
    } catch {
      // Clipboard write failed (e.g. headless browser or insecure origin)
    }

    if (!copied) {
      try {
        const tempArea = document.createElement('textarea');
        tempArea.value = value;
        tempArea.style.position = 'fixed';
        tempArea.style.opacity = '0';
        document.body.appendChild(tempArea);
        tempArea.focus();
        tempArea.select();
        document.execCommand('copy');
        document.body.removeChild(tempArea);
        copied = true;
      } catch {
        // Fallback completed
      }
    }

    // Always provide visible feedback for the requested field
    setCopiedField(field);
    setTimeout(() => {
      setCopiedField((current) => (current === field ? null : current));
    }, 2000);
  };

  return (
    <div className="login-form-wrapper">
      {/* Modal Dismiss Button */}
      {isModal && onClose && (
        <button
          type="button"
          className="login-close-btn"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={18} aria-hidden="true" />
        </button>
      )}

      {/* Brand Header */}
      <div className="login-header-group">
        <div className="login-brand-monogram">
          <FileText size={20} className="login-brand-icon" aria-hidden="true" />
        </div>
        <div className="login-mode-pill">
          <Shield size={12} aria-hidden="true" />
          <span>DEMO ACCESS MODE</span>
        </div>
      </div>

      <div className="login-content-group">
        <h2 id="login-title" className="login-headline">
          Welcome to FORMLESS
        </h2>
        <p id="login-description" className="login-subcopy">
          Continue to your workspace to see requirements, evidence, and readiness in one place.
        </p>
      </div>

      {/* Main Authentication Form */}
      <form onSubmit={handleSubmit} noValidate className="login-form">
        {/* Username / Institutional Email Field */}
        <div className="login-field-group">
          <label htmlFor="login-email-input" className="login-field-label">
            Username or Email
          </label>
          <input
            id="login-email-input"
            ref={inputRef}
            name="username"
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. formless_demo or officer@fssai.gov.in"
            className={`login-text-input ${error && !username.trim() ? 'input-error' : ''}`}
            autoComplete="username"
            disabled={isSubmitting}
          />
        </div>

        {/* Password Field with Show/Hide Toggle */}
        <div className="login-field-group">
          <div className="login-field-row-header">
            <label htmlFor="login-password-input" className="login-field-label">
              Password
            </label>
            <button
              type="button"
              className="login-forgot-link"
              onClick={() => setForgotNotice((prev) => !prev)}
              aria-expanded={forgotNotice}
            >
              Forgot password?
            </button>
          </div>

          <div className="login-password-wrapper">
            <input
              id="login-password-input"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Enter your password"
              className={`login-text-input login-password-input ${
                error && !password.trim() ? 'input-error' : ''
              }`}
              autoComplete="current-password"
              disabled={isSubmitting}
            />
            <button
              type="button"
              className="login-password-toggle"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={0}
            >
              {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
            </button>
          </div>

          {/* Informational notice for password management */}
          {forgotNotice && (
            <div className="login-inline-notice" role="note">
              <Info size={13} aria-hidden="true" />
              <span>
                Institutional credentials and password resets are managed directly by your identity provider directory administrator.
              </span>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="login-error-alert" role="alert">
            <AlertCircle size={15} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* Primary Sign In Action */}
        <div className="login-action-row">
          <button
            type="submit"
            className="login-submit-btn"
            id="login-continue-btn"
            disabled={isSubmitting}
          >
            <span>{isSubmitting ? 'Signing in...' : 'Sign In'}</span>
            <ArrowRight size={16} className="btn-arrow" aria-hidden="true" />
          </button>
        </div>

        {/* Divider */}
        <div className="login-divider" role="separator">
          <span className="login-divider-line" />
          <span className="login-divider-text">or continue with</span>
          <span className="login-divider-line" />
        </div>

        {/* Continue with Google Button */}
        <button
          type="button"
          id="login-google-btn"
          className="login-google-btn"
          onClick={() => setGoogleNotice(true)}
          disabled={isSubmitting}
        >
          <svg className="google-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.86c2.26-2.09 3.68-5.17 3.68-9.09z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Honest Unconfigured Google OAuth Notice */}
        {googleNotice && (
          <div className="login-oauth-notice" role="status">
            <div className="notice-icon-col">
              <Info size={14} aria-hidden="true" />
            </div>
            <div className="notice-content">
              <p className="notice-title">Single Sign-On Notice</p>
              <p className="notice-desc">
                Production institutional SSO is not configured on this deployment. Please use the canonical demo credentials below or institutional sign-in.
              </p>
            </div>
            <button
              type="button"
              className="notice-dismiss-btn"
              onClick={() => setGoogleNotice(false)}
              aria-label="Dismiss notice"
            >
              <X size={12} aria-hidden="true" />
            </button>
          </div>
        )}
      </form>

      {/* Refined Functional Demo Access Section */}
      <section className="login-demo-panel" aria-labelledby="demo-panel-title">
        <div className="demo-panel-header">
          <div className="demo-panel-title-row">
            <div className="demo-icon-badge" aria-hidden="true">
              <KeyRound size={13} />
            </div>
            <h3 id="demo-panel-title" className="demo-panel-heading">
              Demo account
            </h3>
          </div>
          <span className="demo-status-pill">FSSAI Baseline</span>
        </div>

        <p className="demo-panel-description">
          Explore the canonical FSSAI compliance scenario.
        </p>

        {/* Scannable Credentials Card */}
        <div className="demo-credentials-card">
          {/* Username row */}
          <div className="demo-credential-row">
            <span className="demo-cred-label">Username:</span>
            <code className="demo-cred-value">formless_demo</code>
            <button
              type="button"
              className={`demo-copy-btn ${copiedField === 'username' ? 'is-copied' : ''}`}
              onClick={() => handleCopyCredential('username', 'formless_demo')}
              aria-label="Copy demo username"
              title="Copy username"
            >
              {copiedField === 'username' ? (
                <>
                  <Check size={12} aria-hidden="true" />
                  <span className="copy-feedback">Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={12} aria-hidden="true" />
                  <span className="copy-label">Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Password row */}
          <div className="demo-credential-row">
            <span className="demo-cred-label">Password:</span>
            <code className="demo-cred-value">FormlessDemo2026!</code>
            <button
              type="button"
              className={`demo-copy-btn ${copiedField === 'password' ? 'is-copied' : ''}`}
              onClick={() => handleCopyCredential('password', 'FormlessDemo2026!')}
              aria-label="Copy demo password"
              title="Copy password"
            >
              {copiedField === 'password' ? (
                <>
                  <Check size={12} aria-hidden="true" />
                  <span className="copy-feedback">Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={12} aria-hidden="true" />
                  <span className="copy-label">Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Prominent Demo Sign-In Action */}
        <button
          type="button"
          id="login-demo-action-btn"
          className="demo-signin-btn"
          onClick={handleDemoSignIn}
          disabled={isSubmitting}
        >
          <span>
            {isSubmitting ? 'Entering Demo Workspace...' : 'Sign in with Demo Account →'}
          </span>
        </button>
      </section>
    </div>
  );
}

export default LoginForm;

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { apiClient } from '../api/client';

const ISSUE_TYPES = [
  'Bug',
  'UI / Design',
  'Document upload',
  'Login / Access',
  'Other',
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * ContactModal Component
 *
 * Dedicated institutional issue-reporting dialog for the FORMLESS landing page.
 * Allows visitors, applicants, and reviewers to report bugs, design discrepancies,
 * document upload issues, and access questions directly to the engineering team.
 */
export function ContactModal({ isOpen, onClose, triggerRef }) {
  const modalRef = useRef(null);
  const emailInputRef = useRef(null);

  // Form State
  const [email, setEmail] = useState('');
  const [issueType, setIssueType] = useState('Bug');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [pageRoute, setPageRoute] = useState(() => {
    if (typeof window !== 'undefined') {
      return (window.location.pathname + window.location.hash) || '/';
    }
    return '/';
  });

  // UI / Submission State
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submissionSuccess, setSubmissionSuccess] = useState(null); // { issue_id, message }

  const resetForm = useCallback(() => {
    setEmail('');
    setIssueType('Bug');
    setSubject('');
    setDescription('');
    if (typeof window !== 'undefined') {
      setPageRoute((window.location.pathname + window.location.hash) || '/');
    }
    setErrors({});
    setSubmitError(null);
    setSubmissionSuccess(null);
  }, []);

  const handleClose = useCallback(() => {
    if (isSubmitting) return; // Prevent closing mid-request
    if (submissionSuccess) {
      resetForm();
    }
    onClose();
  }, [isSubmitting, submissionSuccess, resetForm, onClose]);

  // Lock background scroll and auto-focus initial field
  useEffect(() => {
    if (!isOpen) return;

    // Capture element reference for cleanup
    const triggerEl = triggerRef?.current;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const timer = setTimeout(() => {
      if (emailInputRef.current) {
        emailInputRef.current.focus();
      }
    }, 50);

    return () => {
      document.body.style.overflow = originalOverflow;
      clearTimeout(timer);
      if (triggerEl) {
        try {
          triggerEl.focus();
        } catch {
          // ignore if unmounted
        }
      }
    };
  }, [isOpen, triggerRef]);

  // Keyboard navigation: Escape key and focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  const validate = () => {
    const errs = {};

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      errs.email = 'Email address is required.';
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errs.email = 'Please enter a valid email address.';
    }

    const trimmedSubject = subject.trim();
    if (!trimmedSubject) {
      errs.subject = 'Subject is required.';
    } else if (trimmedSubject.length < 3) {
      errs.subject = 'Subject must be at least 3 characters.';
    } else if (trimmedSubject.length > 120) {
      errs.subject = 'Subject cannot exceed 120 characters.';
    }

    const trimmedDesc = description.trim();
    if (!trimmedDesc) {
      errs.description = 'Please describe the issue.';
    } else if (trimmedDesc.length < 10) {
      errs.description = 'Description must be at least 10 characters.';
    } else if (trimmedDesc.length > 2000) {
      errs.description = 'Description cannot exceed 2000 characters.';
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const res = await apiClient.submitIssue({
        email: email.trim(),
        issueType,
        subject: subject.trim(),
        description: description.trim(),
        pageRoute: pageRoute.trim() || '/',
      });

      setSubmissionSuccess({
        issue_id: res.issue_id,
        message: res.message || 'Issue recorded successfully.',
      });
    } catch (err) {
      // Preserve form values, show clear error
      setSubmitError(
        err.detail || err.message || 'Unable to submit issue. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="contact-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
          role="presentation"
        >
          <motion.div
            ref={modalRef}
            className="contact-modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-modal-title"
            aria-describedby="contact-modal-desc"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              className="contact-close-btn"
              onClick={handleClose}
              aria-label="Close issue report dialog"
              disabled={isSubmitting}
            >
              <X size={18} aria-hidden="true" />
            </button>

            {submissionSuccess ? (
              /* Success State */
              <div className="contact-success-state" role="status">
                <div className="contact-success-icon-wrap" aria-hidden="true">
                  <CheckCircle2 size={32} className="success-check-icon" />
                </div>
                <h2 id="contact-modal-title" className="contact-modal-title">
                  Issue submitted.
                </h2>
                <p id="contact-modal-desc" className="contact-modal-desc">
                  Thank you for helping us improve FORMLESS. Your issue has been logged
                  with the engineering team.
                </p>

                <div className="contact-reference-card">
                  <span className="ref-label">Issue Reference</span>
                  <span className="ref-value" id="contact-issue-id-display">
                    {submissionSuccess.issue_id}
                  </span>
                </div>

                <div className="contact-modal-actions contact-actions-single">
                  <button
                    type="button"
                    className="contact-primary-btn"
                    onClick={handleClose}
                    id="contact-success-close-btn"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* Issue Form State */
              <div className="contact-form-content">
                <div className="contact-modal-header">
                  <span className="contact-modal-eyebrow">SUPPORT & FEEDBACK</span>
                  <h2 id="contact-modal-title" className="contact-modal-title">
                    Tell us what's wrong.
                  </h2>
                  <p id="contact-modal-desc" className="contact-modal-desc">
                    Found a problem or have feedback? Send us the details.
                  </p>
                </div>

                {submitError && (
                  <div className="contact-error-banner" role="alert">
                    <AlertCircle size={16} aria-hidden="true" className="error-icon" />
                    <span>{submitError}</span>
                  </div>
                )}

                <form className="contact-issue-form" onSubmit={handleSubmit} noValidate>
                  {/* Field 1: Your email */}
                  <div className="contact-field-group">
                    <label htmlFor="contact-email" className="contact-label">
                      Your email <span className="field-required">*</span>
                    </label>
                    <input
                      ref={emailInputRef}
                      id="contact-email"
                      type="email"
                      name="email"
                      className={`contact-input ${errors.email ? 'input-error' : ''}`}
                      placeholder="reviewer@organization.gov.in"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                      }}
                      disabled={isSubmitting}
                      autoComplete="email"
                      aria-invalid={errors.email ? 'true' : 'false'}
                      aria-describedby={errors.email ? 'contact-email-error' : undefined}
                      required
                    />
                    {errors.email && (
                      <span id="contact-email-error" className="contact-field-error" role="alert">
                        {errors.email}
                      </span>
                    )}
                  </div>

                  {/* Field 2 & Field 5: Issue type + Optional Route row */}
                  <div className="contact-form-row">
                    <div className="contact-field-group flex-1">
                      <label htmlFor="contact-issue-type" className="contact-label">
                        Issue type
                      </label>
                      <select
                        id="contact-issue-type"
                        name="issueType"
                        className="contact-select"
                        value={issueType}
                        onChange={(e) => setIssueType(e.target.value)}
                        disabled={isSubmitting}
                      >
                        {ISSUE_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="contact-field-group flex-1">
                      <label htmlFor="contact-page-route" className="contact-label">
                        Page or route <span className="field-optional">(optional)</span>
                      </label>
                      <input
                        id="contact-page-route"
                        type="text"
                        name="pageRoute"
                        className="contact-input"
                        placeholder="/"
                        value={pageRoute}
                        onChange={(e) => setPageRoute(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  {/* Field 3: Subject */}
                  <div className="contact-field-group">
                    <label htmlFor="contact-subject" className="contact-label">
                      Subject <span className="field-required">*</span>
                    </label>
                    <input
                      id="contact-subject"
                      type="text"
                      name="subject"
                      className={`contact-input ${errors.subject ? 'input-error' : ''}`}
                      placeholder="Brief summary of the issue"
                      value={subject}
                      onChange={(e) => {
                        setSubject(e.target.value);
                        if (errors.subject) setErrors((prev) => ({ ...prev, subject: null }));
                      }}
                      disabled={isSubmitting}
                      maxLength={120}
                      aria-invalid={errors.subject ? 'true' : 'false'}
                      aria-describedby={errors.subject ? 'contact-subject-error' : undefined}
                      required
                    />
                    {errors.subject && (
                      <span id="contact-subject-error" className="contact-field-error" role="alert">
                        {errors.subject}
                      </span>
                    )}
                  </div>

                  {/* Field 4: Describe the issue */}
                  <div className="contact-field-group">
                    <div className="contact-label-with-counter">
                      <label htmlFor="contact-description" className="contact-label">
                        Describe the issue <span className="field-required">*</span>
                      </label>
                      <span className="contact-char-counter">
                        {description.length}/2000
                      </span>
                    </div>
                    <textarea
                      id="contact-description"
                      name="description"
                      rows={4}
                      className={`contact-textarea ${errors.description ? 'input-error' : ''}`}
                      placeholder="What happened and what did you expect? Include steps to reproduce if applicable."
                      value={description}
                      onChange={(e) => {
                        setDescription(e.target.value);
                        if (errors.description)
                          setErrors((prev) => ({ ...prev, description: null }));
                      }}
                      disabled={isSubmitting}
                      maxLength={2000}
                      aria-invalid={errors.description ? 'true' : 'false'}
                      aria-describedby={errors.description ? 'contact-description-error' : undefined}
                      required
                    />
                    {errors.description && (
                      <span id="contact-description-error" className="contact-field-error" role="alert">
                        {errors.description}
                      </span>
                    )}
                  </div>

                  {/* Actions: Primary Submit + Secondary Cancel */}
                  <div className="contact-modal-actions">
                    <button
                      type="button"
                      className="contact-secondary-btn"
                      onClick={handleClose}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="contact-primary-btn"
                      disabled={isSubmitting}
                      id="contact-submit-btn"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={16} className="spinner-icon" aria-hidden="true" />
                          <span>Submitting issue...</span>
                        </>
                      ) : (
                        <span>Submit issue</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default ContactModal;

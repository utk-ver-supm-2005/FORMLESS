import React, { useRef, useState } from 'react';
import {
  formatFileSize,
  validateEvidenceFile,
} from './lifecycleModel';

/**
 * EvidenceUploadModal Component
 * Inspired by Reference Image 3:
 * - Purple icon badge header
 * - Dashed rounded dropzone with center Upload button
 * - Clean file card with PDF badge, size, completed/ready status, progress track, and trash action
 *
 * Institutional Compliance Constraints:
 * - PDF, PNG, JPG/JPEG
 * - Maximum 10 MB
 * - Never exposes raw server/filesystem paths
 */
export function EvidenceUploadModal({
  isOpen,
  requirement,
  onClose,
  onUpload,
  loading = false,
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen || !requirement) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    const validation = validateEvidenceFile(file);
    if (!validation.valid) {
      setValidationError(validation.error);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      setValidationError(null);
      setSelectedFile(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0] || null;
    if (!file) return;

    const validation = validateEvidenceFile(file);
    if (!validation.valid) {
      setValidationError(validation.error);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      setValidationError(null);
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!selectedFile) {
      setValidationError('Please select an evidence file to upload.');
      return;
    }

    const validation = validateEvidenceFile(selectedFile);
    if (!validation.valid) {
      setValidationError(validation.error);
      return;
    }

    try {
      setValidationError(null);
      await onUpload(selectedFile, notes.trim() || null);
      handleClose();
    } catch (err) {
      setValidationError(err.message || 'Evidence upload failed.');
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setNotes('');
    setValidationError(null);
    setIsDragOver(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  const isPdf = selectedFile?.name?.toLowerCase().endsWith('.pdf');

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !loading) handleClose();
      }}
    >
      <div className="modal-container modal-upload-styled">
        {/* 1. Header (Reference Image 3: Purple icon badge + title + close) */}
        <div className="modal-header modal-header-styled">
          <div className="modal-header-icon-row">
            <div className="upload-header-icon-badge" aria-hidden="true">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>

            <div className="modal-title-group">
              <h3 id="upload-modal-title" className="modal-title">
                Upload files
              </h3>
              <p className="modal-subtitle">
                Select and upload evidence for <strong>{requirement.code}</strong> — {requirement.title}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="modal-close-btn"
            onClick={handleClose}
            disabled={loading}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>

        {/* 2. Form Body */}
        <form onSubmit={handleSubmit} className="modal-form">
          {validationError && (
            <div className="modal-error-banner" role="alert">
              <span>{validationError}</span>
            </div>
          )}

          {/* 3. Dashed Dropzone Area (Reference Image 3) */}
          <div
            className={`dropzone-dashed ${isDragOver ? 'drag-over' : ''} ${
              selectedFile ? 'has-file' : ''
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !selectedFile && fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !selectedFile) {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              aria-label="Upload evidence file"
            />

            {!selectedFile ? (
              <div className="dropzone-center-content">
                <button
                  type="button"
                  className="dropzone-upload-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span>Upload</span>
                </button>
                <p className="dropzone-primary-text">
                  Choose a file or drag & drop it here
                </p>
                <span className="dropzone-secondary-text">
                  Maximum 10 MB file size · PDF, PNG, JPG
                </span>
              </div>
            ) : (
              /* 4. Uploaded File Item Card (Reference Image 3) */
              <div className="uploaded-file-card" onClick={(e) => e.stopPropagation()}>
                <div className="file-card-main-row">
                  <div className={`file-badge-icon ${isPdf ? 'is-pdf' : 'is-img'}`} aria-hidden="true">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span className="file-badge-type">{isPdf ? 'PDF' : 'IMG'}</span>
                  </div>

                  <div className="file-meta-col">
                    <span className="file-card-title">{selectedFile.name}</span>
                    <div className="file-card-status-row">
                      <span className="file-card-size">
                        {formatFileSize(selectedFile.size)}
                      </span>
                      <span className="file-card-sep">•</span>
                      {loading ? (
                        <span className="file-status-uploading">
                          <span className="spinner-micro" /> Uploading...
                        </span>
                      ) : (
                        <span className="file-status-ready">
                          <span className="status-check-micro">✓</span> Ready to submit
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="file-trash-btn"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    disabled={loading}
                    aria-label="Remove selected file"
                    title="Remove file"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>

                {/* Progress bar on card bottom */}
                {loading && (
                  <div className="file-card-progress-track">
                    <div className="file-card-progress-bar" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5. Optional Notes Input */}
          <div className="form-group">
            <label htmlFor="evidence-notes" className="form-label">
              Submission Notes <span className="label-optional">(Optional)</span>
            </label>
            <input
              id="evidence-notes"
              type="text"
              className="form-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Issued by University Registrar on official institutional letterhead"
              disabled={loading}
            />
          </div>

          {/* 6. Modal Action Buttons */}
          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!selectedFile || loading}
            >
              {loading ? 'Uploading Evidence...' : 'Submit Evidence'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EvidenceUploadModal;

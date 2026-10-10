import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import LoginForm from './LoginForm';

/**
 * LoginModal Component
 *
 * Polished lavender editorial workspace-entry overlay for the public landing page.
 * Reuses the canonical LoginForm with focus trapping, Escape dismissal, and subtle backdrop.
 */
export function LoginModal({ isOpen, onClose, destination = '/overview' }) {
  const modalRef = useRef(null);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="login-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          role="presentation"
        >
          <motion.div
            ref={modalRef}
            className="login-modal-container"
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-title"
            aria-describedby="login-description"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          >
            <LoginForm isModal={true} onClose={onClose} destination={destination} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default LoginModal;

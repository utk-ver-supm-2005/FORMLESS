import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import LoginForm from '../components/LoginForm';

/**
 * Dedicated Full-Page Login Route (/login)
 *
 * Provides a standalone, dedicated workspace access screen adhering to the
 * lavender editorial art direction. Reuses the exact same LoginForm logic
 * as the landing-page modal.
 */
export function LoginPageView() {
  useEffect(() => {
    document.title = 'Access Workspace — FORMLESS';
  }, []);

  return (
    <div className="login-page-root" role="region" aria-label="FORMLESS Workspace Sign-In">
      <div className="login-page-atmosphere-1" aria-hidden="true" />
      <div className="login-page-atmosphere-2" aria-hidden="true" />

      <motion.div
        className="login-page-card"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <LoginForm isModal={false} destination="/overview" />

        <div className="login-page-footer-nav">
          <Link to="/" className="login-page-back-link" aria-label="Return to landing page">
            <ArrowLeft size={15} aria-hidden="true" />
            <span>Return to FORMLESS Overview</span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default LoginPageView;

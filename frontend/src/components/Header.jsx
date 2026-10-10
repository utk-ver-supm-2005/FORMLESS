import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useApplication } from '../context';
import { APPROVED_ROUTES } from '../navigationConfig';

export function Header() {
  const {
    resetFssai,
    mutationPending,
    loading,
    openIngestionModal,
  } = useApplication();

  const handleReset = async () => {
    try {
      await resetFssai();
    } catch {
      // Error handled via ApplicationContext
    }
  };

  return (
    <header className="app-header" role="banner">
      <div className="header-inner">
        {/* Left: Brand Monogram / Identity */}
        <div className="header-brand">
          <Link to="/" className="brand-logo" aria-label="FORMLESS Public Homepage" title="Return to FORMLESS Overview & Showcase">
            FORMLESS
          </Link>
        </div>

        {/* Center: Quiet Editorial Typographic Navigation */}
        <nav className="header-nav" aria-label="Primary Navigation">
          {APPROVED_ROUTES.map((route) => (
            <NavLink
              key={route.path}
              to={route.path}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {route.label}
            </NavLink>
          ))}
        </nav>

        {/* Right: Operational Actions */}
        <div className="header-actions">
          <button
            type="button"
            className="header-btn header-btn-primary"
            onClick={openIngestionModal}
            data-testid="header-ingest-button"
            aria-label="Analyze new policy PDF"
            title="Upload and analyze a compliance policy document"
          >
            Analyze Policy
          </button>

          <button
            type="button"
            className="header-btn header-btn-secondary"
            onClick={handleReset}
            disabled={mutationPending || loading}
            aria-label="Reset canonical demo baseline"
            title="Reset environment to canonical 8-requirement FSSAI demo baseline"
          >
            {mutationPending ? 'Resetting...' : 'Reset Demo'}
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;

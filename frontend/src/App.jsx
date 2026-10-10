import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import IngestionModal from './components/IngestionModal';
import RequirementDrawer from './components/RequirementDrawer';
import { useApplication } from './context';
import LandingPageView from './views/LandingPageView';
import LoginPageView from './views/LoginPageView';
import OverviewView from './views/OverviewView';
import RequirementsView from './views/RequirementsView';
import ReadinessMapView from './views/ReadinessMapView';
import ActionPlanRouteView from './views/ActionPlanRouteView';
import './App.css';

export function App() {
  const { aggregate, error, clearError } = useApplication();
  const location = useLocation();
  const navigate = useNavigate();
  const isLandingPage = location.pathname === '/' || location.pathname === '/login';

  // Global Workspace Keyboard Shortcuts (1: Overview, 2: Requirements, 3: Readiness, 4: Action Plan)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) ||
        e.target.isContentEditable ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey
      ) {
        return;
      }

      if (e.key === '1') {
        navigate('/overview');
      } else if (e.key === '2') {
        navigate('/requirements');
      } else if (e.key === '3') {
        navigate('/readiness');
      } else if (e.key === '4') {
        navigate('/action-plan');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <div className={`app-shell ${isLandingPage ? 'public-landing-mode' : 'workspace-mode'}`}>
      {/* 1. Global Workspace Header (Rendered on workspace views) */}
      {!isLandingPage && <Header />}

      {/* Global Error Banner */}
      {error && !isLandingPage ? (
        <div className="workspace-container" style={{ paddingBottom: 0 }}>
          <div
            role="alert"
            style={{
              backgroundColor: 'var(--status-missing-bg)',
              color: 'var(--status-missing-text)',
              border: '1px solid var(--status-missing-border)',
              borderRadius: 'var(--radius-interactive)',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 'var(--text-sm)',
            }}
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={clearError}
              style={{
                fontWeight: 600,
                color: 'var(--status-missing-text)',
                padding: '2px 8px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {/* 2. Main Routes: Landing Page at /, Workspace views at other routes */}
      <main className={isLandingPage ? 'landing-main-wrapper' : 'workspace-container'}>
        <Routes>
          <Route path="/" element={<LandingPageView />} />
          <Route path="/login" element={<LoginPageView />} />
          <Route path="/overview" element={<OverviewView />} />
          <Route path="/requirements" element={<RequirementsView />} />
          <Route path="/readiness" element={<ReadinessMapView />} />
          <Route path="/action-plan" element={<ActionPlanRouteView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* 3. Global Workspace Footer */}
      {!isLandingPage && (
        <footer className="app-footer">
          <div className="footer-inner">
            <div className="footer-left">
              <span>FORMLESS Institutional Gate Engine</span>
              <span>•</span>
              <span>Version 1.0.0</span>
            </div>
            <div className="footer-right">
              <span>
                Model:{' '}
                {aggregate?.policy_document?.is_demo_seed
                  ? 'Canonical Demo Baseline'
                  : 'gemini-3.8-flash'}
              </span>
              <span>•</span>
              <span>Single Source of Truth: Active</span>
            </div>
          </div>
        </footer>
      )}

      {/* 4. Policy Ingestion Modal */}
      <IngestionModal />

      {/* 5. Shared Accessible Requirement Detail Drawer */}
      <RequirementDrawer />
    </div>
  );
}

export default App;

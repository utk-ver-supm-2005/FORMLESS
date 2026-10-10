import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FileText, Menu, X, Mail } from 'lucide-react';

/**
 * Dedicated Public Landing Page Navigation
 * Refined Lavender Editorial Art Direction
 *
 * Information Architecture:
 * - Brand: FORMLESS logo icon and wordmark (links to top).
 * - Navigation: Home, How it works, The document, Security.
 * - Actions:
 *   - "Contact us" (understated secondary button with fine border)
 *   - "Open workspace →" (primary CTA in deep charcoal/plum)
 *
 * Visual & Interactive:
 * - 72–80px single-row height, warm ivory surface.
 * - Active section tracking with IntersectionObserver & scroll-spy.
 * - Smooth scroll respecting prefers-reduced-motion.
 * - Accessible mobile hamburger navigation drawer.
 */
export function LandingNav({ onOpenLogin, onOpenContact, contactButtonRef }) {
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef(null);
  const isManualScroll = useRef(false);

  // Scroll detection for sticky navbar padding & robust scroll-spy
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);

      if (isManualScroll.current) return;

      if (window.scrollY < 160) {
        setActiveSection('home');
        return;
      }

      // Check sections from bottom of document upwards
      const sectionOrder = ['security', 'workflow', 'process', 'home'];
      const scrollPos = window.scrollY + 140;

      for (const id of sectionOrder) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= scrollPos) {
          setActiveSection(id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on Escape
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  // Smooth scroll handler respecting prefers-reduced-motion
  const scrollToTarget = (e, targetId) => {
    if (e) e.preventDefault();
    setMobileMenuOpen(false);
    setActiveSection(targetId);
    isManualScroll.current = true;

    if (targetId === 'home') {
      const prefersReduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
      window.scrollTo({
        top: 0,
        behavior: prefersReduced ? 'auto' : 'smooth',
      });
    } else {
      const el = document.getElementById(targetId);
      if (el) {
        const prefersReduced = window.matchMedia(
          '(prefers-reduced-motion: reduce)'
        ).matches;
        el.scrollIntoView({
          behavior: prefersReduced ? 'auto' : 'smooth',
          block: 'start',
        });
      }
    }

    setTimeout(() => {
      isManualScroll.current = false;
    }, 900);
  };

  const navLinks = [
    { id: 'home', label: 'Home' },
    { id: 'workflow', label: 'How it works' },
    { id: 'process', label: 'The document' },
    { id: 'security', label: 'Security' },
  ];

  return (
    <header
      className={`public-landing-nav ${scrolled ? 'nav-scrolled' : ''}`}
      role="banner"
    >
      <div className="landing-nav-inner">
        {/* Brand Group (Left): Icon + Wordmark */}
        <div className="landing-brand-group">
          <a
            href="#home"
            className="landing-brand-logo"
            aria-label="FORMLESS Home"
            onClick={(e) => scrollToTarget(e, 'home')}
          >
            <span className="brand-doc-icon-wrap" aria-hidden="true">
              <FileText size={16} className="brand-doc-icon" />
            </span>
            <span className="brand-wordmark">FORMLESS</span>
          </a>
        </div>

        {/* Desktop Navigation Links (Centered / Balanced) */}
        <nav
          className="landing-nav-links desktop-nav"
          aria-label="Landing Page Navigation"
        >
          {navLinks.map((link) => {
            const isActive = activeSection === link.id;
            return (
              <a
                key={link.id}
                href={`#${link.id}`}
                className={`landing-nav-link ${isActive ? 'active' : ''}`}
                onClick={(e) => scrollToTarget(e, link.id)}
                aria-current={isActive ? 'page' : undefined}
              >
                {link.label}
              </a>
            );
          })}
        </nav>

        {/* Desktop Action Group (Right) */}
        <div className="landing-nav-actions desktop-actions">
          {/* Secondary Action: Contact Us */}
          <button
            ref={contactButtonRef}
            type="button"
            onClick={onOpenContact}
            className="landing-contact-btn"
            id="nav-contact-us"
            aria-label="Contact FORMLESS team or report an issue"
          >
            <span>Contact us</span>
          </button>

          {/* Primary Action: Open Workspace */}
          {onOpenLogin ? (
            <button
              type="button"
              onClick={onOpenLogin}
              className="landing-primary-cta"
              id="nav-open-workspace"
              aria-label="Open FORMLESS Workspace"
            >
              <span>Open workspace</span>
              <ArrowRight size={14} className="cta-arrow" aria-hidden="true" />
            </button>
          ) : (
            <Link
              to="/login"
              className="landing-primary-cta"
              id="nav-open-workspace"
              aria-label="Open FORMLESS Workspace"
            >
              <span>Open workspace</span>
              <ArrowRight size={14} className="cta-arrow" aria-hidden="true" />
            </Link>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="mobile-nav-toggle-wrap">
          {onOpenLogin && (
            <button
              type="button"
              onClick={onOpenLogin}
              className="mobile-quick-workspace-btn"
              aria-label="Open Workspace"
            >
              <span>Workspace</span>
              <ArrowRight size={12} aria-hidden="true" />
            </button>
          )}

          <button
            type="button"
            className="mobile-hamburger-btn"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen ? 'true' : 'false'}
            aria-controls="mobile-navigation-drawer"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          id="mobile-navigation-drawer"
          ref={mobileMenuRef}
          className="mobile-nav-drawer"
          role="region"
          aria-label="Mobile Navigation Menu"
        >
          <div className="mobile-nav-links">
            {navLinks.map((link) => {
              const isActive = activeSection === link.id;
              return (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  className={`mobile-nav-link ${isActive ? 'active' : ''}`}
                  onClick={(e) => scrollToTarget(e, link.id)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {link.label}
                </a>
              );
            })}
          </div>

          <div className="mobile-drawer-actions">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                if (onOpenContact) onOpenContact();
              }}
              className="mobile-contact-btn"
              id="mobile-nav-contact-us"
            >
              <Mail size={15} aria-hidden="true" />
              <span>Contact us</span>
            </button>

            {onOpenLogin ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenLogin();
                }}
                className="mobile-workspace-btn"
                id="mobile-nav-open-workspace"
              >
                <span>Open workspace</span>
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="mobile-workspace-btn"
                id="mobile-nav-open-workspace"
              >
                <span>Open workspace</span>
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default LandingNav;

import React, { useMemo, useState } from 'react';
import { useApplication } from '../context';
import RequirementCard from './RequirementCard';
import { filterRequirements } from './matrixModel';
import EmptyState from './EmptyState';

/**
 * RequirementList Component
 * Renders the authoritative requirement matrix workspace.
 *
 * Source of Truth:
 * - ApplicationContext.aggregate.requirements
 *
 * Presentational Capabilities:
 * - Status filter: All | Verified | Needs Verification | Missing | In Progress
 * - Category filter: All Categories | Eligibility | Documentation | Prerequisite | Conduct
 * - Quick text search
 * - Purely presentation filtering; never mutates backend state.
 */
export function RequirementList() {
  const {
    aggregate,
    activeGate,
    selectedRequirementId,
    setSelectedRequirementId,
    loading,
  } = useApplication();

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const allRequirements = aggregate?.requirements || [];
  const gateReadiness = aggregate?.gate_readiness || null;

  // Presentational filtering (never mutates or recomputes statuses)
  const displayedRequirements = useMemo(() => {
    return filterRequirements(aggregate?.requirements, {
      statusFilter,
      categoryFilter,
      searchQuery,
    });
  }, [aggregate?.requirements, statusFilter, categoryFilter, searchQuery]);

  // Loading state (no aggregate yet and loading is true)
  if (!aggregate && loading) {
    return (
      <div className="matrix-empty-state" role="status">
        <div className="spinner-indicator" aria-hidden="true" />
        <p className="empty-title">Loading requirements...</p>
        <span className="empty-sub">Fetching authoritative compliance policy and criteria</span>
      </div>
    );
  }

  // Aggregate loaded but 0 requirements
  if (aggregate && allRequirements.length === 0) {
    return (
      <EmptyState
        title="No requirements extracted yet"
        description="Upload and ingest an institutional policy document to extract criteria."
        className="matrix-workspace-empty"
      />
    );
  }

  // Empty state while aggregate is null/initializing
  if (!aggregate) {
    return (
      <div className="matrix-empty-state" role="status">
        <p className="empty-title">Awaiting application data...</p>
        <span className="empty-sub">Connecting to FORMLESS evaluation engine.</span>
      </div>
    );
  }

  return (
    <section className="requirement-matrix-workspace" aria-label="Requirement Matrix">
      {/* 1. Filter & Search Toolbar */}
      <div className="matrix-toolbar">
        {/* Status Filter Buttons */}
        <div className="status-filter-group" role="tablist" aria-label="Filter by requirement status">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'VERIFIED', label: 'Verified' },
            { id: 'NEEDS_VERIFICATION', label: 'Needs Verification' },
            { id: 'MISSING', label: 'Missing' },
            { id: 'IN_PROGRESS', label: 'In Progress' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={statusFilter === tab.id}
              className={`filter-chip ${statusFilter === tab.id ? 'active' : ''}`}
              onClick={() => setStatusFilter(tab.id)}
            >
              {statusFilter === tab.id && (
                <span className="chip-check-icon" aria-hidden="true">✓</span>
              )}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Secondary Category & Search Controls */}
        <div className="matrix-secondary-controls">
          {/* Category Dropdown */}
          <div className="category-select-wrapper">
            <label htmlFor="category-filter" className="sr-only">
              Filter by Category
            </label>
            <select
              id="category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="category-select"
            >
              <option value="ALL">All Categories</option>
              <option value="ELIGIBILITY">Eligibility</option>
              <option value="DOCUMENTATION">Documentation</option>
              <option value="PREREQUISITE">Prerequisite</option>
              <option value="CONDUCT">Conduct</option>
            </select>
          </div>

          {/* Quick Search Input */}
          <div className="matrix-search-box">
            <span className="search-icon" aria-hidden="true">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code or title..."
              className="matrix-search-input"
              aria-label="Filter requirements by code or title"
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Count & View Status Header with Closeable Pills (Reference Image 5) */}
      <div className="matrix-count-header">
        <div className="matrix-count-left">
          <span className="matrix-count-text">
            Showing <strong>{displayedRequirements.length}</strong> of{' '}
            <strong>{allRequirements.length}</strong> requirements
          </span>

          {/* Closeable Active Filters (Reference Image 5: Closeable chips) */}
          {(statusFilter !== 'ALL' || categoryFilter !== 'ALL' || searchQuery) && (
            <div className="active-filter-pills-row">
              {statusFilter !== 'ALL' && (
                <button
                  type="button"
                  className="active-filter-pill"
                  onClick={() => setStatusFilter('ALL')}
                  title="Remove status filter"
                >
                  <span>Status: {statusFilter.replace(/_/g, ' ')}</span>
                  <span className="pill-dismiss">×</span>
                </button>
              )}
              {categoryFilter !== 'ALL' && (
                <button
                  type="button"
                  className="active-filter-pill"
                  onClick={() => setCategoryFilter('ALL')}
                  title="Remove category filter"
                >
                  <span>Category: {categoryFilter}</span>
                  <span className="pill-dismiss">×</span>
                </button>
              )}
              {searchQuery && (
                <button
                  type="button"
                  className="active-filter-pill"
                  onClick={() => setSearchQuery('')}
                  title="Clear search query"
                >
                  <span>"{searchQuery}"</span>
                  <span className="pill-dismiss">×</span>
                </button>
              )}
            </div>
          )}
        </div>

        {(statusFilter !== 'ALL' || categoryFilter !== 'ALL' || searchQuery) && (
          <button
            type="button"
            className="reset-filters-btn"
            onClick={() => {
              setStatusFilter('ALL');
              setCategoryFilter('ALL');
              setSearchQuery('');
            }}
          >
            Clear All
          </button>
        )}
      </div>

      {/* 3. Requirement Cards Grid with EmptyState (Reference Image 2) */}
      {displayedRequirements.length === 0 ? (
        <EmptyState
          title="No requirements match the active filters"
          description="Try adjusting your status filter, category, or search keywords."
          actionLabel="Show All Requirements"
          onAction={() => {
            setStatusFilter('ALL');
            setCategoryFilter('ALL');
            setSearchQuery('');
          }}
          className="matrix-filter-empty-wrap"
        />
      ) : (
        <div className="requirement-cards-grid" role="list">
          {displayedRequirements.map((req) => (
            <RequirementCard
              key={req.id}
              requirement={req}
              isSelected={selectedRequirementId === req.id}
              gateReadiness={gateReadiness}
              activeGate={activeGate}
              onSelect={setSelectedRequirementId}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default RequirementList;

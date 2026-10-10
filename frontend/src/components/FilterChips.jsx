import React from 'react';

/**
 * FilterChips Component
 * Inspired by Reference Images 4 & 5:
 * - Single or multi-select chips with clean checkmark indicator
 * - Closeable filter pills with dismiss (×)
 * - Restrained, modern typography and pill geometry
 */
export function FilterChip({
  label,
  selected = false,
  onClick,
  closeable = false,
  onClose,
  count,
  disabled = false,
  className = '',
  id,
}) {
  const handleClick = (e) => {
    if (disabled) return;
    if (onClick) onClick(e);
  };

  const handleClose = (e) => {
    e.stopPropagation();
    if (disabled) return;
    if (onClose) onClose(e);
  };

  return (
    <button
      type="button"
      id={id}
      className={`chip-item ${selected ? 'is-selected' : ''} ${
        closeable ? 'is-closeable' : ''
      } ${className}`.trim()}
      onClick={handleClick}
      disabled={disabled}
      aria-pressed={selected}
    >
      {selected && !closeable && (
        <span className="chip-check-icon" aria-hidden="true">
          ✓
        </span>
      )}
      <span className="chip-label">{label}</span>
      {typeof count === 'number' && (
        <span className="chip-count-badge">{count}</span>
      )}
      {closeable && (
        <span
          className="chip-dismiss-btn"
          onClick={handleClose}
          aria-label={`Remove filter ${label}`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleClose(e);
            }
          }}
        >
          ×
        </span>
      )}
    </button>
  );
}

/**
 * FilterChipsGroup Component
 * Renders a cluster of filter chips with optional header, count badge, and clear action.
 */
export function FilterChipsGroup({
  title,
  subtext,
  selectedCount,
  options = [],
  selectedValue,
  selectedValues = [],
  isMulti = false,
  onSelect,
  onClear,
  clearLabel = 'Clear All',
  className = '',
}) {
  const handleSelect = (val) => {
    if (onSelect) onSelect(val);
  };

  return (
    <div className={`chip-group-wrapper ${className}`.trim()}>
      {(title || subtext || typeof selectedCount === 'number') && (
        <div className="chip-group-header">
          <div className="chip-group-title-col">
            {title && <h4 className="chip-group-title">{title}</h4>}
            {subtext && <p className="chip-group-subtext">{subtext}</p>}
          </div>

          <div className="chip-group-meta-col">
            {typeof selectedCount === 'number' && (
              <span className="chip-selected-pill">
                {selectedCount} selected
              </span>
            )}
            {onClear && selectedCount > 0 && (
              <button
                type="button"
                className="chip-clear-btn"
                onClick={onClear}
              >
                {clearLabel}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="chip-cluster" role="group" aria-label={title || 'Filter options'}>
        {options.map((opt) => {
          const isSelected = isMulti
            ? selectedValues.includes(opt.id)
            : selectedValue === opt.id;

          return (
            <FilterChip
              key={opt.id}
              id={`chip-${opt.id}`}
              label={opt.label}
              selected={isSelected}
              closeable={opt.closeable}
              count={opt.count}
              onClick={() => handleSelect(opt.id)}
              onClose={() => opt.onClose && opt.onClose(opt.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

export default FilterChip;

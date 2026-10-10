import React from 'react';
import { deriveRulesModel } from './inspectorModel';

/**
 * RuleEvaluationBox Component
 * Displays deterministic machine-evaluable rule criteria and engine evaluation results.
 *
 * Source of Truth:
 * - requirement.rules
 *
 * Never performs local rule evaluation; renders authoritative backend results only.
 */
export function RuleEvaluationBox({ rules }) {
  const model = deriveRulesModel(rules);

  return (
    <div className="rules-box" role="region" aria-label="Rule Evaluation Conditions">
      <div className="section-header-row">
        <div className="section-title-group">
          <span className="section-icon" aria-hidden="true">
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
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
          </span>
          <h4 className="inspector-section-heading">RULE EVALUATION</h4>
        </div>
        {model.hasRules && (
          <span className="rules-count-tag">
            {model.rules.length} {model.rules.length === 1 ? 'Condition' : 'Conditions'}
          </span>
        )}
      </div>

      {!model.hasRules ? (
        <div className="rules-empty-note">
          <p>{model.fallbackMessage}</p>
        </div>
      ) : (
        <div className="rules-list">
          {model.rules.map((rule) => (
            <div
              key={rule.id}
              className={`rule-card ${
                rule.isSatisfied
                  ? 'status-satisfied'
                  : rule.isFailed
                  ? 'status-failed'
                  : 'status-pending'
              }`}
            >
              <div className="rule-card-header">
                <span className="rule-field-name">{rule.fieldLabel}</span>
                <span
                  className={`rule-status-badge ${
                    rule.isSatisfied
                      ? 'badge-verified'
                      : rule.isFailed
                      ? 'badge-missing'
                      : 'badge-needs-verification'
                  }`}
                >
                  {rule.evaluationStatus}
                </span>
              </div>

              {/* Expression: Field [Operator] Expected Value */}
              <div className="rule-expression">
                <code className="expression-field">{rule.field}</code>
                <span className="expression-operator">{rule.operatorSymbol}</span>
                <code className="expression-value">{rule.expectedValue}</code>
              </div>

              {/* Rule engine evaluation message */}
              {rule.evaluationMessage && (
                <div className="rule-eval-message">
                  <span className="eval-icon" aria-hidden="true">
                    {rule.isSatisfied ? '✓' : 'ℹ'}
                  </span>
                  <span>{rule.evaluationMessage}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RuleEvaluationBox;

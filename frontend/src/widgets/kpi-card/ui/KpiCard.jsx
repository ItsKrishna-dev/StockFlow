import React, { useState } from 'react';
import { cn } from '../../../shared/lib/classNames';
import styles from './KpiCard.module.css';

export function KpiCard({
  title,
  icon,
  stripeColor = 'var(--stockflow-primary)',
  actionText,
  onActionClick,
  lateCount = 0,
  waitingCount = null,
  operationsCount = 0,
  progressDone = 0,
  progressTotal = 0,
  subReference,
  segments = [],
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={styles.card}>
      {/* Left colored stripe */}
      <div className={styles.leftStripe} style={{ backgroundColor: stripeColor }} />

      <div>
        {/* Header */}
        <div className={styles.cardHeader}>
          <div className={styles.titleGroup}>
            <span
              className={cn('material-symbols-outlined', styles.titleIcon)}
              style={{ color: stripeColor }}
            >
              {icon}
            </span>
            <h2 className={styles.title}>{title}</h2>
          </div>

          <div className={styles.menuWrapper}>
            <button
              type="button"
              className={styles.kebabBtn}
              title="Configuration"
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                more_vert
              </span>
            </button>

            {menuOpen && (
              <div className={styles.dropdownMenu}>
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={() => setMenuOpen(false)}
                >
                  View Operations
                </button>
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={() => setMenuOpen(false)}
                >
                  Configuration
                </button>
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={() => setMenuOpen(false)}
                >
                  Reporting
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className={styles.actionWrapper}>
          <button
            type="button"
            className={styles.actionButton}
            onClick={onActionClick}
          >
            <span>{actionText}</span>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              arrow_forward
            </span>
          </button>
        </div>

        {/* Metrics List */}
        <div className={styles.metricsList}>
          {lateCount > 0 && (
            <div className={styles.metricRow}>
              <div className={styles.metricLeft}>
                <span className={styles.statusDot} style={{ backgroundColor: '#ba1a1a' }} />
                <span style={{ color: '#ba1a1a', fontWeight: 500 }}>
                  {lateCount} Late
                </span>
              </div>
              <span className={cn(styles.badge, styles.badgeError)}>
                {waitingCount !== null ? 'Delayed' : 'Attention'}
              </span>
            </div>
          )}

          {waitingCount !== null && waitingCount > 0 && (
            <div className={styles.metricRow}>
              <div className={styles.metricLeft}>
                <span className={styles.statusDot} style={{ backgroundColor: '#5bb8fe' }} />
                <span style={{ color: '#006398', fontWeight: 500 }}>
                  {waitingCount} waiting
                </span>
              </div>
              <span className={cn(styles.badge, styles.badgeSecondary)}>
                Availability
              </span>
            </div>
          )}

          <div className={styles.metricRow}>
            <div className={styles.metricLeft}>
              <span
                className={styles.statusDot}
                style={{ backgroundColor: 'rgba(78, 68, 74, 0.4)' }}
              />
              <span style={{ color: 'var(--stockflow-text-primary)' }}>
                {operationsCount} operations
              </span>
            </div>
            <span className={styles.badgeCaption}>Total scheduled</span>
          </div>
        </div>
      </div>

      {/* Progress Section */}
      <div className={styles.progressSection}>
        <div className={styles.progressBar}>
          {segments.map((seg, i) => (
            <div
              key={i}
              className={styles.progressSegment}
              style={{ backgroundColor: seg.color, width: seg.width }}
            />
          ))}
        </div>
        <div className={styles.progressMeta}>
          <span>
            Progress ({progressDone} Done / {progressTotal})
          </span>
          <span className={styles.progressSubRef}>{subReference}</span>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../../shared/lib/classNames';
import styles from './KpiCard.module.css';

export function KpiCard({
  title,
  icon,
  actionText,
  onActionClick,
  lateCount = 0,
  waitingCount = null,
  operationsCount = 0,
  progressDone = 0,
  progressTotal = 0,
  subReference,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const progressPct = progressTotal > 0 ? Math.round((progressDone / progressTotal) * 100) : 0;

  return (
    <div className={styles.card}>
      <div className={styles.cardContent}>
        {/* Header */}
        <div className={styles.cardHeader}>
          <div className={styles.titleGroup}>
            <div className={styles.titleIconBox}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                {icon}
              </span>
            </div>
            <div>
              <h2 className={styles.title}>{title}</h2>
              {subReference && <span className={styles.subReference}>{subReference}</span>}
            </div>
          </div>

          <div ref={menuRef} className={styles.menuWrapper}>
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
                  onClick={() => {
                    setMenuOpen(false);
                    if (onActionClick) onActionClick();
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>open_in_new</span>
                  <span>View Operations</span>
                </button>
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>tune</span>
                  <span>Configuration</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Action & Metrics */}
        <div className={styles.mainSection}>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={onActionClick}
          >
            <span>{actionText}</span>
            <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>
              arrow_forward
            </span>
          </button>

          {/* Quick Metrics Tags */}
          <div className={styles.metricsList}>
            {lateCount > 0 && (
              <div className={styles.metricRow}>
                <span className={cn(styles.badge, styles.badgeError)}>
                  {lateCount} Late
                </span>
              </div>
            )}

            {waitingCount !== null && waitingCount > 0 && (
              <div className={styles.metricRow}>
                <span className={cn(styles.badge, styles.badgeWarning)}>
                  {waitingCount} Waiting
                </span>
              </div>
            )}

            <div className={styles.metricRow}>
              <span className={cn(styles.badge, styles.badgeNeutral)}>
                {operationsCount} Total
              </span>
            </div>
          </div>
        </div>

        {/* Progress Section */}
        <div className={styles.progressSection}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressSegment}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className={styles.progressMeta}>
            <span>
              Progress: <strong>{progressDone} Done</strong> / {progressTotal} Total
            </span>
            <span className={styles.progressPctText}>
              {progressPct}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
export default KpiCard;



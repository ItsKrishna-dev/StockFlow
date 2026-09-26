import React from 'react';
import styles from './StockFlowLogo.module.css';

export function StockFlowLogo() {
  return (
    <div className={styles.container}>
      <div className={styles.brandRow}>
        <svg
          className={styles.logoSvg}
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect width="36" height="36" rx="4" fill="#714B67" />
          <circle cx="18" cy="18" r="8" stroke="white" strokeWidth="3.5" fill="none" />
          <circle cx="23" cy="13" r="2" fill="#E289B8" />
        </svg>
        <span className={styles.brandName}>StockFlow</span>
      </div>
      <p className={styles.brandSubtitle}>Enterprise Management</p>
    </div>
  );
}

export const OdooLogo = StockFlowLogo;

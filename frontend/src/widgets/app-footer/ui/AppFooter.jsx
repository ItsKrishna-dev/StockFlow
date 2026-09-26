import React from 'react';
import styles from './AppFooter.module.css';

export function AppFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.left}>
        <span className={styles.statusPill}>
          <span className={styles.greenDot} />
          StockFlow 2.0 (Enterprise Edition)
        </span>
        <span className={styles.dbInfo}>Database: production-live</span>
      </div>
      <div className={styles.right}>
        <span>UTC</span>
        <a href="#docs" className={styles.link}>
          Documentation & API
        </a>
        <span>•</span>
        <a href="#support" className={styles.link}>
          Support
        </a>
      </div>
    </footer>
  );
}

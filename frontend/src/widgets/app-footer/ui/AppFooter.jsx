import React from 'react';
import styles from './AppFooter.module.css';

export function AppFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.left}>
        <span className={styles.statusPill}>
          <span className={styles.greenDot} />
          StockFlow 17.0+e (Enterprise Edition)
        </span>
      </div>
      <div className={styles.right}>
        <span>UTC</span>
        <a href="#support" className={styles.link}>
          Support
        </a>
      </div>
    </footer>
  );
}

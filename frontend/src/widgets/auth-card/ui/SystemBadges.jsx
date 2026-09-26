import React from 'react';
import styles from './SystemBadges.module.css';

export function SystemBadges() {
  return (
    <div className={styles.container}>
      <span className={styles.pill}>v17.0 Enterprise</span>
      <span className={styles.dot}>•</span>
      <a href="#help" className={styles.link}>
        Help &amp; Documentation
      </a>
      <span className={styles.dot}>•</span>
      <a href="#security" className={styles.link}>
        Security
      </a>
    </div>
  );
}

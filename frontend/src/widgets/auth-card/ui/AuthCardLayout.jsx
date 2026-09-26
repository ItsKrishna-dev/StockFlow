import React from 'react';
import { StockFlowLogo } from './StockFlowLogo';
import { SystemBadges } from './SystemBadges';
import styles from './AuthCardLayout.module.css';

export function AuthCardLayout({
  title,
  subtitle,
  children,
}) {
  return (
    <div className={styles.page}>
      {/* Centered Auth Card */}
      <main className={styles.main}>
        <div className={styles.card}>
          <StockFlowLogo />

          <div className={styles.header}>
            <h1 className={styles.title}>{title}</h1>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>

          {children}
        </div>

        {/* Auxiliary System Badges */}
        <SystemBadges />
      </main>

      {/* Footer copyright */}
      <footer className={styles.footer}>
        <p>
          Powered by <span className={styles.footerBrand}>StockFlow</span> Enterprise SaaS
        </p>
      </footer>
    </div>
  );
}

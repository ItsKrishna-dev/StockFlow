import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ROUTES } from '../../../shared/config/routes';
import { cn } from '../../../shared/lib/classNames';
import styles from './AppHeader.module.css';

export function AppHeader({ user = { name: 'Mitchell Admin' } }) {
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: ROUTES.DASHBOARD },
    { label: 'Operations', path: ROUTES.OPERATIONS },
    { label: 'Stock', path: ROUTES.STOCK },
    { label: 'Move History', path: ROUTES.MOVE_HISTORY },
    { label: 'Settings', path: ROUTES.SETTINGS },
  ];

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.leftSection}>
          {/* App Switcher button */}
          <button
            type="button"
            className={styles.iconBtn}
            title="App Switcher"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              apps
            </span>
          </button>

          {/* Brand & module name */}
          <Link to={ROUTES.DASHBOARD} className={styles.brand}>
            <span>StockFlow</span>
            <span className={styles.appBadge}>inventory</span>
          </Link>

          {/* Navigation */}
          <nav className={styles.nav}>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.label}
                  to={item.path}
                  className={cn(styles.navLink, isActive ? styles.navLinkActive : '')}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right utility buttons */}
        <div className={styles.rightSection}>
          <button
            type="button"
            className={styles.iconBtn}
            title="Conversations"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              chat
            </span>
          </button>

          <div className={styles.notifWrapper}>
            <button
              type="button"
              className={styles.iconBtn}
              title="Activities"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                schedule
              </span>
            </button>
            <span className={styles.notifDot} />
          </div>

          <div className={styles.userProfile}>
            <span className={styles.userName}>{user.name}</span>
            <div className={styles.avatar}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                person
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

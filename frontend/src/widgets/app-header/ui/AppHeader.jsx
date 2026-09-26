import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ROUTES } from '../../../shared/config/routes';
import { cn } from '../../../shared/lib/classNames';
import styles from './AppHeader.module.css';

export function AppHeader({ user = { name: 'Mitchell Admin' } }) {
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: 'dashboard' },
    { label: 'Receipts', path: ROUTES.RECEIPTS, icon: 'call_received' },
    { label: 'Delivery Orders', path: ROUTES.DELIVERY_ORDERS, icon: 'local_shipping' },
    { label: 'Stock', path: ROUTES.STOCK, icon: 'inventory' },
    { label: 'Move History', path: ROUTES.MOVE_HISTORY, icon: 'receipt_long' },
    { label: 'Settings', path: ROUTES.SETTINGS, icon: 'settings' },
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
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
              apps
            </span>
          </button>

          {/* Brand & module name */}
          <Link to={ROUTES.HOME} className={styles.brand}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#f0bfe0' }}>
              inventory_2
            </span>
            <span>StockFlow</span>
            <span className={styles.appBadge}>operations</span>
          </Link>

          {/* Navigation */}
          <nav className={styles.nav}>
            {navItems.map((item) => {
              const isActive =
                location.pathname === item.path ||
                (item.path === ROUTES.DELIVERY_ORDERS && location.pathname === ROUTES.HOME);
              return (
                <Link
                  key={item.label}
                  to={item.path}
                  className={cn(styles.navLink, isActive ? styles.navLinkActive : '')}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
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
            title="AI Copilot & Chat"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              auto_awesome
            </span>
          </button>

          <div className={styles.notifWrapper}>
            <button
              type="button"
              className={styles.iconBtn}
              title="Activities"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                schedule
              </span>
            </button>
            <span className={styles.notifDot} />
          </div>

          <div className={styles.userProfile}>
            <span className={styles.userName}>{user.name}</span>
            <div className={styles.avatar}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                person
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

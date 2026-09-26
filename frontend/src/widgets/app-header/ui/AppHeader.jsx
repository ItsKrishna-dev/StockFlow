import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../shared/config/routes';
import { cn } from '../../../shared/lib/classNames';
import styles from './AppHeader.module.css';

export function AppHeader({ user = { name: 'Mitchell Admin' } }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showOperationsMenu, setShowOperationsMenu] = useState(false);

  const navItems = [
    { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: 'dashboard' },
    { label: 'Receipts', path: ROUTES.RECEIPTS, icon: 'move_to_inbox' },
    { label: 'Deliveries', path: ROUTES.DELIVERY_ORDERS, icon: 'local_shipping' },
    {
      label: 'Operations',
      icon: 'swap_horiz',
      isDropdown: true,
      children: [
        { label: 'Internal Transfers', path: ROUTES.TRANSFERS, icon: 'swap_horiz' },
        { label: 'Stock Adjustments', path: ROUTES.ADJUSTMENTS, icon: 'tune' },
      ],
    },
    { label: 'Stock', path: ROUTES.STOCK, icon: 'inventory' },
    { label: 'Move History', path: ROUTES.MOVE_HISTORY, icon: 'receipt_long' },
    { label: 'Settings', path: ROUTES.SETTINGS, icon: 'settings' },
  ];

  const isItemActive = (itemPath) => {
    if (!itemPath) return false;
    if (itemPath === ROUTES.DASHBOARD) return location.pathname === ROUTES.DASHBOARD;
    if (itemPath === ROUTES.RECEIPTS) return location.pathname === ROUTES.RECEIPTS || location.pathname.startsWith('/receipts');
    if (itemPath === ROUTES.DELIVERY_ORDERS) return (
      location.pathname === ROUTES.DELIVERY_ORDERS ||
      location.pathname === ROUTES.OPERATIONS ||
      location.pathname.startsWith('/delivery-orders')
    );
    if (itemPath === ROUTES.STOCK) return location.pathname === ROUTES.STOCK;
    if (itemPath === ROUTES.MOVE_HISTORY) return location.pathname === ROUTES.MOVE_HISTORY;
    if (itemPath === ROUTES.SETTINGS) return location.pathname.startsWith('/settings');
    if (itemPath === ROUTES.TRANSFERS) return location.pathname === ROUTES.TRANSFERS;
    if (itemPath === ROUTES.ADJUSTMENTS) return location.pathname === ROUTES.ADJUSTMENTS;
    return location.pathname === itemPath;
  };

  const isDropdownActive = (item) => {
    if (!item.children) return false;
    return item.children.some(c => isItemActive(c.path));
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.leftSection}>
          {/* App Switcher button */}
          <button
            type="button"
            className={styles.iconBtn}
            title="StockFlow Apps"
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
              if (item.isDropdown) {
                const isActive = isDropdownActive(item);
                return (
                  <div
                    key={item.label}
                    style={{ position: 'relative' }}
                    onMouseEnter={() => setShowOperationsMenu(true)}
                    onMouseLeave={() => setShowOperationsMenu(false)}
                  >
                    <button
                      className={cn(styles.navLink, isActive ? styles.navLinkActive : '')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 10px' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                        expand_more
                      </span>
                    </button>
                    {showOperationsMenu && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        minWidth: '200px',
                        background: '#ffffff',
                        border: '1px solid #d1c3ca',
                        borderRadius: '8px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        zIndex: 200,
                        overflow: 'hidden',
                        marginTop: '4px',
                      }}>
                        {item.children.map(child => (
                          <Link
                            key={child.label}
                            to={child.path}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '10px 14px',
                              textDecoration: 'none',
                              color: isItemActive(child.path) ? '#57344f' : '#1b1c1c',
                              fontSize: '13px',
                              fontWeight: isItemActive(child.path) ? 600 : 400,
                              background: isItemActive(child.path) ? '#f5f3f3' : 'transparent',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#efeded'}
                            onMouseLeave={e => e.currentTarget.style.background = isItemActive(child.path) ? '#f5f3f3' : 'transparent'}
                            onClick={() => setShowOperationsMenu(false)}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '17px', color: '#57344f' }}>
                              {child.icon}
                            </span>
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              const isActive = isItemActive(item.path);
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
            title="AI Copilot & Assistant"
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

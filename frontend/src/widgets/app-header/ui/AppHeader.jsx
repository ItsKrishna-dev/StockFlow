import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../shared/config/routes';
import { authApi, sessionStore } from '../../../entities/session';
import { cn } from '../../../shared/lib/classNames';
import styles from './AppHeader.module.css';

export function AppHeader({ user = { name: 'Mitchell Admin' } }) {
  const location = useLocation();
  const navigate = useNavigate();
  const sessionUser = sessionStore.getUser();
  const session = sessionStore.getSession();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);

  const userMenuRef = useRef(null);
  const notifMenuRef = useRef(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = sessionUser?.fullName || sessionUser?.name || session?.email || user?.name || 'Admin User';
  const displayRole = sessionUser?.role || 'Administrator';
  const displayEmail = sessionUser?.email || session?.email || 'admin@stockflow.com';

  const handleLogout = async () => {
    try {
      const refreshToken = sessionStore.getRefreshToken();
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch {
      // Ignore network errors
    } finally {
      sessionStore.clearUser();
      navigate(ROUTES.LOGIN);
    }
  };

  // Check if current route belongs to Operations section
  const isOperationsRoute = [
    ROUTES.OPERATIONS,
    ROUTES.RECEIPTS,
    ROUTES.DELIVERY_ORDERS,
    ROUTES.TRANSFERS,
    ROUTES.ADJUSTMENTS,
  ].some((p) => location.pathname === p || location.pathname.startsWith(p + '/'));

  // Main top navbar items (Receipts and Deliveries are moved inside Operations)
  const navItems = [
    { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: 'dashboard' },
    { label: 'Operations', path: ROUTES.RECEIPTS, icon: 'swap_horiz' },
    { label: 'Stock', path: ROUTES.STOCK, icon: 'inventory_2' },
    { label: 'Move History', path: ROUTES.MOVE_HISTORY, icon: 'receipt_long' },
    { label: 'Settings', path: ROUTES.SETTINGS, icon: 'settings' },
  ];

  // Secondary subnavbar tabs for the Operations section
  const operationsTabs = [
    {
      label: 'Receipts',
      path: ROUTES.RECEIPTS,
      icon: 'move_to_inbox',
      badge: 'In',
      isActive: (p) => p === ROUTES.RECEIPTS || p.startsWith('/receipts'),
    },
    {
      label: 'Deliveries',
      path: ROUTES.DELIVERY_ORDERS,
      icon: 'local_shipping',
      badge: 'Out',
      isActive: (p) => p === ROUTES.DELIVERY_ORDERS || p === ROUTES.OPERATIONS || p.startsWith('/delivery-orders'),
    },
    {
      label: 'Transfers',
      path: ROUTES.TRANSFERS,
      icon: 'swap_horiz',
      isActive: (p) => p === ROUTES.TRANSFERS || p.startsWith('/transfers'),
    },
    {
      label: 'Adjustments',
      path: ROUTES.ADJUSTMENTS,
      icon: 'tune',
      isActive: (p) => p === ROUTES.ADJUSTMENTS || p.startsWith('/adjustments'),
    },
  ];

  const isItemActive = (itemPath) => {
    if (!itemPath) return false;
    if (itemPath === ROUTES.DASHBOARD) {
      return location.pathname === ROUTES.DASHBOARD || location.pathname === ROUTES.HOME;
    }
    if (itemPath === ROUTES.RECEIPTS || itemPath === ROUTES.OPERATIONS) {
      return isOperationsRoute;
    }
    if (itemPath === ROUTES.STOCK) return location.pathname === ROUTES.STOCK;
    if (itemPath === ROUTES.MOVE_HISTORY) return location.pathname === ROUTES.MOVE_HISTORY;
    if (itemPath === ROUTES.SETTINGS) return location.pathname.startsWith('/settings');
    return location.pathname === itemPath;
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        {/* Left Section: Brand & Main Navigation */}
        <div className={styles.leftSection}>
          {/* Brand Logo & Name */}
          <Link to={ROUTES.HOME} className={styles.brand} title="StockFlow Inventory">
            <div className={styles.brandIconContainer}>
              <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#ffffff' }}>
                inventory_2
              </span>
            </div>
            <span className={styles.brandName}>StockFlow</span>
          </Link>

          {/* Main Top Navigation */}
          <nav className={styles.nav}>
            {navItems.map((item) => {
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

        {/* Right Section: Quick Utilities & Profile */}
        <div className={styles.rightSection}>
          {/* Activity / Notifications dropdown */}
          <div ref={notifMenuRef} className={styles.menuContainer}>
            <button
              type="button"
              className={styles.iconBtn}
              title="Recent Activities"
              onClick={() => setShowNotifs((prev) => !prev)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>
                schedule
              </span>
              <span className={styles.notifDot} />
            </button>

            {showNotifs && (
              <div className={styles.notifMenu}>
                <div className={styles.dropdownHeader}>
                  <span>System Activity</span>
                  <span className={styles.notifStatusBadge}>Active</span>
                </div>
                <div className={styles.notifList}>
                  <div className={styles.notifItem}>
                    <span className="material-symbols-outlined" style={{ color: '#006443', fontSize: '18px' }}>
                      check_circle
                    </span>
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#1b1c1c' }}>Auto-sync Completed</div>
                      <div style={{ fontSize: '11px', color: '#80747a' }}>Database synchronized in real-time</div>
                    </div>
                  </div>
                  <div className={styles.notifItem}>
                    <span className="material-symbols-outlined" style={{ color: '#006398', fontSize: '18px' }}>
                      swap_horiz
                    </span>
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#1b1c1c' }}>Live Warehouse Tracking</div>
                      <div style={{ fontSize: '11px', color: '#80747a' }}>Multi-warehouse nodes active</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User profile dropdown - ONLY clicking here displays user menu with Log Out */}
          <div ref={userMenuRef} className={styles.menuContainer}>
            <div
              className={styles.userProfile}
              onClick={() => setShowUserMenu((prev) => !prev)}
              role="button"
              tabIndex={0}
              title="User Account"
            >
              <div className={styles.avatar}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  person
                </span>
              </div>
              <div className={styles.userInfoCol}>
                <span className={styles.userName}>{displayName}</span>
                <span className={styles.userRole}>{displayRole}</span>
              </div>
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: '16px',
                  opacity: 0.8,
                  transition: 'transform 0.2s ease',
                  transform: showUserMenu ? 'rotate(180deg)' : 'none',
                }}
              >
                expand_more
              </span>
            </div>

            {showUserMenu && (
              <div className={styles.userMenu}>
                <div className={styles.userMenuHeader}>
                  <div className={styles.avatarLarge}>
                    <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                      person
                    </span>
                  </div>
                  <div className={styles.userMenuHeaderInfo}>
                    <div className={styles.userMenuHeaderName}>{displayName}</div>
                    <div className={styles.userMenuHeaderEmail}>{displayEmail}</div>
                    <span className={styles.userMenuRoleBadge}>{displayRole}</span>
                  </div>
                </div>
                <div className={styles.menuDivider} />
                <Link
                  to={ROUTES.SETTINGS}
                  className={styles.userMenuItem}
                  onClick={() => setShowUserMenu(false)}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#714b67' }}>
                    settings
                  </span>
                  <span>Warehouse Settings</span>
                </Link>
                <Link
                  to={ROUTES.STOCK}
                  className={styles.userMenuItem}
                  onClick={() => setShowUserMenu(false)}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#714b67' }}>
                    inventory_2
                  </span>
                  <span>Manage Stock</span>
                </Link>
                <div className={styles.menuDivider} />
                <button
                  type="button"
                  className={styles.logoutBtn}
                  onClick={handleLogout}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    logout
                  </span>
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Operations Subnavbar - Rendered when inside Operations section */}
      {isOperationsRoute && (
        <div className={styles.subnav}>
          <div className={styles.subnavInner}>
            <div className={styles.subnavLabel}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                alt_route
              </span>
              <span>Operations:</span>
            </div>
            <div className={styles.subnavTabs}>
              {operationsTabs.map((tab) => {
                const isActive = tab.isActive(location.pathname);
                return (
                  <Link
                    key={tab.label}
                    to={tab.path}
                    className={cn(styles.subnavTab, isActive ? styles.subnavTabActive : '')}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>
                      {tab.icon}
                    </span>
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span className={styles.subnavBadge}>{tab.badge}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default AppHeader;

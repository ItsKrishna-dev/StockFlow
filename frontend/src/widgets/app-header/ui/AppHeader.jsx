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

  const [showOperationsMenu, setShowOperationsMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);

  const opsMenuRef = useRef(null);
  const userMenuRef = useRef(null);
  const notifMenuRef = useRef(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (opsMenuRef.current && !opsMenuRef.current.contains(e.target)) {
        setShowOperationsMenu(false);
      }
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

  const navItems = [
    { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: 'dashboard' },
    { label: 'Receipts', path: ROUTES.RECEIPTS, icon: 'move_to_inbox', badge: 'In' },
    { label: 'Deliveries', path: ROUTES.DELIVERY_ORDERS, icon: 'local_shipping', badge: 'Out' },
    {
      label: 'Operations',
      icon: 'swap_horiz',
      isDropdown: true,
      children: [
        { label: 'Internal Transfers', path: ROUTES.TRANSFERS, icon: 'swap_horiz', desc: 'Move stock between internal locations' },
        { label: 'Stock Adjustments', path: ROUTES.ADJUSTMENTS, icon: 'tune', desc: 'Physical inventory count reconciliation' },
      ],
    },
    { label: 'Stock', path: ROUTES.STOCK, icon: 'inventory_2' },
    { label: 'Move History', path: ROUTES.MOVE_HISTORY, icon: 'receipt_long' },
    { label: 'Settings', path: ROUTES.SETTINGS, icon: 'settings' },
  ];

  const isItemActive = (itemPath) => {
    if (!itemPath) return false;
    if (itemPath === ROUTES.DASHBOARD) return location.pathname === ROUTES.DASHBOARD || location.pathname === ROUTES.HOME;
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
            title="StockFlow Workspace"
            onClick={() => navigate(ROUTES.DASHBOARD)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '21px' }}>
              apps
            </span>
          </button>

          {/* Brand & module badge */}
          <Link to={ROUTES.HOME} className={styles.brand}>
            <div className={styles.brandIconContainer}>
              <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#ffffff' }}>
                inventory_2
              </span>
            </div>
            <span className={styles.brandName}>StockFlow</span>
            <span className={styles.appBadge}>
              <span className={styles.livePulseDot} />
              Live
            </span>
          </Link>

          {/* Navigation */}
          <nav className={styles.nav}>
            {navItems.map((item) => {
              if (item.isDropdown) {
                const isActive = isDropdownActive(item);
                return (
                  <div
                    key={item.label}
                    ref={opsMenuRef}
                    className={styles.dropdownContainer}
                  >
                    <button
                      type="button"
                      className={cn(styles.navLink, isActive ? styles.navLinkActive : '')}
                      onClick={() => setShowOperationsMenu(prev => !prev)}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: '16px',
                          transition: 'transform 0.2s',
                          transform: showOperationsMenu ? 'rotate(180deg)' : 'none',
                        }}
                      >
                        expand_more
                      </span>
                    </button>
                    {showOperationsMenu && (
                      <div className={styles.dropdownMenu}>
                        <div className={styles.dropdownHeader}>
                          Operations Management
                        </div>
                        {item.children.map(child => {
                          const isChildActive = isItemActive(child.path);
                          return (
                            <Link
                              key={child.label}
                              to={child.path}
                              className={cn(styles.dropdownItem, isChildActive ? styles.dropdownItemActive : '')}
                              onClick={() => setShowOperationsMenu(false)}
                            >
                              <div className={styles.dropdownItemIcon}>
                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                                  {child.icon}
                                </span>
                              </div>
                              <div className={styles.dropdownItemContent}>
                                <div className={styles.dropdownItemTitle}>{child.label}</div>
                                <div className={styles.dropdownItemDesc}>{child.desc}</div>
                              </div>
                              {isChildActive && (
                                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#714b67' }}>
                                  check
                                </span>
                              )}
                            </Link>
                          );
                        })}
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
                  {item.badge && (
                    <span className={styles.navBadge}>{item.badge}</span>
                  )}
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
            title="Stock Inventory Quick View"
            onClick={() => navigate(ROUTES.STOCK)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>
              search
            </span>
          </button>

          {/* Activity / Notifications dropdown */}
          <div ref={notifMenuRef} className={styles.menuContainer}>
            <button
              type="button"
              className={styles.iconBtn}
              title="Recent Activities"
              onClick={() => setShowNotifs(prev => !prev)}
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
                  <span className={styles.notifStatusBadge}>Live</span>
                </div>
                <div className={styles.notifList}>
                  <div className={styles.notifItem}>
                    <span className="material-symbols-outlined" style={{ color: '#006443', fontSize: '18px' }}>check_circle</span>
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#1b1c1c' }}>Auto-sync Completed</div>
                      <div style={{ fontSize: '11px', color: '#80747a' }}>Database synced with Neon Cloud</div>
                    </div>
                  </div>
                  <div className={styles.notifItem}>
                    <span className="material-symbols-outlined" style={{ color: '#006398', fontSize: '18px' }}>swap_horiz</span>
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#1b1c1c' }}>Live Warehouse Tracking</div>
                      <div style={{ fontSize: '11px', color: '#80747a' }}>Multi-warehouse nodes active</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User profile dropdown */}
          <div ref={userMenuRef} className={styles.menuContainer}>
            <div
              className={styles.userProfile}
              onClick={() => setShowUserMenu(prev => !prev)}
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
              <span className="material-symbols-outlined" style={{ fontSize: '16px', opacity: 0.8 }}>
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
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#1b1c1c' }}>{displayName}</div>
                    <div style={{ fontSize: '11.5px', color: '#80747a' }}>{sessionUser?.email || session?.email || 'admin@gmail.com'}</div>
                  </div>
                </div>
                <div className={styles.menuDivider} />
                <Link to={ROUTES.SETTINGS} className={styles.userMenuItem} onClick={() => setShowUserMenu(false)}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#714b67' }}>settings</span>
                  <span>Warehouse Settings</span>
                </Link>
                <Link to={ROUTES.STOCK} className={styles.userMenuItem} onClick={() => setShowUserMenu(false)}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#714b67' }}>inventory_2</span>
                  <span>Manage Stock</span>
                </Link>
                <div className={styles.menuDivider} />
                <button
                  type="button"
                  className={styles.logoutBtn}
                  onClick={handleLogout}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span>
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Log Out"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              color: '#fca5a5',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              transition: 'all 0.15s ease-in-out',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.25)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.12)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>
              logout
            </span>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
export default AppHeader;

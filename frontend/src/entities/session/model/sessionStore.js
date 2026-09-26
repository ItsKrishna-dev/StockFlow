/**
 * entities/session/model/sessionStore.js
 *
 * Manages the JWT session in localStorage.
 * Backend returns: { access_token, refresh_token, token_type }
 */
const SESSION_KEY = 'stockflow_session';

export const sessionStore = {
  getSession() {
    try {
      const data = localStorage.getItem(SESSION_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  /** Alias for backward compatibility & user object accessor */
  getUser() {
    const s = this.getSession();
    if (!s) return null;
    return s.user ? { ...s.user, ...s } : s;
  },

  getRole() {
    const user = this.getUser();
    return user?.role || user?.user?.role || 'warehouse_staff';
  },

  getWarehouseId() {
    const user = this.getUser();
    return user?.warehouse_id || user?.user?.warehouse_id || null;
  },

  getAccessToken() {
    return this.getSession()?.access_token || null;
  },

  getRefreshToken() {
    return this.getSession()?.refresh_token || null;
  },

  isAuthenticated() {
    return !!this.getAccessToken();
  },

  /**
   * Called after successful login / token refresh.
   * sessionData = { access_token, refresh_token, token_type, user }
   */
  setUser(sessionData) {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    } catch (e) {
      console.error('Could not save session', e);
    }
  },

  updateUser(userData) {
    try {
      const current = this.getSession() || {};
      const updated = {
        ...current,
        user: { ...(current.user || {}), ...userData },
        role: userData.role || current.role,
        warehouse_id: userData.warehouse_id !== undefined ? userData.warehouse_id : current.warehouse_id,
        fullName: userData.full_name || userData.fullName || current.fullName,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Could not update user in session', e);
    }
  },

  clearUser() {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (e) {
      console.error('Could not clear session', e);
    }
  },
};

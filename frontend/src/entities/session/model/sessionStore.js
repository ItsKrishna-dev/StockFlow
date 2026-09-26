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

  /** Alias for backward compatibility */
  getUser() {
    return this.getSession();
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
   * sessionData = { access_token, refresh_token, token_type }
   */
  setUser(sessionData) {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    } catch (e) {
      console.error('Could not save session', e);
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

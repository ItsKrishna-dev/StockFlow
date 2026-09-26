const SESSION_KEY = 'stockflow_session';

export const sessionStore = {
  getUser() {
    try {
      const data = localStorage.getItem(SESSION_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

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

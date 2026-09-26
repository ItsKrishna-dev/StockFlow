export const authApi = {
  async login({ loginId, password }) {
    // Simulated network delay for realistic enterprise feel
    await new Promise((resolve) => setTimeout(resolve, 600));

    if (!loginId || !password) {
      throw new Error('Please enter both Login Id and Password');
    }

    // Example mock authentication response
    return {
      user: {
        id: 'user_1',
        loginId,
      },
      token: 'stockflow_session_token_' + Date.now(),
    };
  },

  async signUp({ loginId, email, password, confirmPassword }) {
    await new Promise((resolve) => setTimeout(resolve, 700));

    if (!loginId || !email || !password) {
      throw new Error('All fields are required');
    }

    if (password !== confirmPassword) {
      throw new Error('Passwords do not match');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    return {
      user: {
        id: 'user_' + Date.now(),
        loginId,
        email,
      },
      token: 'stockflow_session_token_' + Date.now(),
    };
  },
};

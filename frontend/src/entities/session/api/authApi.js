/**
 * entities/session/api/authApi.js
 *
 * Real HTTP calls to backend /api/v1/auth/* endpoints.
 */
import { apiClient } from '../../../shared/lib/apiClient';

export const authApi = {
  /**
   * POST /api/v1/auth/login
   * Returns TokenResponse: { access_token, refresh_token, token_type }
   */
  async login({ loginId, password }) {
    return apiClient.post('/auth/login', {
      email: loginId,
      password,
    });
  },

  /**
   * POST /api/v1/auth/signup
   * Returns UserOut
   */
  async signUp({ email, password, full_name, role }) {
    return apiClient.post('/auth/signup', {
      email,
      password,
      full_name,
      role,
    });
  },

  /**
   * POST /api/v1/auth/refresh
   */
  async refresh(refresh_token) {
    return apiClient.post('/auth/refresh', { refresh_token });
  },

  /**
   * POST /api/v1/auth/logout
   */
  async logout(refresh_token) {
    return apiClient.post('/auth/logout', { refresh_token });
  },

  /**
   * POST /api/v1/auth/forgot-password
   */
  async forgotPassword(email) {
    return apiClient.post('/auth/forgot-password', { email });
  },

  /**
   * POST /api/v1/auth/reset-password
   */
  async resetPassword({ email, otp, new_password }) {
    return apiClient.post('/auth/reset-password', { email, otp, new_password });
  },

  /**
   * GET /api/v1/auth/me
   */
  async getMe() {
    return apiClient.get('/auth/me');
  },
};

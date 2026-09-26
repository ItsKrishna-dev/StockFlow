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
    const cleanId = (loginId || '').trim();
    return apiClient.post('/auth/login', {
      login_id: cleanId,
      email: cleanId,
      password,
    });
  },

  /**
   * POST /api/v1/auth/signup
   * Returns UserOut
   */
  async signUp({ login_id, email, password, full_name, role }) {
    const cleanLoginId = (login_id || '').trim();
    return apiClient.post('/auth/signup', {
      login_id: cleanLoginId,
      email: (email || '').trim(),
      password,
      full_name: (full_name || cleanLoginId).trim(),
      role: role || 'warehouse_staff',
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
  async resetPassword({ email, otp, otp_code, new_password }) {
    return apiClient.post('/auth/reset-password', {
      email,
      otp_code: (otp_code || otp || '').trim(),
      new_password,
    });
  },

  /**
   * GET /api/v1/auth/me
   */
  async getMe() {
    return apiClient.get('/auth/me');
  },
};

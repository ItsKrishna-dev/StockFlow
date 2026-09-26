/**
 * shared/lib/apiClient.js
 *
 * Central HTTP client for all backend API calls.
 * - Automatically attaches Bearer token from localStorage
 * - Handles 401 → clears session and redirects to /login
 * - Throws error objects with { message, status } for UI consumption
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const SESSION_KEY = 'stockflow_session';

function getToken() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    return session?.access_token || null;
  } catch {
    return null;
  }
}

async function request(method, path, body = undefined, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };

  const response = await fetch(`${BASE_URL}${path}`, config);

  if (response.status === 401) {
    // Clear stale session and redirect to login
    localStorage.removeItem(SESSION_KEY);
    window.location.href = '/login';
    throw new Error('Session expired. Please login again.');
  }

  if (!response.ok) {
    let errorMessage = `Request failed: ${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (Array.isArray(errorData?.detail)) {
        errorMessage = errorData.detail.map(d => `${d.loc?.slice(-1)[0] || 'field'}: ${d.msg}`).join('; ');
      } else {
        errorMessage = errorData?.detail || errorData?.message || errorMessage;
      }
    } catch {
      // Keep default error message
    }
    const err = new Error(errorMessage);
    err.status = response.status;
    throw err;
  }

  // Handle 204 No Content
  if (response.status === 204) return null;

  return response.json();
}

export const apiClient = {
  get: (path, options) => request('GET', path, undefined, options),
  post: (path, body, options) => request('POST', path, body, options),
  patch: (path, body, options) => request('PATCH', path, body, options),
  put: (path, body, options) => request('PUT', path, body, options),
  delete: (path, options) => request('DELETE', path, undefined, options),
};

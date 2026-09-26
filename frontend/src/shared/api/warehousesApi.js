/**
 * shared/api/warehousesApi.js
 *
 * API calls for warehouses, locations, and partners.
 */
import { apiClient } from '../lib/apiClient';

export const warehousesApi = {
  // ─── Warehouses ──────────────────────────────────────────────────────────

  async listWarehouses() {
    return apiClient.get('/warehouses');
  },

  async createWarehouse(payload) {
    return apiClient.post('/warehouses', payload);
  },

  // ─── Locations ───────────────────────────────────────────────────────────

  /**
   * GET /api/v1/locations?warehouse_id=...&type=...
   * type: 'internal' | 'vendor' | 'customer' | 'virtual'
   */
  async listLocations({ warehouse_id, type } = {}) {
    const params = new URLSearchParams();
    if (warehouse_id) params.set('warehouse_id', warehouse_id);
    if (type) params.set('type', type);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get(`/locations${query}`);
  },

  async createLocation(payload) {
    return apiClient.post('/locations', payload);
  },

  // ─── Partners ────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/partners?type=...
   * type: 'vendor' | 'customer' | 'both'
   */
  async listPartners({ type } = {}) {
    const query = type ? `?type=${type}` : '';
    return apiClient.get(`/partners${query}`);
  },

  async createPartner(payload) {
    return apiClient.post('/partners', payload);
  },
};

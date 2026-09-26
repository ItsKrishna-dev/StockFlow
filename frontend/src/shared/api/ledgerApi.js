/**
 * shared/api/ledgerApi.js
 *
 * API calls for Move History / Ledger.
 */
import { apiClient } from '../lib/apiClient';

export const ledgerApi = {
  /**
   * GET /api/v1/ledger/move-history
   * Optional filters: document_type, status, warehouse_id, location_id
   */
  async getMoveHistory({ document_type, status, warehouse_id, location_id } = {}) {
    const params = new URLSearchParams();
    if (document_type && document_type !== 'all') params.set('document_type', document_type);
    if (status && status !== 'all') params.set('status', status);
    if (warehouse_id && warehouse_id !== 'all' && warehouse_id !== 'ALL') params.set('warehouse_id', warehouse_id);
    if (location_id && location_id !== 'all' && location_id !== 'ALL') params.set('location_id', location_id);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get(`/ledger/move-history${query}`);
  },

  /**
   * GET /api/v1/ledger/{document_id}
   */
  async getDocument(documentId) {
    return apiClient.get(`/ledger/${documentId}`);
  },

  /**
   * GET /api/v1/ledger/products/{product_id}/summary
   */
  async getProductSummary(productId, { date_from, date_to } = {}) {
    const params = new URLSearchParams();
    if (date_from) params.set('date_from', date_from);
    if (date_to) params.set('date_to', date_to);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get(`/ledger/products/${productId}/summary${query}`);
  },

  /**
   * GET /api/v1/ledger/products/{product_id}/explain
   */
  async explainStock(productId, limit = 50) {
    return apiClient.get(`/ledger/products/${productId}/explain?limit=${limit}`);
  },
};

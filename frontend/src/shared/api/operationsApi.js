/**
 * shared/api/operationsApi.js
 *
 * API calls for all stock operation documents:
 * - Receipts (vendor → internal)
 * - Deliveries (internal → customer)
 * - Internal Transfers
 * - Stock Adjustments
 *
 * All endpoints require authentication (Bearer token).
 */
import { apiClient } from '../lib/apiClient';

// ─── Helper: Format document number for display ─────────────────────────────
function formatDocNumber(doc) {
  return doc.document_number || `#${String(doc.id).slice(0, 8).toUpperCase()}`;
}

// ─── Receipts ─────────────────────────────────────────────────────────────────

export const receiptsApi = {
  /**
   * GET /api/v1/receipts?status=...&warehouse_id=...
   */
  async list({ status, warehouse_id } = {}) {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.set('status', status);
    if (warehouse_id && warehouse_id !== 'all') params.set('warehouse_id', warehouse_id);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get(`/receipts${query}`);
  },

  /**
   * GET /api/v1/receipts/{id}
   */
  async get(id) {
    return apiClient.get(`/receipts/${id}`);
  },

  /**
   * POST /api/v1/receipts
   */
  async create(payload) {
    return apiClient.post('/receipts', payload);
  },

  /**
   * PATCH /api/v1/receipts/{docId}/lines/{lineId}
   */
  async updateLine(docId, lineId, { quantity_done, reason }) {
    return apiClient.patch(`/receipts/${docId}/lines/${lineId}`, {
      quantity_done,
      reason,
    });
  },

  /**
   * POST /api/v1/receipts/{id}/mark-ready
   */
  async markReady(id) {
    return apiClient.post(`/receipts/${id}/mark-ready`);
  },

  /**
   * POST /api/v1/receipts/{id}/validate
   */
  async validate(id) {
    return apiClient.post(`/receipts/${id}/validate`);
  },

  /**
   * POST /api/v1/receipts/{id}/cancel
   */
  async cancel(id) {
    return apiClient.post(`/receipts/${id}/cancel`);
  },
};

// ─── Deliveries ───────────────────────────────────────────────────────────────

export const deliveriesApi = {
  /**
   * GET /api/v1/deliveries?status=...
   */
  async list(status) {
    const query = status ? `?status=${status}` : '';
    return apiClient.get(`/deliveries${query}`);
  },

  /**
   * GET /api/v1/deliveries/{id}
   */
  async get(id) {
    return apiClient.get(`/deliveries/${id}`);
  },

  /**
   * POST /api/v1/deliveries
   */
  async create(payload) {
    return apiClient.post('/deliveries', payload);
  },

  /**
   * PATCH /api/v1/deliveries/{docId}/lines/{lineId}
   */
  async updateLine(docId, lineId, { quantity_done, reason }) {
    return apiClient.patch(`/deliveries/${docId}/lines/${lineId}`, {
      quantity_done,
      reason,
    });
  },

  /**
   * POST /api/v1/deliveries/{id}/validate
   */
  async validate(id) {
    return apiClient.post(`/deliveries/${id}/validate`);
  },

  /**
   * POST /api/v1/deliveries/{id}/cancel
   */
  async cancel(id) {
    return apiClient.post(`/deliveries/${id}/cancel`);
  },
};

// ─── Internal Transfers ───────────────────────────────────────────────────────

export const transfersApi = {
  async list(status) {
    const query = status ? `?status=${status}` : '';
    return apiClient.get(`/transfers${query}`);
  },

  async get(id) {
    return apiClient.get(`/transfers/${id}`);
  },

  async create(payload) {
    return apiClient.post('/transfers', payload);
  },

  async updateLine(docId, lineId, { quantity_done, reason }) {
    return apiClient.patch(`/transfers/${docId}/lines/${lineId}`, {
      quantity_done,
      reason,
    });
  },

  async validate(id) {
    return apiClient.post(`/transfers/${id}/validate`);
  },

  async cancel(id) {
    return apiClient.post(`/transfers/${id}/cancel`);
  },
};

// ─── Stock Adjustments ────────────────────────────────────────────────────────

export const adjustmentsApi = {
  async list(status) {
    const query = status ? `?status=${status}` : '';
    return apiClient.get(`/adjustments${query}`);
  },

  async get(id) {
    return apiClient.get(`/adjustments/${id}`);
  },

  async create(payload) {
    return apiClient.post('/adjustments', payload);
  },

  async validate(id) {
    return apiClient.post(`/adjustments/${id}/validate`);
  },

  async cancel(id) {
    return apiClient.post(`/adjustments/${id}/cancel`);
  },
};

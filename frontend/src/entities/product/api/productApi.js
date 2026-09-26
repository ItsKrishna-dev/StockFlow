/**
 * entities/product/api/productApi.js
 *
 * Real HTTP calls to backend /api/v1/products/* endpoints.
 * Backend ProductOut: { id, name, code, category_id, uom_id, unit_cost, is_active, reorder_point, ... }
 */
import { apiClient } from '../../../shared/lib/apiClient';

/**
 * Map backend ProductOut to the shape the StockPage UI expects.
 * The UI uses: { id, name, code, icon, unitCost, onHand, freeToUse, status }
 * Stock quantities come from /products/{id}/stock endpoint.
 */
function mapProduct(p) {
  return {
    id: p.id,
    name: p.name,
    code: p.code || '',
    icon: 'inventory_2',
    unitCost: Number(p.unit_cost) || 0,
    // onHand & freeToUse will be fetched from stock endpoint separately
    // For list view, default to 0 until populated
    onHand: Number(p.qty_on_hand) ?? 0,
    freeToUse: Number(p.qty_available) ?? 0,
    status: p.is_active ? 'Available' : 'Inactive',
    categoryId: p.category_id,
    uomId: p.uom_id,
    isActive: p.is_active,
    reorderPoint: Number(p.reorder_point) || 0,
  };
}

export const productApi = {
  /**
   * GET /api/v1/products
   */
  async getProducts({ search, category_id, is_active } = {}) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category_id) params.set('category_id', category_id);
    if (is_active !== undefined) params.set('is_active', String(is_active));
    const query = params.toString() ? `?${params.toString()}` : '';
    const data = await apiClient.get(`/products${query}`);
    return data.map(mapProduct);
  },

  /**
   * GET /api/v1/products/{id}
   */
  async getProduct(id) {
    const data = await apiClient.get(`/products/${id}`);
    return mapProduct(data);
  },

  /**
   * GET /api/v1/products/{id}/stock
   */
  async getProductStock(id) {
    return apiClient.get(`/products/${id}/stock`);
  },

  /**
   * POST /api/v1/products
   */
  async addProduct(newProduct) {
    const payload = {
      name: newProduct.name,
      code: newProduct.code || undefined,
      unit_cost: Number(newProduct.unitCost) || 0,
      category_id: newProduct.categoryId || undefined,
      uom_id: newProduct.uomId || undefined,
      is_active: true,
      reorder_point: Number(newProduct.reorderPoint) || 0,
    };
    // Remove undefined keys to avoid backend validation issues
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
    const data = await apiClient.post('/products', payload);
    return mapProduct(data);
  },

  /**
   * PATCH /api/v1/products/{id}
   */
  async updateProduct(id, updates) {
    const payload = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.unitCost !== undefined) payload.unit_cost = Number(updates.unitCost);
    if (updates.isActive !== undefined) payload.is_active = updates.isActive;
    if (updates.reorderPoint !== undefined) payload.reorder_point = Number(updates.reorderPoint);
    const data = await apiClient.patch(`/products/${id}`, payload);
    return mapProduct(data);
  },

  /**
   * GET /api/v1/categories
   */
  async getCategories() {
    return apiClient.get('/categories');
  },

  /**
   * GET /api/v1/units-of-measure
   */
  async getUOMs() {
    return apiClient.get('/units-of-measure');
  },
};

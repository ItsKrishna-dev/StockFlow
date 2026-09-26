/**
 * entities/inventory-kpi/api/kpiApi.js
 *
 * Real HTTP calls to backend /api/v1/dashboard/* endpoints.
 */
import { apiClient } from '../../../shared/lib/apiClient';

/**
 * Maps DashboardKPIs from backend into the KpiCard shape the UI expects.
 * Backend: { total_products, low_stock_count, out_of_stock_count,
 *            pending_receipts, pending_deliveries, scheduled_transfers }
 */
function mapKpisToCards(raw) {
  return {
    receipt: {
      title: 'Receipts',
      icon: 'move_to_inbox',
      stripeColor: 'var(--stockflow-primary)',
      actionText: `${raw.pending_receipts} to receive`,
      operationsCount: raw.pending_receipts,
      progressDone: 0,
      progressTotal: raw.pending_receipts || 1,
      subReference: 'WH/IN Receipts',
      segments: [
        { color: 'var(--stockflow-primary)', width: `${Math.min(100, raw.pending_receipts * 10)}%` },
        { color: '#e4e2e2', width: '100%' },
      ],
    },
    delivery: {
      title: 'Deliveries',
      icon: 'local_shipping',
      stripeColor: '#006398',
      actionText: `${raw.pending_deliveries} to deliver`,
      operationsCount: raw.pending_deliveries,
      progressDone: 0,
      progressTotal: raw.pending_deliveries || 1,
      subReference: 'WH/OUT Deliveries',
      segments: [
        { color: '#006398', width: `${Math.min(100, raw.pending_deliveries * 10)}%` },
        { color: '#e4e2e2', width: '100%' },
      ],
    },
    lowStock: {
      title: 'Low Stock',
      icon: 'warning_amber',
      stripeColor: '#d97706',
      actionText: `${raw.low_stock_count} items low`,
      operationsCount: raw.low_stock_count,
      subReference: 'Reorder needed',
    },
    totalProducts: raw.total_products,
    outOfStock: raw.out_of_stock_count,
    scheduledTransfers: raw.scheduled_transfers,
  };
}

/**
 * Maps LowStockItem[] into WarehouseTransfersTable row shape.
 */
function mapLowStockToTransfers(items) {
  return items.map((item) => ({
    reference: item.sku,
    type: 'Low Stock',
    partner: item.warehouse_name || 'Warehouse',
    date: `${Number(item.current_qty).toFixed(0)} / ${Number(item.min_qty).toFixed(0)} min`,
    status: Number(item.current_qty) === 0 ? 'Out of Stock' : 'Low Stock',
    statusVariant: Number(item.current_qty) === 0 ? 'error' : 'secondary',
    productName: item.name,
  }));
}

export const kpiApi = {
  /**
   * GET /api/v1/dashboard/kpis
   */
  async getKpis() {
    const raw = await apiClient.get('/dashboard/kpis');
    return mapKpisToCards(raw);
  },

  /**
   * GET /api/v1/dashboard/low-stock
   * Used for the WarehouseTransfersTable widget.
   */
  async getTransfers() {
    const items = await apiClient.get('/dashboard/low-stock');
    return mapLowStockToTransfers(items);
  },

  /**
   * Get raw KPI numbers (for custom use).
   */
  async getRawKpis() {
    return apiClient.get('/dashboard/kpis');
  },

  /**
   * Get raw low-stock list.
   */
  async getLowStockItems() {
    return apiClient.get('/dashboard/low-stock');
  },
};

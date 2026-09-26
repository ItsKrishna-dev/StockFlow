import React, { useState, useMemo, useRef, useEffect } from 'react';
import './DeliveryOrders.css';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DeliveryDetailModal from './DeliveryDetailModal';
import NewDeliveryModal from './NewDeliveryModal';
import DeliveryOrderDetailView from './DeliveryOrderDetailView';
import { AppHeader } from '../../widgets/app-header';
import { AppFooter } from '../../widgets/app-footer';
import { deliveriesApi } from '../../shared/api/operationsApi';
import { warehousesApi } from '../../shared/api/warehousesApi';
import { productApi } from '../../entities/product';

function getStatusBadge(status) {
  switch (status) {
    case 'draft':
      return { label: 'Draft', bg: '#f5f3f3', color: '#4e444a' };
    case 'waiting':
      return { label: 'Waiting Availability', bg: '#fef3c7', color: '#92400e' };
    case 'ready':
      return { label: 'Ready for Pickup', bg: '#e0f2fe', color: '#0369a1' };
    case 'done':
      return { label: 'Done / Delivered', bg: '#d1fae5', color: '#006443' };
    case 'cancelled':
    case 'canceled':
      return { label: 'Cancelled', bg: '#fee2e2', color: '#991b1b' };
    default:
      return { label: status, bg: '#f5f3f3', color: '#4e444a' };
  }
}

export default function DeliveryOrdersPage() {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [facilityFilter, setFacilityFilter] = useState('ALL');
  const [activeView, setActiveView] = useState('list');
  const [toastMessage, setToastMessage] = useState('');

  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState(null);
  const [inspectOrder, setInspectOrder] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: rawOrders = [], isLoading: isLoadingDeliveries } = useQuery({
    queryKey: ['deliveries'],
    queryFn: () => deliveriesApi.list(),
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesApi.listWarehouses(),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => warehousesApi.listLocations(),
  });

  const { data: partners = [] } = useQuery({
    queryKey: ['partners'],
    queryFn: () => warehousesApi.listPartners(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => productApi.getProducts(),
  });

  // Fast entity lookup maps
  const warehouseMap = useMemo(() => {
    const map = {};
    warehouses.forEach((w) => {
      map[w.id] = w.name || w.code;
    });
    return map;
  }, [warehouses]);

  const locationMap = useMemo(() => {
    const map = {};
    locations.forEach((l) => {
      map[l.id] = l.complete_name || l.name || l.code;
    });
    return map;
  }, [locations]);

  const partnerMap = useMemo(() => {
    const map = {};
    partners.forEach((p) => {
      map[p.id] = p.name;
    });
    return map;
  }, [partners]);

  const productMap = useMemo(() => {
    const map = {};
    products.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [products]);

  // Map backend DocumentOut to display shape with human-readable entity names
  const orders = useMemo(() => {
    return rawOrders.map((doc) => {
      const fromLoc = locationMap[doc.source_location_id] || 'WH/Stock';
      const toLoc = locationMap[doc.dest_location_id] || 'Partner Locations/Customers';
      const customerContact =
        partnerMap[doc.partner_id] ||
        (doc.notes?.match(/Customer:\s*([^)]+)/)?.[1]?.trim() || (doc.partner_id ? 'Customer Partner' : 'Standard Client'));
      const whName = warehouseMap[doc.warehouse_id] || 'Central WH';

      return {
        id: doc.id,
        reference: doc.document_number || `#${String(doc.id).slice(0, 8).toUpperCase()}`,
        fromLocationId: doc.source_location_id,
        fromLocation: fromLoc,
        toLocationId: doc.dest_location_id,
        toLocation: toLoc,
        contact: customerContact,
        partnerId: doc.partner_id,
        warehouseId: doc.warehouse_id,
        warehouseName: whName,
        scheduledDate: doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '—',
        status: doc.status,
        linesCount: doc.lines?.length || 0,
        lines: (doc.lines || []).map((l) => {
          const p = productMap[l.product_id];
          return {
            id: l.id,
            productId: l.product_id,
            productName: p ? p.name : String(l.product_id).slice(0, 8),
            demand: Number(l.quantity_expected) || 0,
            reserved: Number(l.quantity_expected) || 0,
            done: Number(l.quantity_done) || 0,
            uom: p?.uomId || 'Units',
          };
        }),
        note: doc.notes || '',
        raw: doc,
      };
    });
  }, [rawOrders, locationMap, partnerMap, warehouseMap, productMap]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const validateMutation = useMutation({
    mutationFn: (id) => deliveriesApi.validate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
      showToast('Delivery Order validated — stock dispatched');
      if (inspectOrder) setInspectOrder(null);
    },
    onError: (err) => showToast(err.response?.data?.detail || err.message || 'Validation failed'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => deliveriesApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
      showToast('Delivery Order cancelled');
      if (inspectOrder) setInspectOrder(null);
    },
    onError: (err) => showToast(err.response?.data?.detail || err.message || 'Cancel failed'),
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3500);
  };

  // ── Filtered Orders ───────────────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        order.reference.toLowerCase().includes(q) ||
        order.contact.toLowerCase().includes(q) ||
        order.warehouseName.toLowerCase().includes(q) ||
        order.fromLocation.toLowerCase().includes(q) ||
        order.toLocation.toLowerCase().includes(q) ||
        order.note.toLowerCase().includes(q) ||
        order.lines?.some((l) => l.productName.toLowerCase().includes(q));

      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'draft' && order.status === 'draft') ||
        (filterStatus === 'waiting' && order.status === 'waiting') ||
        (filterStatus === 'ready' && order.status === 'ready') ||
        (filterStatus === 'done' && order.status === 'done') ||
        (filterStatus === 'cancelled' && (order.status === 'cancelled' || order.status === 'canceled'));

      const matchesFacility =
        facilityFilter === 'ALL' || order.warehouseId === facilityFilter;

      return matchesSearch && matchesStatus && matchesFacility;
    });
  }, [orders, filterStatus, facilityFilter, searchQuery]);

  // Statistics
  const counts = useMemo(() => {
    return {
      all: orders.length,
      draft: orders.filter((o) => o.status === 'draft').length,
      waiting: orders.filter((o) => o.status === 'waiting').length,
      ready: orders.filter((o) => o.status === 'ready').length,
      done: orders.filter((o) => o.status === 'done').length,
      cancelled: orders.filter((o) => o.status === 'cancelled' || o.status === 'canceled').length,
    };
  }, [orders]);

  const statusFilterTabs = [
    { key: 'all', label: `All (${counts.all})` },
    { key: 'ready', label: `Ready for Pickup (${counts.ready})` },
    { key: 'waiting', label: `Waiting Availability (${counts.waiting})` },
    { key: 'draft', label: `Draft (${counts.draft})` },
    { key: 'done', label: `Delivered (${counts.done})` },
    { key: 'cancelled', label: `Cancelled (${counts.cancelled})` },
  ];

  // Selection
  const isAllSelected = filteredOrders.length > 0 && selectedIds.length === filteredOrders.length;
  const isSomeSelected = selectedIds.length > 0 && selectedIds.length < filteredOrders.length;
  const selectAllRef = useRef(null);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = isSomeSelected;
    }
  }, [isSomeSelected]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredOrders.map((o) => o.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleRowSelect = (id, e) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // CSV Export
  const handleDownloadCSV = () => {
    if (filteredOrders.length === 0) {
      showToast('No delivery orders to export');
      return;
    }
    const headers = ['Reference', 'Warehouse', 'Source Sub-Location', 'Destination', 'Customer Contact', 'Scheduled Date', 'Lines', 'Status'];
    const rows = filteredOrders.map((o) => [
      o.reference,
      `"${o.warehouseName}"`,
      `"${o.fromLocation}"`,
      `"${o.toLocation}"`,
      `"${o.contact}"`,
      o.scheduledDate,
      o.linesCount,
      o.status,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `stockflow_delivery_orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Delivery orders exported to CSV');
  };

  if (selectedOrderForDetail) {
    return (
      <DeliveryOrderDetailView
        initialOrder={selectedOrderForDetail}
        onBackToList={() => setSelectedOrderForDetail(null)}
      />
    );
  }

  return (
    <div className="stockflow-shell odoo-shell">
      <AppHeader />

      {/* Control Ribbon */}
      <div className="control-ribbon">
        <div className="ribbon-left">
          <button
            className="btn-new-record"
            type="button"
            onClick={() => setShowNewModal(true)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              add
            </span>
            <span>New Delivery Order</span>
          </button>

          {/* Clean Page Title (Removed Breadcrumbs / Links) */}
          <div className="delivery-title-container">
            <h1 className="delivery-page-title">
              <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#714b67' }}>
                local_shipping
              </span>
              Delivery Orders
            </h1>
            <span className="delivery-badge">Outbound Logistics</span>
          </div>

          <div className="action-tool-buttons">
            <button className="tool-icon-btn" title="Export All to CSV" type="button" onClick={handleDownloadCSV}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                file_download
              </span>
            </button>
            <button
              className="tool-icon-btn"
              title="Print Delivery Slips"
              type="button"
              onClick={() => {
                window.print();
                showToast('Printing delivery records');
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                print
              </span>
            </button>
          </div>
        </div>

        <div className="ribbon-right">
          {/* Search container */}
          <div className="search-container">
            <span className="material-symbols-outlined" style={{ color: '#80747a', fontSize: '18px' }}>
              search
            </span>
            <input
              type="text"
              className="search-input"
              placeholder="Search reference, customer, sub-location, product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="chip-close"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  cancel
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <main className="main-workspace">
        {/* Filters and Facility Dropdown Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div className="delivery-filter-pills">
            {statusFilterTabs.map((tab) => (
              <button
                key={tab.key}
                className={`delivery-filter-pill ${filterStatus === tab.key ? 'active' : ''}`}
                onClick={() => setFilterStatus(tab.key)}
              >
                {tab.label}
              </button>
            ))}

            {/* Facility / Warehouse Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#756f82' }}>Facility:</span>
              <select
                className="delivery-facility-select"
                value={facilityFilter}
                onChange={(e) => setFacilityFilter(e.target.value)}
              >
                <option value="ALL">All Facilities ({orders.length})</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name || w.code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#756f82' }}>
              Showing {filteredOrders.length} of {orders.length} orders
            </span>
            {(searchQuery || filterStatus !== 'all' || facilityFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterStatus('all');
                  setFacilityFilter('ALL');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#714b67',
                  fontSize: '13px',
                  fontWeight: 600,
                  textDecoration: 'underline',
                  cursor: 'pointer',
                }}
              >
                Reset filters
              </button>
            )}
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 18px',
              background: '#714b67',
              color: '#ffffff',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            <span>{selectedIds.length} orders selected</span>
            <button
              onClick={() => {
                selectedIds.forEach((id) => validateMutation.mutate(id));
                setSelectedIds([]);
              }}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                background: 'rgba(255,255,255,0.2)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.4)',
                cursor: 'pointer',
              }}
            >
              Validate All Selected
            </button>
            <button
              onClick={() => {
                selectedIds.forEach((id) => cancelMutation.mutate(id));
                setSelectedIds([]);
              }}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                background: 'rgba(239, 68, 68, 0.3)',
                color: '#fff',
                border: '1px solid rgba(239, 68, 68, 0.5)',
                cursor: 'pointer',
              }}
            >
              Cancel All Selected
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoadingDeliveries && (
          <div className="empty-state-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#714b67' }}>
              progress_activity
            </span>
            <p style={{ marginTop: '12px', fontSize: '15px', color: '#756f82' }}>Loading delivery orders...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoadingDeliveries && filteredOrders.length === 0 && (
          <div className="empty-state-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#d1c3ca' }}>
              local_shipping
            </span>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '12px 0 6px', color: '#212529' }}>
              No delivery orders found
            </h3>
            <p style={{ fontSize: '14px', color: '#756f82', maxWidth: '420px', margin: '0 auto 16px' }}>
              {searchQuery || filterStatus !== 'all' || facilityFilter !== 'ALL'
                ? 'No deliveries match your active filter criteria. Try resetting your search or filters.'
                : 'Create an outbound delivery order to pick, pack, and ship inventory items to customer destinations.'}
            </p>
            {searchQuery || filterStatus !== 'all' || facilityFilter !== 'ALL' ? (
              <button
                className="btn-secondary"
                onClick={() => {
                  setSearchQuery('');
                  setFilterStatus('all');
                  setFacilityFilter('ALL');
                }}
              >
                Clear All Filters
              </button>
            ) : (
              <button className="btn-primary" onClick={() => setShowNewModal(true)}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  add
                </span>
                Create Delivery Order
              </button>
            )}
          </div>
        )}

        {/* Deliveries Table */}
        {!isLoadingDeliveries && filteredOrders.length > 0 && (
          <div className="table-responsive-wrapper">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      ref={selectAllRef}
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>Reference</th>
                  <th>Facility</th>
                  <th>Source Sub-Location</th>
                  <th>Destination</th>
                  <th>Customer / Contact</th>
                  <th>Scheduled Date</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const badge = getStatusBadge(order.status);
                  return (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrderForDetail(order)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(order.id)}
                          onChange={(e) => handleRowSelect(order.id, e)}
                        />
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: '#714b67', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                            local_shipping
                          </span>
                          {order.reference}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: '#3b333a' }}>{order.warehouseName}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#756f82' }}>
                            warehouse
                          </span>
                          <span style={{ fontWeight: 500 }}>{order.fromLocation}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#047857' }}>
                            location_on
                          </span>
                          <span style={{ fontSize: '13px', color: '#4e444a' }}>{order.toLocation}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: '#212529' }}>{order.contact}</span>
                      </td>
                      <td style={{ fontSize: '13px', color: '#756f82' }}>{order.scheduledDate}</td>
                      <td>
                        <span
                          style={{
                            padding: '2px 8px',
                            background: '#f3f4f6',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#374151',
                          }}
                        >
                          {order.linesCount} item{order.linesCount !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 700,
                            backgroundColor: badge.bg,
                            color: badge.color,
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            className="tool-icon-btn"
                            title="Inspect Details"
                            onClick={() => setInspectOrder(order)}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                              visibility
                            </span>
                          </button>
                          {order.status !== 'done' && order.status !== 'cancelled' && order.status !== 'canceled' && (
                            <button
                              className="tool-icon-btn"
                              title="Validate Delivery"
                              onClick={() => validateMutation.mutate(order.id)}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#047857' }}>
                                check_circle
                              </span>
                            </button>
                          )}
                          {order.status !== 'done' && order.status !== 'cancelled' && order.status !== 'canceled' && (
                            <button
                              className="tool-icon-btn"
                              title="Cancel Delivery"
                              onClick={() => cancelMutation.mutate(order.id)}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#dc2626' }}>
                                cancel
                              </span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <AppFooter />

      {/* New Delivery Modal */}
      {showNewModal && (
        <NewDeliveryModal
          onClose={() => setShowNewModal(false)}
          onSuccess={(msg) => showToast(msg)}
          onError={(err) => showToast(err)}
        />
      )}

      {/* Inspect Modal */}
      {inspectOrder && (
        <DeliveryDetailModal
          order={inspectOrder}
          onClose={() => setInspectOrder(null)}
          onValidate={(id) => validateMutation.mutate(id)}
          onCancelOrder={(id) => cancelMutation.mutate(id)}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-banner">
          <span className="material-symbols-outlined" style={{ color: '#6ffbbe', fontSize: '20px' }}>
            check_circle
          </span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

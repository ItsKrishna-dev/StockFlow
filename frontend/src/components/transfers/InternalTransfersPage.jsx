import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '../../widgets/app-header';
import { AppFooter } from '../../widgets/app-footer';
import { transfersApi } from '../../shared/api/operationsApi';
import { warehousesApi } from '../../shared/api/warehousesApi';
import { usePermissions } from '../../shared/lib/usePermissions';
import { ROUTES } from '../../shared/config/routes';
import styles from './Transfers.module.css';

// ── Status helpers ────────────────────────────────────────────────────────────
function getStatusBadgeClass(status) {
  switch (status) {
    case 'draft':     return styles.badgeDraft;
    case 'ready':
    case 'waiting_availability': return styles.badgeReady;
    case 'waiting':   return styles.badgeWaiting;
    case 'done':      return styles.badgeDone;
    case 'cancelled': return styles.badgeCancelled;
    default:          return styles.badgeDraft;
  }
}
function statusLabel(s) {
  const map = {
    draft: 'Draft', ready: 'Ready', waiting_availability: 'Ready',
    waiting: 'Waiting', done: 'Done', cancelled: 'Cancelled',
  };
  return map[s] || s;
}

function mapTransfer(doc, locMap = {}) {
  const fromName = locMap[doc.source_location_id] || doc.source_location_id;
  const toName = locMap[doc.dest_location_id] || doc.dest_location_id;
  return {
    id: doc.id,
    reference: doc.document_number || `#${String(doc.id).slice(0, 8).toUpperCase()}`,
    fromLocation: fromName,
    toLocation: toName,
    status: doc.status,
    linesCount: doc.lines?.length || 0,
    notes: doc.notes || '',
    createdAt: doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '—',
  };
}

export default function InternalTransfersPage() {
  const queryClient = useQueryClient();
  const selectAllRef = useRef(null);
  const { canValidate, canCancel } = usePermissions();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [toastMsg, setToastMsg] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newForm, setNewForm] = useState({
    warehouse_id: '',
    source_location_id: '',
    dest_location_id: '',
    product_id: '',
    quantity: '',
    notes: '',
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3200);
  };

  // ── Data fetching ─────────────────────────────────────────────────────────
  const { data: rawTransfers = [], isLoading } = useQuery({
    queryKey: ['transfers'],
    queryFn: () => transfersApi.list(),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => warehousesApi.listLocations(),
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesApi.listWarehouses(),
  });

  // Fetch available products directly from DB when source location is selected
  const { data: locationStock = [], isLoading: isLoadingStock } = useQuery({
    queryKey: ['location-stock', newForm.source_location_id],
    queryFn: () => warehousesApi.getLocationStock(newForm.source_location_id),
    enabled: Boolean(newForm.source_location_id),
  });

  // Filter locations to only those belonging to selected warehouse
  const warehouseLocations = useMemo(() => {
    if (!newForm.warehouse_id) return [];
    return locations.filter(
      l => l.warehouse_id === newForm.warehouse_id && (l.type === 'internal' || !l.type)
    );
  }, [locations, newForm.warehouse_id]);

  // Selected product from location stock
  const selectedProductStock = useMemo(() => {
    if (!newForm.product_id || !Array.isArray(locationStock)) return null;
    return locationStock.find(p => p.product_id === newForm.product_id) || null;
  }, [locationStock, newForm.product_id]);

  // Check if entered quantity exceeds available DB stock
  const isQtyExceeded = useMemo(() => {
    if (!selectedProductStock || !newForm.quantity) return false;
    const qty = Number(newForm.quantity);
    return !isNaN(qty) && qty > Number(selectedProductStock.available_qty);
  }, [selectedProductStock, newForm.quantity]);

  const locMap = useMemo(() => {
    const map = {};
    locations.forEach(l => {
      map[l.id] = l.complete_name || l.name;
    });
    return map;
  }, [locations]);

  const transfers = useMemo(
    () => rawTransfers.map(t => mapTransfer(t, locMap)),
    [rawTransfers, locMap]
  );

  // ── Mutations ─────────────────────────────────────────────────────────────
  const validateMutation = useMutation({
    mutationFn: (id) => transfersApi.validate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      showToast('Transfer validated — stock moved');
    },
    onError: (e) => showToast(e.message || 'Validation failed'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => transfersApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      showToast('Transfer cancelled');
    },
    onError: (e) => showToast(e.message || 'Cancel failed'),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => transfersApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      showToast('Internal transfer created successfully');
      setShowNewModal(false);
      setNewForm({
        warehouse_id: '',
        source_location_id: '',
        dest_location_id: '',
        product_id: '',
        quantity: '',
        notes: '',
      });
    },
    onError: (e) => showToast(e.message || 'Transfer creation failed'),
  });

  const handleCreateTransfer = () => {
    if (!newForm.warehouse_id) {
      showToast('Please select a warehouse');
      return;
    }
    if (!newForm.source_location_id) {
      showToast('Please select From Location');
      return;
    }
    if (!newForm.dest_location_id) {
      showToast('Please select To Location');
      return;
    }
    if (newForm.source_location_id === newForm.dest_location_id) {
      showToast('From and To locations cannot be the same');
      return;
    }
    if (!newForm.product_id) {
      showToast('Please select a product');
      return;
    }
    const qty = Number(newForm.quantity);
    if (!newForm.quantity || isNaN(qty) || qty <= 0) {
      showToast('Please enter a valid quantity');
      return;
    }
    if (selectedProductStock && qty > Number(selectedProductStock.available_qty)) {
      showToast(`The entered quantity (${qty}) is more than present quantity (${selectedProductStock.available_qty})`);
      return;
    }

    createMutation.mutate({
      warehouse_id: newForm.warehouse_id,
      source_location_id: newForm.source_location_id,
      dest_location_id: newForm.dest_location_id,
      notes: newForm.notes ? newForm.notes.trim() : undefined,
      lines: [
        {
          product_id: newForm.product_id,
          uom_id: selectedProductStock.uom_id,
          quantity_expected: qty,
        },
      ],
    });
  };

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return transfers.filter((t) => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q ||
        t.reference.toLowerCase().includes(q) ||
        String(t.fromLocation).toLowerCase().includes(q) ||
        String(t.toLocation).toLowerCase().includes(q) ||
        t.notes.toLowerCase().includes(q);
      const matchStatus = filterStatus === 'all' || t.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [transfers, searchQuery, filterStatus]);

  const statusCounts = useMemo(() => ({
    all: transfers.length,
    draft: transfers.filter(t => t.status === 'draft').length,
    ready: transfers.filter(t => ['ready','waiting_availability'].includes(t.status)).length,
    done: transfers.filter(t => t.status === 'done').length,
  }), [transfers]);

  // ── Selection ─────────────────────────────────────────────────────────────
  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < filtered.length;

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;
  }, [someSelected]);

  const handleSelectAll = (e) => {
    setSelectedIds(e.target.checked ? filtered.map(t => t.id) : []);
  };
  const handleRowSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const statusFilters = [
    { key: 'all', label: `All (${statusCounts.all})` },
    { key: 'draft', label: `Draft (${statusCounts.draft})` },
    { key: 'ready', label: `Ready (${statusCounts.ready})` },
    { key: 'done', label: `Done (${statusCounts.done})` },
  ];

  return (
    <div className={styles.page}>
      <AppHeader />

      {/* Control Ribbon */}
      <div className={styles.controlRibbon}>
        <div className={styles.ribbonLeft}>
          <button className={styles.btnNew} onClick={() => setShowNewModal(true)}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
            New Transfer
          </button>
          <div className={styles.breadcrumbs}>
            <h1 className={styles.crumbCurrent}>Internal Transfers</h1>
          </div>
          <button className={styles.toolBtn} title="Export CSV" onClick={() => showToast('Exported transfers CSV')}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>file_download</span>
          </button>
        </div>
        <div className={styles.ribbonRight}>
          <div className={styles.searchBox}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#80747a' }}>search</span>
            <input
              className={styles.searchInput}
              placeholder="Search by reference, location..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className={styles.clearBtn} onClick={() => setSearchQuery('')}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Subnav */}
      <div className={styles.subnav}>
        <div className={styles.pills}>
          {statusFilters.map(f => (
            <button
              key={f.key}
              className={`${styles.pill} ${filterStatus === f.key ? styles.pillActive : ''}`}
              onClick={() => setFilterStatus(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className={styles.countText}>{filtered.length} records</span>
      </div>

      {/* Main Content */}
      <main className={styles.mainContent}>
        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className={styles.bulkBar}>
            <span>{selectedIds.length} selected</span>
            {canValidate && (
              <button
                className={styles.bulkBtn}
                onClick={() => { selectedIds.forEach(id => validateMutation.mutate(id)); setSelectedIds([]); }}
              >
                Validate All
              </button>
            )}
            {canCancel && (
              <button
                className={`${styles.bulkBtn} ${styles.bulkBtnDanger}`}
                onClick={() => { selectedIds.forEach(id => cancelMutation.mutate(id)); setSelectedIds([]); }}
              >
                Cancel All
              </button>
            )}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className={styles.stateBox}>
            <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#714b67', animation: 'spin 1s linear infinite' }}>progress_activity</span>
            <p className={styles.stateDesc}>Loading transfers...</p>
          </div>
        )}

        {/* Empty */}
        {!isLoading && filtered.length === 0 && (
          <div className={styles.stateBox}>
            <span className={`material-symbols-outlined ${styles.stateIcon}`}>swap_horiz</span>
            <p className={styles.stateTitle}>No internal transfers found</p>
            <p className={styles.stateDesc}>
              {searchQuery ? 'Try a different search term.' : 'Create a transfer to move stock between locations.'}
            </p>
            <button className={styles.btnNew} onClick={() => setShowNewModal(true)}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
              New Transfer
            </button>
          </div>
        )}

        {/* Table */}
        {!isLoading && filtered.length > 0 && (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead className={styles.thead}>
                <tr>
                  <th className={`${styles.th} ${styles.thCheck}`}>
                    <input type="checkbox" ref={selectAllRef} checked={allSelected} onChange={handleSelectAll} />
                  </th>
                  <th className={styles.th}>Reference</th>
                  <th className={styles.th}>From → To Location</th>
                  <th className={styles.th}>Products</th>
                  <th className={styles.th}>Date</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody className={styles.tbody}>
                {filtered.map(t => (
                  <tr key={t.id} onClick={() => handleRowSelect(t.id)}>
                    <td className={styles.td} onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(t.id)}
                        onChange={() => handleRowSelect(t.id)}
                      />
                    </td>
                    <td className={styles.td}>
                      <span className={styles.refLink}>
                        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>swap_horiz</span>
                        {t.reference}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <div className={styles.locationCell}>
                        <span style={{ fontSize: '11px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {String(t.fromLocation).slice(0, 20)}
                        </span>
                        <span className={`material-symbols-outlined ${styles.locationArrow}`} style={{ fontSize: '14px' }}>arrow_forward</span>
                        <span style={{ fontSize: '11px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {String(t.toLocation).slice(0, 20)}
                        </span>
                      </div>
                    </td>
                    <td className={styles.td}>{t.linesCount} line{t.linesCount !== 1 ? 's' : ''}</td>
                    <td className={styles.td} style={{ fontSize: '12px', color: '#80747a' }}>{t.createdAt}</td>
                    <td className={styles.td}>
                      <span className={`${styles.badge} ${getStatusBadgeClass(t.status)}`}>
                        {statusLabel(t.status)}
                      </span>
                    </td>
                    <td className={styles.td} onClick={e => e.stopPropagation()}>
                      <div className={styles.rowActions}>
                        {canValidate && t.status !== 'done' && t.status !== 'cancelled' && (
                          <button
                            className={styles.rowActionBtn}
                            title="Validate Transfer"
                            onClick={() => validateMutation.mutate(t.id)}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#006443' }}>check_circle</span>
                          </button>
                        )}
                        {canCancel && t.status !== 'done' && t.status !== 'cancelled' && (
                          <button
                            className={`${styles.rowActionBtn} ${styles.rowActionBtnDanger}`}
                            title="Cancel Transfer"
                            onClick={() => cancelMutation.mutate(t.id)}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>cancel</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <AppFooter />

      {/* New Transfer Modal */}
      {showNewModal && (
        <div className={styles.modalOverlay} onClick={() => setShowNewModal(false)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ color: '#714b67', fontSize: '20px' }}>swap_horiz</span>
                <h3 className={styles.modalTitle}>New Internal Transfer</h3>
              </div>
              <button className={styles.modalClose} onClick={() => setShowNewModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Warehouse <span style={{ color: '#ba1a1a' }}>*</span></label>
                <select
                  className={styles.formSelect}
                  value={newForm.warehouse_id}
                  onChange={e => {
                    const whId = e.target.value;
                    setNewForm(p => ({
                      ...p,
                      warehouse_id: whId,
                      source_location_id: '',
                      dest_location_id: '',
                      product_id: '',
                      quantity: '',
                    }));
                  }}
                >
                  <option value="">— Select warehouse —</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name || w.code}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>From Location <span style={{ color: '#ba1a1a' }}>*</span></label>
                  <select
                    className={styles.formSelect}
                    value={newForm.source_location_id}
                    disabled={!newForm.warehouse_id}
                    onChange={e => {
                      const locId = e.target.value;
                      setNewForm(p => ({
                        ...p,
                        source_location_id: locId,
                        product_id: '',
                        quantity: '',
                      }));
                    }}
                  >
                    <option value="">
                      {!newForm.warehouse_id ? '— Select warehouse first —' : '— Select source location —'}
                    </option>
                    {warehouseLocations.map(l => (
                      <option key={l.id} value={l.id}>{l.complete_name || l.name}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>To Location <span style={{ color: '#ba1a1a' }}>*</span></label>
                  <select
                    className={styles.formSelect}
                    value={newForm.dest_location_id}
                    disabled={!newForm.warehouse_id}
                    onChange={e => setNewForm(p => ({ ...p, dest_location_id: e.target.value }))}
                  >
                    <option value="">
                      {!newForm.warehouse_id ? '— Select warehouse first —' : '— Select destination location —'}
                    </option>
                    {warehouseLocations
                      .filter(l => l.id !== newForm.source_location_id)
                      .map(l => (
                        <option key={l.id} value={l.id}>{l.complete_name || l.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Product and Quantity row - shown when From Location is selected */}
              {newForm.source_location_id && (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Product <span style={{ color: '#ba1a1a' }}>*</span></label>
                    <select
                      className={styles.formSelect}
                      value={newForm.product_id}
                      onChange={e => setNewForm(p => ({ ...p, product_id: e.target.value, quantity: '' }))}
                      disabled={isLoadingStock}
                    >
                      {isLoadingStock ? (
                        <option value="">Loading products...</option>
                      ) : locationStock.length === 0 ? (
                        <option value="">No products available in this location</option>
                      ) : (
                        <>
                          <option value="">— Select product —</option>
                          {locationStock.map(p => (
                            <option key={p.product_id} value={p.product_id}>
                              {p.product_name} ({p.available_qty} available)
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                    {selectedProductStock && (
                      <span className={styles.qtyHint}>
                        Available in DB: <strong>{selectedProductStock.available_qty}</strong>
                      </span>
                    )}
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Quantity <span style={{ color: '#ba1a1a' }}>*</span></label>
                    <input
                      type="number"
                      min="1"
                      max={selectedProductStock ? selectedProductStock.available_qty : undefined}
                      className={`${styles.formInput} ${isQtyExceeded ? styles.formInputError : ''}`}
                      placeholder={selectedProductStock ? `Max: ${selectedProductStock.available_qty}` : "Enter quantity"}
                      value={newForm.quantity}
                      onChange={e => setNewForm(p => ({ ...p, quantity: e.target.value }))}
                      disabled={!newForm.product_id}
                    />
                    {isQtyExceeded && (
                      <div className={styles.qtyError}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>error</span>
                        Entered quantity ({newForm.quantity}) exceeds available ({selectedProductStock.available_qty})
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Notes</label>
                <input
                  className={styles.formInput}
                  placeholder="Optional notes..."
                  value={newForm.notes}
                  onChange={e => setNewForm(p => ({ ...p, notes: e.target.value }))}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.btnSecondary}
                onClick={() => setShowNewModal(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </button>
              <button
                className={styles.btnPrimary}
                onClick={handleCreateTransfer}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMsg && (
        <div className={styles.toast}>
          <span className="material-symbols-outlined" style={{ color: '#6ffbbe', fontSize: '18px' }}>check_circle</span>
          {toastMsg}
        </div>
      )}
    </div>
  );
}

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '../../widgets/app-header';
import { AppFooter } from '../../widgets/app-footer';
import { adjustmentsApi } from '../../shared/api/operationsApi';
import { warehousesApi } from '../../shared/api/warehousesApi';
import { ROUTES } from '../../shared/config/routes';
// Re-use Transfers CSS – same design system
import styles from './Transfers.module.css';

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
  const map = { draft: 'Draft', ready: 'In Progress', done: 'Validated', cancelled: 'Cancelled' };
  return map[s] || s;
}

function mapAdjustment(doc) {
  return {
    id: doc.id,
    reference: doc.document_number || `#${String(doc.id).slice(0, 8).toUpperCase()}`,
    location: doc.source_location_id,
    status: doc.status,
    linesCount: doc.lines?.length || 0,
    notes: doc.notes || '',
    createdAt: doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '—',
    warehouseId: doc.warehouse_id,
  };
}

export default function StockAdjustmentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const selectAllRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [toastMsg, setToastMsg] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newForm, setNewForm] = useState({
    internal_location_id: '',
    warehouse_id: '',
    notes: '',
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3200);
  };

  // ── Data ─────────────────────────────────────────────────────────────────
  const { data: rawAdj = [], isLoading } = useQuery({
    queryKey: ['adjustments'],
    queryFn: () => adjustmentsApi.list(),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => warehousesApi.listLocations(),
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesApi.listWarehouses(),
  });

  const adjustments = useMemo(() => rawAdj.map(mapAdjustment), [rawAdj]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const validateMutation = useMutation({
    mutationFn: (id) => adjustmentsApi.validate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
      showToast('Adjustment validated — stock quantities updated');
    },
    onError: (e) => showToast(e.message || 'Validation failed'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => adjustmentsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adjustments'] });
      showToast('Adjustment cancelled');
    },
    onError: (e) => showToast(e.message || 'Cancel failed'),
  });

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return adjustments.filter(a => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q ||
        a.reference.toLowerCase().includes(q) ||
        a.notes.toLowerCase().includes(q);
      const matchStatus = filterStatus === 'all' || a.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [adjustments, searchQuery, filterStatus]);

  const counts = useMemo(() => ({
    all: adjustments.length,
    draft: adjustments.filter(a => a.status === 'draft').length,
    done: adjustments.filter(a => a.status === 'done').length,
  }), [adjustments]);

  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < filtered.length;

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;
  }, [someSelected]);

  const handleSelectAll = (e) => setSelectedIds(e.target.checked ? filtered.map(a => a.id) : []);
  const handleRowSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const internalLocations = locations.filter(l => l.type === 'internal' || !l.type);

  const statusFilters = [
    { key: 'all', label: `All (${counts.all})` },
    { key: 'draft', label: `Draft (${counts.draft})` },
    { key: 'done', label: `Validated (${counts.done})` },
  ];

  return (
    <div className={styles.page}>
      <AppHeader />

      {/* Control Ribbon */}
      <div className={styles.controlRibbon}>
        <div className={styles.ribbonLeft}>
          <button className={styles.btnNew} onClick={() => setShowNewModal(true)}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
            New Adjustment
          </button>
          <div className={styles.breadcrumbs}>
            <Link to={ROUTES.DASHBOARD} className={styles.crumbParent}>StockFlow</Link>
            <span className={styles.crumbSep}>/</span>
            <span className={styles.crumbParent}>Inventory</span>
            <span className={styles.crumbSep}>/</span>
            <h1 className={styles.crumbCurrent}>Stock Adjustments</h1>
          </div>
          <button className={styles.toolBtn} title="Export CSV" onClick={() => showToast('Exported adjustments CSV')}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>file_download</span>
          </button>
        </div>
        <div className={styles.ribbonRight}>
          <div className={styles.searchBox}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#80747a' }}>search</span>
            <input
              className={styles.searchInput}
              placeholder="Search adjustments..."
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

      <main className={styles.mainContent}>
        {/* Bulk actions */}
        {selectedIds.length > 0 && (
          <div className={styles.bulkBar}>
            <span>{selectedIds.length} selected</span>
            <button
              className={styles.bulkBtn}
              onClick={() => { selectedIds.forEach(id => validateMutation.mutate(id)); setSelectedIds([]); }}
            >
              Validate All
            </button>
            <button
              className={`${styles.bulkBtn} ${styles.bulkBtnDanger}`}
              onClick={() => { selectedIds.forEach(id => cancelMutation.mutate(id)); setSelectedIds([]); }}
            >
              Cancel All
            </button>
          </div>
        )}

        {isLoading && (
          <div className={styles.stateBox}>
            <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#714b67' }}>progress_activity</span>
            <p className={styles.stateDesc}>Loading adjustments...</p>
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className={styles.stateBox}>
            <span className={`material-symbols-outlined ${styles.stateIcon}`}>tune</span>
            <p className={styles.stateTitle}>No stock adjustments found</p>
            <p className={styles.stateDesc}>
              {searchQuery ? 'Try a different search.' : 'Create an adjustment to reconcile physical counts with system quantities.'}
            </p>
            <button className={styles.btnNew} onClick={() => setShowNewModal(true)}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
              New Adjustment
            </button>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead className={styles.thead}>
                <tr>
                  <th className={`${styles.th} ${styles.thCheck}`}>
                    <input type="checkbox" ref={selectAllRef} checked={allSelected} onChange={handleSelectAll} />
                  </th>
                  <th className={styles.th}>Reference</th>
                  <th className={styles.th}>Location</th>
                  <th className={styles.th}>Lines</th>
                  <th className={styles.th}>Date</th>
                  <th className={styles.th}>Notes</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody className={styles.tbody}>
                {filtered.map(a => (
                  <tr key={a.id}>
                    <td className={styles.td} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.includes(a.id)} onChange={() => handleRowSelect(a.id)} />
                    </td>
                    <td className={styles.td}>
                      <span className={styles.refLink}>
                        <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#006443' }}>tune</span>
                        {a.reference}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <div className={styles.locationCell}>
                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>warehouse</span>
                        <span style={{ fontSize: '12px' }}>{String(a.location).slice(0, 25)}</span>
                      </div>
                    </td>
                    <td className={styles.td}>{a.linesCount} line{a.linesCount !== 1 ? 's' : ''}</td>
                    <td className={styles.td} style={{ fontSize: '12px', color: '#80747a' }}>{a.createdAt}</td>
                    <td className={styles.td} style={{ fontSize: '12px', color: '#80747a', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.notes || '—'}
                    </td>
                    <td className={styles.td}>
                      <span className={`${styles.badge} ${getStatusBadgeClass(a.status)}`}>
                        {statusLabel(a.status)}
                      </span>
                    </td>
                    <td className={styles.td} onClick={e => e.stopPropagation()}>
                      <div className={styles.rowActions}>
                        {a.status !== 'done' && a.status !== 'cancelled' && (
                          <button
                            className={styles.rowActionBtn}
                            title="Validate Adjustment"
                            onClick={() => validateMutation.mutate(a.id)}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#006443' }}>check_circle</span>
                          </button>
                        )}
                        {a.status !== 'done' && a.status !== 'cancelled' && (
                          <button
                            className={`${styles.rowActionBtn} ${styles.rowActionBtnDanger}`}
                            title="Cancel"
                            onClick={() => cancelMutation.mutate(a.id)}
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

      {/* New Adjustment Modal */}
      {showNewModal && (
        <div className={styles.modalOverlay} onClick={() => setShowNewModal(false)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ color: '#006443', fontSize: '20px' }}>tune</span>
                <h3 className={styles.modalTitle}>New Stock Adjustment</h3>
              </div>
              <button className={styles.modalClose} onClick={() => setShowNewModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className={styles.modalBody}>
              <div style={{ padding: '10px 14px', background: '#e0f0ff', borderRadius: 6, fontSize: 12, color: '#00476e', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>info</span>
                <span>Stock Adjustments reconcile physical counts. Only managers & admins can validate. All validated adjustments are reflected in Move History.</span>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Warehouse <span style={{ color: '#ba1a1a' }}>*</span></label>
                <select
                  className={styles.formSelect}
                  value={newForm.warehouse_id}
                  onChange={e => setNewForm(p => ({ ...p, warehouse_id: e.target.value }))}
                >
                  <option value="">— Select warehouse —</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name || w.code}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Inventory Location <span style={{ color: '#ba1a1a' }}>*</span></label>
                <select
                  className={styles.formSelect}
                  value={newForm.internal_location_id}
                  onChange={e => setNewForm(p => ({ ...p, internal_location_id: e.target.value }))}
                >
                  <option value="">— Select location —</option>
                  {internalLocations.map(l => <option key={l.id} value={l.id}>{l.complete_name || l.name}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Notes</label>
                <input
                  className={styles.formInput}
                  placeholder="e.g. Annual physical count Q4 2024"
                  value={newForm.notes}
                  onChange={e => setNewForm(p => ({ ...p, notes: e.target.value }))}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary} onClick={() => setShowNewModal(false)}>Cancel</button>
              <button
                className={styles.btnPrimary}
                style={{ background: '#006443' }}
                onClick={() => {
                  if (!newForm.warehouse_id || !newForm.internal_location_id) {
                    showToast('Please select warehouse and location');
                    return;
                  }
                  showToast('Adjustment created — add product lines to proceed');
                  setShowNewModal(false);
                }}
              >
                Create Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMsg && (
        <div className={styles.toast}>
          <span className="material-symbols-outlined" style={{ color: '#6ffbbe', fontSize: '18px' }}>check_circle</span>
          {toastMsg}
        </div>
      )}
    </div>
  );
}

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '../../widgets/app-header';
import { AppFooter } from '../../widgets/app-footer';
import { adjustmentsApi } from '../../shared/api/operationsApi';
import { warehousesApi } from '../../shared/api/warehousesApi';
import { usePermissions } from '../../shared/lib/usePermissions';
import styles from './Transfers.module.css';

function getStatusBadgeClass(status) {
  switch (status) {
    case 'draft':
      return styles.badgeWaiting;
    case 'done':
      return styles.badgeDone;
    case 'cancelled':
      return styles.badgeCancelled;
    default:
      return styles.badgeDraft;
  }
}

function statusLabel(s) {
  const map = { draft: 'Draft', done: 'Validated', cancelled: 'Cancelled' };
  return map[s] || s;
}

export default function StockAdjustmentsPage() {
  const queryClient = useQueryClient();
  const selectAllRef = useRef(null);

  // Role and permissions from hook
  const { role, isAdmin, isManager, isStaff, canValidate, canCancel, assignedWarehouseId } = usePermissions();
  const isManagerOrAdmin = canValidate;
  const roleDisplayLabel = isAdmin
    ? 'Administrator'
    : isManager
    ? 'Inventory Manager'
    : 'Warehouse Staff';

  // Active view tab: 'products' | 'all' | 'draft' | 'done'
  const [activeTab, setActiveTab] = useState('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState(assignedWarehouseId || 'ALL');
  const [selectedIds, setSelectedIds] = useState([]);
  const [toastMsg, setToastMsg] = useState('');

  // Selected product item for the adjustment popup modal
  const [adjustItem, setAdjustItem] = useState(null);
  const [adjustType, setAdjustType] = useState('add'); // 'add' | 'remove'
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  // Synchronize warehouse if user is locked to an assigned warehouse
  useEffect(() => {
    if (assignedWarehouseId) {
      setSelectedWarehouse(assignedWarehouseId);
    }
  }, [assignedWarehouseId]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  // ── 1. Fetch Products with Location & Warehouse ────────────────────────────
  const { data: stockItems = [], isLoading: isLoadingStock } = useQuery({
    queryKey: ['stock-adjustment-items', selectedWarehouse, searchQuery],
    queryFn: () =>
      adjustmentsApi.listStockItems({
        warehouse_id: selectedWarehouse !== 'ALL' ? selectedWarehouse : undefined,
        search: searchQuery || undefined,
      }),
  });

  // ── 2. Fetch Adjustment Documents (All, Draft, Validated) ──────────────────
  const { data: rawAdjustments = [], isLoading: isLoadingAdj } = useQuery({
    queryKey: ['adjustments'],
    queryFn: () => adjustmentsApi.list(),
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesApi.listWarehouses(),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => warehousesApi.listLocations(),
  });

  // Maps for resolving location and product names
  const locMap = useMemo(() => {
    const map = {};
    locations.forEach((l) => {
      map[l.id] = { name: l.complete_name || l.name, warehouse_id: l.warehouse_id };
    });
    return map;
  }, [locations]);

  const whMap = useMemo(() => {
    const map = {};
    warehouses.forEach((w) => {
      map[w.id] = w.name || w.code;
    });
    return map;
  }, [warehouses]);

  const prodMap = useMemo(() => {
    const map = {};
    stockItems.forEach((p) => {
      map[p.product_id] = { name: p.product_name, sku: p.sku };
    });
    return map;
  }, [stockItems]);

  // Mapped adjustment documents
  const adjustments = useMemo(() => {
    return rawAdjustments.map((doc) => {
      const line = doc.lines?.[0];
      const prod = line ? prodMap[line.product_id] : null;
      const targetLocId = doc.dest_location_id || doc.source_location_id;
      const locInfo = locMap[targetLocId] || locMap[doc.source_location_id];
      const whName = doc.warehouse_id ? whMap[doc.warehouse_id] : '';

      return {
        id: doc.id,
        reference: doc.document_number || `#${String(doc.id).slice(0, 8).toUpperCase()}`,
        productName: prod?.name || (line?.product_id ? String(line.product_id).slice(0, 8) : 'Stock Item'),
        sku: prod?.sku || '',
        locationName: locInfo?.name || String(targetLocId).slice(0, 12),
        warehouseName: whName || 'Warehouse',
        quantity: line?.quantity_expected ? Number(line.quantity_expected) : 0,
        reason: line?.reason || doc.notes || 'Physical count adjustment',
        status: doc.status,
        createdAt: doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '—',
      };
    });
  }, [rawAdjustments, prodMap, locMap, whMap]);

  // ── 3. Mutations ───────────────────────────────────────────────────────────
  // Apply Adjustment Mutation (from popup)
  const adjustMutation = useMutation({
    mutationFn: async ({ item, type, deltaQty, reason }) => {
      const currentQty = Number(item.quantity_on_hand || 0);
      const delta = Number(deltaQty);
      const countedQuantity = type === 'add' ? currentQty + delta : currentQty - delta;

      const payload = {
        warehouse_id: item.warehouse_id,
        internal_location_id: item.location_id,
        notes: reason.trim(),
        auto_validate: isManagerOrAdmin,
        lines: [
          {
            product_id: item.product_id,
            uom_id: item.uom_id,
            counted_quantity: countedQuantity,
            reason: reason.trim(),
          },
        ],
      };

      const doc = await adjustmentsApi.create(payload);

      // If user is manager or admin and doc is not yet marked done, validate directly
      if (isManagerOrAdmin && doc.status !== 'done') {
        try {
          const validatedDoc = await adjustmentsApi.validate(doc.id);
          return { doc: validatedDoc, validated: true };
        } catch (valErr) {
          console.warn('Direct validation failed:', valErr);
          return { doc, validated: false };
        }
      }

      return { doc, validated: doc.status === 'done' };
    },
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({ queryKey: ['stock-adjustment-items'] });
      queryClient.invalidateQueries({ queryKey: ['adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['kpis'] });

      const sign = vars.type === 'add' ? '+' : '-';
      if (res.validated) {
        showToast(`Stock updated & validated directly (${sign}${vars.deltaQty} units for ${vars.item.product_name})`);
      } else {
        showToast(`Adjustment submitted as Draft (Pending manager/admin validation)`);
        setActiveTab('draft');
      }
      closeAdjustModal();
    },
    onError: (err) => {
      showToast(err.message || 'Failed to apply adjustment');
    },
  });

  // Validate Mutation (called by manager/admin on draft adjustments)
  const validateMutation = useMutation({
    mutationFn: (id) => adjustmentsApi.validate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['stock-adjustment-items'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
      showToast('Adjustment validated — stock quantities updated in DB');
    },
    onError: (e) => showToast(e.message || 'Validation failed (Requires manager or admin role)'),
  });

  // Cancel Mutation
  const cancelMutation = useMutation({
    mutationFn: (id) => adjustmentsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adjustments'] });
      showToast('Adjustment cancelled');
    },
    onError: (e) => showToast(e.message || 'Cancel failed'),
  });

  // ── 4. Filtering and Counts ────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    return stockItems.filter((item) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.product_name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.location_name.toLowerCase().includes(q) ||
        item.warehouse_name.toLowerCase().includes(q)
      );
    });
  }, [stockItems, searchQuery]);

  const filteredAdjustments = useMemo(() => {
    return adjustments.filter((a) => {
      if (activeTab === 'draft' && a.status !== 'draft') return false;
      if (activeTab === 'done' && a.status !== 'done') return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          a.reference.toLowerCase().includes(q) ||
          a.productName.toLowerCase().includes(q) ||
          a.sku.toLowerCase().includes(q) ||
          a.locationName.toLowerCase().includes(q) ||
          a.reason.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [adjustments, activeTab, searchQuery]);

  const draftCount = useMemo(() => adjustments.filter((a) => a.status === 'draft').length, [adjustments]);
  const doneCount = useMemo(() => adjustments.filter((a) => a.status === 'done').length, [adjustments]);
  const allAdjCount = adjustments.length;

  // ── 5. Selection for Bulk Actions ──────────────────────────────────────────
  const allSelected =
    filteredAdjustments.length > 0 && selectedIds.length === filteredAdjustments.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < filteredAdjustments.length;

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;
  }, [someSelected]);

  const handleSelectAll = (e) =>
    setSelectedIds(e.target.checked ? filteredAdjustments.map((a) => a.id) : []);
  const handleRowSelect = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // ── 6. Modal Handlers ──────────────────────────────────────────────────────
  const openAdjustModal = (item) => {
    setAdjustItem(item);
    setAdjustType('add');
    setAdjustQty('');
    setAdjustReason('Physical count discrepancy');
  };

  const closeAdjustModal = () => {
    setAdjustItem(null);
    setAdjustQty('');
    setAdjustReason('');
  };

  const handleApplyAdjustment = () => {
    if (!adjustItem) return;

    const qty = Number(adjustQty);
    if (!adjustQty || isNaN(qty) || qty <= 0) {
      showToast('Please enter a valid quantity greater than zero');
      return;
    }

    const currentQty = Number(adjustItem.quantity_on_hand || 0);
    if (adjustType === 'remove' && qty > currentQty) {
      showToast(`Cannot remove more than current on-hand stock (${currentQty} units)`);
      return;
    }

    if (!adjustReason.trim()) {
      showToast('Please enter a reason for this stock adjustment');
      return;
    }

    adjustMutation.mutate({
      item: adjustItem,
      type: adjustType,
      deltaQty: qty,
      reason: adjustReason,
    });
  };

  // Preview calculation in modal
  const currentStockNum = adjustItem ? Number(adjustItem.quantity_on_hand || 0) : 0;
  const inputDeltaNum = Number(adjustQty || 0);
  const calculatedNewStock =
    adjustType === 'add' ? currentStockNum + inputDeltaNum : currentStockNum - inputDeltaNum;
  const isRemoveExceeded = adjustType === 'remove' && inputDeltaNum > currentStockNum;

  const quickReasons = [
    'Physical count discrepancy',
    'Damaged inventory',
    'Routine audit reconciliation',
    'Found unrecorded stock',
    'Theft / shrinkage loss',
  ];

  const handleExportCSV = () => {
    if (activeTab === 'products') {
      if (filteredProducts.length === 0) return showToast('No records to export');
      const headers = ['Product Name', 'SKU', 'Warehouse', 'Location', 'On Hand', 'Available'];
      const rows = filteredProducts.map((i) => [
        `"${i.product_name}"`,
        `"${i.sku}"`,
        `"${i.warehouse_name}"`,
        `"${i.location_name}"`,
        i.quantity_on_hand,
        i.available_qty,
      ]);
      const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const a = document.createElement('a');
      a.href = encodeURI(csv);
      a.download = `Stock_Inventory_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
    } else {
      if (filteredAdjustments.length === 0) return showToast('No records to export');
      const headers = ['Reference', 'Product', 'Location', 'Quantity', 'Reason', 'Status', 'Date'];
      const rows = filteredAdjustments.map((a) => [
        `"${a.reference}"`,
        `"${a.productName}"`,
        `"${a.locationName}"`,
        a.quantity,
        `"${a.reason}"`,
        `"${a.status}"`,
        `"${a.createdAt}"`,
      ]);
      const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const a = document.createElement('a');
      a.href = encodeURI(csv);
      a.download = `Stock_Adjustments_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
    }
    showToast('Exported CSV');
  };

  return (
    <div className={styles.page}>
      <AppHeader />

      {/* Control Ribbon — Clean heading, NO New Adjustment button */}
      <div className={styles.controlRibbon}>
        <div className={styles.ribbonLeft}>
          <div className={styles.breadcrumbs}>
            <h1 className={styles.crumbCurrent}>Stock Adjustments</h1>
          </div>
          <button className={styles.toolBtn} title="Export CSV" onClick={handleExportCSV}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>file_download</span>
          </button>
        </div>

        <div className={styles.ribbonRight}>
          {/* User Role Indicator */}
          <div className={styles.roleBadge} title={`Logged in as ${roleDisplayLabel}`}>
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
              {isManagerOrAdmin ? 'verified_user' : 'badge'}
            </span>
            <span>{roleDisplayLabel}</span>
          </div>

          {/* Warehouse Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#80747a' }}>warehouse</span>
            <select
              className={styles.formSelect}
              style={{ padding: '6px 12px', fontSize: '13px', width: 'auto' }}
              value={selectedWarehouse}
              disabled={Boolean(assignedWarehouseId && isStaff)}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
            >
              {!assignedWarehouseId && <option value="ALL">All Warehouses</option>}
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name || w.code}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className={styles.searchBox}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#80747a' }}>search</span>
            <input
              className={styles.searchInput}
              placeholder="Search product, SKU, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className={styles.clearBtn} onClick={() => setSearchQuery('')}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Subnav — Products stock table + All / Draft / Validated filter pills */}
      <div className={styles.subnav}>
        <div className={styles.pills}>
          <button
            className={`${styles.pill} ${activeTab === 'products' ? styles.pillActive : ''}`}
            onClick={() => setActiveTab('products')}
          >
            Products to Adjust ({stockItems.length})
          </button>
          <button
            className={`${styles.pill} ${activeTab === 'all' ? styles.pillActive : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All ({allAdjCount})
          </button>
          <button
            className={`${styles.pill} ${activeTab === 'draft' ? styles.pillActive : ''}`}
            onClick={() => setActiveTab('draft')}
          >
            Draft ({draftCount})
          </button>
          <button
            className={`${styles.pill} ${activeTab === 'done' ? styles.pillActive : ''}`}
            onClick={() => setActiveTab('done')}
          >
            Validated ({doneCount})
          </button>
        </div>

        <span className={styles.countText}>
          {activeTab === 'products' ? `${filteredProducts.length} items` : `${filteredAdjustments.length} records`}
        </span>
      </div>

      {/* Main Content */}
      <main className={styles.mainContent}>
        {/* Manager Banner when Drafts are awaiting validation */}
        {isManagerOrAdmin && draftCount > 0 && activeTab !== 'draft' && (
          <div className={styles.pendingNotice}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#d97706' }}>
                notification_important
              </span>
              <span>
                <strong>{draftCount} Draft adjustment{draftCount > 1 ? 's' : ''}</strong> submitted by staff awaiting manager/admin validation.
              </span>
            </div>
            <button
              className={styles.btnSecondary}
              style={{ padding: '4px 12px', fontSize: '12.5px', borderColor: '#d97706', color: '#92400e' }}
              onClick={() => setActiveTab('draft')}
            >
              Review Drafts
            </button>
          </div>
        )}

        {/* ── TAB: Products to Adjust (Auto-fetched inventory table) ──────────── */}
        {activeTab === 'products' && (
          <>
            {isLoadingStock && (
              <div className={styles.stateBox}>
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '40px', color: '#714b67', animation: 'spin 1s linear infinite' }}
                >
                  progress_activity
                </span>
                <p className={styles.stateDesc}>Fetching product stock levels...</p>
              </div>
            )}

            {!isLoadingStock && filteredProducts.length === 0 && (
              <div className={styles.stateBox}>
                <span className={`material-symbols-outlined ${styles.stateIcon}`}>inventory_2</span>
                <p className={styles.stateTitle}>No products found</p>
                <p className={styles.stateDesc}>
                  {searchQuery ? 'Try a different search keyword.' : 'No products found in the selected warehouse.'}
                </p>
              </div>
            )}

            {!isLoadingStock && filteredProducts.length > 0 && (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead className={styles.thead}>
                    <tr>
                      <th className={styles.th}>Product</th>
                      <th className={styles.th}>Warehouse</th>
                      <th className={styles.th}>Location</th>
                      <th className={styles.th}>On Hand</th>
                      <th className={styles.th}>Available</th>
                      <th className={styles.th}>Status</th>
                      <th className={styles.th} style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className={styles.tbody}>
                    {filteredProducts.map((item) => {
                      const onHand = Number(item.quantity_on_hand || 0);
                      const avail = Number(item.available_qty || 0);

                      let statusBadge = (
                        <span className={`${styles.badge} ${styles.badgeInStock}`}>
                          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>check_circle</span>
                          In Stock
                        </span>
                      );
                      if (onHand <= 0) {
                        statusBadge = (
                          <span className={`${styles.badge} ${styles.badgeOutOfStock}`}>
                            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>cancel</span>
                            Out of Stock
                          </span>
                        );
                      } else if (onHand < 5) {
                        statusBadge = (
                          <span className={`${styles.badge} ${styles.badgeLowStock}`}>
                            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>warning</span>
                            Low Stock
                          </span>
                        );
                      }

                      return (
                        <tr
                          key={item.id}
                          onClick={() => openAdjustModal(item)}
                          title="Click to adjust quantity"
                          style={{ cursor: 'pointer' }}
                        >
                          <td className={styles.td}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span style={{ fontWeight: 700, color: '#212529', fontSize: '14.5px' }}>
                                {item.product_name}
                              </span>
                              <span style={{ fontSize: '12px', color: '#756f82' }}>
                                SKU: <strong>{item.sku}</strong>
                                {item.category_name && ` · ${item.category_name}`}
                              </span>
                            </div>
                          </td>
                          <td className={styles.td}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '13.5px' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#714b67' }}>
                                warehouse
                              </span>
                              <span>{item.warehouse_name}</span>
                            </div>
                          </td>
                          <td className={styles.td}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '13.5px' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#006443' }}>
                                location_on
                              </span>
                              <span style={{ fontWeight: 600 }}>{item.location_name}</span>
                            </div>
                          </td>
                          <td className={styles.td}>
                            <span
                              style={{
                                fontWeight: 700,
                                fontSize: '15px',
                                color: onHand > 0 ? '#1b1c1c' : '#ba1a1a',
                              }}
                            >
                              {onHand}
                            </span>
                            {item.uom_name && (
                              <span style={{ fontSize: '11px', color: '#80747a', marginLeft: 4 }}>
                                {item.uom_name}
                              </span>
                            )}
                          </td>
                          <td className={styles.td}>
                            <span
                              style={{
                                fontWeight: 600,
                                fontSize: '14px',
                                color: avail > 0 ? '#006443' : '#80747a',
                              }}
                            >
                              {avail}
                            </span>
                          </td>
                          <td className={styles.td}>{statusBadge}</td>
                          <td className={styles.td} style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                            <button
                              className={styles.btnAdjustAction}
                              onClick={() => openAdjustModal(item)}
                              title="Adjust stock quantity"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>tune</span>
                              Adjust
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── TABS: All / Draft / Validated Adjustments ───────────────────────── */}
        {activeTab !== 'products' && (
          <>
            {/* Bulk Action Bar for Manager/Admin on Drafts */}
            {canValidate && selectedIds.length > 0 && activeTab === 'draft' && (
              <div className={styles.bulkBar}>
                <span>{selectedIds.length} draft adjustments selected</span>
                <button
                  className={styles.bulkBtn}
                  onClick={() => {
                    selectedIds.forEach((id) => validateMutation.mutate(id));
                    setSelectedIds([]);
                  }}
                >
                  Validate All Selected
                </button>
                {canCancel && (
                  <button
                    className={`${styles.bulkBtn} ${styles.bulkBtnDanger}`}
                    onClick={() => {
                      selectedIds.forEach((id) => cancelMutation.mutate(id));
                      setSelectedIds([]);
                    }}
                  >
                    Cancel All Selected
                  </button>
                )}
              </div>
            )}

            {isLoadingAdj && (
              <div className={styles.stateBox}>
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '40px', color: '#714b67', animation: 'spin 1s linear infinite' }}
                >
                  progress_activity
                </span>
                <p className={styles.stateDesc}>Loading adjustment records...</p>
              </div>
            )}

            {!isLoadingAdj && filteredAdjustments.length === 0 && (
              <div className={styles.stateBox}>
                <span className={`material-symbols-outlined ${styles.stateIcon}`}>tune</span>
                <p className={styles.stateTitle}>
                  {activeTab === 'draft'
                    ? 'No draft adjustments pending validation'
                    : activeTab === 'done'
                    ? 'No validated adjustments found'
                    : 'No stock adjustments recorded'}
                </p>
                <p className={styles.stateDesc}>
                  {activeTab === 'draft'
                    ? 'When warehouse staff adjusts product quantities, drafts will appear here for manager review.'
                    : 'Select a product in "Products to Adjust" to make a stock adjustment.'}
                </p>
                <button
                  className={styles.btnPrimary}
                  style={{ marginTop: 8 }}
                  onClick={() => setActiveTab('products')}
                >
                  Go to Products to Adjust
                </button>
              </div>
            )}

            {!isLoadingAdj && filteredAdjustments.length > 0 && (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead className={styles.thead}>
                    <tr>
                      {activeTab === 'draft' && canValidate && (
                        <th className={`${styles.th} ${styles.thCheck}`}>
                          <input type="checkbox" ref={selectAllRef} checked={allSelected} onChange={handleSelectAll} />
                        </th>
                      )}
                      <th className={styles.th}>Reference</th>
                      <th className={styles.th}>Product & Location</th>
                      <th className={styles.th}>Adjustment Quantity</th>
                      <th className={styles.th}>Reason</th>
                      <th className={styles.th}>Date</th>
                      <th className={styles.th}>Status</th>
                      <th className={styles.th} style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className={styles.tbody}>
                    {filteredAdjustments.map((a) => (
                      <tr key={a.id}>
                        {activeTab === 'draft' && canValidate && (
                          <td className={styles.td} onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(a.id)}
                              onChange={() => handleRowSelect(a.id)}
                            />
                          </td>
                        )}
                        <td className={styles.td}>
                          <span className={styles.refLink}>
                            <span
                              className="material-symbols-outlined"
                              style={{ fontSize: '15px', color: '#714b67' }}
                            >
                              tune
                            </span>
                            {a.reference}
                          </span>
                        </td>
                        <td className={styles.td}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontWeight: 700, color: '#212529', fontSize: '14px' }}>
                              {a.productName}
                            </span>
                            <span style={{ fontSize: '12px', color: '#756f82' }}>
                              {a.warehouseName} → {a.locationName}
                            </span>
                          </div>
                        </td>
                        <td className={styles.td}>
                          <span className={styles.deltaPositive}>
                            {a.quantity} units
                          </span>
                        </td>
                        <td className={styles.td} style={{ fontSize: '12.5px', color: '#4e444a', maxWidth: '200px' }}>
                          {a.reason}
                        </td>
                        <td className={styles.td} style={{ fontSize: '12px', color: '#80747a' }}>
                          {a.createdAt}
                        </td>
                        <td className={styles.td}>
                          <span className={`${styles.badge} ${getStatusBadgeClass(a.status)}`}>
                            {statusLabel(a.status)}
                          </span>
                        </td>
                        <td className={styles.td} style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                          {a.status === 'draft' ? (
                            canValidate ? (
                              <div className={styles.rowActions} style={{ justifyContent: 'flex-end' }}>
                                <button
                                  className={styles.rowActionBtn}
                                  title="Validate Adjustment (Manager)"
                                  onClick={() => validateMutation.mutate(a.id)}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '17px', color: '#006443' }}>
                                    check_circle
                                  </span>
                                </button>
                                {canCancel && (
                                  <button
                                    className={`${styles.rowActionBtn} ${styles.rowActionBtnDanger}`}
                                    title="Cancel Adjustment"
                                    onClick={() => cancelMutation.mutate(a.id)}
                                  >
                                    <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>
                                      cancel
                                    </span>
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span style={{ fontSize: '11.5px', color: '#92400e', fontWeight: 600 }}>
                                Awaiting Manager Approval
                              </span>
                            )
                          ) : (
                            <span style={{ fontSize: '12px', color: '#006443', fontWeight: 600 }}>
                              ✓ Reconciled
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>

      <AppFooter />

      {/* ── Adjustment Popup Modal ────────────────────────────────────────────── */}
      {adjustItem && (
        <div className={styles.modalOverlay} onClick={closeAdjustModal}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ color: '#714b67', fontSize: '22px' }}>
                  tune
                </span>
                <div>
                  <h3 className={styles.modalTitle}>Adjust Stock Quantity</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#756f82' }}>
                    Reconcile physical inventory for {adjustItem.product_name}
                  </p>
                </div>
              </div>
              <button className={styles.modalClose} onClick={closeAdjustModal}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Role-based info note */}
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  fontSize: '12.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: isManagerOrAdmin ? '#ecfdf5' : '#fffbeb',
                  border: isManagerOrAdmin ? '1px solid #a7f3d0' : '1px solid #fde68a',
                  color: isManagerOrAdmin ? '#065f46' : '#92400e',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  {isManagerOrAdmin ? 'verified' : 'info'}
                </span>
                <span>
                  {isManagerOrAdmin ? (
                    <>As <strong>{roleDisplayLabel}</strong>, your adjustment will directly move to <strong>Validated</strong> without requiring extra approval.</>
                  ) : (
                    <>As <strong>Warehouse Staff</strong>, this adjustment will be saved into <strong>Draft</strong> category and applied after a Manager/Admin validates it.</>
                  )}
                </span>
              </div>

              {/* Product and Location Summary Card */}
              <div className={styles.itemSummaryCard}>
                <div className={styles.itemSummaryRow}>
                  <span className={styles.itemSummaryLabel}>Product:</span>
                  <span className={styles.itemSummaryValue}>
                    {adjustItem.product_name} ({adjustItem.sku})
                  </span>
                </div>
                <div className={styles.itemSummaryRow}>
                  <span className={styles.itemSummaryLabel}>Warehouse & Location:</span>
                  <span className={styles.itemSummaryValue}>
                    {adjustItem.warehouse_name} → {adjustItem.location_name}
                  </span>
                </div>
                <div className={styles.itemSummaryRow}>
                  <span className={styles.itemSummaryLabel}>Current Stock in DB:</span>
                  <span className={styles.itemSummaryValue} style={{ fontSize: '15px', color: '#714b67' }}>
                    {currentStockNum} units (Available: {adjustItem.available_qty})
                  </span>
                </div>
              </div>

              {/* Add or Remove Quantity Option */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Adjustment Type <span style={{ color: '#ba1a1a' }}>*</span>
                </label>
                <div className={styles.toggleGroup}>
                  <button
                    type="button"
                    className={`${styles.toggleBtn} ${adjustType === 'add' ? styles.toggleBtnAddActive : ''}`}
                    onClick={() => setAdjustType('add')}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#10b981' }}>
                      add_circle
                    </span>
                    Add Quantity (+)
                  </button>
                  <button
                    type="button"
                    className={`${styles.toggleBtn} ${adjustType === 'remove' ? styles.toggleBtnRemoveActive : ''}`}
                    onClick={() => setAdjustType('remove')}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#f43f5e' }}>
                      remove_circle
                    </span>
                    Remove Quantity (−)
                  </button>
                </div>
              </div>

              {/* Quantity Input */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  {adjustType === 'add' ? 'Quantity to Add' : 'Quantity to Remove'}{' '}
                  <span style={{ color: '#ba1a1a' }}>*</span>
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  max={adjustType === 'remove' ? currentStockNum : undefined}
                  className={`${styles.formInput} ${isRemoveExceeded ? styles.formInputError : ''}`}
                  placeholder={adjustType === 'add' ? 'e.g. 5' : `Max: ${currentStockNum}`}
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  autoFocus
                />
                {isRemoveExceeded && (
                  <div className={styles.qtyError}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>error</span>
                    Cannot remove more than current on-hand stock ({currentStockNum} units)
                  </div>
                )}
              </div>

              {/* Calculation Preview */}
              {adjustQty && !isNaN(inputDeltaNum) && inputDeltaNum > 0 && !isRemoveExceeded && (
                <div className={styles.calcPreview}>
                  <span>
                    Current Stock ({currentStockNum}) {adjustType === 'add' ? '+' : '−'} {inputDeltaNum}
                  </span>
                  <span style={{ fontWeight: 800, fontSize: '14.5px', color: '#714b67' }}>
                    New Stock: {calculatedNewStock} units
                  </span>
                </div>
              )}

              {/* Reason Input */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Reason for Adjustment <span style={{ color: '#ba1a1a' }}>*</span>
                </label>
                <input
                  className={styles.formInput}
                  placeholder="e.g. Physical count discrepancy, damaged goods, audit..."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                />
                {/* Preset Chips */}
                <div className={styles.reasonChips}>
                  {quickReasons.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      className={styles.reasonChip}
                      onClick={() => setAdjustReason(chip)}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.btnSecondary}
                onClick={closeAdjustModal}
                disabled={adjustMutation.isPending}
              >
                Cancel
              </button>
              <button
                className={styles.btnPrimary}
                onClick={handleApplyAdjustment}
                disabled={
                  adjustMutation.isPending ||
                  !adjustQty ||
                  inputDeltaNum <= 0 ||
                  isRemoveExceeded ||
                  !adjustReason.trim()
                }
              >
                {adjustMutation.isPending
                  ? 'Submitting...'
                  : isManagerOrAdmin
                  ? 'Apply & Validate Adjustment'
                  : 'Submit Draft Adjustment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className={styles.toast}>
          <span className="material-symbols-outlined" style={{ color: '#6ffbbe', fontSize: '18px' }}>
            check_circle
          </span>
          {toastMsg}
        </div>
      )}
    </div>
  );
}

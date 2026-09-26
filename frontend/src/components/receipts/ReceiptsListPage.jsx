import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '../../widgets/app-header';
import { AppFooter } from '../../widgets/app-footer';
import { receiptsApi } from '../../shared/api/operationsApi';
import { warehousesApi } from '../../shared/api/warehousesApi';
import { productApi } from '../../entities/product/api/productApi';
import { usePermissions } from '../../shared/lib/usePermissions';
import './ReceiptsList.css';

export default function ReceiptsListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isStaff, assignedWarehouseId, hasMultiFacilityAccess } = usePermissions();

  const [selectedIds, setSelectedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(
    isStaff && assignedWarehouseId ? assignedWarehouseId : 'all'
  );
  const [activeView, setActiveView] = useState('list'); // list | kanban
  const [toastMessage, setToastMessage] = useState('');

  // Sync assigned warehouse for staff
  useEffect(() => {
    if (isStaff && assignedWarehouseId) {
      setSelectedWarehouseId(assignedWarehouseId);
    }
  }, [isStaff, assignedWarehouseId]);

  // Modal State for New Receipt
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalForm, setModalForm] = useState({
    warehouse_id: '',
    partner_id: '',
    dest_location_id: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    notes: '',
    lines: [{ product_id: '', quantity_expected: 1 }],
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // ── Queries ───────────────────────────────────────────────────────────────
  const effectiveQueryWarehouse = (isStaff && assignedWarehouseId) ? assignedWarehouseId : selectedWarehouseId;
  const { data: rawReceipts = [] } = useQuery({
    queryKey: ['receipts', filterStatus, effectiveQueryWarehouse],
    queryFn: () => receiptsApi.list({ status: filterStatus, warehouse_id: effectiveQueryWarehouse }),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => warehousesApi.listLocations(),
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesApi.listWarehouses(),
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
  const locationMap = useMemo(() => {
    const map = {};
    locations.forEach((l) => {
      map[l.id] = l.name ? `${l.name} (${l.code})` : l.code;
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

  const warehouseMap = useMemo(() => {
    const map = {};
    warehouses.forEach((w) => {
      map[w.id] = w.name || w.code;
    });
    return map;
  }, [warehouses]);

  // Vendor & Internal Locations
  const vendorLocation = useMemo(
    () => locations.find((l) => l.type === 'vendor') || { id: locations[0]?.id, code: 'LOC-VENDOR' },
    [locations]
  );

  const internalLocations = useMemo(
    () => locations.filter((l) => l.type === 'internal'),
    [locations]
  );

  const vendorPartners = useMemo(
    () => partners.filter((p) => p.type === 'vendor' || p.type === 'both'),
    [partners]
  );

  // Active warehouse with internal locations prioritized
  const defaultWarehouseId = useMemo(() => {
    // Prefer WH-MAIN or any warehouse with defined internal locations
    const mainWh = warehouses.find((w) => w.code === 'WH-MAIN' || (w.code && w.code.includes('MAIN')));
    if (mainWh) return mainWh.id;
    const withLoc = warehouses.find((w) => internalLocations.some((l) => l.warehouse_id === w.id));
    return withLoc?.id || warehouses[0]?.id || '';
  }, [warehouses, internalLocations]);

  // Destination locations matching chosen warehouse, with fallback so it's never empty
  const availableDestLocations = useMemo(() => {
    if (!modalForm.warehouse_id) return internalLocations;
    const matching = internalLocations.filter((l) => l.warehouse_id === modalForm.warehouse_id);
    return matching.length > 0 ? matching : internalLocations;
  }, [internalLocations, modalForm.warehouse_id]);

  // Map backend DocumentOut to readable display shape
  const receipts = useMemo(() => {
    return rawReceipts.map((doc) => ({
      id: doc.id,
      reference: doc.document_number || `#${String(doc.id).slice(0, 8).toUpperCase()}`,
      fromLocation: locationMap[doc.source_location_id] || 'Vendor Receiving Dock',
      toLocation: locationMap[doc.dest_location_id] || 'WH/Stock1',
      contact: partnerMap[doc.partner_id] || (doc.partner_id ? 'Vendor Partner' : '—'),
      scheduledDate: doc.scheduled_date
        ? new Date(doc.scheduled_date).toLocaleDateString()
        : doc.created_at
        ? new Date(doc.created_at).toLocaleDateString()
        : '—',
      status: doc.status,
      productsCount: doc.lines?.length || 0,
      purchaseOrder: doc.notes || '',
      warehouseId: doc.warehouse_id,
      warehouseName: warehouseMap[doc.warehouse_id] || 'Central WH',
    }));
  }, [rawReceipts, locationMap, partnerMap, warehouseMap]);

  // Filtered receipts
  const filteredReceipts = useMemo(() => {
    return receipts.filter((item) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        q === '' ||
        item.reference.toLowerCase().includes(q) ||
        item.contact.toLowerCase().includes(q) ||
        item.toLocation.toLowerCase().includes(q) ||
        item.fromLocation.toLowerCase().includes(q) ||
        item.purchaseOrder.toLowerCase().includes(q) ||
        item.warehouseName.toLowerCase().includes(q);

      const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
      const matchesWarehouse =
        selectedWarehouseId === 'all' || item.warehouseId === selectedWarehouseId;

      return matchesSearch && matchesStatus && matchesWarehouse;
    });
  }, [receipts, searchQuery, filterStatus, selectedWarehouseId]);

  // Grouped receipts for Kanban view
  const kanbanColumns = useMemo(() => {
    return {
      draft: filteredReceipts.filter((r) => r.status === 'draft'),
      ready: filteredReceipts.filter((r) => ['ready', 'waiting', 'waiting_availability'].includes(r.status)),
      done: filteredReceipts.filter((r) => r.status === 'done'),
    };
  }, [filteredReceipts]);

  // Master Checkbox Logic
  const isAllSelected =
    filteredReceipts.length > 0 && selectedIds.length === filteredReceipts.length;
  const isSomeSelected =
    selectedIds.length > 0 && selectedIds.length < filteredReceipts.length;
  const selectAllRef = useRef(null);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = isSomeSelected;
    }
  }, [isSomeSelected]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredReceipts.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id, e) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleOpenReceipt = (receiptId) => {
    navigate(`/receipts/${receiptId}`);
  };

  // Open creation modal
  const handleOpenCreateModal = () => {
    const defaultWh = (isStaff && assignedWarehouseId) ? assignedWarehouseId : defaultWarehouseId;
    const matchingLocs = internalLocations.filter((l) => l.warehouse_id === defaultWh);
    const validInternal = matchingLocs.length > 0 ? matchingLocs[0] : internalLocations[0];
    setModalForm({
      warehouse_id: defaultWh,
      partner_id: vendorPartners[0]?.id || '',
      dest_location_id: validInternal?.id || '',
      scheduled_date: new Date().toISOString().split('T')[0],
      notes: '',
      lines: [{ product_id: products[0]?.id || '', quantity_expected: 10 }],
    });
    setShowCreateModal(true);
  };

  // Create Receipt Mutation
  const createMutation = useMutation({
    mutationFn: async (payload) => {
      return receiptsApi.create(payload);
    },
    onSuccess: (newDoc) => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      showToast(`Receipt ${newDoc.document_number || 'created'} generated successfully!`);
      setShowCreateModal(false);
      navigate(`/receipts/${newDoc.id}`);
    },
    onError: (err) => {
      showToast(err.response?.data?.detail || err.message || 'Failed to create receipt');
    },
  });

  const handleFormLineChange = (index, field, value) => {
    setModalForm((prev) => {
      const nextLines = [...prev.lines];
      nextLines[index] = { ...nextLines[index], [field]: value };
      return { ...prev, lines: nextLines };
    });
  };

  const handleAddLine = () => {
    setModalForm((prev) => ({
      ...prev,
      lines: [...prev.lines, { product_id: products[0]?.id || '', quantity_expected: 10 }],
    }));
  };

  const handleRemoveLine = (index) => {
    setModalForm((prev) => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index),
    }));
  };

  const handleSubmitCreate = () => {
    if (!modalForm.warehouse_id || !modalForm.dest_location_id || !vendorLocation?.id) {
      showToast('Please select warehouse and locations');
      return;
    }
    if (modalForm.lines.length === 0 || !modalForm.lines[0].product_id) {
      showToast('Please add at least one valid product line');
      return;
    }

    const payload = {
      vendor_location_id: vendorLocation.id,
      internal_location_id: modalForm.dest_location_id,
      warehouse_id: modalForm.warehouse_id,
      partner_id: modalForm.partner_id || null,
      notes: modalForm.notes || null,
      lines: modalForm.lines.map((l) => {
        const prod = products.find((p) => p.id === l.product_id);
        return {
          product_id: l.product_id,
          uom_id: prod?.uomId || prod?.uom_id || '149909fe-577b-4f68-aa40-16a9df7c6377',
          quantity_expected: Number(l.quantity_expected) || 1,
        };
      }),
    };

    createMutation.mutate(payload);
  };

  // CSV Export
  const handleDownloadCSV = () => {
    const headers = ['Reference', 'Warehouse', 'From', 'To', 'Contact', 'Scheduled Date', 'Status'];
    const rows = filteredReceipts.map((r) => [
      r.reference,
      `"${r.warehouseName}"`,
      `"${r.fromLocation}"`,
      `"${r.toLocation}"`,
      `"${r.contact}"`,
      r.scheduledDate,
      r.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'stockflow_receipts.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('StockFlow receipts exported to CSV');
  };

  const readyCount = receipts.filter((r) => ['ready', 'waiting', 'waiting_availability'].includes(r.status)).length;

  return (
    <div className="receipts-list-shell">
      <AppHeader />

      {/* Control Ribbon */}
      <div className="receipts-control-ribbon">
        <div className="receipts-ribbon-left">
          <button
            className="btn-new-receipt"
            type="button"
            onClick={handleOpenCreateModal}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
            <span>New</span>
          </button>

          <div className="receipts-breadcrumbs">
            <span className="receipts-crumb-parent">Inventory</span>
            <span className="receipts-crumb-separator">/</span>
            <span className="receipts-crumb-active">Receipts</span>
          </div>

          <div className="receipts-ribbon-actions">
            <button
              className="receipts-action-icon-btn"
              title="Print receipts list"
              type="button"
              onClick={() => window.print()}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>print</span>
            </button>
            <button
              className="receipts-action-icon-btn"
              title="Export All Records"
              type="button"
              onClick={handleDownloadCSV}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>file_download</span>
            </button>
          </div>
        </div>

        <div className="receipts-ribbon-right">
          {/* Warehouse Filter */}
          <div
            className="receipts-warehouse-selector-box"
            title={hasMultiFacilityAccess ? 'Filter by Warehouse' : 'Assigned Warehouse Facility'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#714b67' }}>
              warehouse
            </span>
            {hasMultiFacilityAccess ? (
              <select
                className="receipts-warehouse-select"
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
              >
                <option value="all">🏢 All Warehouses</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name || w.code}
                  </option>
                ))}
              </select>
            ) : (
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#374151',
                  padding: '2px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <span>{warehouses.find((w) => w.id === assignedWarehouseId)?.name || 'Bhiwandi Central'}</span>
                <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#6b7280' }}>
                  lock
                </span>
              </div>
            )}
          </div>

          {/* Search bar */}
          <div className="receipts-search-bar">
            <span className="material-symbols-outlined" style={{ color: '#80747a', fontSize: '18px' }}>
              search
            </span>
            {filterStatus !== 'all' && (
              <span className="receipts-search-chip">
                <span>Status: {filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}</span>
                <button
                  className="receipts-search-chip-close"
                  type="button"
                  onClick={() => setFilterStatus('all')}
                >
                  ×
                </button>
              </span>
            )}
            <input
              type="text"
              className="receipts-search-input"
              placeholder="Search Reference, Partner, Destination..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="receipts-search-chip-close"
                onClick={() => setSearchQuery('')}
                style={{ marginRight: 6 }}
              >
                ×
              </button>
            )}
          </div>

          {/* View Switchers */}
          <div className="receipts-view-switchers">
            <button
              type="button"
              className={`receipts-view-btn ${activeView === 'list' ? 'active' : ''}`}
              title="List View"
              onClick={() => setActiveView('list')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>format_list_bulleted</span>
            </button>
            <button
              type="button"
              className={`receipts-view-btn ${activeView === 'kanban' ? 'active' : ''}`}
              title="Kanban View"
              onClick={() => setActiveView('kanban')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>view_kanban</span>
            </button>
          </div>
        </div>
      </div>

      {/* Context Sub-Bar */}
      <div className="receipts-context-bar">
        <div className="receipts-context-left">
          <span className="receipts-context-tag">Context: Operations / Receipts</span>
          <div className="receipts-context-indicator">
            <span className="indicator-dot-green"></span>
            <span>Incoming Shipments (Automated Stock Ingest)</span>
          </div>
        </div>
        <div>
          <span>
            Active Filter:{' '}
            <strong>
              {selectedWarehouseId === 'all'
                ? 'All Facilities'
                : warehouseMap[selectedWarehouseId] || 'Selected Warehouse'}
            </strong>
          </span>
        </div>
      </div>

      {/* Quick Filter Status Pills */}
      <div className="receipts-filter-pills">
        <button
          type="button"
          className={`receipts-filter-pill-btn ${filterStatus === 'all' ? 'active' : ''}`}
          onClick={() => setFilterStatus('all')}
        >
          <span>All Receipts</span>
          <span className="filter-badge-count">{receipts.length}</span>
        </button>
        <button
          type="button"
          className={`receipts-filter-pill-btn ${filterStatus === 'ready' ? 'active' : ''}`}
          onClick={() => setFilterStatus('ready')}
        >
          <span>Ready</span>
          <span className="filter-badge-count">{readyCount}</span>
        </button>
        <button
          type="button"
          className={`receipts-filter-pill-btn ${filterStatus === 'draft' ? 'active' : ''}`}
          onClick={() => setFilterStatus('draft')}
        >
          <span>Draft</span>
          <span className="filter-badge-count">
            {receipts.filter((r) => r.status === 'draft').length}
          </span>
        </button>
        <button
          type="button"
          className={`receipts-filter-pill-btn ${filterStatus === 'done' ? 'active' : ''}`}
          onClick={() => setFilterStatus('done')}
        >
          <span>Done</span>
          <span className="filter-badge-count">
            {receipts.filter((r) => r.status === 'done').length}
          </span>
        </button>
      </div>

      {/* Main Content Area */}
      {activeView === 'list' ? (
        <div className="receipts-table-wrapper">
          <div className="receipts-table-card">
            <table className="receipts-table">
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
                  <th>From</th>
                  <th>To</th>
                  <th>Contact</th>
                  <th>Scheduled Date</th>
                  <th>Status</th>
                  <th style={{ width: '48px', textAlign: 'right' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>tune</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredReceipts.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#756f82' }}>
                      No incoming receipts match the current criteria.
                    </td>
                  </tr>
                ) : (
                  filteredReceipts.map((receipt) => {
                    const isSelected = selectedIds.includes(receipt.id);
                    return (
                      <tr
                        key={receipt.id}
                        className={`receipts-row ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleOpenReceipt(receipt.id)}
                      >
                        <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleToggleSelect(receipt.id, e)}
                          />
                        </td>
                        <td>
                          <div className="receipt-ref-cell">
                            <span className="indicator-dot-green"></span>
                            <span style={{ fontWeight: 700, color: '#714b67' }}>{receipt.reference}</span>
                            <span
                              className="material-symbols-outlined"
                              style={{ fontSize: '16px', color: '#006443', opacity: 0.8 }}
                            >
                              arrow_downward_alt
                            </span>
                          </div>
                        </td>
                        <td style={{ color: '#57344f', fontWeight: 500 }}>{receipt.fromLocation}</td>
                        <td style={{ fontWeight: 600, color: '#2f2937' }}>{receipt.toLocation}</td>
                        <td style={{ fontWeight: 600, color: '#1a1622' }}>{receipt.contact}</td>
                        <td style={{ color: '#756f82' }}>{receipt.scheduledDate}</td>
                        <td>
                          <span className={`receipt-status-pill status-${receipt.status}`}>
                            {receipt.status.charAt(0).toUpperCase() + receipt.status.slice(1)}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn-open-record"
                            title="Open record"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenReceipt(receipt.id);
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                              chevron_right
                            </span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Table Footer Bar */}
            <div className="receipts-table-footer-bar">
              <div className="receipts-footer-left">
                <span className="receipts-records-count">
                  {filteredReceipts.length} records
                </span>
                <span>•</span>
                <span>Tip: Click any receipt row to open detail sheet and validate moves</span>
              </div>
              <div className="receipts-footer-right">
                <span className="receipts-ready-badge">
                  Total Ready: <strong>{readyCount} Orders</strong>
                </span>
                <button
                  type="button"
                  className="btn-download-csv"
                  onClick={handleDownloadCSV}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
                  <span>Download CSV</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Status-Column Kanban Board */
        <div className="receipts-kanban-board">
          {/* Draft Column */}
          <div className="receipts-kanban-column">
            <div className="receipts-kanban-col-header">
              <div className="kanban-col-title-group">
                <span className="kanban-col-dot dot-draft"></span>
                <span className="kanban-col-title">Draft</span>
              </div>
              <span className="kanban-col-count">{kanbanColumns.draft.length}</span>
            </div>
            <div className="receipts-kanban-col-cards">
              {kanbanColumns.draft.length === 0 ? (
                <div className="kanban-empty-col">No draft receipts</div>
              ) : (
                kanbanColumns.draft.map((receipt) => (
                  <div
                    key={receipt.id}
                    className="receipt-kanban-card"
                    onClick={() => handleOpenReceipt(receipt.id)}
                  >
                    <div className="kanban-header">
                      <span className="kanban-ref">{receipt.reference}</span>
                      <span className="receipt-status-pill status-draft">Draft</span>
                    </div>
                    <div className="kanban-contact">
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#714b67' }}>store</span>
                      {receipt.contact}
                    </div>
                    <div className="kanban-route">
                      {receipt.fromLocation} ➔ {receipt.toLocation}
                    </div>
                    <div className="kanban-footer">
                      <span>{receipt.warehouseName}</span>
                      <span>{receipt.scheduledDate}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Ready Column */}
          <div className="receipts-kanban-column">
            <div className="receipts-kanban-col-header">
              <div className="kanban-col-title-group">
                <span className="kanban-col-dot dot-ready"></span>
                <span className="kanban-col-title">Ready</span>
              </div>
              <span className="kanban-col-count">{kanbanColumns.ready.length}</span>
            </div>
            <div className="receipts-kanban-col-cards">
              {kanbanColumns.ready.length === 0 ? (
                <div className="kanban-empty-col">No receipts ready for receipt</div>
              ) : (
                kanbanColumns.ready.map((receipt) => (
                  <div
                    key={receipt.id}
                    className="receipt-kanban-card"
                    onClick={() => handleOpenReceipt(receipt.id)}
                  >
                    <div className="kanban-header">
                      <span className="kanban-ref">{receipt.reference}</span>
                      <span className="receipt-status-pill status-ready">Ready</span>
                    </div>
                    <div className="kanban-contact">
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#0284c7' }}>local_shipping</span>
                      {receipt.contact}
                    </div>
                    <div className="kanban-route">
                      {receipt.fromLocation} ➔ {receipt.toLocation}
                    </div>
                    <div className="kanban-footer">
                      <span>{receipt.warehouseName}</span>
                      <span>{receipt.scheduledDate}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Done Column */}
          <div className="receipts-kanban-column">
            <div className="receipts-kanban-col-header">
              <div className="kanban-col-title-group">
                <span className="kanban-col-dot dot-done"></span>
                <span className="kanban-col-title">Done</span>
              </div>
              <span className="kanban-col-count">{kanbanColumns.done.length}</span>
            </div>
            <div className="receipts-kanban-col-cards">
              {kanbanColumns.done.length === 0 ? (
                <div className="kanban-empty-col">No validated receipts</div>
              ) : (
                kanbanColumns.done.map((receipt) => (
                  <div
                    key={receipt.id}
                    className="receipt-kanban-card"
                    onClick={() => handleOpenReceipt(receipt.id)}
                  >
                    <div className="kanban-header">
                      <span className="kanban-ref">{receipt.reference}</span>
                      <span className="receipt-status-pill status-done">Done</span>
                    </div>
                    <div className="kanban-contact">
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#006443' }}>verified</span>
                      {receipt.contact}
                    </div>
                    <div className="kanban-route">
                      {receipt.fromLocation} ➔ {receipt.toLocation}
                    </div>
                    <div className="kanban-footer">
                      <span>{receipt.warehouseName}</span>
                      <span>{receipt.scheduledDate}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Receipt Creation Modal */}
      {showCreateModal && (
        <div className="receipts-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="receipts-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="receipts-modal-header">
              <div className="receipts-modal-title">
                <span className="material-symbols-outlined" style={{ color: '#714b67' }}>note_add</span>
                <span>Create New Inbound Receipt</span>
              </div>
              <button
                type="button"
                className="receipts-modal-close-btn"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="receipts-modal-body">
              <div className="receipts-modal-grid-2">
                <div className="receipts-field-group">
                  <label className="receipts-field-label">
                    Warehouse <span>*</span>
                  </label>
                  <select
                    className="receipts-field-select"
                    value={modalForm.warehouse_id}
                    disabled={isStaff && !!assignedWarehouseId}
                    title={isStaff && !!assignedWarehouseId ? 'Locked to your assigned warehouse' : 'Select Warehouse'}
                    onChange={(e) => {
                      const whId = e.target.value;
                      const match = internalLocations.filter((l) => l.warehouse_id === whId);
                      const validLoc = match.length > 0 ? match[0] : internalLocations[0];
                      setModalForm((p) => ({
                        ...p,
                        warehouse_id: whId,
                        dest_location_id: validLoc?.id || '',
                      }));
                    }}
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name || w.code}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="receipts-field-group">
                  <label className="receipts-field-label">
                    Receive From (Vendor Partner) <span>*</span>
                  </label>
                  <select
                    className="receipts-field-select"
                    value={modalForm.partner_id}
                    onChange={(e) => setModalForm((p) => ({ ...p, partner_id: e.target.value }))}
                  >
                    <option value="">— Select Vendor Partner —</option>
                    {vendorPartners.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="receipts-modal-grid-2">
                <div className="receipts-field-group">
                  <label className="receipts-field-label">
                    Destination Location (To) <span>*</span>
                  </label>
                  <select
                    className="receipts-field-select"
                    value={modalForm.dest_location_id}
                    onChange={(e) => setModalForm((p) => ({ ...p, dest_location_id: e.target.value }))}
                  >
                    {availableDestLocations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="receipts-field-group">
                  <label className="receipts-field-label">Scheduled Date</label>
                  <input
                    type="date"
                    className="receipts-field-input"
                    value={modalForm.scheduled_date}
                    onChange={(e) => setModalForm((p) => ({ ...p, scheduled_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="receipts-field-group">
                <label className="receipts-field-label">Purchase Order / Notes</label>
                <input
                  type="text"
                  className="receipts-field-input"
                  placeholder="e.g. PO/2026/0084 - Inbound container shipment"
                  value={modalForm.notes}
                  onChange={(e) => setModalForm((p) => ({ ...p, notes: e.target.value }))}
                />
              </div>

              {/* Product Lines */}
              <div className="receipts-lines-section">
                <div className="receipts-lines-header">
                  <span className="receipts-lines-title">Product Demand Lines</span>
                  <button type="button" className="btn-add-line" onClick={handleAddLine}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
                    <span>Add Product</span>
                  </button>
                </div>

                <table className="receipts-lines-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th style={{ width: '130px' }}>Expected Qty</th>
                      <th style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalForm.lines.map((line, idx) => (
                      <tr key={idx}>
                        <td>
                          <select
                            className="receipts-field-select"
                            style={{ width: '100%' }}
                            value={line.product_id}
                            onChange={(e) => handleFormLineChange(idx, 'product_id', e.target.value)}
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                [{p.code || p.sku || 'SKU'}] {p.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            className="receipts-field-input"
                            style={{ width: '100%' }}
                            value={line.quantity_expected}
                            onChange={(e) => handleFormLineChange(idx, 'quantity_expected', e.target.value)}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {modalForm.lines.length > 1 && (
                            <button
                              type="button"
                              className="btn-remove-line"
                              title="Remove item"
                              onClick={() => handleRemoveLine(idx)}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="receipts-modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-modal-submit"
                onClick={handleSubmitCreate}
                disabled={createMutation.isPending}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check</span>
                <span>{createMutation.isPending ? 'Generating...' : 'Create Draft Receipt'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="receipts-toast-banner">
          <span className="material-symbols-outlined" style={{ color: '#6ffbbe' }}>info</span>
          <span>{toastMessage}</span>
        </div>
      )}

      <AppFooter />
    </div>
  );
}

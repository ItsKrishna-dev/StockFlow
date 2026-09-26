import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '../../widgets/app-header';
import { AppFooter } from '../../widgets/app-footer';
import { receiptsApi } from '../../shared/api/operationsApi';
import './ReceiptsList.css';

/** Map backend DocumentOut to display shape */
function mapReceipt(doc) {
  return {
    id: doc.id,
    reference: doc.document_number || `#${String(doc.id).slice(0, 8).toUpperCase()}`,
    fromLocation: doc.source_location_id,
    toLocation: doc.dest_location_id,
    contact: doc.partner_id || '—',
    scheduledDate: doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '—',
    status: doc.status,
    productsCount: doc.lines?.length || 0,
    purchaseOrder: doc.notes || '',
  };
}

export default function ReceiptsListPage() {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeView, setActiveView] = useState('list'); // list | kanban
  const [toastMessage, setToastMessage] = useState('');

  const { data: rawReceipts = [] } = useQuery({
    queryKey: ['receipts'],
    queryFn: () => receiptsApi.list(),
  });

  const receipts = useMemo(() => rawReceipts.map(mapReceipt), [rawReceipts]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Filtered receipts
  const filteredReceipts = useMemo(() => {
    return receipts.filter((item) => {
      const matchesSearch =
        searchQuery === '' ||
        item.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.contact.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.toLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.fromLocation.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        filterStatus === 'all' || item.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [receipts, searchQuery, filterStatus]);

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

  // Open detail view for a receipt
  const handleOpenReceipt = (receiptId) => {
    navigate(`/receipts/${receiptId}`);
  };

  // Create new receipt
  const handleCreateNew = () => {
    const newId = `WH-IN-${String(receipts.length + 1).padStart(4, '0')}`;
    const newRef = `WH/IN/${String(receipts.length + 1).padStart(4, '0')}`;
    const newRecord = {
      id: newId,
      reference: newRef,
      fromLocation: 'vendor',
      toLocation: 'WH/Stock',
      contact: 'New Vendor Partner',
      scheduledDate: new Date().toISOString().split('T')[0],
      status: 'draft',
      productsCount: 1,
      purchaseOrder: `P0000${45 + receipts.length}`,
    };
    setReceipts([newRecord, ...receipts]);
    showToast(`Draft Receipt ${newRef} generated`);
    navigate(`/receipts/${newId}`);
  };

  // CSV Export
  const handleDownloadCSV = () => {
    const headers = ['Reference', 'From', 'To', 'Contact', 'Scheduled Date', 'Status'];
    const rows = filteredReceipts.map((r) => [
      r.reference,
      r.fromLocation,
      r.toLocation,
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

  const readyCount = receipts.filter((r) => r.status === 'ready').length;

  return (
    <div className="receipts-list-shell">
      <AppHeader />

      {/* Control Ribbon */}
      <div className="receipts-control-ribbon">
        <div className="receipts-ribbon-left">
          <button
            className="btn-new-receipt"
            type="button"
            onClick={handleCreateNew}
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
              onClick={() => showToast('Printing Receipts Document...')}
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
            <button
              className="receipts-filter-dropdown-btn"
              title="Filters"
              type="button"
              onClick={() =>
                setFilterStatus((prev) =>
                  prev === 'ready' ? 'all' : 'ready'
                )
              }
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>filter_alt</span>
            </button>
          </div>

          {/* Pager */}
          <div className="receipts-pager">
            <span>
              1-{filteredReceipts.length} / {filteredReceipts.length}
            </span>
            <button className="receipts-pager-btn" type="button" disabled>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_left</span>
            </button>
            <button className="receipts-pager-btn" type="button" disabled>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_right</span>
            </button>
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
          <span>Warehouse: WH (Main Store)</span>
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
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>settings</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredReceipts.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#756f82' }}>
                      No incoming receipts match the current filter criteria.
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
                            <span>{receipt.reference}</span>
                            <span
                              className="material-symbols-outlined"
                              style={{ fontSize: '16px', color: '#006443', opacity: 0.8 }}
                            >
                              arrow_downward_alt
                            </span>
                          </div>
                        </td>
                        <td style={{ color: '#756f82' }}>{receipt.fromLocation}</td>
                        <td style={{ fontWeight: 600 }}>{receipt.toLocation}</td>
                        <td style={{ fontWeight: 600, color: '#2f2937' }}>{receipt.contact}</td>
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
        /* Kanban View */
        <div className="receipts-kanban-grid">
          {filteredReceipts.map((receipt) => (
            <div
              key={receipt.id}
              className="receipt-kanban-card"
              onClick={() => handleOpenReceipt(receipt.id)}
            >
              <div className="kanban-header">
                <span className="kanban-ref">{receipt.reference}</span>
                <span className={`receipt-status-pill status-${receipt.status}`}>
                  {receipt.status.charAt(0).toUpperCase() + receipt.status.slice(1)}
                </span>
              </div>
              <div className="kanban-contact">{receipt.contact}</div>
              <div className="kanban-route">
                {receipt.fromLocation} ➔ {receipt.toLocation}
              </div>
              <div className="kanban-footer">
                <span>PO: {receipt.purchaseOrder}</span>
                <span>{receipt.scheduledDate}</span>
              </div>
            </div>
          ))}
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

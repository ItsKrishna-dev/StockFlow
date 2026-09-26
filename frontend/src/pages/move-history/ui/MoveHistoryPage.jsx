import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ROUTES } from '../../../shared/config/routes';
import { AppHeader } from '../../../widgets/app-header';
import { AppFooter } from '../../../widgets/app-footer';
import './MoveHistory.css';

const INITIAL_MOVES = [
  {
    id: '1',
    reference: 'WH/IN/0001',
    type: 'incoming',
    date: '2023-12-01',
    contact: 'Acme Interior',
    fromLocation: 'vendor',
    toLocation: 'WH/Stock1',
    product: 'Steel Rods (STL-001)',
    quantity: '15.00 kg',
    status: 'ready',
    link: '/receipts/WH-IN-0001',
  },
  {
    id: '2',
    reference: 'WH/OUT/0002',
    type: 'outgoing',
    date: '2023-12-02',
    contact: 'Acme Interior',
    fromLocation: 'WH/Stock1',
    toLocation: 'vendor',
    product: 'Wooden Panels (WPN-002)',
    quantity: '8.00 pcs',
    status: 'ready',
    link: '/delivery-orders/2',
  },
  {
    id: '3',
    reference: 'WH/INT/0001',
    type: 'internal',
    date: '2023-12-03',
    contact: 'Automated Rebalance',
    fromLocation: 'WH/Stock1',
    toLocation: 'WH/Rack-A',
    product: 'Industrial Paint (PNT-006)',
    quantity: '25.00 L',
    status: 'done',
    link: null,
  },
  {
    id: '4',
    reference: 'WH/OUT/0004',
    type: 'outgoing',
    date: '2023-11-25',
    contact: 'Delta Heavy Industries',
    fromLocation: 'WH/Rack-A',
    toLocation: 'Customer Beta',
    product: 'Safety Gloves (GLV-004)',
    quantity: '50.00 pairs',
    status: 'done',
    link: '/delivery-orders/4',
  },
  {
    id: '5',
    reference: 'WH/IN/0002',
    type: 'incoming',
    date: '2023-12-02',
    contact: 'Deco Addict',
    fromLocation: 'vendor',
    toLocation: 'WH/Stock2',
    product: 'Office Chair (CHAIR-002)',
    quantity: '12.00 Units',
    status: 'draft',
    link: '/receipts/WH-IN-0002',
  },
];

export default function MoveHistoryPage() {
  const navigate = useNavigate();
  const [moves, setMoves] = useState(INITIAL_MOVES);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeView, setActiveView] = useState('list'); // list | kanban
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Filter logic
  const filteredMoves = useMemo(() => {
    return moves.filter((item) => {
      const matchesSearch =
        searchQuery === '' ||
        item.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.contact.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.fromLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.toLocation.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        filterStatus === 'all' || item.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [moves, searchQuery, filterStatus]);

  // Master Checkbox Logic
  const isAllSelected =
    filteredMoves.length > 0 && selectedIds.length === filteredMoves.length;
  const isSomeSelected =
    selectedIds.length > 0 && selectedIds.length < filteredMoves.length;
  const selectAllRef = useRef(null);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = isSomeSelected;
    }
  }, [isSomeSelected]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredMoves.map((m) => m.id));
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

  const handleRowClick = (move) => {
    if (move.link) {
      navigate(move.link);
    } else {
      showToast(`Viewing internal move ledger for ${move.reference}`);
    }
  };

  const handleDownloadCSV = () => {
    const headers = ['Reference', 'Date', 'Contact', 'Product', 'From', 'To', 'Quantity', 'Status'];
    const rows = filteredMoves.map((m) => [
      m.reference,
      m.date,
      `"${m.contact}"`,
      `"${m.product}"`,
      m.fromLocation,
      m.toLocation,
      `"${m.quantity}"`,
      m.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'stockflow_move_history.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('StockFlow Move History exported to CSV');
  };

  return (
    <div className="move-history-shell">
      <AppHeader />

      {/* Control Ribbon */}
      <div className="move-control-ribbon">
        <div className="move-ribbon-left">
          <button
            className="btn-new-move"
            type="button"
            onClick={() => showToast('New Stock Move ledger entry created')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
            <span>New</span>
          </button>

          <div className="move-breadcrumbs">
            <Link to={ROUTES.DASHBOARD} style={{ color: '#756f82', textDecoration: 'none' }}>
              Inventory
            </Link>
            <span style={{ color: '#d1c3ca' }}>/</span>
            <span className="move-crumb-active">Move History</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
            <button
              type="button"
              style={{ background: 'transparent', border: 'none', color: '#756f82', padding: '6px', cursor: 'pointer', borderRadius: '4px' }}
              title="Print Move Report"
              onClick={() => showToast('Printing Move History Report...')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>print</span>
            </button>
            <button
              type="button"
              style={{ background: 'transparent', border: 'none', color: '#756f82', padding: '6px', cursor: 'pointer', borderRadius: '4px' }}
              title="Export All Records"
              onClick={handleDownloadCSV}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>file_download</span>
            </button>
          </div>
        </div>

        {/* Right Search, Pager & View Switchers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#f5f3f3',
            border: '1px solid #e4e2e2',
            borderRadius: '4px',
            padding: '4px 10px',
            gap: '8px',
            minWidth: '280px',
          }}>
            <span className="material-symbols-outlined" style={{ color: '#80747a', fontSize: '18px' }}>
              search
            </span>
            <input
              type="text"
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13.5px', color: '#2f2937', width: '100%' }}
              placeholder="Search Reference, Partner, Product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              type="button"
              style={{ background: 'transparent', border: 'none', color: '#756f82', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              title="Filters"
              onClick={() => setFilterStatus((prev) => (prev === 'ready' ? 'all' : 'ready'))}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>filter_alt</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#756f82' }}>
            <span>1-{filteredMoves.length} / {filteredMoves.length}</span>
            <button type="button" disabled style={{ background: 'transparent', border: '1px solid #d1c3ca', borderRadius: '4px', padding: '2px 4px', opacity: 0.4, cursor: 'not-allowed' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_left</span>
            </button>
            <button type="button" disabled style={{ background: 'transparent', border: '1px solid #d1c3ca', borderRadius: '4px', padding: '2px 4px', opacity: 0.4, cursor: 'not-allowed' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_right</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#efeded', padding: '2px', borderRadius: '4px', gap: '2px' }}>
            <button
              type="button"
              style={{
                background: activeView === 'list' ? '#ffffff' : 'transparent',
                color: activeView === 'list' ? '#714b67' : '#756f82',
                border: 'none',
                padding: '4px 6px',
                borderRadius: '3px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                boxShadow: activeView === 'list' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
              title="List View"
              onClick={() => setActiveView('list')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>format_list_bulleted</span>
            </button>
            <button
              type="button"
              style={{
                background: activeView === 'kanban' ? '#ffffff' : 'transparent',
                color: activeView === 'kanban' ? '#714b67' : '#756f82',
                border: 'none',
                padding: '4px 6px',
                borderRadius: '3px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                boxShadow: activeView === 'kanban' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
              title="Kanban View"
              onClick={() => setActiveView('kanban')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>view_kanban</span>
            </button>
          </div>
        </div>
      </div>

      {/* Context Sub-Bar */}
      <div className="move-context-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontWeight: 700, color: '#714b67', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em' }}>
            Active Context:
          </span>
          <span className="move-badge-pill">Move History</span>
          <span>Warehouse Operations Audit Trail</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#047857' }} />
          <span>Auto-refresh synced</span>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px 0' }}>
        <button
          type="button"
          style={{
            backgroundColor: filterStatus === 'all' ? '#714b67' : '#ffffff',
            color: filterStatus === 'all' ? '#ffffff' : '#2f2937',
            border: '1px solid #d1c3ca',
            borderRadius: '14px',
            padding: '4px 12px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          onClick={() => setFilterStatus('all')}
        >
          All Moves ({moves.length})
        </button>
        <button
          type="button"
          style={{
            backgroundColor: filterStatus === 'ready' ? '#714b67' : '#ffffff',
            color: filterStatus === 'ready' ? '#ffffff' : '#0284c7',
            border: '1px solid #d1c3ca',
            borderRadius: '14px',
            padding: '4px 12px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          onClick={() => setFilterStatus('ready')}
        >
          Ready ({moves.filter((m) => m.status === 'ready').length})
        </button>
        <button
          type="button"
          style={{
            backgroundColor: filterStatus === 'done' ? '#714b67' : '#ffffff',
            color: filterStatus === 'done' ? '#ffffff' : '#047857',
            border: '1px solid #d1c3ca',
            borderRadius: '14px',
            padding: '4px 12px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          onClick={() => setFilterStatus('done')}
        >
          Done ({moves.filter((m) => m.status === 'done').length})
        </button>
        <button
          type="button"
          style={{
            backgroundColor: filterStatus === 'draft' ? '#714b67' : '#ffffff',
            color: filterStatus === 'draft' ? '#ffffff' : '#6c757d',
            border: '1px solid #d1c3ca',
            borderRadius: '14px',
            padding: '4px 12px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          onClick={() => setFilterStatus('draft')}
        >
          Draft ({moves.filter((m) => m.status === 'draft').length})
        </button>
      </div>

      {/* Main Table */}
      {activeView === 'list' ? (
        <div className="move-table-wrapper">
          <div className="move-table-card">
            <table className="move-table">
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
                  <th>Date</th>
                  <th>Contact</th>
                  <th>Product</th>
                  <th>From</th>
                  <th>To</th>
                  <th style={{ textAlign: 'right' }}>Quantity</th>
                  <th>Status</th>
                  <th style={{ width: '48px', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredMoves.map((move) => {
                  const isSelected = selectedIds.includes(move.id);
                  return (
                    <tr
                      key={move.id}
                      className={`move-row ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleRowClick(move)}
                    >
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleToggleSelect(move.id, e)}
                        />
                      </td>
                      <td>
                        <div
                          className={
                            move.type === 'incoming'
                              ? 'ref-cell-incoming'
                              : move.type === 'outgoing'
                              ? 'ref-cell-outgoing'
                              : 'ref-cell-internal'
                          }
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                            {move.type === 'incoming'
                              ? 'arrow_downward_alt'
                              : move.type === 'outgoing'
                              ? 'arrow_upward_alt'
                              : 'sync_alt'}
                          </span>
                          <span>{move.reference}</span>
                        </div>
                      </td>
                      <td style={{ color: '#756f82' }}>{move.date}</td>
                      <td style={{ fontWeight: 600, color: '#2f2937' }}>{move.contact}</td>
                      <td style={{ fontWeight: 500 }}>{move.product}</td>
                      <td style={{ color: '#756f82' }}>{move.fromLocation}</td>
                      <td style={{ fontWeight: 600 }}>{move.toLocation}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{move.quantity}</td>
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            backgroundColor:
                              move.status === 'ready'
                                ? '#e0f2fe'
                                : move.status === 'done'
                                ? '#d1fae5'
                                : '#f1f3f5',
                            color:
                              move.status === 'ready'
                                ? '#0284c7'
                                : move.status === 'done'
                                ? '#047857'
                                : '#6c757d',
                          }}
                        >
                          {move.status.charAt(0).toUpperCase() + move.status.slice(1)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          style={{ background: 'transparent', border: 'none', color: '#80747a', cursor: 'pointer', padding: '4px' }}
                          title="Open Related Document"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(move);
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                            open_in_new
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Table Footer Bar */}
            <div className="move-table-footer-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 800, color: '#2f2937' }}>{filteredMoves.length} records</span>
                <span>•</span>
                <span>Immutable warehouse operations audit trail</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <button
                  type="button"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#ffffff',
                    color: '#714b67',
                    border: '1px solid #d1c3ca',
                    padding: '6px 14px',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  onClick={handleDownloadCSV}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
                  <span>Export CSV</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Kanban View */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', padding: '12px 24px 24px' }}>
          {filteredMoves.map((move) => (
            <div
              key={move.id}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e8e4ec',
                borderRadius: '6px',
                padding: '16px',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
              onClick={() => handleRowClick(move)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, color: '#714b67' }}>{move.reference}</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: move.status === 'ready' ? '#0284c7' : '#047857' }}>
                  {move.status}
                </span>
              </div>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>{move.product}</div>
              <div style={{ fontSize: '13px', color: '#756f82', marginBottom: '10px' }}>
                {move.fromLocation} ➔ {move.toLocation}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderTop: '1px solid #f0edf2', paddingTop: '8px' }}>
                <span>Qty: {move.quantity}</span>
                <span>{move.date}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '48px',
          right: '24px',
          backgroundColor: '#2f2937',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          zIndex: 1000,
        }}>
          <span className="material-symbols-outlined" style={{ color: '#6ffbbe' }}>check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      <AppFooter />
    </div>
  );
}

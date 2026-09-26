import React, { useState, useMemo, useRef, useEffect } from 'react';
import './DeliveryOrders.css';
import DeliveryDetailModal from './DeliveryDetailModal';
import NewDeliveryModal from './NewDeliveryModal';
import DeliveryOrderDetailView from './DeliveryOrderDetailView';
import { AppHeader } from '../../widgets/app-header';
import { AppFooter } from '../../widgets/app-footer';

const INITIAL_ORDERS = [
  {
    id: '1',
    reference: 'WH/OUT/0001',
    fromLocation: 'WH/Stock1',
    toLocation: 'vendor',
    contact: 'Acme Interior',
    scheduledDate: '2026-09-26',
    status: 'ready',
    lines: [
      {
        productName: 'Steel Rods (STL-001)',
        demand: 15,
        reserved: 15,
        done: 15,
        uom: 'kg',
      }
    ],
    note: 'Priority outbound shipment for Acme Interior batch 1',
  },
  {
    id: '2',
    reference: 'WH/OUT/0002',
    fromLocation: 'WH/Stock1',
    toLocation: 'vendor',
    contact: 'Acme Interior',
    scheduledDate: '2026-09-26',
    status: 'ready',
    lines: [
      {
        productName: 'Wooden Panels (WPN-002)',
        demand: 8,
        reserved: 8,
        done: 8,
        uom: 'pcs',
      }
    ],
    note: 'Standard return/vendor transfer packaging',
  },
  {
    id: '3',
    reference: 'WH/OUT/0003',
    fromLocation: 'WH/Stock1',
    toLocation: 'Customer Alpha',
    contact: 'Customer Alpha',
    scheduledDate: '2026-09-27',
    status: 'waiting',
    lines: [
      {
        productName: 'Industrial Paint (PNT-006)',
        demand: 30,
        reserved: 10,
        done: 0,
        uom: 'L',
      }
    ],
    note: 'Awaiting raw batch quality inspection before dispatch',
  },
  {
    id: '4',
    reference: 'WH/OUT/0004',
    fromLocation: 'WH/Rack-A',
    toLocation: 'Customer Beta',
    contact: 'Delta Heavy Industries',
    scheduledDate: '2026-09-25',
    status: 'done',
    lines: [
      {
        productName: 'Safety Gloves (GLV-004)',
        demand: 50,
        reserved: 50,
        done: 50,
        uom: 'pairs',
      }
    ],
    note: 'Completed delivery dispatched via Carrier Express',
  }
];

export default function DeliveryOrdersPage() {
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ready');
  const [activeView, setActiveView] = useState('list');
  const [toastMessage, setToastMessage] = useState('');
  
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState(null);
  const [inspectOrder, setInspectOrder] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);

  // Trigger brief toast
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3200);
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus = filterStatus ? order.status === filterStatus : true;
      const q = searchQuery.toLowerCase();
      const matchesSearch = searchQuery
        ? order.reference.toLowerCase().includes(q) ||
          order.contact.toLowerCase().includes(q) ||
          order.fromLocation.toLowerCase().includes(q) ||
          order.toLocation.toLowerCase().includes(q) ||
          order.lines?.some(l => l.productName.toLowerCase().includes(q))
        : true;
      return matchesStatus && matchesSearch;
    });
  }, [orders, filterStatus, searchQuery]);

  // Statistics
  const readyCount = orders.filter(o => o.status === 'ready').length;
  const doneCount = orders.filter(o => o.status === 'done').length;
  const waitingCount = orders.filter(o => o.status === 'waiting').length;

  // Select all handler
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredOrders.map((o) => o.id));
    } else {
      setSelectedIds([]);
    }
  };

  // Row selection handler
  const handleRowSelect = (id, e) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk validate
  const handleBulkValidate = () => {
    setOrders(prev => prev.map(o => selectedIds.includes(o.id) ? { ...o, status: 'done' } : o));
    showToast(`${selectedIds.length} delivery orders validated as DONE`);
    setSelectedIds([]);
  };

  // Bulk delete
  const handleBulkDelete = () => {
    setOrders(prev => prev.filter(o => !selectedIds.includes(o.id)));
    showToast(`${selectedIds.length} orders removed`);
    setSelectedIds([]);
  };

  // Validate an order
  const handleValidateOrder = (orderId) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'done' } : o))
    );
    if (inspectOrder && inspectOrder.id === orderId) {
      setInspectOrder((prev) => ({ ...prev, status: 'done' }));
    }
    showToast(`Order ${inspectOrder?.reference || ''} marked as DONE`);
  };

  // Cancel an order
  const handleCancelOrder = (orderId) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'canceled' } : o))
    );
    if (inspectOrder && inspectOrder.id === orderId) {
      setInspectOrder((prev) => ({ ...prev, status: 'canceled' }));
    }
    showToast(`Order canceled`);
  };

  // Create new order
  const handleCreateOrder = (newOrderData) => {
    const nextNum = (orders.length + 1).toString().padStart(4, '0');
    const newRecord = {
      id: Date.now().toString(),
      reference: `WH/OUT/${nextNum}`,
      ...newOrderData,
    };
    setOrders((prev) => [newRecord, ...prev]);
    showToast(`Delivery Order ${newRecord.reference} successfully created`);
  };

  // Download CSV
  const handleDownloadCSV = () => {
    const headers = ['Reference', 'From', 'To', 'Contact', 'Scheduled Date', 'Status'];
    const rows = filteredOrders.map((o) => [
      o.reference,
      o.fromLocation,
      o.toLocation,
      `"${o.contact}"`,
      o.scheduledDate,
      o.status,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'stockflow_delivery_orders.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('StockFlow delivery orders exported to CSV');
  };

  const isAllSelected = filteredOrders.length > 0 && selectedIds.length === filteredOrders.length;
  const isSomeSelected = selectedIds.length > 0 && selectedIds.length < filteredOrders.length;
  const selectAllRef = useRef(null);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = isSomeSelected;
    }
  }, [isSomeSelected]);

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
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
            <span>New</span>
          </button>

          <div className="breadcrumbs">
            <span className="crumb-parent" onClick={() => setActiveTab('dashboard')}>StockFlow</span>
            <span className="crumb-separator">/</span>
            <h1 className="crumb-current">Delivery Orders</h1>
          </div>

          <div className="action-tool-buttons">
            <button className="tool-icon-btn" title="Export All to CSV" type="button" onClick={handleDownloadCSV}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>file_download</span>
            </button>
            <button className="tool-icon-btn" title="Print Delivery Slips" type="button" onClick={() => { window.print(); showToast('Printing delivery slips'); }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>print</span>
            </button>
            <button className="tool-icon-btn" title="Automations & AI Insights" type="button" onClick={() => showToast('Automations & AI Insights: Active')}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>bolt</span>
            </button>
          </div>
        </div>

        <div className="ribbon-right">
          {/* Search container */}
          <div className="search-container">
            <span className="material-symbols-outlined" style={{ color: '#80747a', fontSize: '20px' }}>search</span>
            {filterStatus && (
              <div className="filter-chip">
                <span>Status: {filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}</span>
                <button
                  type="button"
                  className="chip-close"
                  onClick={() => setFilterStatus('')}
                  title="Remove filter"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                </button>
              </div>
            )}
            <input
              type="text"
              className="search-input"
              placeholder="Search reference, customer, product..."
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
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>cancel</span>
              </button>
            )}
            <button
              className="search-tool-btn"
              title="Toggle Ready Filter"
              type="button"
              onClick={() => setFilterStatus(filterStatus === 'ready' ? '' : 'ready')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>filter_alt</span>
            </button>
            <button className="search-tool-btn" title="Group By" type="button" onClick={() => showToast('Grouped by Destination')}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>view_agenda</span>
            </button>
            <button className="search-tool-btn" title="Favorites" type="button" onClick={() => showToast('Saved to Favorites')}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>star</span>
            </button>
          </div>

          {/* Record Pager */}
          <div className="pager-box">
            <span>{filteredOrders.length > 0 ? `1-${filteredOrders.length} / ${filteredOrders.length}` : '0 / 0'}</span>
            <button className="pager-btn" disabled type="button">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_left</span>
            </button>
            <button className="pager-btn" disabled type="button">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_right</span>
            </button>
          </div>

          {/* View Mode Switcher */}
          <div className="view-switcher">
            <button
              className={`view-btn ${activeView === 'list' ? 'active' : ''}`}
              title="List View"
              type="button"
              onClick={() => setActiveView('list')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>format_list_bulleted</span>
            </button>
            <button
              className={`view-btn ${activeView === 'kanban' ? 'active' : ''}`}
              title="Kanban Board"
              type="button"
              onClick={() => setActiveView('kanban')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>view_kanban</span>
            </button>
            <button
              className={`view-btn ${activeView === 'calendar' ? 'active' : ''}`}
              title="Calendar Schedule"
              type="button"
              onClick={() => setActiveView('calendar')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>calendar_month</span>
            </button>
            <button
              className={`view-btn ${activeView === 'pivot' ? 'active' : ''}`}
              title="Pivot Analytics"
              type="button"
              onClick={() => setActiveView('pivot')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>pivot_table_chart</span>
            </button>
            <button
              className={`view-btn ${activeView === 'activity' ? 'active' : ''}`}
              title="Activity Stream"
              type="button"
              onClick={() => setActiveView('activity')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>schedule</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <main className="main-workspace">
        {/* Quick Filter Tag Chips */}
        <div className="filter-tags-bar">
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#756f82', marginRight: '4px' }}>Quick Filter:</span>
          <button
            className={`filter-tag-item ${filterStatus === '' ? 'active' : ''}`}
            onClick={() => setFilterStatus('')}
          >
            All Deliveries ({orders.length})
          </button>
          <button
            className={`filter-tag-item ${filterStatus === 'ready' ? 'active' : ''}`}
            onClick={() => setFilterStatus('ready')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: filterStatus === 'ready' ? '#fff' : '#006398' }}>check_circle</span>
            Ready for Pickup ({readyCount})
          </button>
          <button
            className={`filter-tag-item ${filterStatus === 'waiting' ? 'active' : ''}`}
            onClick={() => setFilterStatus('waiting')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: filterStatus === 'waiting' ? '#fff' : '#c8841a' }}>hourglass_empty</span>
            Waiting Availability ({waitingCount})
          </button>
          <button
            className={`filter-tag-item ${filterStatus === 'done' ? 'active' : ''}`}
            onClick={() => setFilterStatus('done')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: filterStatus === 'done' ? '#fff' : '#006443' }}>task_alt</span>
            Done / Dispatched ({doneCount})
          </button>

          {/* Batch Actions Bar */}
          {selectedIds.length > 0 && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#714b67' }}>
                {selectedIds.length} Selected
              </span>
              <button
                type="button"
                className="btn-validate"
                style={{ padding: '6px 14px', fontSize: '13px' }}
                onClick={handleBulkValidate}
              >
                Validate Selected
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '6px 14px', fontSize: '13px', color: '#ba1a1a' }}
                onClick={handleBulkDelete}
              >
                Delete Selected
              </button>
            </div>
          )}
        </div>

        {/* Dynamic View Display: List / Kanban / Calendar / Pivot / Activity */}
        <div key={activeView} className="view-transition-wrapper">
          {activeView === 'list' && (
            <div className="table-wrapper">
              <table className="enterprise-table">
                <thead>
                  <tr>
                    <th style={{ width: '48px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={selectAllRef}
                        onChange={handleSelectAll}
                        style={{ cursor: 'pointer', width: '18px', height: '18px', accentColor: '#714b67' }}
                      />
                    </th>
                    <th>Reference</th>
                    <th>From Location</th>
                    <th>To Destination</th>
                    <th>Contact / Partner</th>
                    <th>Schedule Date</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th style={{ width: '56px', textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => {
                      const isSelected = selectedIds.includes(order.id);
                      return (
                        <tr
                          key={order.id}
                          className={isSelected ? 'selected-row' : ''}
                          onClick={() => setSelectedOrderForDetail(order)}
                        >
                          <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleRowSelect(order.id, e)}
                              style={{ cursor: 'pointer', width: '18px', height: '18px', accentColor: '#714b67' }}
                            />
                          </td>
                          <td style={{ fontWeight: 600 }}>
                            <div className="ref-cell">
                              <span className="material-symbols-outlined outgoing-arrow" title="Outgoing Transfer">
                                arrow_forward
                              </span>
                              <span className="ref-link">{order.reference}</span>
                            </div>
                          </td>
                          <td style={{ color: '#2f2937', fontWeight: 600 }}>{order.fromLocation}</td>
                          <td style={{ color: '#4e444a', fontWeight: 600 }}>{order.toLocation}</td>
                          <td style={{ color: '#2f2937', fontWeight: 600 }}>{order.contact}</td>
                          <td style={{ color: '#756f82' }}>{order.scheduledDate}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`status-pill ${order.status}`}>
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', color: '#80747a' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>chevron_right</span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '54px 16px', color: '#756f82' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '44px', color: '#d1c3ca', display: 'block', marginBottom: '8px' }}>
                          inventory
                        </span>
                        No delivery orders match the current filter or search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Table Footer Bar */}
              <div className="table-footer-bar">
                <div className="footer-left">
                  <span className="footer-records-count">{filteredOrders.length} records</span>
                  <span className="footer-divider">•</span>
                  <span className="footer-tip">Tip: Click any delivery row to inspect lines, pick items, or print documents</span>
                </div>
                <div className="footer-right">
                  <span className="footer-ready-badge">
                    Total Ready: <strong>{readyCount} Orders</strong>
                  </span>
                  <button type="button" className="btn-download-csv" onClick={handleDownloadCSV}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
                    <span>Download CSV</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Kanban Board View */}
          {activeView === 'kanban' && (
            <div className="kanban-board">
              {['draft', 'waiting', 'ready', 'done'].map((stageKey) => {
                const stageOrders = orders.filter(o => o.status === stageKey);
                return (
                  <div key={stageKey} className="kanban-column">
                    <div className="kanban-column-header">
                      <span className="kanban-col-title">{stageKey}</span>
                      <span className="kanban-col-count">{stageOrders.length}</span>
                    </div>
                    {stageOrders.map((order) => (
                      <div key={order.id} className="kanban-card" onClick={() => setSelectedOrderForDetail(order)}>
                        <div className="kanban-card-top">
                          <span className="kanban-card-title">{order.reference}</span>
                          <span className={`status-pill ${order.status}`} style={{ minWidth: 'auto', padding: '2px 8px', fontSize: '11px' }}>
                            {order.status}
                          </span>
                        </div>
                        <div className="kanban-card-body">
                          <strong>{order.contact}</strong>
                          <div style={{ color: '#756f82', fontSize: '12px', marginTop: '2px' }}>
                            {order.fromLocation} → {order.toLocation}
                          </div>
                        </div>
                        <div className="kanban-card-footer">
                          <span>{order.lines?.[0]?.productName || 'General Goods'}</span>
                          <span style={{ fontWeight: 700 }}>{order.lines?.[0]?.demand} {order.lines?.[0]?.uom}</span>
                        </div>
                      </div>
                    ))}
                    {stageOrders.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '28px 8px', color: '#a099a8', fontSize: '12.5px', fontStyle: 'italic' }}>
                        No orders in {stageKey}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Calendar / Schedule View */}
          {activeView === 'calendar' && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1.5px solid #e8e4ec', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                <h2 style={{ fontSize: '19px', fontWeight: 800 }}>Dispatch Calendar — September 2026</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-secondary" onClick={() => showToast('Previous Week')}>Previous</button>
                  <button className="btn-secondary" onClick={() => showToast('Today Schedule')}>Today</button>
                  <button className="btn-secondary" onClick={() => showToast('Next Week')}>Next</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px' }}>
                {['Mon 22', 'Tue 23', 'Wed 24', 'Thu 25', 'Fri 26'].map((day, dIdx) => (
                  <div key={dIdx} style={{ backgroundColor: '#fcfbfd', border: '1.5px solid #e8e4ec', borderRadius: '10px', padding: '14px', minHeight: '170px' }}>
                    <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#714b67', marginBottom: '10px' }}>{day}</div>
                    {dIdx === 4 && (
                      <>
                        <div style={{ backgroundColor: '#cce5ff', padding: '8px 10px', borderRadius: '8px', fontSize: '12.5px', marginBottom: '8px', fontWeight: 700, color: '#00476e' }}>
                          WH/OUT/0001 (Acme Interior)
                        </div>
                        <div style={{ backgroundColor: '#cce5ff', padding: '8px 10px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, color: '#00476e' }}>
                          WH/OUT/0002 (Acme Return)
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pivot / Analytics View */}
          {activeView === 'pivot' && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1.5px solid #e8e4ec', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <h2 style={{ fontSize: '19px', fontWeight: 800, marginBottom: '18px' }}>Outbound Velocity & Fulfillments</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px' }}>
                <div style={{ backgroundColor: '#fbf9f8', padding: '18px', borderRadius: '10px', border: '1.5px solid #e8e4ec' }}>
                  <span style={{ fontSize: '12px', color: '#756f82', fontWeight: 800, textTransform: 'uppercase' }}>Fulfillment Ratio</span>
                  <p style={{ fontSize: '32px', fontWeight: 800, color: '#006443', marginTop: '4px' }}>100%</p>
                  <p style={{ fontSize: '13px', color: '#756f82', marginTop: '4px' }}>All reserved lines currently in stock</p>
                </div>
                <div style={{ backgroundColor: '#fbf9f8', padding: '18px', borderRadius: '10px', border: '1.5px solid #e8e4ec' }}>
                  <span style={{ fontSize: '12px', color: '#756f82', fontWeight: 800, textTransform: 'uppercase' }}>Avg Picking Time</span>
                  <p style={{ fontSize: '32px', fontWeight: 800, color: '#714b67', marginTop: '4px' }}>24 mins</p>
                  <p style={{ fontSize: '13px', color: '#756f82', marginTop: '4px' }}>Surpasses 30-minute target</p>
                </div>
                <div style={{ backgroundColor: '#fbf9f8', padding: '18px', borderRadius: '10px', border: '1.5px solid #e8e4ec' }}>
                  <span style={{ fontSize: '12px', color: '#756f82', fontWeight: 800, textTransform: 'uppercase' }}>On-Time Rate</span>
                  <p style={{ fontSize: '32px', fontWeight: 800, color: '#006398', marginTop: '4px' }}>98.4%</p>
                  <p style={{ fontSize: '13px', color: '#756f82', marginTop: '4px' }}>Across customer dispatches</p>
                </div>
              </div>
            </div>
          )}

          {/* Activity Stream View */}
          {activeView === 'activity' && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1.5px solid #e8e4ec', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <h2 style={{ fontSize: '19px', fontWeight: 800, marginBottom: '18px' }}>StockFlow Activity Stream</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#006443', backgroundColor: '#d1fae5', padding: '8px', borderRadius: '50%' }}>check</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px' }}>WH/OUT/0004 validated by Mitchell Admin</div>
                    <div style={{ fontSize: '13px', color: '#756f82' }}>Dispatched 50 pairs Safety Gloves to Delta Heavy Industries (10 mins ago)</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#006398', backgroundColor: '#cce5ff', padding: '8px', borderRadius: '50%' }}>inventory_2</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px' }}>Stock reserved for WH/OUT/0001</div>
                    <div style={{ fontSize: '13px', color: '#756f82' }}>15 kg Steel Rods allocated from WH/Stock1 (45 mins ago)</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Operational KPI Metric Cards */}
        <div className="kpi-cards-grid">
          <div className="kpi-card">
            <div>
              <p className="kpi-info-title">Operations Status</p>
              <p className="kpi-info-value">{readyCount} Orders Scheduled</p>
              <p className="kpi-info-sub" style={{ color: '#005236', fontWeight: 700 }}>
                100% available in WH/Stock1
              </p>
            </div>
            <div className="kpi-icon-box shipping">
              <span className="material-symbols-outlined" style={{ fontSize: '30px' }}>local_shipping</span>
            </div>
          </div>

          <div className="kpi-card">
            <div>
              <p className="kpi-info-title">Picking Velocity</p>
              <p className="kpi-info-value">0.4 hrs average</p>
              <p className="kpi-info-sub">Real-time processing active</p>
            </div>
            <div className="kpi-icon-box velocity">
              <span className="material-symbols-outlined" style={{ fontSize: '30px' }}>speed</span>
            </div>
          </div>

          <div className="kpi-card">
            <div>
              <p className="kpi-info-title">Destination Breakdown</p>
              <p className="kpi-info-value">Partner: Acme Interior</p>
              <p className="kpi-info-sub">Return / Vendor Transfer flow</p>
            </div>
            <div className="kpi-icon-box destination">
              <span className="material-symbols-outlined" style={{ fontSize: '30px' }}>storefront</span>
            </div>
          </div>
        </div>
      </main>

      {/* System Footer with StockFlow Branding */}
      <footer className="system-footer">
        <div className="system-footer-left">
          <span>
            <span className="system-status-indicator"></span>
            StockFlow 2.0 (Enterprise Edition)
          </span>
          <span>Database: production-live</span>
        </div>
        <div className="system-footer-right">
          <span>UTC</span>
          <span>StockFlow Support & Docs</span>
        </div>
      </footer>

      {/* Inspection Modal */}
      {inspectOrder && (
        <DeliveryDetailModal
          order={inspectOrder}
          onClose={() => setInspectOrder(null)}
          onValidate={handleValidateOrder}
          onCancelOrder={handleCancelOrder}
        />
      )}

      {/* New Order Modal */}
      {showNewModal && (
        <NewDeliveryModal
          onClose={() => setShowNewModal(false)}
          onCreateOrder={handleCreateOrder}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-banner">
          <span className="material-symbols-outlined" style={{ color: '#6ffbbe' }}>info</span>
          <span>{toastMessage}</span>
        </div>
      )}

      <AppFooter />
    </div>
  );
}

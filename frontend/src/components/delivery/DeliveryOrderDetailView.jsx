import React, { useState } from 'react';
import './DeliveryOrderDetail.css';

const MOCK_RECORDS = [
  {
    id: '1',
    reference: 'WH/OUT/0001',
    status: 'ready',
    deliveryAddress: 'Acme Interior, 250 Executive Park Blvd, San Francisco CA',
    scheduleDate: '12/01/2023 14:00:00',
    responsible: 'Mitchell Admin',
    operationType: 'San Francisco: Delivery Orders',
    transfersCount: 1,
    lines: [
      {
        id: '1',
        code: '[DESK001] Desk',
        location: 'WH/Stock',
        demand: '6.00 Units',
        quantity: '6.00 Units',
        hasWarningFlag: true,
        status: 'Partial Stock',
      }
    ],
    messages: [
      {
        id: '1',
        author: 'Automated Stock Control',
        type: 'bot',
        time: '12 minutes ago',
        isAlert: true,
        alertTitle: 'Stage changed from Waiting to Ready.',
        alertDesc: 'Allocation reservation check flagged low stock alert: Requested 6.00 Units, physically on hand 4.00 Units.',
      },
      {
        id: '2',
        author: 'Mitchell Admin',
        type: 'user',
        time: 'Today at 09:41 AM',
        body: 'Delivery order created from Sales Order SO00042. Scheduled for customer Acme Interior.',
      }
    ]
  },
  {
    id: '2',
    reference: 'WH/OUT/0002',
    status: 'ready',
    deliveryAddress: 'Acme Interior, 250 Executive Park Blvd, San Francisco CA',
    scheduleDate: '12/02/2023 11:30:00',
    responsible: 'Mitchell Admin',
    operationType: 'San Francisco: Delivery Orders',
    transfersCount: 1,
    lines: [
      {
        id: '1',
        code: '[WPN002] Wooden Panels',
        location: 'WH/Stock1',
        demand: '8.00 Units',
        quantity: '8.00 Units',
        hasWarningFlag: false,
        status: 'Available',
      }
    ],
    messages: [
      {
        id: '1',
        author: 'Mitchell Admin',
        type: 'user',
        time: 'Yesterday at 04:15 PM',
        body: 'Standard return/vendor transfer packaging initiated.',
      }
    ]
  }
];

export default function DeliveryOrderDetailView({ onBackToList, initialOrder }) {
  const [recordIndex, setRecordIndex] = useState(
    initialOrder?.reference === 'WH/OUT/0002' ? 1 : 0
  );
  
  const currentRecord = MOCK_RECORDS[recordIndex] || MOCK_RECORDS[0];

  const [currentStage, setCurrentStage] = useState(currentRecord.status);
  const [activeTab, setActiveTab] = useState('products');
  
  // Form fields state
  const [deliveryAddress, setDeliveryAddress] = useState(currentRecord.deliveryAddress);
  const [scheduleDate, setScheduleDate] = useState(currentRecord.scheduleDate);
  const [responsible, setResponsible] = useState(currentRecord.responsible);
  const [operationType, setOperationType] = useState(currentRecord.operationType);
  
  // Line items state
  const [lines, setLines] = useState(currentRecord.lines);

  // Chatter state
  const [chatterType, setChatterType] = useState(null); // 'message' | 'note' | 'activity' | null
  const [chatterInput, setChatterInput] = useState('');
  const [messages, setMessages] = useState(currentRecord.messages);

  const [toast, setToast] = useState('');
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const switchRecord = (newIdx) => {
    if (newIdx < 0 || newIdx >= MOCK_RECORDS.length) return;
    setRecordIndex(newIdx);
    const rec = MOCK_RECORDS[newIdx];
    setCurrentStage(rec.status);
    setDeliveryAddress(rec.deliveryAddress);
    setScheduleDate(rec.scheduleDate);
    setResponsible(rec.responsible);
    setOperationType(rec.operationType);
    setLines(rec.lines);
    setMessages(rec.messages);
    showToast(`Loaded ${rec.reference}`);
  };

  const handleValidate = () => {
    setCurrentStage('done');
    showToast(`Delivery Order ${currentRecord.reference} has been Validated & Dispatched!`);
    setMessages(prev => [
      {
        id: Date.now().toString(),
        author: 'Mitchell Admin',
        type: 'user',
        time: 'Just now',
        body: 'Validated transfer. Inventory moves posted to immutable stock ledger.',
      },
      ...prev
    ]);
  };

  const handleCancel = () => {
    setCurrentStage('draft');
    showToast('Delivery order moved to Draft');
  };

  const handleAddLine = () => {
    const newItem = {
      id: Date.now().toString(),
      code: '[STL001] Steel Rods 20mm',
      location: 'WH/Stock1',
      demand: '12.00 Units',
      quantity: '12.00 Units',
      hasWarningFlag: false,
      status: 'Available',
    };
    setLines(prev => [...prev, newItem]);
    showToast('New product line added');
  };

  const handlePostChatter = () => {
    if (!chatterInput.trim()) return;
    setMessages(prev => [
      {
        id: Date.now().toString(),
        author: 'Mitchell Admin',
        type: 'user',
        time: 'Just now',
        body: chatterInput,
      },
      ...prev
    ]);
    setChatterInput('');
    setChatterType(null);
    showToast(chatterType === 'note' ? 'Internal note logged' : 'Message sent to followers');
  };

  return (
    <div className="detail-view-container">
      {/* Top Header */}
      <header className="top-header">
        <div className="header-left">
          <button className="icon-btn" title="StockFlow Apps" type="button" onClick={onBackToList}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>apps</span>
          </button>
          
          <div className="brand-badge" onClick={onBackToList}>
            <span className="brand-flow-logo">
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>inventory_2</span>
              StockFlow
            </span>
            <span className="app-tag">operations</span>
          </div>

          <nav className="nav-links">
            <button className="nav-item" onClick={onBackToList}>
              <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>dashboard</span>
              Dashboard
            </button>
            <button className="nav-item" onClick={onBackToList}>
              <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>call_received</span>
              Receipts
            </button>
            <button className="nav-item active">
              <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>local_shipping</span>
              Delivery Orders
            </button>
            <button className="nav-item" onClick={onBackToList}>
              <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>inventory</span>
              Stock
            </button>
            <button className="nav-item" onClick={onBackToList}>
              <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>receipt_long</span>
              Move History
            </button>
            <button className="nav-item" onClick={onBackToList}>
              <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>settings</span>
              Settings
            </button>
          </nav>
        </div>

        <div className="header-right">
          <button className="icon-btn" title="Conversations" type="button" onClick={() => setChatterType('message')}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chat</span>
          </button>
          <button className="icon-btn" title="Activities" type="button" style={{ position: 'relative' }} onClick={() => setChatterType('activity')}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>schedule</span>
            <span style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#6ffbbe',
            }} />
          </button>
          <div className="user-profile">
            <span className="user-name">Mitchell Admin</span>
            <div className="user-avatar">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person</span>
            </div>
          </div>
        </div>
      </header>

      {/* Control / Breadcrumbs & Stage Bar */}
      <div className="detail-ribbon">
        <div className="detail-ribbon-left">
          <div className="detail-breadcrumbs">
            <span className="detail-crumb-parent" onClick={onBackToList}>Inventory</span>
            <span style={{ color: '#d1c3ca' }}>/</span>
            <button className="back-link-btn" onClick={onBackToList} title="Back to Delivery Orders list">
              <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>arrow_back</span>
              Delivery Orders
            </button>
            <span style={{ color: '#d1c3ca' }}>/</span>
            <span className="detail-crumb-active">{currentRecord.reference}</span>
          </div>
        </div>

        <div className="detail-ribbon-right">
          {/* Pager */}
          <div className="pager-box">
            <span>{recordIndex + 1}/{MOCK_RECORDS.length}</span>
            <button
              className={`pager-btn ${recordIndex > 0 ? 'enabled' : ''}`}
              type="button"
              disabled={recordIndex === 0}
              onClick={() => switchRecord(recordIndex - 1)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_left</span>
            </button>
            <button
              className={`pager-btn ${recordIndex < MOCK_RECORDS.length - 1 ? 'enabled' : ''}`}
              type="button"
              disabled={recordIndex === MOCK_RECORDS.length - 1}
              onClick={() => switchRecord(recordIndex + 1)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Document Action & Stage Chevron Ribbon */}
      <div className="doc-actions-bar">
        <div className="doc-buttons-group">
          {currentStage !== 'done' && (
            <button className="btn-doc-validate" onClick={handleValidate}>
              <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>check</span>
              Validate
            </button>
          )}
          <button className="btn-doc-action" onClick={() => { window.print(); showToast('Printing picking & delivery slip'); }}>
            <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>print</span>
            Print
          </button>
          {currentStage !== 'done' && (
            <button className="btn-doc-action" onClick={handleCancel}>
              Cancel
            </button>
          )}
        </div>

        {/* Chevron Stage Workflow Bar */}
        <div className="chevron-stage-bar">
          <div
            className={`chevron-stage ${currentStage === 'draft' ? 'active' : 'completed'}`}
            onClick={() => setCurrentStage('draft')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>check</span>
            Draft
          </div>
          <div
            className={`chevron-stage ${currentStage === 'waiting' ? 'active' : (currentStage === 'ready' || currentStage === 'done' ? 'completed' : '')}`}
            onClick={() => setCurrentStage('waiting')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>check</span>
            Waiting
          </div>
          <div
            className={`chevron-stage ${currentStage === 'ready' ? 'active' : (currentStage === 'done' ? 'completed' : '')}`}
            onClick={() => setCurrentStage('ready')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>fiber_manual_record</span>
            Ready
          </div>
          <div
            className={`chevron-stage ${currentStage === 'done' ? 'active' : ''}`}
            onClick={() => setCurrentStage('done')}
          >
            Done
          </div>
        </div>
      </div>

      {/* Main Document Card Sheet Container */}
      <div className="doc-sheet-container">
        <div className="doc-sheet-card">
          {/* Top Badges & Smart Stats */}
          <div className="doc-sheet-top">
            <div>
              <div className="doc-badge-pills">
                <span className="doc-type-pill">
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#0284c7' }}></span>
                  Outgoing Delivery
                </span>
                <span className="doc-state-pill">
                  {currentStage.charAt(0).toUpperCase() + currentStage.slice(1)}
                </span>
              </div>
              <h1 className="doc-main-title">{currentRecord.reference}</h1>
            </div>

            {/* Smart Stat Action Buttons */}
            <div className="smart-stats-group">
              <button className="smart-stat-btn" onClick={() => showToast('Viewing associated Operations transfers')}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#714b67' }}>swap_horiz</span>
                <div className="smart-stat-text">
                  <span className="smart-stat-value">{currentRecord.transfersCount} Transfers</span>
                  <span className="smart-stat-label">Operations</span>
                </div>
              </button>

              <button className="smart-stat-btn" onClick={() => showToast('Traceability: Lot/Serial Upstream tracking active')}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#714b67' }}>alt_route</span>
                <div className="smart-stat-text">
                  <span className="smart-stat-value">Traceability</span>
                  <span className="smart-stat-label">Upstream</span>
                </div>
              </button>
            </div>
          </div>

          {/* Form Fields 2-Column Grid */}
          <div className="doc-fields-grid">
            {/* Delivery Address */}
            <div className="doc-field-item">
              <label className="doc-field-label">Delivery Address</label>
              <div className="doc-input-box">
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                />
                <span className="material-symbols-outlined" style={{ color: '#80747a', fontSize: '18px' }}>domain</span>
              </div>
            </div>

            {/* Schedule Date */}
            <div className="doc-field-item">
              <label className="doc-field-label">Schedule Date</label>
              <div className="doc-input-box">
                <input
                  type="text"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                />
                <span className="material-symbols-outlined" style={{ color: '#80747a', fontSize: '18px' }}>calendar_today</span>
              </div>
            </div>

            {/* Responsible */}
            <div className="doc-field-item">
              <label className="doc-field-label">Responsible</label>
              <div className="doc-input-box">
                <div className="responsible-avatar-badge">MA</div>
                <input
                  type="text"
                  value={responsible}
                  onChange={(e) => setResponsible(e.target.value)}
                />
                <span className="material-symbols-outlined" style={{ color: '#80747a', fontSize: '17px' }}>lock</span>
              </div>
            </div>

            {/* Operation Type */}
            <div className="doc-field-item">
              <label className="doc-field-label">Operation Type</label>
              <div className="doc-input-box">
                <span className="material-symbols-outlined" style={{ color: '#714b67', fontSize: '18px' }}>local_shipping</span>
                <select
                  value={operationType}
                  onChange={(e) => setOperationType(e.target.value)}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="San Francisco: Delivery Orders">San Francisco: Delivery Orders</option>
                  <option value="Main Warehouse: Delivery Orders">Main Warehouse: Delivery Orders</option>
                  <option value="Internal Transfers">Internal Transfers</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="doc-tabs-nav">
            <button
              className={`doc-tab-btn ${activeTab === 'products' ? 'active' : ''}`}
              onClick={() => setActiveTab('products')}
            >
              Operations / Products
              <span className="doc-tab-badge">{lines.length}</span>
            </button>
            <button
              className={`doc-tab-btn ${activeTab === 'additional' ? 'active' : ''}`}
              onClick={() => setActiveTab('additional')}
            >
              Additional Info
            </button>
            <button
              className={`doc-tab-btn ${activeTab === 'note' ? 'active' : ''}`}
              onClick={() => setActiveTab('note')}
            >
              Note
            </button>
          </div>

          {/* Tab 1: Operations / Products */}
          {activeTab === 'products' && (
            <div>
              <div className="doc-lines-table-wrapper">
                <table className="doc-lines-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Demand</th>
                      <th>Quantity</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr key={line.id}>
                        <td>
                          <div className="product-cell-container">
                            <div className="product-icon-box">
                              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>inventory_2</span>
                            </div>
                            <div>
                              <div className="product-title-text">{line.code}</div>
                              <div className="product-location-sub">Location: {line.location}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontWeight: 600 }}>{line.demand}</td>
                        <td style={{ fontWeight: 700 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{line.quantity}</span>
                            {line.hasWarningFlag && (
                              <span className="material-symbols-outlined" style={{ color: '#ba1a1a', fontSize: '16px' }} title="Low stock reservation flag">
                                flag
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="partial-stock-badge">
                            {line.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn-add-product-line"
                  onClick={handleAddLine}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>add_circle</span>
                  Add New product
                </button>
                <span style={{ fontSize: '12px', color: '#756f82' }}>
                  {lines.length} line recorded
                </span>
              </div>
            </div>
          )}

          {/* Tab 2: Additional Info */}
          {activeTab === 'additional' && (
            <div className="doc-fields-grid" style={{ padding: '16px 0' }}>
              <div className="doc-field-item">
                <label className="doc-field-label">Shipping Policy</label>
                <div className="doc-input-box">
                  <input type="text" defaultValue="As soon as possible" />
                </div>
              </div>
              <div className="doc-field-item">
                <label className="doc-field-label">Source Document</label>
                <div className="doc-input-box">
                  <input type="text" defaultValue="SO00042" />
                </div>
              </div>
              <div className="doc-field-item">
                <label className="doc-field-label">Tracking Reference</label>
                <div className="doc-input-box">
                  <input type="text" defaultValue="TRK-984214-SF" />
                </div>
              </div>
              <div className="doc-field-item">
                <label className="doc-field-label">Procurement Group</label>
                <div className="doc-input-box">
                  <input type="text" defaultValue="PG/2026/092" />
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Note */}
          {activeTab === 'note' && (
            <div style={{ padding: '10px 0' }}>
              <textarea
                className="form-textarea"
                style={{ width: '100%', height: '100px', border: '1px solid #e8e4ec', borderRadius: '6px', padding: '10px', fontSize: '13.5px' }}
                defaultValue="Customer requested delivery to receiving dock #2. Please verify signature on delivery slip upon drop-off."
              />
            </div>
          )}
        </div>

        {/* Bottom Chatter & Audit Trail Box */}
        <div className="chatter-card">
          <div className="chatter-header">
            <div className="chatter-actions">
              <button
                className="btn-chatter-action"
                onClick={() => setChatterType(chatterType === 'message' ? null : 'message')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '17px', color: '#714b67' }}>mail</span>
                Send message
              </button>
              <button
                className="btn-chatter-action"
                onClick={() => setChatterType(chatterType === 'note' ? null : 'note')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '17px', color: '#714b67' }}>edit_note</span>
                Log note
              </button>
              <button
                className="btn-chatter-action"
                onClick={() => setChatterType(chatterType === 'activity' ? null : 'activity')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '17px', color: '#714b67' }}>schedule</span>
                Activities
              </button>
            </div>

            <div className="chatter-meta">
              <span>
                <span className="material-symbols-outlined" style={{ fontSize: '15px', verticalAlign: 'middle', marginRight: '4px' }}>visibility</span>
                2 Followers
              </span>
              <span>|</span>
              <span className="audit-status-badge">
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#006443' }}></span>
                Audit enabled
              </span>
            </div>
          </div>

          {/* Interactive Composer Box */}
          {chatterType && (
            <div className="chatter-composer">
              <textarea
                className="chatter-textarea"
                placeholder={
                  chatterType === 'message'
                    ? 'Write a message to followers and customer...'
                    : chatterType === 'note'
                    ? 'Log an internal note (only visible to warehouse team)...'
                    : 'Schedule an activity or reminder...'
                }
                value={chatterInput}
                onChange={(e) => setChatterInput(e.target.value)}
                autoFocus
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: '13px' }} onClick={() => setChatterType(null)}>
                  Cancel
                </button>
                <button className="btn-primary" style={{ padding: '5px 16px', fontSize: '13px' }} onClick={handlePostChatter}>
                  {chatterType === 'note' ? 'Log Note' : 'Send'}
                </button>
              </div>
            </div>
          )}

          {/* Chatter Feed */}
          <div className="chatter-feed">
            {messages.map((msg) => (
              <div key={msg.id} className="feed-item">
                <div className={`feed-avatar ${msg.type}`}>
                  {msg.type === 'bot' ? (
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>smart_toy</span>
                  ) : (
                    'MA'
                  )}
                </div>
                <div className="feed-content">
                  <div className="feed-meta-row">
                    <span className="feed-author">{msg.author}</span>
                    <span className="feed-time">{msg.time}</span>
                  </div>

                  {msg.isAlert ? (
                    <div className="bot-alert-banner">
                      <div className="bot-alert-title">
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>warning</span>
                        {msg.alertTitle}
                      </div>
                      <div className="bot-alert-desc">
                        {msg.alertDesc}
                      </div>
                    </div>
                  ) : (
                    <div className="feed-bubble">
                      {msg.body}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Footer */}
      <footer className="system-footer">
        <div className="system-footer-left">
          <span>
            <span className="system-status-indicator"></span>
            StockFlow 2.0+e (Enterprise Edition)
          </span>
          <span>Database: production-live</span>
          <span>UTC (+00:00)</span>
        </div>
        <div className="system-footer-right">
          <span style={{ cursor: 'pointer' }} onClick={() => showToast('Opening documentation')}>Documentation</span>
          <span style={{ cursor: 'pointer' }} onClick={() => showToast('Contacting support')}>Support</span>
        </div>
      </footer>

      {/* Toast */}
      {toast && (
        <div className="toast-banner">
          <span className="material-symbols-outlined" style={{ color: '#6ffbbe' }}>info</span>
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}

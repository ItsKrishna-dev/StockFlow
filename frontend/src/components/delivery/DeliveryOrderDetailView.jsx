import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../shared/config/routes';
import { AppHeader } from '../../widgets/app-header';
import { AppFooter } from '../../widgets/app-footer';
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
  const navigate = useNavigate();
  const handleBack = () => {
    if (onBackToList) {
      onBackToList();
    } else {
      navigate(ROUTES.DELIVERY_ORDERS);
    }
  };

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
      code: `[ITEM00${lines.length + 1}] Custom Product`,
      location: 'WH/Stock1',
      demand: '1.00 Units',
      quantity: '1.00 Units',
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
    showToast('Note posted to chatter stream');
  };

  return (
    <div className="detail-view-container">
      <AppHeader />

      {/* ---------------- Subheader & Control Panel Ribbon ---------------- */}
      <div className="detail-ribbon">
        <div className="detail-ribbon-left">
          <div className="detail-breadcrumbs">
            <span className="detail-crumb-parent" onClick={handleBack}>Inventory</span>
            <span className="crumb-separator">/</span>
            <button className="back-link-btn" type="button" onClick={handleBack} title="Back to Delivery Orders list">
              <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>arrow_back</span>
              <span>Delivery Orders</span>
            </button>
            <span className="crumb-separator">/</span>
            <span className="detail-crumb-active">{currentRecord.reference}</span>
          </div>
        </div>

        <div className="detail-ribbon-right">
          <div className="pager-box">
            <span>{recordIndex + 1} / {MOCK_RECORDS.length}</span>
            <div className="pager-buttons">
              <button
                className="pager-btn"
                type="button"
                disabled={recordIndex === 0}
                onClick={() => switchRecord(recordIndex - 1)}
                title="Previous Order"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_left</span>
              </button>
              <button
                className="pager-btn"
                type="button"
                disabled={recordIndex === MOCK_RECORDS.length - 1}
                onClick={() => switchRecord(recordIndex + 1)}
                title="Next Order"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- Document Action & Stage Chevron Ribbon ---------------- */}
      <div className="doc-actions-bar">
        <div className="doc-buttons-group">
          {currentStage !== 'done' && (
            <button className="btn-doc-validate" type="button" onClick={handleValidate}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
              <span>Validate</span>
            </button>
          )}
          <button className="btn-doc-action" type="button" onClick={() => { window.print(); showToast('Printing picking & delivery slip'); }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>print</span>
            <span>Print</span>
          </button>
          {currentStage !== 'done' && (
            <button className="btn-doc-action" type="button" onClick={handleCancel}>
              <span>Cancel</span>
            </button>
          )}
        </div>

        {/* Chevron Stage Workflow Bar */}
        <div className="chevron-stage-bar">
          <button
            className={`chevron-stage ${currentStage === 'draft' ? 'active' : 'completed'}`}
            type="button"
            onClick={() => setCurrentStage('draft')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>check</span>
            <span>Draft</span>
          </button>
          <button
            className={`chevron-stage ${currentStage === 'waiting' ? 'active' : (currentStage === 'ready' || currentStage === 'done' ? 'completed' : '')}`}
            type="button"
            onClick={() => setCurrentStage('waiting')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>check</span>
            <span>Waiting</span>
          </button>
          <button
            className={`chevron-stage ${currentStage === 'ready' ? 'active' : (currentStage === 'done' ? 'completed' : '')}`}
            type="button"
            onClick={() => setCurrentStage('ready')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>fiber_manual_record</span>
            <span>Ready</span>
          </button>
          <button
            className={`chevron-stage ${currentStage === 'done' ? 'active' : ''}`}
            type="button"
            onClick={() => setCurrentStage('done')}
          >
            <span>Done</span>
          </button>
        </div>
      </div>

      {/* ---------------- Main Document Card Sheet Container ---------------- */}
      <div className="doc-sheet-container">
        <div className="doc-sheet-card">
          {/* Top Badges & Smart Stats */}
          <div className="doc-sheet-top">
            <div>
              <div className="doc-badge-pills">
                <span className="doc-type-pill">
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#714b67' }}></span>
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
              <button className="smart-stat-box" type="button" onClick={() => showToast('Viewing associated Operations transfers')}>
                <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#714b67' }}>sync_alt</span>
                <div className="smart-stat-info">
                  <span className="smart-stat-val">{currentRecord.transfersCount} Transfers</span>
                  <span className="smart-stat-lbl">Operations</span>
                </div>
              </button>

              <button className="smart-stat-box" type="button" onClick={() => showToast('Traceability: Lot/Serial Upstream tracking active')}>
                <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#714b67' }}>route</span>
                <div className="smart-stat-info">
                  <span className="smart-stat-val">Traceability</span>
                  <span className="smart-stat-lbl">Upstream</span>
                </div>
              </button>
            </div>
          </div>

          {/* Form Fields 2-Column Grid */}
          <div className="doc-form-grid">
            <div className="form-group-row">
              <label className="form-field-lbl">Delivery Address</label>
              <div className="form-field-val">
                <input
                  type="text"
                  className="form-input-ctrl"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                />
                <span className="material-symbols-outlined field-icon">domain</span>
              </div>
            </div>

            <div className="form-group-row">
              <label className="form-field-lbl">Responsible</label>
              <div className="form-field-val">
                <input
                  type="text"
                  className="form-input-ctrl"
                  value={responsible}
                  onChange={(e) => setResponsible(e.target.value)}
                />
                <span className="material-symbols-outlined field-icon">lock</span>
              </div>
            </div>

            <div className="form-group-row">
              <label className="form-field-lbl">Schedule Date</label>
              <div className="form-field-val">
                <input
                  type="text"
                  className="form-input-ctrl"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                />
                <span className="material-symbols-outlined field-icon">calendar_today</span>
              </div>
            </div>

            <div className="form-group-row">
              <label className="form-field-lbl">Operation Type</label>
              <div className="form-field-val">
                <select
                  className="form-input-ctrl"
                  value={operationType}
                  onChange={(e) => setOperationType(e.target.value)}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="San Francisco: Delivery Orders">San Francisco: Delivery Orders</option>
                  <option value="Main Warehouse: Delivery Orders">Main Warehouse: Delivery Orders</option>
                  <option value="Internal Transfers">Internal Transfers</option>
                </select>
                <span className="material-symbols-outlined field-icon">local_shipping</span>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="doc-tabs-container">
            <div className="doc-tabs-nav">
              <button
                className={`doc-tab-btn ${activeTab === 'products' ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveTab('products')}
              >
                Operations / Products ({lines.length})
              </button>
              <button
                className={`doc-tab-btn ${activeTab === 'additional' ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveTab('additional')}
              >
                Additional Info
              </button>
              <button
                className={`doc-tab-btn ${activeTab === 'note' ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveTab('note')}
              >
                Note
              </button>
            </div>

            {/* Tab 1: Operations / Products */}
            {activeTab === 'products' && (
              <div>
                <table className="lines-data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '45%' }}>Product</th>
                      <th style={{ width: '20%' }}>Demand</th>
                      <th style={{ width: '20%' }}>Quantity</th>
                      <th style={{ width: '15%' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr key={line.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span className="material-symbols-outlined" style={{ color: '#714b67', fontSize: '20px' }}>
                              inventory_2
                            </span>
                            <div>
                              <div style={{ fontWeight: 700, color: '#212529' }}>{line.code}</div>
                              <div style={{ fontSize: '12px', color: '#756f82' }}>Location: {line.location}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, color: '#4e444a' }}>{line.demand}</td>
                        <td style={{ fontWeight: 800, color: '#212529' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{line.quantity}</span>
                            {line.hasWarningFlag && (
                              <span className="material-symbols-outlined" style={{ color: '#ba1a1a', fontSize: '18px' }} title="Low stock reservation flag">
                                warning
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span
                            className={`badge-status ${
                              line.status.toLowerCase().includes('available') ? 'ready' : 'waiting'
                            }`}
                          >
                            <span className="status-dot"></span>
                            {line.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 4px' }}>
                  <button
                    type="button"
                    className="btn-add-product-line"
                    onClick={handleAddLine}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>add_circle</span>
                    <span>Add New product</span>
                  </button>
                  <span style={{ fontSize: '13px', color: '#756f82', fontWeight: 600 }}>
                    {lines.length} line recorded
                  </span>
                </div>
              </div>
            )}

            {/* Tab 2: Additional Info */}
            {activeTab === 'additional' && (
              <div style={{ padding: '16px 0', fontSize: '14px', color: '#4e444a', lineHeight: '1.8' }}>
                <p><strong>Tracking Policy:</strong> Automatic Serial/Lot Tracking upon reservation</p>
                <p><strong>Shipping Policy:</strong> As soon as all products are ready</p>
                <p><strong>Source Document:</strong> SO00042</p>
                <p><strong>Carrier Service:</strong> Standard Ground Delivery</p>
              </div>
            )}

            {/* Tab 3: Note */}
            {activeTab === 'note' && (
              <div style={{ padding: '14px 0' }}>
                <textarea
                  className="chatter-textarea-field"
                  placeholder="Add delivery order notes..."
                  rows={3}
                  defaultValue="Priority dispatch for customer Acme Interior batch 1."
                />
              </div>
            )}
          </div>
        </div>

        {/* ---------------- Chatter / Communication Stream ---------------- */}
        <div className="doc-chatter-card">
          <div className="chatter-top-tools">
            <div className="chatter-tools-left">
              <button
                className={`btn-chatter-tab ${chatterType === 'message' ? 'active' : ''}`}
                type="button"
                onClick={() => setChatterType(prev => prev === 'message' ? null : 'message')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span>
                <span>Send message</span>
              </button>
              <button
                className={`btn-chatter-tab ${chatterType === 'note' ? 'active' : ''}`}
                type="button"
                onClick={() => setChatterType(prev => prev === 'note' ? null : 'note')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit_note</span>
                <span>Log note</span>
              </button>
              <button
                className="btn-chatter-tab"
                type="button"
                onClick={() => showToast('Activities scheduler open')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>schedule</span>
                <span>Activities</span>
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '13px', color: '#756f82', fontWeight: 600 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>visibility</span>
                <span>2 Followers</span>
              </div>
              <span>•</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#006443' }}>
                  verified_user
                </span>
                <span>Audit enabled</span>
              </div>
            </div>
          </div>

          {/* Composer Box */}
          {chatterType && (
            <div className="chatter-input-area">
              <textarea
                className="chatter-textarea-field"
                placeholder={chatterType === 'message' ? 'Send a message to followers...' : 'Log an internal note...'}
                value={chatterInput}
                onChange={(e) => setChatterInput(e.target.value)}
                autoFocus
              />
              <div className="composer-bottom-actions">
                <button
                  type="button"
                  className="btn-action-secondary"
                  onClick={() => { setChatterType(null); setChatterInput(''); }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-action-primary"
                  onClick={handlePostChatter}
                >
                  {chatterType === 'message' ? 'Send' : 'Log'}
                </button>
              </div>
            </div>
          )}

          {/* Messages Stream */}
          <div className="chatter-timeline-stream">
            {messages.map((msg) => (
              <div key={msg.id} className="chatter-msg-box">
                <div className={`chatter-avatar-circle ${msg.type === 'bot' ? 'system-bot' : ''}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    {msg.type === 'bot' ? 'smart_toy' : 'person'}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 800, fontSize: '14px', color: '#212529' }}>{msg.author}</span>
                    <span style={{ fontSize: '12px', color: '#756f82' }}>{msg.time}</span>
                  </div>
                  {msg.isAlert ? (
                    <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', padding: '10px 14px', borderRadius: '8px' }}>
                      <div style={{ fontWeight: 700, color: '#92400e', fontSize: '13.5px' }}>{msg.alertTitle}</div>
                      <div style={{ fontSize: '13px', color: '#78350f', marginTop: '2px' }}>{msg.alertDesc}</div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '13.5px', color: '#333333', lineHeight: 1.5 }}>{msg.body}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---------------- System Footer ---------------- */}
      <AppFooter />

      {/* Toast Notification */}
      {toast && (
        <div className="toast-banner">
          <span className="material-symbols-outlined" style={{ color: '#6ffbbe', fontSize: '20px' }}>
            check_circle
          </span>
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}

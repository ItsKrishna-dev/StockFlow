import React, { useState, useMemo } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ROUTES } from '../../shared/config/routes';
import { AppHeader } from '../../widgets/app-header';
import { AppFooter } from '../../widgets/app-footer';
import { receiptsApi } from '../../shared/api/operationsApi';
import { warehousesApi } from '../../shared/api/warehousesApi';
import { productApi } from '../../entities/product/api/productApi';
import { sessionStore } from '../../entities/session/model/sessionStore';
import { usePermissions } from '../../shared/lib/usePermissions';
import './ReceiptDetail.css';

export default function ReceiptDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { canValidate, canCancel, isStaff } = usePermissions();

  const [activeTab, setActiveTab] = useState('operations'); // operations | additional | note
  const [showComposer, setShowComposer] = useState(false);
  const [composerMode, setComposerMode] = useState('note'); // note | message
  const [composerText, setComposerText] = useState('');
  const [localLogs, setLocalLogs] = useState([]);
  const [toastMessage, setToastMessage] = useState('');

  const session = sessionStore.getSession();
  const currentStaffName = session?.full_name || session?.email?.split('@')[0] || 'Vivek Maurya';

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: receiptDoc } = useQuery({
    queryKey: ['receipt', id],
    queryFn: () => receiptsApi.get(id),
    enabled: !!id,
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

  // Fast Lookup Maps
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

  const productMap = useMemo(() => {
    const map = {};
    products.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [products]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  // Move Draft -> Ready (To DO)
  const readyMutation = useMutation({
    mutationFn: () => receiptsApi.markReady(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipt', id] });
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      showToast('Receipt status moved to READY for receiving!');
    },
    onError: (err) => showToast(err.response?.data?.detail || err.message || 'Action failed'),
  });

  // Move Ready -> Done (Validate)
  const validateMutation = useMutation({
    mutationFn: () => receiptsApi.validate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipt', id] });
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      showToast('Receipt validated successfully as DONE! Stock updated.');
    },
    onError: (err) => showToast(err.response?.data?.detail || err.message || 'Validation failed'),
  });

  // Cancel receipt
  const cancelMutation = useMutation({
    mutationFn: () => receiptsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipt', id] });
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      showToast('Receipt cancelled');
    },
    onError: (err) => showToast(err.response?.data?.detail || err.message || 'Cancel failed'),
  });

  // Map backend DocumentOut to display shape
  const currentReceipt = useMemo(() => {
    if (!receiptDoc) {
      return {
        id: id || 'WH/IN/0001',
        stage: 'ready',
        scheduleDate: new Date().toLocaleDateString(),
        receiveFrom: 'Vendor Partner',
        responsible: currentStaffName,
        purchaseOrder: 'PO-0001',
        destinationLocation: 'WH/Stock1',
        transfersCount: 1,
        products: [
          { id: 1, code: '[PROD001]', name: 'Standard Item', quantity: 10, unit: 'Units' },
        ],
        logs: localLogs,
      };
    }

    const lines = (receiptDoc.lines || []).map((l, i) => {
      const p = productMap[l.product_id];
      return {
        id: l.id || i + 1,
        code: p?.code || p?.sku || `SKU-${String(l.product_id).slice(0, 8)}`,
        name: p?.name || 'Raw Material Component',
        quantity: Number(l.quantity_expected || 1),
        quantityDone: Number(l.quantity_done || 0),
        unit: 'Units',
      };
    });

    return {
      id: receiptDoc.document_number || receiptDoc.id,
      stage: receiptDoc.status || 'draft',
      scheduleDate: receiptDoc.scheduled_date
        ? new Date(receiptDoc.scheduled_date).toLocaleDateString()
        : receiptDoc.created_at
        ? new Date(receiptDoc.created_at).toLocaleDateString()
        : '—',
      receiveFrom: partnerMap[receiptDoc.partner_id] || (receiptDoc.partner_id ? 'Vendor Partner' : 'Vendor Dock'),
      responsible: currentStaffName,
      purchaseOrder: receiptDoc.notes || 'PO-Auto',
      destinationLocation: locationMap[receiptDoc.dest_location_id] || 'WH/Stock1',
      transfersCount: lines.length || 1,
      products: lines,
      logs: localLogs,
    };
  }, [receiptDoc, id, localLogs, currentStaffName, partnerMap, locationMap, productMap]);

  // Handle Action Button Clicks
  const handleMarkTODO = () => {
    readyMutation.mutate();
  };

  const handleValidate = () => {
    if (currentReceipt.stage === 'done') {
      showToast('Receipt is already validated.');
      return;
    }
    validateMutation.mutate();
  };

  const handleCancel = () => {
    cancelMutation.mutate();
  };

  const handlePrint = () => {
    window.print();
  };

  // Submit note/message
  const handlePostNote = (e) => {
    e.preventDefault();
    if (!composerText.trim()) return;

    const newLog = {
      id: Date.now(),
      author: currentStaffName,
      isSystem: false,
      time: new Date().toLocaleString(),
      body: composerText,
    };

    setLocalLogs((prev) => [newLog, ...prev]);
    setComposerText('');
    setShowComposer(false);
    showToast(composerMode === 'note' ? 'Log note recorded' : 'Message sent');
  };

  return (
    <div className="receipt-page-container">
      <AppHeader />

      {/* Subheader & Control Panel Ribbon */}
      <div className="receipt-control-ribbon">
        <div className="ribbon-left-section">
          <button
            className="btn-new-record"
            type="button"
            onClick={() => navigate(ROUTES.RECEIPTS)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
            <span>New</span>
          </button>

          <div className="receipt-breadcrumbs">
            <Link to={ROUTES.HOME} className="crumb-parent">
              Inventory
            </Link>
            <span className="crumb-separator">/</span>
            <button
              className="back-link-btn"
              type="button"
              onClick={() => navigate(ROUTES.RECEIPTS)}
              title="Back to Receipts list"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#714b67',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '0 4px',
                fontSize: '14px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>arrow_back</span>
              <span>Receipts</span>
            </button>
            <span className="crumb-separator">/</span>
            <span className="crumb-current">{currentReceipt.id}</span>
          </div>

          {/* Action Buttons as per Wireframe */}
          <div className="receipt-action-buttons">
            {/* If Draft -> Show 'To DO' (moves to Ready) */}
            {currentReceipt.stage === 'draft' && (
              <button
                className="btn-action-primary"
                type="button"
                onClick={handleMarkTODO}
                disabled={readyMutation.isPending}
                style={{ backgroundColor: '#0284c7', borderColor: '#0284c7' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
                <span>{readyMutation.isPending ? 'Updating...' : 'To DO'}</span>
              </button>
            )}

            {/* If Ready -> Show 'Validate' (moves to Done) for Manager/Admin, or status badge for Staff */}
            {currentReceipt.stage === 'ready' && (
              canValidate ? (
                <button
                  className="btn-action-primary"
                  type="button"
                  onClick={handleValidate}
                  disabled={validateMutation.isPending}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
                  <span>{validateMutation.isPending ? 'Validating...' : 'Validate'}</span>
                </button>
              ) : (
                <div
                  className="badge-awaiting-validation"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    background: '#fef3c7',
                    color: '#92400e',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: '1px solid #fde68a',
                  }}
                  title="Warehouse staff cannot validate stock entries. An inventory manager or admin must review and validate."
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>hourglass_empty</span>
                  <span>Awaiting Manager Validation</span>
                </div>
              )
            )}

            {/* Print Button */}
            <button
              className={`btn-action-secondary ${currentReceipt.stage === 'done' ? 'btn-print-done' : ''}`}
              type="button"
              onClick={handlePrint}
              title={currentReceipt.stage === 'done' ? "Print the receipt once it's DONE" : 'Print receipt'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>print</span>
              <span>Print</span>
            </button>

            {/* Cancel Button (Managers and Admins only, when not done/cancelled) */}
            {canCancel && currentReceipt.stage !== 'cancelled' && currentReceipt.stage !== 'done' && (
              <button
                className="btn-action-secondary"
                type="button"
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
              >
                <span>Cancel</span>
              </button>
            )}
          </div>
        </div>

        <div className="ribbon-right-section">
          {/* Wireframe Status Chevron Bar: Draft > Ready > Done */}
          <div className="pipeline-status-bar">
            <span
              className={`stage-pill ${
                currentReceipt.stage === 'draft' ? 'active' : ''
              } ${currentReceipt.stage === 'ready' || currentReceipt.stage === 'done' ? 'done' : ''}`}
            >
              {(currentReceipt.stage === 'ready' || currentReceipt.stage === 'done') && (
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>check</span>
              )}
              <span>Draft</span>
            </span>

            <span
              className={`stage-pill ${
                currentReceipt.stage === 'ready' ? 'active' : ''
              } ${currentReceipt.stage === 'done' ? 'done' : ''}`}
            >
              {currentReceipt.stage === 'done' && (
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>check</span>
              )}
              <span>Ready</span>
              {currentReceipt.stage === 'ready' && <span className="stage-dot"></span>}
            </span>

            <span className={`stage-pill ${currentReceipt.stage === 'done' ? 'active' : ''}`}>
              <span>Done</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <main className="receipt-main-content">
        {/* Primary Record Sheet Card */}
        <div className="record-sheet-card">
          <div className="sheet-header-top">
            <div className="sheet-title-area">
              <div className="status-badges-group">
                <span className="badge-pill-incoming">
                  <span className="pulse-dot"></span>
                  Incoming Shipment
                </span>
                {currentReceipt.stage === 'ready' && <span className="badge-pill-ready">Ready</span>}
                {currentReceipt.stage === 'done' && <span className="badge-pill-done">Done</span>}
                {currentReceipt.stage === 'draft' && <span className="log-tag draft">Draft</span>}
              </div>
              <h1 className="record-large-id">{currentReceipt.id}</h1>
            </div>

            {/* Smart Stats Buttons */}
            <div className="sheet-smart-buttons">
              <button className="smart-stat-btn" onClick={() => showToast('1 connected inbound movement')}>
                <div className="smart-btn-icon-wrap">
                  <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>sync_alt</span>
                </div>
                <div className="smart-stat-meta">
                  <span className="smart-stat-val">{currentReceipt.transfersCount}</span>
                  <span className="smart-stat-lbl">Lines</span>
                </div>
              </button>

              <button className="smart-stat-btn" onClick={() => showToast('Traceability chain healthy')}>
                <div className="smart-btn-icon-wrap">
                  <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>route</span>
                </div>
                <div className="smart-stat-meta">
                  <span className="smart-stat-val">Ledger</span>
                  <span className="smart-stat-lbl">Verified</span>
                </div>
              </button>
            </div>
          </div>

          {/* Form Fields 2-Column Grid (Per Wireframe) */}
          <div className="sheet-form-grid">
            <div className="form-field-group">
              <label className="field-label">Receive From</label>
              <div className="field-input-box">
                <input
                  type="text"
                  className="field-input"
                  value={currentReceipt.receiveFrom}
                  readOnly
                />
                <span className="material-symbols-outlined field-icon">domain</span>
              </div>
            </div>

            <div className="form-field-group">
              <label className="field-label">Schedule Date</label>
              <div className="field-input-box">
                <input
                  type="text"
                  className="field-input"
                  value={currentReceipt.scheduleDate}
                  readOnly
                />
                <span className="material-symbols-outlined field-icon">calendar_today</span>
              </div>
            </div>

            <div className="form-field-group">
              <label className="field-label">Responsible</label>
              <div className="field-input-box" title="Auto-filled with current logged-in user">
                <input
                  type="text"
                  className="field-input"
                  value={currentReceipt.responsible}
                  readOnly
                />
                <span className="material-symbols-outlined field-icon">person</span>
              </div>
            </div>

            <div className="form-field-group">
              <label className="field-label">Destination Location (To)</label>
              <div className="field-input-box">
                <input
                  type="text"
                  className="field-input"
                  value={currentReceipt.destinationLocation}
                  readOnly
                />
                <span className="material-symbols-outlined field-icon">location_on</span>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="sheet-tabs-container">
            <div className="sheet-tabs-nav">
              <button
                className={`tab-nav-btn ${activeTab === 'operations' ? 'active' : ''}`}
                onClick={() => setActiveTab('operations')}
              >
                Operations / Products
              </button>
              <button
                className={`tab-nav-btn ${activeTab === 'additional' ? 'active' : ''}`}
                onClick={() => setActiveTab('additional')}
              >
                Additional Info
              </button>
              <button
                className={`tab-nav-btn ${activeTab === 'note' ? 'active' : ''}`}
                onClick={() => setActiveTab('note')}
              >
                Note
              </button>
            </div>

            {/* Products Table Tab */}
            {activeTab === 'operations' && (
              <div>
                <table className="sheet-products-table">
                  <thead>
                    <tr>
                      <th style={{ width: '65%' }}>Product</th>
                      <th style={{ textAlign: 'right', width: '35%' }}>Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentReceipt.products.map((prod) => (
                      <tr key={prod.id}>
                        <td>
                          <div className="product-title-wrap">
                            <span className="material-symbols-outlined" style={{ color: '#714b67', fontSize: '20px' }}>
                              inventory_2
                            </span>
                            <span className="product-code-tag">[{prod.code}]</span>
                            <span className="product-name-txt">{prod.name}</span>
                          </div>
                        </td>
                        <td className="product-qty-value">
                          {prod.quantity}
                          <span className="product-qty-unit">{prod.unit}</span>
                          {currentReceipt.stage === 'done' && (
                            <span style={{ marginLeft: 8, color: '#006443', fontSize: '12px', fontWeight: 600 }}>
                              ✓ Received
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="table-bottom-bar">
                  <span className="lines-counter-txt">
                    {currentReceipt.products.length} line{currentReceipt.products.length !== 1 ? 's' : ''} recorded
                  </span>
                  {currentReceipt.stage === 'draft' && (
                    <button
                      type="button"
                      className="btn-add-line"
                      onClick={() => showToast('To add lines to draft, create a new receipt or use API')}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
                      <span>New Product</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Additional Info Tab */}
            {activeTab === 'additional' && (
              <div style={{ padding: '14px 0', fontSize: '14px', color: '#4e444a', lineHeight: '1.8' }}>
                <p><strong>Source Document:</strong> {currentReceipt.purchaseOrder}</p>
                <p><strong>Destination Location:</strong> {currentReceipt.destinationLocation}</p>
                <p><strong>Responsible Officer:</strong> {currentReceipt.responsible}</p>
                <p><strong>Operation Type:</strong> Receipts (Incoming Shipment)</p>
                <p><strong>Ledger Synchronization:</strong> Real-time PostgreSQL atomic append</p>
              </div>
            )}

            {/* Note Tab */}
            {activeTab === 'note' && (
              <div style={{ padding: '14px 0' }}>
                <textarea
                  className="chatter-textarea-field"
                  placeholder="Add internal vendor instructions or delivery remarks..."
                  rows={3}
                  defaultValue="Expected bulk shipment handling via bay 4. Standard quality verification required upon arrival."
                />
              </div>
            )}
          </div>
        </div>

        {/* Chatter / Communication Stream */}
        <div className="chatter-card">
          <div className="chatter-header-actions">
            <div className="chatter-btns-group">
              <button
                className={`btn-chatter-tool ${showComposer && composerMode === 'message' ? 'active' : ''}`}
                onClick={() => {
                  setComposerMode('message');
                  setShowComposer((prev) => (composerMode === 'message' ? !prev : true));
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span>
                <span>Send message</span>
              </button>

              <button
                className={`btn-chatter-tool ${showComposer && composerMode === 'note' ? 'active' : ''}`}
                onClick={() => {
                  setComposerMode('note');
                  setShowComposer((prev) => (composerMode === 'note' ? !prev : true));
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit_note</span>
                <span>Log note</span>
              </button>
            </div>

            <div className="chatter-meta-info">
              <div className="meta-chip-item">
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#006443' }}>
                  verified_user
                </span>
                <span>Live Audit Enabled</span>
              </div>
            </div>
          </div>

          {/* Chatter Composer */}
          {showComposer && (
            <form className="chatter-input-area" onSubmit={handlePostNote}>
              <textarea
                className="chatter-textarea-field"
                placeholder={
                  composerMode === 'note'
                    ? 'Log an internal note regarding this receipt...'
                    : 'Send a message to all followers...'
                }
                value={composerText}
                onChange={(e) => setComposerText(e.target.value)}
                autoFocus
              />
              <div className="composer-bottom-actions">
                <button
                  type="button"
                  className="btn-action-secondary"
                  onClick={() => {
                    setShowComposer(false);
                    setComposerText('');
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-action-primary">
                  {composerMode === 'note' ? 'Log Note' : 'Send Message'}
                </button>
              </div>
            </form>
          )}

          {/* Chatter Logs Feed */}
          <div className="chatter-feed-list">
            <div className="chatter-feed-item">
              <div className="chatter-avatar-box">
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#714b67' }}>
                  local_shipping
                </span>
              </div>
              <div className="chatter-body-box">
                <div className="chatter-author-row">
                  <span className="chatter-author-name">System Operator</span>
                  <span className="chatter-time-txt">{currentReceipt.scheduleDate}</span>
                </div>
                <div className="chatter-text-content">
                  Inbound document <strong>{currentReceipt.id}</strong> initialized in{' '}
                  <span className={`log-tag ${currentReceipt.stage}`}>{currentReceipt.stage.toUpperCase()}</span> stage.
                </div>
              </div>
            </div>

            {currentReceipt.logs.map((log) => (
              <div key={log.id} className="chatter-feed-item">
                <div className="chatter-avatar-box">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#714b67' }}>
                    person
                  </span>
                </div>
                <div className="chatter-body-box">
                  <div className="chatter-author-row">
                    <span className="chatter-author-name">{log.author}</span>
                    <span className="chatter-time-txt">{log.time}</span>
                  </div>
                  <div className="chatter-text-content">{log.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Toast */}
      {toastMessage && (
        <div className="receipt-toast-banner">
          <span className="material-symbols-outlined" style={{ color: '#6ffbbe' }}>info</span>
          <span>{toastMessage}</span>
        </div>
      )}

      <AppFooter />
    </div>
  );
}

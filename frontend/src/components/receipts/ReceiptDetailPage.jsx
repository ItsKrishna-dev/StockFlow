import React, { useState, useMemo } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ROUTES } from '../../shared/config/routes';
import { AppHeader } from '../../widgets/app-header';
import { AppFooter } from '../../widgets/app-footer';
import { receiptsApi } from '../../shared/api/operationsApi';
import './ReceiptDetail.css';

export default function ReceiptDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('operations'); // operations | additional | note
  const [showComposer, setShowComposer] = useState(false);
  const [composerMode, setComposerMode] = useState('note'); // note | message
  const [composerText, setComposerText] = useState('');
  const [localLogs, setLocalLogs] = useState([]);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const { data: receiptDoc } = useQuery({
    queryKey: ['receipt', id],
    queryFn: () => receiptsApi.get(id),
    enabled: !!id,
  });

  const validateMutation = useMutation({
    mutationFn: () => receiptsApi.validate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipt', id] });
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      showToast('Receipt validated successfully as DONE!');
    },
    onError: (err) => showToast(err.message || 'Validation failed'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => receiptsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipt', id] });
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      showToast('Receipt cancelled');
    },
    onError: (err) => showToast(err.message || 'Cancel failed'),
  });

  // Map backend DocumentOut to the view shape
  const currentReceipt = useMemo(() => {
    if (!receiptDoc) {
      return {
        id: id || 'WH/IN/0001',
        stage: 'ready',
        scheduleDate: new Date().toLocaleDateString(),
        receiveFrom: 'Vendor Partner',
        responsible: 'Mitchell Admin',
        purchaseOrder: 'PO-0001',
        destinationLocation: 'WH/Stock',
        transfersCount: 1,
        products: [
          { id: 1, code: '[PROD001]', name: 'Standard Item', quantity: 10, unit: 'Units' },
        ],
        logs: localLogs,
      };
    }
    return {
      id: receiptDoc.document_number || receiptDoc.id,
      stage: receiptDoc.status || 'draft',
      scheduleDate: receiptDoc.created_at ? new Date(receiptDoc.created_at).toLocaleString() : '—',
      receiveFrom: receiptDoc.partner_id || 'Vendor Partner',
      responsible: 'Mitchell Admin',
      purchaseOrder: receiptDoc.notes || 'PO-Auto',
      destinationLocation: receiptDoc.dest_location_id || 'WH/Stock',
      transfersCount: receiptDoc.lines?.length || 1,
      products: (receiptDoc.lines || []).map((l, i) => ({
        id: l.id || i + 1,
        code: l.product_id,
        name: l.product_id,
        quantity: Number(l.quantity_expected || 1),
        unit: l.uom_id || 'Units',
      })),
      logs: localLogs,
    };
  }, [receiptDoc, id, localLogs]);

  // Validate handler — calls real API
  const handleValidate = () => {
    if (currentReceipt.stage === 'done') {
      showToast('Receipt is already validated.');
      return;
    }
    validateMutation.mutate();
  };

  // Cancel handler — calls real API
  const handleCancel = () => {
    cancelMutation.mutate();
  };

  // Submit note/message
  const handlePostNote = (e) => {
    e.preventDefault();
    if (!composerText.trim()) return;

    const newLog = {
      id: Date.now(),
      author: 'Mitchell Admin',
      isSystem: false,
      time: new Date().toLocaleString(),
      body: composerText,
    };

    setLocalLogs(prev => [newLog, ...prev]);
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
            onClick={() => {
              navigate(ROUTES.RECEIPTS);
              showToast('Creating new receipt');
            }}
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

          <div className="receipt-action-buttons">
            {currentReceipt.stage !== 'done' && (
              <button className="btn-action-primary" type="button" onClick={handleValidate}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
                <span>Validate</span>
              </button>
            )}
            <button className="btn-action-secondary" type="button" onClick={() => window.print()}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>print</span>
              <span>Print</span>
            </button>
            {currentReceipt.stage !== 'cancelled' && currentReceipt.stage !== 'done' && (
              <button className="btn-action-secondary" type="button" onClick={handleCancel}>
                <span>Cancel</span>
              </button>
            )}
          </div>
        </div>

        <div className="ribbon-right-section">
          {/* Pipeline Stage Status */}
          <div className="pipeline-status-bar">
            <span className={`stage-pill ${currentReceipt.stage === 'draft' ? 'active' : ''} ${currentReceipt.stage !== 'draft' ? 'done' : ''}`}>
              {currentReceipt.stage !== 'draft' && (
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>check</span>
              )}
              <span>Draft</span>
            </span>

            <span className={`stage-pill ${currentReceipt.stage === 'ready' ? 'active' : ''} ${currentReceipt.stage === 'done' ? 'done' : ''}`}>
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
              <button className="smart-stat-btn" onClick={() => showToast('1 connected transfer')}>
                <div className="smart-btn-icon-wrap">
                  <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>sync_alt</span>
                </div>
                <div className="smart-stat-meta">
                  <span className="smart-stat-val">{currentReceipt.transfersCount}</span>
                  <span className="smart-stat-lbl">Transfers</span>
                </div>
              </button>

              <button className="smart-stat-btn" onClick={() => showToast('Upstream trace active')}>
                <div className="smart-btn-icon-wrap">
                  <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>route</span>
                </div>
                <div className="smart-stat-meta">
                  <span className="smart-stat-val">Traceability</span>
                  <span className="smart-stat-lbl">Upstream</span>
                </div>
              </button>
            </div>
          </div>

          {/* Form Fields 2-Column Grid */}
          <div className="sheet-form-grid">
            <div className="form-field-group">
              <label className="field-label">Schedule Date</label>
              <div className="field-input-box">
                <input
                  type="text"
                  className="field-input"
                  defaultValue={currentReceipt.scheduleDate}
                  readOnly
                />
                <span className="material-symbols-outlined field-icon">calendar_today</span>
              </div>
            </div>

            <div className="form-field-group">
              <label className="field-label">Responsible</label>
              <div className="field-input-box">
                <input
                  type="text"
                  className="field-input"
                  defaultValue={currentReceipt.responsible}
                  readOnly
                />
                <span className="material-symbols-outlined field-icon">lock</span>
              </div>
            </div>

            <div className="form-field-group">
              <label className="field-label">Receive From</label>
              <div className="field-input-box">
                <input
                  type="text"
                  className="field-input"
                  defaultValue={currentReceipt.receiveFrom}
                  readOnly
                />
                <span className="material-symbols-outlined field-icon">domain</span>
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
                      <th style={{ width: '75%' }}>Product</th>
                      <th style={{ textAlign: 'right', width: '25%' }}>Quantity</th>
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
                            <span className="product-code-tag">{prod.code}</span>
                            <span className="product-name-txt">{prod.name}</span>
                          </div>
                        </td>
                        <td className="product-qty-value">
                          {prod.quantity.toFixed(2)}
                          <span className="product-qty-unit">{prod.unit}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="table-bottom-bar">
                  <span className="lines-counter-txt">
                    {currentReceipt.products.length} line{currentReceipt.products.length !== 1 ? 's' : ''} recorded
                  </span>
                </div>
              </div>
            )}

            {/* Additional Info Tab */}
            {activeTab === 'additional' && (
              <div style={{ padding: '14px 0', fontSize: '14px', color: '#4e444a', lineHeight: '1.8' }}>
                <p><strong>Source Document:</strong> {currentReceipt.purchaseOrder}</p>
                <p><strong>Destination Location:</strong> {currentReceipt.destinationLocation}</p>
                <p><strong>Operation Type:</strong> Receipts (Incoming Shipment)</p>
                <p><strong>Tracking Policy:</strong> Automated serial allocation on entry</p>
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

          {/* Activity Log Stream */}
          <div className="chatter-log-list">
            {currentReceipt.logs && currentReceipt.logs.map((log) => (
              <div key={log.id} className="chatter-entry-item">
                <div className={`entry-user-avatar ${log.isSystem ? 'system-bot' : ''}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    {log.isSystem ? 'smart_toy' : 'person'}
                  </span>
                </div>
                <div className="entry-content-box">
                  <div className="entry-header-line">
                    <span className="entry-author-title">{log.author}</span>
                    <span className="entry-time-text">{log.time}</span>
                  </div>
                  <div className="entry-body-text">{log.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
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
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <span className="material-symbols-outlined" style={{ color: '#6ffbbe', fontSize: '20px' }}>
            check_circle
          </span>
          <span>{toastMessage}</span>
        </div>
      )}

      <AppFooter />
    </div>
  );
}


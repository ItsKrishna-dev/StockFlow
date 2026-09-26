import React, { useState, useMemo } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ROUTES } from '../../shared/config/routes';
import { AppHeader } from '../../widgets/app-header';
import { AppFooter } from '../../widgets/app-footer';
import { receiptsApi } from '../../shared/api/operationsApi';
import './ReceiptDetail.css';

const MOCK_RECEIPTS = [
  {
    id: 'WH/IN/0001',
    stage: 'ready', // draft | ready | done
    scheduleDate: '12/01/2023 10:30:00',
    receiveFrom: 'Acme Interior',
    responsible: 'Mitchell Admin',
    purchaseOrder: 'P000042',
    destinationLocation: 'WH/Stock',
    transfersCount: 1,
    products: [
      {
        id: 1,
        code: '[DESK001]',
        name: 'Desk',
        quantity: 6.0,
        unit: 'Units',
      },
    ],
    logs: [
      {
        id: 1,
        author: 'Mitchell Admin',
        isSystem: false,
        time: '12/01/2023 10:30:12',
        body: 'Receipt created from Purchase Order P000042. Expected shipment received at WH/Stock.',
      },
      {
        id: 2,
        author: 'Automated Stock Control',
        isSystem: true,
        time: '12/01/2023 10:31:00',
        stageTransition: { from: 'Draft', to: 'Ready' },
        body: 'Stage changed from Draft to Ready . Stock reservations completed.',
      },
    ],
  },
  {
    id: 'WH/IN/0002',
    stage: 'draft',
    scheduleDate: '12/02/2023 14:15:00',
    receiveFrom: 'Deco Addict',
    responsible: 'Mitchell Admin',
    purchaseOrder: 'P000043',
    destinationLocation: 'WH/Stock2',
    transfersCount: 2,
    products: [
      {
        id: 1,
        code: '[CHAIR002]',
        name: 'Office Chair',
        quantity: 12.0,
        unit: 'Units',
      },
      {
        id: 2,
        code: '[LAMP005]',
        name: 'Desk Lamp',
        quantity: 4.0,
        unit: 'Units',
      },
    ],
    logs: [
      {
        id: 1,
        author: 'Mitchell Admin',
        isSystem: false,
        time: '12/02/2023 14:15:22',
        body: 'Receipt draft initiated for Vendor Deco Addict.',
      },
    ],
  },
];

export default function ReceiptDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data: receiptDoc, isLoading, error } = useQuery({
    queryKey: ['receipt', id],
    queryFn: () => receiptsApi.get(id),
    enabled: !!id,
  });

  const validateMutation = useMutation({
    mutationFn: () => receiptsApi.validate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipt', id] });
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      showToast('Receipt validated successfully!');
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
    if (!receiptDoc) return null;
    return {
      id: receiptDoc.document_number || receiptDoc.id,
      stage: receiptDoc.status,
      scheduleDate: receiptDoc.created_at ? new Date(receiptDoc.created_at).toLocaleString() : '—',
      receiveFrom: receiptDoc.partner_id || '—',
      responsible: '—',
      purchaseOrder: receiptDoc.notes || '—',
      destinationLocation: receiptDoc.dest_location_id,
      transfersCount: receiptDoc.lines?.length || 0,
      products: (receiptDoc.lines || []).map((l, i) => ({
        id: l.id || i + 1,
        code: l.product_id,
        name: l.product_id,
        quantity: Number(l.quantity_expected),
        unit: l.uom_id || 'Units',
      })),
      logs: [],
    };
  }, [receiptDoc]);

  const [activeTab, setActiveTab] = useState('operations'); // operations | additional | note
  const [showComposer, setShowComposer] = useState(false);
  const [composerMode, setComposerMode] = useState('note'); // note | message
  const [composerText, setComposerText] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Validate handler — calls real API
  const handleValidate = () => {
    if (!currentReceipt || currentReceipt.stage === 'done') {
      showToast('Receipt is already validated.');
      return;
    }
    validateMutation.mutate();
  };

  // Cancel handler — calls real API
  const handleCancelOrder = () => {
    cancelMutation.mutate();
  };

  // Add Product line
  const handleAddProduct = () => {
    const newProd = {
      id: Date.now(),
      code: `[ITEM00${currentReceipt.products.length + 1}]`,
      name: 'Custom Inventory Item',
      quantity: 1.0,
      unit: 'Units',
    };
    const updated = [...receiptsData];
    updated[receiptIndex] = {
      ...currentReceipt,
      products: [...currentReceipt.products, newProd],
    };
    setReceiptsData(updated);
    showToast('New product line added.');
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

    const updated = [...receiptsData];
    updated[receiptIndex] = {
      ...currentReceipt,
      logs: [newLog, ...currentReceipt.logs],
    };
    setReceiptsData(updated);
    setComposerText('');
    setShowComposer(false);
    showToast(composerMode === 'note' ? 'Log note recorded' : 'Message sent to followers');
  };

  return (
    <div className="receipt-page-container">
      <AppHeader />

      {/* ---------------- Subheader & Control Panel Ribbon ---------------- */}
      <div className="receipt-control-ribbon">
        <div className="ribbon-left-section">
          <button
            className="btn-new-record"
            type="button"
            onClick={() => showToast('New Receipt Draft initialized')}
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
            <button className="btn-action-primary" type="button" onClick={handleValidate}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
              <span>Validate</span>
            </button>
            <button className="btn-action-secondary" type="button" onClick={() => window.print()}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>print</span>
              <span>Print</span>
            </button>
            <button className="btn-action-secondary" type="button" onClick={() => navigate(ROUTES.DELIVERY_ORDERS)}>
              <span>Cancel</span>
            </button>
          </div>
        </div>

        <div className="ribbon-right-section">
          {/* Pager */}
          <div className="receipt-pager">
            <span>
              {receiptIndex + 1} / {receiptsData.length}
            </span>
            <div className="pager-buttons">
              <button
                className="pager-btn"
                disabled={receiptIndex === 0}
                onClick={() => setReceiptIndex((prev) => prev - 1)}
                title="Previous Receipt"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_left</span>
              </button>
              <button
                className="pager-btn"
                disabled={receiptIndex === receiptsData.length - 1}
                onClick={() => setReceiptIndex((prev) => prev + 1)}
                title="Next Receipt"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_right</span>
              </button>
            </div>
          </div>

          {/* Pipeline Stage Status */}
          <div className="pipeline-status-bar">
            <button
              className={`stage-pill ${currentReceipt.stage === 'draft' ? 'active' : ''} ${currentReceipt.stage !== 'draft' ? 'done' : ''}`}
              onClick={() => handleStageChange('draft')}
            >
              {currentReceipt.stage !== 'draft' && (
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>check</span>
              )}
              <span>Draft</span>
            </button>

            <button
              className={`stage-pill ${currentReceipt.stage === 'ready' ? 'active' : ''} ${currentReceipt.stage === 'done' ? 'done' : ''}`}
              onClick={() => handleStageChange('ready')}
            >
              <span>Ready</span>
              {currentReceipt.stage === 'ready' && <span className="stage-dot"></span>}
            </button>

            <button
              className={`stage-pill ${currentReceipt.stage === 'done' ? 'active' : ''}`}
              onClick={() => handleStageChange('done')}
            >
              <span>Done</span>
            </button>
          </div>
        </div>
      </div>

      {/* ---------------- Main Body ---------------- */}
      <main className="receipt-main-content">
        {/* ---------------- Primary Record Sheet Card ---------------- */}
        <div className="record-sheet-card">
          <div className="sheet-header-top">
            <div className="sheet-title-area">
              <div className="status-badges-group">
                <span className="badge-pill-incoming">
                  <span className="pulse-dot"></span>
                  Incoming Receipt
                </span>
                {currentReceipt.stage === 'ready' && <span className="badge-pill-ready">Ready</span>}
                {currentReceipt.stage === 'done' && <span className="badge-pill-done">Done</span>}
                {currentReceipt.stage === 'draft' && <span className="log-tag draft">Draft</span>}
              </div>
              <h1 className="record-large-id">{currentReceipt.id}</h1>
            </div>

            {/* Smart Stats Buttons */}
            <div className="sheet-smart-buttons">
              <button className="smart-stat-btn" onClick={() => showToast('Showing 1 connected transfer')}>
                <div className="smart-btn-icon-wrap">
                  <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>sync_alt</span>
                </div>
                <div className="smart-stat-meta">
                  <span className="smart-stat-val">{currentReceipt.transfersCount}</span>
                  <span className="smart-stat-lbl">Transfers</span>
                </div>
              </button>

              <button className="smart-stat-btn" onClick={() => showToast('Upstream trace generated')}>
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
                  <button className="btn-add-product-line" onClick={handleAddProduct}>
                    <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>add_circle</span>
                    <span>Add a product</span>
                  </button>
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
                <p><strong>Tracking Policy:</strong> Automatic serial allocation on warehouse entry</p>
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

        {/* ---------------- Chatter / Communication Stream ---------------- */}
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

              <button className="btn-chatter-tool" onClick={() => showToast('Activities schedule modal opened')}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>schedule</span>
                <span>Activities</span>
              </button>
            </div>

            <div className="chatter-meta-info">
              <div className="meta-chip-item">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>visibility</span>
                <span>2 Followers</span>
              </div>
              <span>•</span>
              <div className="meta-chip-item">
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#006443' }}>
                  verified_user
                </span>
                <span>Audit enabled</span>
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
            {currentReceipt.logs.map((log) => (
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
                  <div className="entry-body-text">
                    {log.stageTransition ? (
                      <span>
                        Stage changed from{' '}
                        <span className={`log-tag ${log.stageTransition.from.toLowerCase()}`}>
                          {log.stageTransition.from}
                        </span>{' '}
                        to{' '}
                        <span className={`log-tag ${log.stageTransition.to.toLowerCase()}`}>
                          {log.stageTransition.to}
                        </span>{' '}
                        . {log.body.replace(/Stage changed from .* to .* \. /, '')}
                      </span>
                    ) : (
                      log.body
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* ---------------- System Footer ---------------- */}
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
          <a
            href="#docs"
            style={{ color: 'inherit', textDecoration: 'none' }}
            onClick={(e) => {
              e.preventDefault();
              showToast('Opening documentation');
            }}
          >
            Documentation & API
          </a>
          <span>•</span>
          <a
            href="#support"
            style={{ color: 'inherit', textDecoration: 'none' }}
            onClick={(e) => {
              e.preventDefault();
              showToast('StockFlow Support Active');
            }}
          >
            Support
          </a>
        </div>
      </footer>

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

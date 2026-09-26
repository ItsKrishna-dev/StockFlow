import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ROUTES } from '../../../shared/config/routes';
import { AppHeader } from '../../../widgets/app-header';
import { AppFooter } from '../../../widgets/app-footer';
import './WarehouseSettings.css';

const DEFAULT_WAREHOUSE = {
  name: 'Central Warehouse (WH)',
  code: 'WH',
  address: '250 Executive Park Blvd, Suite 3400\nSan Francisco, CA 94134\nUnited States',
  incomingShipments: true,
  outgoingShipments: true,
  resupplySubcontractors: false,
};

export default function WarehouseSettingsPage() {
  const navigate = useNavigate();
  const [warehouse, setWarehouse] = useState(DEFAULT_WAREHOUSE);
  const [isModified, setIsModified] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [activeTab, setActiveTab] = useState('configuration'); // configuration | technical | routes
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleFieldChange = (field, value) => {
    setWarehouse((prev) => ({ ...prev, [field]: value }));
    setIsModified(true);
  };

  const handleSave = () => {
    setIsModified(false);
    showToast('Warehouse profile saved successfully to database');
  };

  const handleDiscard = () => {
    setWarehouse(DEFAULT_WAREHOUSE);
    setIsModified(false);
    showToast('Changes reverted to default profile');
  };

  const handleNewRecord = () => {
    setWarehouse({
      name: '',
      code: '',
      address: '',
      incomingShipments: true,
      outgoingShipments: true,
      resupplySubcontractors: false,
    });
    setIsModified(true);
    showToast('New Warehouse draft initialized');
  };

  return (
    <div className="settings-shell">
      <AppHeader />

      {/* Control Ribbon */}
      <div className="settings-control-ribbon">
        <div className="settings-ribbon-left">
          <div className="settings-breadcrumbs">
            <Link to={ROUTES.DASHBOARD} className="settings-crumb-link">
              Inventory
            </Link>
            <span style={{ color: '#d1c3ca' }}>/</span>
            <span style={{ color: '#756f82' }}>Configuration</span>
            <span style={{ color: '#d1c3ca' }}>/</span>
            <span style={{ color: '#756f82' }}>Warehouses</span>
            <span style={{ color: '#d1c3ca' }}>/</span>
            <span className="settings-crumb-active">
              {warehouse.name || 'New Warehouse'}
            </span>
          </div>
          <span className="status-badge-active">
            <span className="sync-dot-green"></span>
            Active
          </span>
        </div>

        {/* Pager */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#756f82', fontWeight: 600 }}>
          <span>1 / 1</span>
          <button
            type="button"
            disabled
            style={{
              background: 'transparent',
              border: '1px solid #d1c3ca',
              borderRadius: '4px',
              padding: '2px 4px',
              opacity: 0.4,
              cursor: 'not-allowed',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_left</span>
          </button>
          <button
            type="button"
            disabled
            style={{
              background: 'transparent',
              border: '1px solid #d1c3ca',
              borderRadius: '4px',
              padding: '2px 4px',
              opacity: 0.4,
              cursor: 'not-allowed',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_right</span>
          </button>
        </div>
      </div>

      {/* Actions and Sync Bar */}
      <div className="settings-actions-bar">
        <div className="settings-buttons-group">
          <button
            type="button"
            className="btn-primary-action"
            onClick={handleSave}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>cloud_done</span>
            <span>Save</span>
          </button>

          <button
            type="button"
            className="btn-secondary-action"
            onClick={handleDiscard}
          >
            Discard
          </button>

          <div style={{ width: '1px', height: '20px', backgroundColor: '#e8e4ec', margin: '0 4px' }} />

          <button
            type="button"
            className="btn-secondary-action"
            onClick={handleNewRecord}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
            <span>New</span>
          </button>

          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="btn-secondary-action"
              onClick={() => setShowActionMenu(!showActionMenu)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>settings</span>
              <span>Action</span>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_drop_down</span>
            </button>

            {showActionMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e8e4ec',
                  borderRadius: '4px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  zIndex: 20,
                  minWidth: '160px',
                  padding: '4px 0',
                }}
              >
                <button
                  type="button"
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 14px',
                    border: 'none',
                    background: 'transparent',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                  onClick={() => {
                    setShowActionMenu(false);
                    showToast('Warehouse duplicated as WH-COPY');
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>content_copy</span>
                  Duplicate
                </button>
                <button
                  type="button"
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 14px',
                    border: 'none',
                    background: 'transparent',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                  onClick={() => {
                    setShowActionMenu(false);
                    showToast('Barcode label generated for ' + warehouse.code);
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>qr_code_2</span>
                  Print Barcode
                </button>
                <button
                  type="button"
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 14px',
                    border: 'none',
                    background: 'transparent',
                    fontSize: '13px',
                    cursor: 'pointer',
                    color: '#ba1a1a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                  onClick={() => {
                    setShowActionMenu(false);
                    showToast('Warehouse archived');
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>archive</span>
                  Archive
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={`settings-sync-status ${isModified ? 'unsaved' : ''}`}>
          <span className={isModified ? 'sync-dot-amber' : 'sync-dot-green'}></span>
          <span>{isModified ? 'Unsaved changes...' : 'All changes saved to database'}</span>
        </div>
      </div>

      {/* Subnav Switcher: Warehouse Settings vs Location Settings */}
      <div className="settings-subnav">
        <button
          type="button"
          className="settings-subnav-btn active"
          onClick={() => navigate(ROUTES.WAREHOUSE_SETTINGS)}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>warehouse</span>
          <span>Warehouse Settings</span>
        </button>

        <button
          type="button"
          className="settings-subnav-btn"
          onClick={() => navigate(ROUTES.LOCATION_SETTINGS)}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>location_on</span>
          <span>Location Settings</span>
        </button>
      </div>

      {/* Main Canvas Card */}
      <div className="settings-canvas">
        <div className="settings-sheet-card">
          {/* Top Info & Smart Buttons */}
          <div className="sheet-top-row">
            <div className="sheet-identity">
              <div className="sheet-icon-box">
                <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>warehouse</span>
              </div>
              <div>
                <span className="sheet-tagline">Inventory Configuration</span>
                <h1 className="sheet-title">Warehouse Profile</h1>
              </div>
            </div>

            <div className="smart-stat-group">
              <button
                type="button"
                className="smart-stat-btn primary"
                onClick={() => navigate(ROUTES.LOCATION_SETTINGS)}
                title="View Locations"
              >
                <span className="material-symbols-outlined stat-icon" style={{ fontSize: '22px' }}>location_on</span>
                <div>
                  <div className="stat-value">4</div>
                  <div className="stat-label">Locations</div>
                </div>
              </button>

              <button
                type="button"
                className="smart-stat-btn secondary"
                onClick={() => showToast('12 Fulfillment Routes active')}
                title="View Routes"
              >
                <span className="material-symbols-outlined stat-icon" style={{ fontSize: '22px' }}>sync_alt</span>
                <div>
                  <div className="stat-value">12</div>
                  <div className="stat-label">Routes</div>
                </div>
              </button>

              <button
                type="button"
                className="smart-stat-btn tertiary"
                onClick={() => navigate(ROUTES.MOVE_HISTORY)}
                title="View Stock Moves"
              >
                <span className="material-symbols-outlined stat-icon" style={{ fontSize: '22px' }}>inventory_2</span>
                <div>
                  <div className="stat-value">1,842</div>
                  <div className="stat-label">Stock Moves</div>
                </div>
              </button>
            </div>
          </div>

          {/* Form Grid */}
          <div className="settings-form-grid">
            {/* Left Column */}
            <div className="form-column-left">
              <div className="form-field-group">
                <label className="form-label" htmlFor="wh-name">
                  Name <span className="req-star">*</span>
                </label>
                <input
                  id="wh-name"
                  type="text"
                  className="form-input-text"
                  placeholder="e.g. Central Warehouse"
                  value={warehouse.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                />
                <span className="form-field-hint">
                  The primary operating name displayed across picking and packing sheets.
                </span>
              </div>

              <div className="form-field-group" style={{ maxWidth: '280px' }}>
                <label className="form-label" htmlFor="wh-code">
                  Short Code <span className="req-star">*</span>
                </label>
                <input
                  id="wh-code"
                  type="text"
                  maxLength={5}
                  className="form-input-text"
                  style={{ textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}
                  placeholder="e.g. WH"
                  value={warehouse.code}
                  onChange={(e) => handleFieldChange('code', e.target.value.toUpperCase())}
                />
                <span className="form-field-hint">
                  Short code used to identify stock locations and sequence numbers (max 5 chars).
                </span>
              </div>

              <div className="form-field-group">
                <label className="form-label" htmlFor="wh-address">
                  Address
                </label>
                <textarea
                  id="wh-address"
                  rows={4}
                  className="form-textarea"
                  placeholder="Street, City, State, ZIP, Country"
                  value={warehouse.address}
                  onChange={(e) => handleFieldChange('address', e.target.value)}
                />
                <span className="form-field-hint">
                  Physical fulfillment and reception address associated with partner contacts.
                </span>
              </div>

              <div className="form-field-group">
                <span className="form-label">Fulfillment Routing</span>
                <div className="checkbox-list-card">
                  <label className="checkbox-label-item">
                    <input
                      type="checkbox"
                      checked={warehouse.incomingShipments}
                      onChange={(e) => handleFieldChange('incomingShipments', e.target.checked)}
                    />
                    <span>Incoming Shipments (1 step: receive in stock directly)</span>
                  </label>

                  <label className="checkbox-label-item">
                    <input
                      type="checkbox"
                      checked={warehouse.outgoingShipments}
                      onChange={(e) => handleFieldChange('outgoingShipments', e.target.checked)}
                    />
                    <span>Outgoing Shipments (1 step: deliver directly)</span>
                  </label>

                  <label className="checkbox-label-item">
                    <input
                      type="checkbox"
                      checked={warehouse.resupplySubcontractors}
                      onChange={(e) => handleFieldChange('resupplySubcontractors', e.target.checked)}
                    />
                    <span>Resupply Subcontractors</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="form-column-right">
              {/* Technical Information Box */}
              <div className="info-card-box">
                <div className="info-card-header">
                  <span>Technical Information</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#756f82' }}>terminal</span>
                </div>
                <div className="info-kv-row">
                  <span className="info-kv-label">Company</span>
                  <span className="info-kv-value">San Francisco Operations</span>
                </div>
                <div className="info-kv-row">
                  <span className="info-kv-label">Resupply</span>
                  <span className="info-kv-value" style={{ color: '#047857' }}>✓ True</span>
                </div>
                <div className="info-kv-row">
                  <span className="info-kv-label">View Location</span>
                  <span className="info-kv-value" style={{ fontFamily: 'monospace' }}>WH/Stock</span>
                </div>
                <div className="info-kv-row">
                  <span className="info-kv-label">Input Location</span>
                  <span className="info-kv-value" style={{ fontFamily: 'monospace' }}>WH/Input</span>
                </div>
                <div className="info-kv-row">
                  <span className="info-kv-label">Quality Control</span>
                  <span className="info-kv-value" style={{ color: '#756f82' }}>Disabled</span>
                </div>
                <div className="info-kv-row">
                  <span className="info-kv-label">Internal Sequence</span>
                  <span className="info-kv-value" style={{ fontFamily: 'monospace' }}>WH/INT/%05d</span>
                </div>
              </div>

              {/* Capacity Card */}
              <div className="info-card-box">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#2f2937' }}>Capacity Utilization</span>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#714b67' }}>68%</span>
                </div>
                <div className="capacity-progress-bar">
                  <div className="capacity-progress-fill" style={{ width: '68%' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#756f82' }}>
                  <span>Pallet Slots: 840 / 1,200</span>
                  <span>Zones: A, B, Cold-1</span>
                </div>
              </div>

              {/* Traceability Notice */}
              <div className="trace-notice-box">
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#714b67' }}>info</span>
                <div>
                  <div style={{ fontWeight: 600, color: '#2f2937', marginBottom: '2px' }}>Traceability Notice</div>
                  Modifications to the Short Code will update serial batch prefixes across newly generated transfer orders.
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Tabs & Audit */}
          <div style={{ borderTop: '1px solid #e8e4ec', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={`settings-subnav-btn ${activeTab === 'configuration' ? 'active' : ''}`}
                onClick={() => setActiveTab('configuration')}
              >
                Warehouse Configuration
              </button>
              <button
                type="button"
                className={`settings-subnav-btn ${activeTab === 'technical' ? 'active' : ''}`}
                onClick={() => setActiveTab('technical')}
              >
                Technical Details
              </button>
              <button
                type="button"
                className={`settings-subnav-btn ${activeTab === 'routes' ? 'active' : ''}`}
                onClick={() => setActiveTab('routes')}
              >
                Associated Routes
              </button>
            </div>

            <div className="sheet-audit-footer">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>history</span>
                <span>Created by <strong>Mitchell Admin</strong> on October 14, 2023 at 09:22 UTC</span>
              </div>
              <div>Last updated: Today at 04:12 UTC</div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="settings-toast-banner">
          <span className="material-symbols-outlined" style={{ color: '#6ffbbe' }}>check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      <AppFooter />
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ROUTES } from '../../../shared/config/routes';
import { AppHeader } from '../../../widgets/app-header';
import { AppFooter } from '../../../widgets/app-footer';
import './WarehouseSettings.css';
import './LocationSettings.css';

const DEFAULT_LOCATION = {
  name: 'Stock',
  code: 'WH-STOCK',
  warehouse: 'WH',
  parentLocation: 'WH',
  locationType: 'Internal Location',
  removalStrategy: 'First In, First Out (FIFO)',
  storageCategory: 'Standard Pallet Rack (5T max)',
  barcode: 'LOC-WH-001',
};

const SUB_LOCATIONS = [
  { id: '1', code: 'WH/Stock/A1', zone: 'Bay 01 (North)', category: 'Pallet Rack (Heavy)', itemsHeld: 480, status: 'In Service' },
  { id: '2', code: 'WH/Stock/A2', zone: 'Bay 02 (North)', category: 'Pallet Rack (Standard)', itemsHeld: 360, status: 'In Service' },
  { id: '3', code: 'WH/Stock/B1', zone: 'Bay 01 (South)', category: 'Small Parts Bin', itemsHeld: 580, status: 'In Service' },
];

export default function LocationSettingsPage() {
  const navigate = useNavigate();
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [isModified, setIsModified] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [activeTab, setActiveTab] = useState('details'); // details | rules | routes
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleFieldChange = (field, value) => {
    setLocation((prev) => ({ ...prev, [field]: value }));
    setIsModified(true);
  };

  const handleSave = () => {
    setIsModified(false);
    showToast('Location parameters saved to database');
  };

  const handleDiscard = () => {
    setLocation(DEFAULT_LOCATION);
    setIsModified(false);
    showToast('Changes discarded');
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
            <span style={{ color: '#756f82' }}>Locations</span>
            <span style={{ color: '#d1c3ca' }}>/</span>
            <span className="settings-crumb-active">
              WH/{location.name || 'New Location'}
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
            <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>save</span>
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
            onClick={() => {
              setLocation({
                name: '',
                code: '',
                warehouse: 'WH',
                parentLocation: 'WH',
                locationType: 'Internal Location',
                removalStrategy: 'First In, First Out (FIFO)',
                storageCategory: 'Standard Pallet Rack (5T max)',
                barcode: '',
              });
              setIsModified(true);
              showToast('New location template ready');
            }}
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
                  minWidth: '170px',
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
                    showToast('Location duplicated');
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
                    showToast('Barcode label printed for ' + location.barcode);
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
                    showToast('Location archived');
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>archive</span>
                  Archive Location
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
          className="settings-subnav-btn"
          onClick={() => navigate(ROUTES.WAREHOUSE_SETTINGS)}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>warehouse</span>
          <span>Warehouse Settings</span>
        </button>

        <button
          type="button"
          className="settings-subnav-btn active"
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
              <div className="sheet-icon-box" style={{ backgroundColor: '#f0e8f5' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#714b67' }}>
                  location_on
                </span>
              </div>
              <div>
                <span className="sheet-tagline">Location Configuration</span>
                <h1 className="sheet-title">WH / {location.name}</h1>
                <div style={{ fontSize: '12px', color: '#756f82', marginTop: '2px' }}>
                  Hierarchy: Physical Locations / WH / {location.name}
                </div>
              </div>
            </div>

            <div className="smart-stat-group">
              <button
                type="button"
                className="smart-stat-btn primary"
                onClick={() => showToast('Viewing units on hand in ' + location.name)}
                title="Units on Hand"
              >
                <span className="material-symbols-outlined stat-icon" style={{ fontSize: '22px' }}>inventory_2</span>
                <div>
                  <div className="stat-value">1,420</div>
                  <div className="stat-label">Units on Hand</div>
                </div>
              </button>

              <button
                type="button"
                className="smart-stat-btn secondary"
                onClick={() => showToast('2 Putaway rules assigned')}
                title="Putaway Rules"
              >
                <span className="material-symbols-outlined stat-icon" style={{ fontSize: '22px' }}>rule</span>
                <div>
                  <div className="stat-value">2</div>
                  <div className="stat-label">Putaway Rules</div>
                </div>
              </button>

              <button
                type="button"
                className="smart-stat-btn tertiary"
                onClick={() => navigate(ROUTES.MOVE_HISTORY)}
                title="View Stock Moves"
              >
                <span className="material-symbols-outlined stat-icon" style={{ fontSize: '22px' }}>sync_alt</span>
                <div>
                  <div className="stat-value">842</div>
                  <div className="stat-label">Stock Moves</div>
                </div>
              </button>
            </div>
          </div>

          {/* Form Grid */}
          <div className="settings-form-grid">
            {/* Left Column */}
            <div className="form-column-left">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '4px' }}>
                <span style={{ width: '4px', height: '14px', backgroundColor: '#714b67', borderRadius: '2px' }}></span>
                <span style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#2f2937' }}>
                  General Parameters
                </span>
              </div>

              <div className="form-field-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" htmlFor="loc-name">
                    Location Name <span className="req-star">*</span>
                  </label>
                  <span style={{ fontSize: '11px', color: '#756f82' }}>System Unique ID: LOC-0012</span>
                </div>
                <input
                  id="loc-name"
                  type="text"
                  className="form-input-text"
                  placeholder="e.g. Stock"
                  value={location.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                />
                <span className="form-field-hint">
                  Primary location name for picking, packaging, and internal storage allocations.
                </span>
              </div>

              <div className="form-field-group">
                <label className="form-label" htmlFor="loc-code">
                  Short Code <span className="req-star">*</span>
                </label>
                <input
                  id="loc-code"
                  type="text"
                  className="form-input-text"
                  style={{ textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700 }}
                  placeholder="e.g. WH-STOCK"
                  value={location.code}
                  onChange={(e) => handleFieldChange('code', e.target.value.toUpperCase())}
                />
                <span className="form-field-hint">
                  Unique code used for high-velocity barcode scanning and terminal dispatch.
                </span>
              </div>

              <div className="form-field-group">
                <label className="form-label" htmlFor="loc-wh">
                  Warehouse <span className="req-star">*</span>
                </label>
                <select
                  id="loc-wh"
                  className="form-input-text"
                  value={location.warehouse}
                  onChange={(e) => handleFieldChange('warehouse', e.target.value)}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="WH">Central Warehouse (WH)</option>
                  <option value="WH2">Distribution Center East (DCE)</option>
                  <option value="WH3">Secondary Assembly Hub (SAH)</option>
                  <option value="COLD">Cold Storage Facility (CSF)</option>
                </select>
                <span className="form-field-hint">
                  Warehouse defining stock ownership and automatic replenish pipeline.
                </span>
              </div>

              {/* Hierarchy Notice */}
              <div className="trace-notice-box" style={{ marginTop: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#714b67' }}>account_tree</span>
                <div>
                  <div style={{ fontWeight: 600, color: '#2f2937', marginBottom: '2px' }}>Storage Hierarchy Architecture</div>
                  This internal node acts as the parent container for multiple physical subdivisions (Aisles, Racks, Shelves, and Bins) across the primary operational footprint.
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="form-column-right">
              {/* Location Attributes */}
              <div className="info-card-box">
                <div className="info-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#714b67' }}>domain_verification</span>
                    <span>Location Information</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#047857', backgroundColor: '#d1fae5', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                    System Verified
                  </span>
                </div>

                <div className="info-kv-row">
                  <span className="info-kv-label">Location Type</span>
                  <span className="info-kv-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#0284c7' }} />
                    {location.locationType}
                  </span>
                </div>

                <div className="info-kv-row">
                  <span className="info-kv-label">Parent Location</span>
                  <span
                    className="info-kv-value"
                    style={{ color: '#714b67', cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => navigate(ROUTES.WAREHOUSE_SETTINGS)}
                  >
                    {location.parentLocation}
                  </span>
                </div>

                <div className="info-kv-row">
                  <span className="info-kv-label">Is a Scrap Location?</span>
                  <span className="info-kv-value" style={{ color: '#756f82' }}>No</span>
                </div>

                <div className="info-kv-row">
                  <span className="info-kv-label">Is a Return Location?</span>
                  <span className="info-kv-value" style={{ color: '#756f82' }}>No</span>
                </div>

                <div className="info-kv-row">
                  <span className="info-kv-label">Barcode Identifier</span>
                  <span className="info-kv-value" style={{ fontFamily: 'monospace', backgroundColor: '#e8e4ec', padding: '1px 6px', borderRadius: '3px' }}>
                    {location.barcode}
                  </span>
                </div>
              </div>

              {/* Capacity & Logistics */}
              <div className="info-card-box">
                <div className="info-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#0284c7' }}>tune</span>
                    <span>Capacity & Logistics</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#756f82' }}>Removal Strategy</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '13.5px' }}>{location.removalStrategy}</span>
                    <span className="material-symbols-outlined" style={{ color: '#047857', fontSize: '18px' }}>check_circle</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#756f82' }}>Storage Category</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#0284c7' }}>88% Utilized</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>{location.storageCategory}</div>
                  <div className="capacity-progress-bar" style={{ marginTop: '4px' }}>
                    <div className="capacity-progress-fill" style={{ width: '88%', backgroundColor: '#0284c7' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabbed Sub-Locations */}
          <div style={{ borderTop: '1px solid #e8e4ec', paddingTop: '16px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <button
                type="button"
                className={`settings-subnav-btn ${activeTab === 'details' ? 'active' : ''}`}
                onClick={() => setActiveTab('details')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>view_list</span>
                <span>Location Details</span>
              </button>
              <button
                type="button"
                className={`settings-subnav-btn ${activeTab === 'rules' ? 'active' : ''}`}
                onClick={() => setActiveTab('rules')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>alt_route</span>
                <span>Logistics Rules</span>
                <span style={{ backgroundColor: '#e8e4ec', padding: '1px 6px', borderRadius: '10px', fontSize: '11px' }}>2</span>
              </button>
              <button
                type="button"
                className={`settings-subnav-btn ${activeTab === 'routes' ? 'active' : ''}`}
                onClick={() => setActiveTab('routes')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>fork_right</span>
                <span>Associated Routes</span>
              </button>
            </div>

            {/* Sub-locations table */}
            <div style={{ overflowX: 'auto', border: '1px solid #e8e4ec', borderRadius: '4px' }}>
              <table className="sublocations-table">
                <thead>
                  <tr>
                    <th>Sub-Location Code</th>
                    <th>Bay / Zone</th>
                    <th>Active Category</th>
                    <th style={{ textAlign: 'right' }}>Items Held</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {SUB_LOCATIONS.map((sub) => (
                    <tr key={sub.id}>
                      <td style={{ fontWeight: 700, color: '#714b67' }}>{sub.code}</td>
                      <td>{sub.zone}</td>
                      <td>{sub.category}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{sub.itemsHeld} Units</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="status-pill-inservice">
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#047857' }} />
                          {sub.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

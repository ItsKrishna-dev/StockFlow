import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ROUTES } from '../../../shared/config/routes';
import { AppHeader } from '../../../widgets/app-header';
import { AppFooter } from '../../../widgets/app-footer';
import './WarehouseSettings.css';

const INITIAL_WAREHOUSES = [
  {
    id: 'WH-01',
    name: 'Central Warehouse (WH)',
    code: 'WH',
    address: '250 Executive Park Blvd, Suite 3400\nSan Francisco, CA 94134\nUnited States',
    incomingShipments: true,
    outgoingShipments: true,
    resupplySubcontractors: false,
    manager: 'Mitchell Admin',
    totalLocations: 5,
    staffCount: 4,
  },
  {
    id: 'WH-02',
    name: 'East Coast Distribution Hub (WH-EAST)',
    code: 'WH-EAST',
    address: '100 Industrial Parkway, Dock 12\nSecaucus, NJ 07094\nUnited States',
    incomingShipments: true,
    outgoingShipments: true,
    resupplySubcontractors: true,
    manager: 'Sarah Jenkins',
    totalLocations: 3,
    staffCount: 2,
  },
  {
    id: 'WH-03',
    name: 'Europe Distribution Center (WH-EU)',
    code: 'WH-EU',
    address: 'Havenlaan 86C, Box 402\n1000 Brussels\nBelgium',
    incomingShipments: true,
    outgoingShipments: true,
    resupplySubcontractors: false,
    manager: 'Jean-Luc Dubois',
    totalLocations: 2,
    staffCount: 1,
  },
];

const INITIAL_SUB_LOCATIONS = [
  {
    id: 'LOC-001',
    warehouseCode: 'WH',
    name: 'Main Stock Floor',
    path: 'WH/Stock1',
    zone: 'Zone A (Ground Floor)',
    type: 'Internal Storage',
    category: 'Standard Pallet Rack (5T)',
    barcode: 'LOC-WH-001',
    itemsHeld: 480,
    maxCapacity: 600,
    status: 'In Service',
  },
  {
    id: 'LOC-002',
    warehouseCode: 'WH',
    name: 'North Racks - Heavy Items',
    path: 'WH/Rack-A',
    zone: 'Zone A (North Wing)',
    type: 'Internal Storage',
    category: 'Heavy Duty Cantilever',
    barcode: 'LOC-WH-002',
    itemsHeld: 320,
    maxCapacity: 400,
    status: 'In Service',
  },
  {
    id: 'LOC-003',
    warehouseCode: 'WH',
    name: 'Inbound Receiving Bay 4',
    path: 'WH/Input-Bay-4',
    zone: 'Docking Staging',
    type: 'Incoming Staging',
    category: 'Cross-Dock Buffer',
    barcode: 'LOC-WH-003',
    itemsHeld: 85,
    maxCapacity: 150,
    status: 'In Service',
  },
  {
    id: 'LOC-004',
    warehouseCode: 'WH',
    name: 'Outbound Express Dispatch Dock',
    path: 'WH/Output-Dock-2',
    zone: 'Dispatch Bay',
    type: 'Outgoing Dispatch',
    category: 'Fast Packing Station',
    barcode: 'LOC-WH-004',
    itemsHeld: 110,
    maxCapacity: 200,
    status: 'In Service',
  },
  {
    id: 'LOC-005',
    warehouseCode: 'WH',
    name: 'Quality Inspection & Quarantine',
    path: 'WH/Quality-Control',
    zone: 'QC Lab Area',
    type: 'Quality Inspection',
    category: 'Climate Controlled Zone',
    barcode: 'LOC-WH-005',
    itemsHeld: 14,
    maxCapacity: 50,
    status: 'In Service',
  },
  {
    id: 'LOC-006',
    warehouseCode: 'WH-EAST',
    name: 'East Hub High-Bay Storage',
    path: 'WH-EAST/Stock-Main',
    zone: 'High Bay 01',
    type: 'Internal Storage',
    category: 'Automated VNA Racks',
    barcode: 'LOC-E-001',
    itemsHeld: 950,
    maxCapacity: 1200,
    status: 'In Service',
  },
  {
    id: 'LOC-007',
    warehouseCode: 'WH-EAST',
    name: 'East Hub Cold Room',
    path: 'WH-EAST/Cold-Storage',
    zone: 'Cold Vault 2',
    type: 'Internal Storage',
    category: 'Refrigerated Unit (2-8°C)',
    barcode: 'LOC-E-002',
    itemsHeld: 120,
    maxCapacity: 200,
    status: 'In Service',
  },
  {
    id: 'LOC-008',
    warehouseCode: 'WH-EU',
    name: 'Brussels Primary Vault',
    path: 'WH-EU/Stock-Central',
    zone: 'Main Level 0',
    type: 'Internal Storage',
    category: 'Euro-Pallet Shelving',
    barcode: 'LOC-EU-001',
    itemsHeld: 640,
    maxCapacity: 800,
    status: 'In Service',
  },
];

const INITIAL_STAFF_MEMBERS = [
  {
    id: 'EMP-1001',
    name: 'Mitchell Admin',
    initials: 'MA',
    role: 'Head Warehouse Director',
    warehouseCode: 'WH',
    warehouseName: 'Central Warehouse (WH)',
    assignedZone: 'All Zones (Full Access)',
    shift: 'General (08:00 - 17:00)',
    accessLevel: 'Super Administrator',
    email: 'admin@stockflow.internal',
    status: 'On Shift',
  },
  {
    id: 'EMP-1002',
    name: 'Carlos Mendez',
    initials: 'CM',
    role: 'Lead Inbound Supervisor',
    warehouseCode: 'WH',
    warehouseName: 'Central Warehouse (WH)',
    assignedZone: 'WH/Input-Bay-4',
    shift: 'Morning (06:00 - 14:30)',
    accessLevel: 'Warehouse Supervisor',
    email: 'carlos.m@stockflow.internal',
    status: 'On Shift',
  },
  {
    id: 'EMP-1003',
    name: 'Elena Rostova',
    initials: 'ER',
    role: 'Senior Forklift Operator',
    warehouseCode: 'WH',
    warehouseName: 'Central Warehouse (WH)',
    assignedZone: 'WH/Rack-A',
    shift: 'Morning (06:00 - 14:30)',
    accessLevel: 'Equipment Specialist',
    email: 'elena.r@stockflow.internal',
    status: 'On Shift',
  },
  {
    id: 'EMP-1004',
    name: 'David Kim',
    initials: 'DK',
    role: 'Inventory Quality Auditor',
    warehouseCode: 'WH',
    warehouseName: 'Central Warehouse (WH)',
    assignedZone: 'WH/Quality-Control',
    shift: 'Evening (14:00 - 22:30)',
    accessLevel: 'Quality Assurance',
    email: 'david.k@stockflow.internal',
    status: 'Active',
  },
  {
    id: 'EMP-1005',
    name: 'Sarah Jenkins',
    initials: 'SJ',
    role: 'East Regional Operations Lead',
    warehouseCode: 'WH-EAST',
    warehouseName: 'East Coast Distribution Hub',
    assignedZone: 'WH-EAST/Stock-Main',
    shift: 'Morning (07:00 - 15:30)',
    accessLevel: 'Regional Admin',
    email: 's.jenkins@stockflow.internal',
    status: 'On Shift',
  },
  {
    id: 'EMP-1006',
    name: 'Marcus Vance',
    initials: 'MV',
    role: 'Cold Storage Handling Specialist',
    warehouseCode: 'WH-EAST',
    warehouseName: 'East Coast Distribution Hub',
    assignedZone: 'WH-EAST/Cold-Storage',
    shift: 'Night (22:00 - 06:30)',
    accessLevel: 'Operator',
    email: 'm.vance@stockflow.internal',
    status: 'On Break',
  },
  {
    id: 'EMP-1007',
    name: 'Jean-Luc Dubois',
    initials: 'JD',
    role: 'EU Logistics & Customs Manager',
    warehouseCode: 'WH-EU',
    warehouseName: 'Europe Distribution Center',
    assignedZone: 'WH-EU/Stock-Central',
    shift: 'Day (08:30 - 17:00 CET)',
    accessLevel: 'Regional Admin',
    email: 'jeanluc.d@stockflow.eu',
    status: 'On Shift',
  },
];

export default function WarehouseSettingsPage() {
  const navigate = useNavigate();
  const [warehousesList, setWarehousesList] = useState(INITIAL_WAREHOUSES);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('WH-01');
  const [subLocations, setSubLocations] = useState(INITIAL_SUB_LOCATIONS);
  const [staffMembers, setStaffMembers] = useState(INITIAL_STAFF_MEMBERS);

  const [activeSection, setActiveSection] = useState('profile'); // 'profile' | 'locations' | 'staff'
  const [isModified, setIsModified] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Modals state
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [newLocationForm, setNewLocationForm] = useState({
    name: '',
    pathSuffix: '',
    zone: 'Zone A (Ground Floor)',
    type: 'Internal Storage',
    category: 'Standard Pallet Rack (5T)',
    barcode: '',
    maxCapacity: 500,
  });

  const [showStaffModal, setShowStaffModal] = useState(false);
  const [newStaffForm, setNewStaffForm] = useState({
    name: '',
    role: 'Warehouse Operator',
    warehouseCode: 'WH',
    assignedZone: 'WH/Stock1',
    shift: 'Morning (06:00 - 14:30)',
    accessLevel: 'Operator',
    email: '',
  });

  const [staffWarehouseFilter, setStaffWarehouseFilter] = useState('ALL');

  const currentWarehouse =
    warehousesList.find((w) => w.id === selectedWarehouseId) || warehousesList[0];

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleWarehouseFieldChange = (field, value) => {
    setWarehousesList((prev) =>
      prev.map((w) => (w.id === currentWarehouse.id ? { ...w, [field]: value } : w))
    );
    setIsModified(true);
  };

  const handleSave = () => {
    setIsModified(false);
    showToast(`Warehouse profile for "${currentWarehouse.name}" saved successfully`);
  };

  const handleDiscard = () => {
    setIsModified(false);
    showToast('Changes discarded');
  };

  // Add Location Submit
  const handleAddLocationSubmit = (e) => {
    e.preventDefault();
    if (!newLocationForm.name.trim() || !newLocationForm.pathSuffix.trim()) {
      showToast('Please enter both location name and path suffix');
      return;
    }

    const fullPath = `${currentWarehouse.code}/${newLocationForm.pathSuffix.replace(/^\/+/, '')}`;
    const newLoc = {
      id: `LOC-${Date.now().toString().slice(-4)}`,
      warehouseCode: currentWarehouse.code,
      name: newLocationForm.name,
      path: fullPath,
      zone: newLocationForm.zone,
      type: newLocationForm.type,
      category: newLocationForm.category,
      barcode: newLocationForm.barcode || `LOC-${currentWarehouse.code}-${Date.now().toString().slice(-3)}`,
      itemsHeld: 0,
      maxCapacity: Number(newLocationForm.maxCapacity) || 500,
      status: 'In Service',
    };

    setSubLocations((prev) => [newLoc, ...prev]);
    setShowLocationModal(false);
    setNewLocationForm({
      name: '',
      pathSuffix: '',
      zone: 'Zone A (Ground Floor)',
      type: 'Internal Storage',
      category: 'Standard Pallet Rack (5T)',
      barcode: '',
      maxCapacity: 500,
    });
    showToast(`Added sub-location "${fullPath}" to ${currentWarehouse.name}`);
  };

  // Delete Location
  const handleDeleteLocation = (locId, locPath) => {
    setSubLocations((prev) => prev.filter((l) => l.id !== locId));
    showToast(`Removed location ${locPath}`);
  };

  // Add Staff Submit
  const handleAddStaffSubmit = (e) => {
    e.preventDefault();
    if (!newStaffForm.name.trim() || !newStaffForm.email.trim()) {
      showToast('Please enter staff name and email address');
      return;
    }

    const initials = newStaffForm.name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const targetWh = warehousesList.find((w) => w.code === newStaffForm.warehouseCode) || currentWarehouse;

    const newStaff = {
      id: `EMP-${Date.now().toString().slice(-4)}`,
      name: newStaffForm.name,
      initials: initials || 'SF',
      role: newStaffForm.role,
      warehouseCode: targetWh.code,
      warehouseName: targetWh.name,
      assignedZone: newStaffForm.assignedZone,
      shift: newStaffForm.shift,
      accessLevel: newStaffForm.accessLevel,
      email: newStaffForm.email,
      status: 'Active',
    };

    setStaffMembers((prev) => [newStaff, ...prev]);
    setShowStaffModal(false);
    setNewStaffForm({
      name: '',
      role: 'Warehouse Operator',
      warehouseCode: currentWarehouse.code,
      assignedZone: `${currentWarehouse.code}/Stock1`,
      shift: 'Morning (06:00 - 14:30)',
      accessLevel: 'Operator',
      email: '',
    });
    showToast(`Assigned ${newStaff.name} to ${targetWh.name}`);
  };

  // Filtered sub-locations for current warehouse
  const currentWarehouseLocations = subLocations.filter(
    (loc) => loc.warehouseCode === currentWarehouse.code
  );

  // Filtered staff members
  const filteredStaff = staffMembers.filter((staff) => {
    if (staffWarehouseFilter === 'ALL') return true;
    return staff.warehouseCode === staffWarehouseFilter;
  });

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
            <span style={{ color: '#b0a8b4' }}>/</span>
            <span style={{ color: '#756f82' }}>Configuration</span>
            <span style={{ color: '#b0a8b4' }}>/</span>
            <span style={{ color: '#756f82' }}>Warehouses</span>
            <span style={{ color: '#b0a8b4' }}>/</span>
            <span className="settings-crumb-active">{currentWarehouse.name}</span>
          </div>
          <span className="status-badge-active">
            <span className="sync-dot-green"></span>
            Active
          </span>
        </div>

        {/* Warehouse Selector Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontSize: '13px', fontWeight: 700, color: '#4e444a' }}>
            Switch Warehouse:
          </label>
          <select
            className="form-input-select"
            style={{ width: 'auto', minWidth: '240px', padding: '6px 12px', fontWeight: 600 }}
            value={selectedWarehouseId}
            onChange={(e) => {
              setSelectedWarehouseId(e.target.value);
              setIsModified(false);
            }}
          >
            {warehousesList.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.name} ({wh.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Operational Actions Bar */}
      <div className="settings-actions-bar">
        <div className="settings-buttons-group">
          <button
            type="button"
            className="btn-primary-action"
            onClick={handleSave}
            disabled={!isModified && activeSection === 'profile'}
            style={{ opacity: !isModified && activeSection === 'profile' ? 0.7 : 1 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>save</span>
            <span>Save Profile</span>
          </button>

          <button
            type="button"
            className="btn-secondary-action"
            onClick={handleDiscard}
            disabled={!isModified}
            style={{ opacity: !isModified ? 0.6 : 1 }}
          >
            <span>Discard</span>
          </button>

          {/* Action Menu Trigger */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="btn-secondary-action"
              onClick={() => setShowActionMenu((prev) => !prev)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>bolt</span>
              <span>Actions</span>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_drop_down</span>
            </button>

            {showActionMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  backgroundColor: '#ffffff',
                  border: '1.5px solid #e8e4ec',
                  borderRadius: '8px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  minWidth: '200px',
                  zIndex: 200,
                  padding: '6px 0',
                }}
              >
                <button
                  type="button"
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 16px',
                    border: 'none',
                    background: 'transparent',
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                  onClick={() => {
                    setShowActionMenu(false);
                    showToast(`Barcode labels printed for ${currentWarehouse.code}`);
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#714b67' }}>
                    qr_code_2
                  </span>
                  Print Warehouse Barcodes
                </button>
                <button
                  type="button"
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 16px',
                    border: 'none',
                    background: 'transparent',
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                  onClick={() => {
                    setShowActionMenu(false);
                    navigate(ROUTES.LOCATION_SETTINGS);
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#714b67' }}>
                    alt_route
                  </span>
                  Global Location Rules
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={`settings-sync-status ${isModified ? 'unsaved' : ''}`}>
          <span className={isModified ? 'sync-dot-amber' : 'sync-dot-green'}></span>
          <span>{isModified ? 'Unsaved changes in profile...' : 'Database in sync'}</span>
        </div>
      </div>

      {/* Subnav Navigation Switcher */}
      <div className="settings-subnav">
        <button
          type="button"
          className={`settings-subnav-btn ${activeSection === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveSection('profile')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>warehouse</span>
          <span>Warehouse Profile ({currentWarehouse.code})</span>
        </button>

        <button
          type="button"
          className={`settings-subnav-btn ${activeSection === 'locations' ? 'active' : ''}`}
          onClick={() => setActiveSection('locations')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>location_on</span>
          <span>Sub-Locations & Racks ({currentWarehouseLocations.length})</span>
        </button>

        <button
          type="button"
          className={`settings-subnav-btn ${activeSection === 'staff' ? 'active' : ''}`}
          onClick={() => setActiveSection('staff')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>badge</span>
          <span>Staff Members & Personnel ({staffMembers.length})</span>
        </button>
      </div>

      {/* Main Canvas Container */}
      <main className="settings-canvas">
        {/* ============================================================== */}
        {/* SECTION 1: WAREHOUSE PROFILE & CONFIGURATION */}
        {/* ============================================================== */}
        {activeSection === 'profile' && (
          <div className="settings-sheet-card">
            {/* Top Identity & Smart Stat Buttons */}
            <div className="sheet-top-row">
              <div className="sheet-identity">
                <div className="sheet-icon-box">
                  <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>warehouse</span>
                </div>
                <div>
                  <span className="sheet-tagline">Operating Facility</span>
                  <h1 className="sheet-title">{currentWarehouse.name}</h1>
                </div>
              </div>

              <div className="smart-stat-group">
                <button
                  type="button"
                  className="smart-stat-btn"
                  onClick={() => setActiveSection('locations')}
                  title="View Locations of this warehouse"
                >
                  <span className="material-symbols-outlined stat-icon" style={{ fontSize: '24px' }}>
                    location_on
                  </span>
                  <div>
                    <div className="stat-value">{currentWarehouseLocations.length}</div>
                    <div className="stat-label">Sub-Locations</div>
                  </div>
                </button>

                <button
                  type="button"
                  className="smart-stat-btn"
                  onClick={() => setActiveSection('staff')}
                  title="View Staff working here"
                >
                  <span className="material-symbols-outlined stat-icon" style={{ fontSize: '24px' }}>
                    groups
                  </span>
                  <div>
                    <div className="stat-value">
                      {staffMembers.filter((s) => s.warehouseCode === currentWarehouse.code).length}
                    </div>
                    <div className="stat-label">Assigned Staff</div>
                  </div>
                </button>

                <button
                  type="button"
                  className="smart-stat-btn"
                  onClick={() => navigate(ROUTES.MOVE_HISTORY)}
                  title="View Stock Ledger"
                >
                  <span className="material-symbols-outlined stat-icon" style={{ fontSize: '24px' }}>
                    inventory_2
                  </span>
                  <div>
                    <div className="stat-value">1,842</div>
                    <div className="stat-label">Stock Moves</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Form Fields Grid */}
            <div className="settings-form-grid">
              <div className="form-field-group">
                <label className="form-label">
                  Warehouse Name <span className="req-star">*</span>
                </label>
                <input
                  type="text"
                  className="form-input-text"
                  value={currentWarehouse.name}
                  onChange={(e) => handleWarehouseFieldChange('name', e.target.value)}
                />
                <span className="form-field-hint">Display name used in reports and delivery manifests.</span>
              </div>

              <div className="form-field-group">
                <label className="form-label">
                  Short Code <span className="req-star">*</span>
                </label>
                <input
                  type="text"
                  className="form-input-text"
                  style={{ textTransform: 'uppercase' }}
                  value={currentWarehouse.code}
                  onChange={(e) => handleWarehouseFieldChange('code', e.target.value.toUpperCase())}
                />
                <span className="form-field-hint">Prefix used in inventory sequences (e.g. WH/IN/0001).</span>
              </div>

              <div className="form-field-group">
                <label className="form-label">Facility Manager</label>
                <input
                  type="text"
                  className="form-input-text"
                  value={currentWarehouse.manager}
                  onChange={(e) => handleWarehouseFieldChange('manager', e.target.value)}
                />
              </div>

              <div className="form-field-group">
                <label className="form-label">Full Address & Dock Info</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={currentWarehouse.address}
                  onChange={(e) => handleWarehouseFieldChange('address', e.target.value)}
                />
              </div>
            </div>

            {/* Logistics Routing Checkboxes */}
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#212529', marginBottom: '14px' }}>
                Operational Logistics Rules
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', fontWeight: 600, color: '#4e444a', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    style={{ width: '18px', height: '18px', accentColor: '#714b67' }}
                    checked={currentWarehouse.incomingShipments}
                    onChange={(e) => handleWarehouseFieldChange('incomingShipments', e.target.checked)}
                  />
                  <span>Direct Incoming Shipments (Receive in 1 step)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', fontWeight: 600, color: '#4e444a', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    style={{ width: '18px', height: '18px', accentColor: '#714b67' }}
                    checked={currentWarehouse.outgoingShipments}
                    onChange={(e) => handleWarehouseFieldChange('outgoingShipments', e.target.checked)}
                  />
                  <span>Direct Outgoing Shipments (Deliver in 1 step)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', fontWeight: 600, color: '#4e444a', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    style={{ width: '18px', height: '18px', accentColor: '#714b67' }}
                    checked={currentWarehouse.resupplySubcontractors}
                    onChange={(e) => handleWarehouseFieldChange('resupplySubcontractors', e.target.checked)}
                  />
                  <span>Resupply Subcontractors & Vendor Hubs</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SECTION 2: WAREHOUSE SUB-LOCATIONS & ZONES */}
        {/* ============================================================== */}
        {activeSection === 'locations' && (
          <div className="settings-sheet-card">
            <div className="enterprise-section-header">
              <div>
                <h2 className="section-heading-title">
                  Sub-Locations & Zones in {currentWarehouse.name}
                </h2>
                <p className="section-heading-sub">
                  Define specific storage racks, aisles, bays, and inspection zones belonging to {currentWarehouse.code}.
                </p>
              </div>

              <button
                type="button"
                className="btn-add-entity"
                onClick={() => setShowLocationModal(true)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>add_location</span>
                <span>+ Add Sub-Location</span>
              </button>
            </div>

            {/* Sub-Locations Table */}
            <div className="settings-table-wrapper">
              <table className="settings-data-table">
                <thead>
                  <tr>
                    <th>Location Name</th>
                    <th>Full Path Hierarchy</th>
                    <th>Zone / Area</th>
                    <th>Location Type</th>
                    <th>Barcode</th>
                    <th>Capacity Load</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentWarehouseLocations.map((loc) => (
                    <tr key={loc.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="material-symbols-outlined" style={{ color: '#714b67', fontSize: '18px' }}>
                            shelves
                          </span>
                          <span style={{ fontWeight: 800, color: '#212529' }}>{loc.name}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: '#714b67', fontFamily: 'monospace' }}>
                          {loc.path}
                        </span>
                      </td>
                      <td>
                        <span className="zone-pill">{loc.zone}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '13px', color: '#4e444a', fontWeight: 600 }}>
                          {loc.type}
                        </span>
                      </td>
                      <td>
                        <span className="barcode-badge">{loc.barcode}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: '#212529' }}>
                          {loc.itemsHeld} / {loc.maxCapacity} units
                        </span>
                      </td>
                      <td>
                        <span className="status-badge-active">
                          <span className="sync-dot-green"></span>
                          {loc.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ba1a1a',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                          }}
                          onClick={() => handleDeleteLocation(loc.id, loc.path)}
                          title="Delete Location"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SECTION 3: STAFF MEMBERS DIRECTORY (ADMIN TABLE) */}
        {/* ============================================================== */}
        {activeSection === 'staff' && (
          <div className="settings-sheet-card">
            <div className="enterprise-section-header">
              <div>
                <h2 className="section-heading-title">Warehouse Staff & Personnel Directory</h2>
                <p className="section-heading-sub">
                  Admin view of active personnel, assigned facilities, work shifts, and security clearance.
                </p>
              </div>

              <button
                type="button"
                className="btn-add-entity"
                onClick={() => setShowStaffModal(true)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>person_add</span>
                <span>+ Assign Staff Member</span>
              </button>
            </div>

            {/* Warehouse Filter Chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#756f82' }}>Filter Facility:</span>
              <button
                type="button"
                className={`settings-subnav-btn ${staffWarehouseFilter === 'ALL' ? 'active' : ''}`}
                style={{ padding: '4px 14px', fontSize: '12.5px' }}
                onClick={() => setStaffWarehouseFilter('ALL')}
              >
                All Facilities ({staffMembers.length})
              </button>
              {warehousesList.map((wh) => (
                <button
                  key={wh.code}
                  type="button"
                  className={`settings-subnav-btn ${staffWarehouseFilter === wh.code ? 'active' : ''}`}
                  style={{ padding: '4px 14px', fontSize: '12.5px' }}
                  onClick={() => setStaffWarehouseFilter(wh.code)}
                >
                  {wh.name} ({staffMembers.filter((s) => s.warehouseCode === wh.code).length})
                </button>
              ))}
            </div>

            {/* Staff Directory Table */}
            <div className="settings-table-wrapper">
              <table className="settings-data-table">
                <thead>
                  <tr>
                    <th>Staff Member</th>
                    <th>Role / Designation</th>
                    <th>Assigned Warehouse</th>
                    <th>Primary Working Zone</th>
                    <th>Shift Hours</th>
                    <th>Access Level</th>
                    <th>Email Contact</th>
                    <th>Duty Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map((staff) => (
                    <tr key={staff.id}>
                      <td>
                        <div className="staff-user-cell">
                          <div className="staff-avatar-circle">{staff.initials}</div>
                          <div>
                            <div className="staff-name-title">{staff.name}</div>
                            <div className="staff-emp-id">{staff.id}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="role-pill">{staff.role}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: '#714b67' }}>
                          {staff.warehouseCode}
                        </span>
                        <div style={{ fontSize: '11.5px', color: '#756f82' }}>
                          {staff.warehouseName}
                        </div>
                      </td>
                      <td>
                        <span className="zone-pill">{staff.assignedZone}</span>
                      </td>
                      <td>
                        <span className="shift-pill">
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>schedule</span>
                          {staff.shift}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, fontSize: '12.5px', color: '#00476e' }}>
                          {staff.accessLevel}
                        </span>
                      </td>
                      <td>
                        <a
                          href={`mailto:${staff.email}`}
                          style={{ color: '#714b67', textDecoration: 'none', fontWeight: 600, fontSize: '13px' }}
                        >
                          {staff.email}
                        </a>
                      </td>
                      <td>
                        <span
                          className={
                            staff.status === 'On Shift'
                              ? 'staff-status-active'
                              : 'staff-status-break'
                          }
                        >
                          <span className="sync-dot-green"></span>
                          {staff.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* MODAL 1: ADD SUB-LOCATION */}
      {/* ============================================================== */}
      {showLocationModal && (
        <div className="modal-overlay" onClick={() => setShowLocationModal(false)}>
          <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3 className="modal-header-title">
                Add Sub-Location to {currentWarehouse.name}
              </h3>
              <button
                type="button"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#756f82' }}
                onClick={() => setShowLocationModal(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAddLocationSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-field-group">
                <label className="form-label">
                  Location Name <span className="req-star">*</span>
                </label>
                <input
                  type="text"
                  className="form-input-text"
                  placeholder="e.g. Rack A3 / Mezzanine Storage"
                  value={newLocationForm.name}
                  onChange={(e) => setNewLocationForm((p) => ({ ...p, name: e.target.value }))}
                  autoFocus
                  required
                />
              </div>

              <div className="form-field-group">
                <label className="form-label">
                  Path Identifier <span className="req-star">*</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 800, color: '#714b67', fontFamily: 'monospace' }}>
                    {currentWarehouse.code}/
                  </span>
                  <input
                    type="text"
                    className="form-input-text"
                    placeholder="Rack-A3"
                    value={newLocationForm.pathSuffix}
                    onChange={(e) => setNewLocationForm((p) => ({ ...p, pathSuffix: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-field-group">
                  <label className="form-label">Zone / Area</label>
                  <select
                    className="form-input-select"
                    value={newLocationForm.zone}
                    onChange={(e) => setNewLocationForm((p) => ({ ...p, zone: e.target.value }))}
                  >
                    <option value="Zone A (Ground Floor)">Zone A (Ground Floor)</option>
                    <option value="Zone B (Mezzanine)">Zone B (Mezzanine)</option>
                    <option value="Docking Staging">Docking Staging</option>
                    <option value="Cold Storage Vault">Cold Storage Vault</option>
                    <option value="QC Quarantine Area">QC Quarantine Area</option>
                  </select>
                </div>

                <div className="form-field-group">
                  <label className="form-label">Location Type</label>
                  <select
                    className="form-input-select"
                    value={newLocationForm.type}
                    onChange={(e) => setNewLocationForm((p) => ({ ...p, type: e.target.value }))}
                  >
                    <option value="Internal Storage">Internal Storage</option>
                    <option value="Incoming Staging">Incoming Staging</option>
                    <option value="Outgoing Dispatch">Outgoing Dispatch</option>
                    <option value="Quality Inspection">Quality Inspection</option>
                    <option value="Scrap / Damaged">Scrap / Damaged</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-field-group">
                  <label className="form-label">Max Capacity (Units)</label>
                  <input
                    type="number"
                    className="form-input-text"
                    value={newLocationForm.maxCapacity}
                    onChange={(e) => setNewLocationForm((p) => ({ ...p, maxCapacity: e.target.value }))}
                  />
                </div>

                <div className="form-field-group">
                  <label className="form-label">Custom Barcode</label>
                  <input
                    type="text"
                    className="form-input-text"
                    placeholder={`LOC-${currentWarehouse.code}-AUTO`}
                    value={newLocationForm.barcode}
                    onChange={(e) => setNewLocationForm((p) => ({ ...p, barcode: e.target.value }))}
                  />
                </div>
              </div>

              <div className="modal-footer-actions">
                <button
                  type="button"
                  className="btn-secondary-action"
                  onClick={() => setShowLocationModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary-action">
                  Create Sub-Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: ASSIGN STAFF MEMBER */}
      {/* ============================================================== */}
      {showStaffModal && (
        <div className="modal-overlay" onClick={() => setShowStaffModal(false)}>
          <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3 className="modal-header-title">Assign New Staff Member</h3>
              <button
                type="button"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#756f82' }}
                onClick={() => setShowStaffModal(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAddStaffSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-field-group">
                <label className="form-label">
                  Full Name <span className="req-star">*</span>
                </label>
                <input
                  type="text"
                  className="form-input-text"
                  placeholder="e.g. Alex Henderson"
                  value={newStaffForm.name}
                  onChange={(e) => setNewStaffForm((p) => ({ ...p, name: e.target.value }))}
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-field-group">
                  <label className="form-label">Role / Title</label>
                  <select
                    className="form-input-select"
                    value={newStaffForm.role}
                    onChange={(e) => setNewStaffForm((p) => ({ ...p, role: e.target.value }))}
                  >
                    <option value="Warehouse Supervisor">Warehouse Supervisor</option>
                    <option value="Lead Inbound Supervisor">Lead Inbound Supervisor</option>
                    <option value="Forklift Specialist">Forklift Specialist</option>
                    <option value="Picking & Dispatch Operator">Picking & Dispatch Operator</option>
                    <option value="Inventory Quality Auditor">Inventory Quality Auditor</option>
                    <option value="Receiving Clerk">Receiving Clerk</option>
                  </select>
                </div>

                <div className="form-field-group">
                  <label className="form-label">Assign to Facility</label>
                  <select
                    className="form-input-select"
                    value={newStaffForm.warehouseCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      setNewStaffForm((p) => ({
                        ...p,
                        warehouseCode: code,
                        assignedZone: `${code}/Stock1`,
                      }));
                    }}
                  >
                    {warehousesList.map((wh) => (
                      <option key={wh.code} value={wh.code}>
                        {wh.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-field-group">
                  <label className="form-label">Shift Hours</label>
                  <select
                    className="form-input-select"
                    value={newStaffForm.shift}
                    onChange={(e) => setNewStaffForm((p) => ({ ...p, shift: e.target.value }))}
                  >
                    <option value="Morning (06:00 - 14:30)">Morning (06:00 - 14:30)</option>
                    <option value="Day (08:00 - 17:00)">Day (08:00 - 17:00)</option>
                    <option value="Evening (14:00 - 22:30)">Evening (14:00 - 22:30)</option>
                    <option value="Night (22:00 - 06:30)">Night (22:00 - 06:30)</option>
                  </select>
                </div>

                <div className="form-field-group">
                  <label className="form-label">Security Access Level</label>
                  <select
                    className="form-input-select"
                    value={newStaffForm.accessLevel}
                    onChange={(e) => setNewStaffForm((p) => ({ ...p, accessLevel: e.target.value }))}
                  >
                    <option value="Operator">Operator</option>
                    <option value="Equipment Specialist">Equipment Specialist</option>
                    <option value="Warehouse Supervisor">Warehouse Supervisor</option>
                    <option value="Regional Admin">Regional Admin</option>
                  </select>
                </div>
              </div>

              <div className="form-field-group">
                <label className="form-label">
                  Email Contact <span className="req-star">*</span>
                </label>
                <input
                  type="email"
                  className="form-input-text"
                  placeholder="alex.h@stockflow.internal"
                  value={newStaffForm.email}
                  onChange={(e) => setNewStaffForm((p) => ({ ...p, email: e.target.value }))}
                  required
                />
              </div>

              <div className="modal-footer-actions">
                <button
                  type="button"
                  className="btn-secondary-action"
                  onClick={() => setShowStaffModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary-action">
                  Assign Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <AppFooter />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="settings-toast">
          <span className="material-symbols-outlined" style={{ color: '#6ffbbe' }}>
            check_circle
          </span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

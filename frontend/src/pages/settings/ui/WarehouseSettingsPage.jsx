import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ROUTES } from '../../../shared/config/routes';
import { AppHeader } from '../../../widgets/app-header';
import { AppFooter } from '../../../widgets/app-footer';
import { warehousesApi } from '../../../shared/api/warehousesApi';
import './WarehouseSettings.css';

const INITIAL_WAREHOUSES = [
  {
    id: 'WH-01',
    name: 'Central Warehouse (WH)',
    code: 'WH',
    category: 'Primary Distribution Center',
    city: 'San Francisco, CA',
    country: 'United States',
    address: '250 Executive Park Blvd, Suite 3400\nSan Francisco, CA 94134\nUnited States',
    incomingShipments: true,
    outgoingShipments: true,
    resupplySubcontractors: false,
    manager: 'Mitchell Admin',
    operatingHours: '24/7 Multi-Shift',
    totalCapacity: 2000,
    status: 'Active',
  },
  {
    id: 'WH-02',
    name: 'East Coast Distribution Hub (WH-EAST)',
    code: 'WH-EAST',
    category: 'Regional Fulfillment Center',
    city: 'Secaucus, NJ',
    country: 'United States',
    address: '100 Industrial Parkway, Dock 12\nSecaucus, NJ 07094\nUnited States',
    incomingShipments: true,
    outgoingShipments: true,
    resupplySubcontractors: true,
    manager: 'Sarah Jenkins',
    operatingHours: '06:00 - 23:00 EST',
    totalCapacity: 3500,
    status: 'Active',
  },
  {
    id: 'WH-03',
    name: 'Europe Distribution Center (WH-EU)',
    code: 'WH-EU',
    category: 'International Gateway Hub',
    city: 'Brussels',
    country: 'Belgium',
    address: 'Havenlaan 86C, Box 402\n1000 Brussels\nBelgium',
    incomingShipments: true,
    outgoingShipments: true,
    resupplySubcontractors: false,
    manager: 'Jean-Luc Dubois',
    operatingHours: '08:00 - 18:00 CET',
    totalCapacity: 1800,
    status: 'Active',
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
    status: 'On Shift',
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
  const queryClient = useQueryClient();

  // Queries
  const { data: apiWarehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesApi.listWarehouses(),
  });

  const { data: apiLocations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => warehousesApi.listLocations(),
  });

  const { data: apiStaff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => warehousesApi.listStaff(),
  });

  // Local states
  const [localWarehouses, setLocalWarehouses] = useState(INITIAL_WAREHOUSES);
  const [localSubLocations, setLocalSubLocations] = useState(INITIAL_SUB_LOCATIONS);
  const [staffMembers, setStaffMembers] = useState(INITIAL_STAFF_MEMBERS);

  const warehousesList = useMemo(() => {
    if (apiWarehouses.length > 0) {
      return apiWarehouses.map(w => ({
        id: w.id,
        name: w.name,
        code: w.code,
        category: 'Warehouse Facility',
        city: w.city || '',
        country: w.country || '',
        address: w.address || '',
        incomingShipments: true,
        outgoingShipments: true,
        resupplySubcontractors: false,
        manager: 'Mitchell Admin',
        operatingHours: '08:00 - 18:00',
        totalCapacity: 2500,
        status: w.is_active !== false ? 'Active' : 'Inactive',
      }));
    }
    return localWarehouses;
  }, [apiWarehouses, localWarehouses]);

  const subLocations = useMemo(() => {
    if (apiLocations.length > 0) {
      return apiLocations.map(l => ({
        id: l.id,
        warehouseCode: l.warehouse_id || 'WH',
        name: l.name,
        path: l.complete_name || l.name,
        zone: l.type || 'Storage Area',
        type: l.type === 'internal' ? 'Internal Storage' : l.type || 'Internal Storage',
        category: 'Standard Shelving',
        barcode: l.barcode || `LOC-${String(l.id).slice(-4)}`,
        itemsHeld: 150,
        maxCapacity: 300,
        status: l.is_active !== false ? 'In Service' : 'Out of Service',
      }));
    }
    return localSubLocations;
  }, [apiLocations, localSubLocations]);

  // Mutations
  const updateWarehouseMutation = useMutation({
    mutationFn: ({ id, payload }) => warehousesApi.updateWarehouse(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      showToast('Warehouse updated successfully');
      setIsModified(false);
    },
    onError: (err) => showToast(err.message || 'Failed to update warehouse'),
  });

  const createWarehouseMutation = useMutation({
    mutationFn: (payload) => warehousesApi.createWarehouse(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      showToast('Warehouse created successfully');
      setShowNewWarehouseModal(false);
    },
    onError: (err) => showToast(err.message || 'Failed to create warehouse'),
  });

  const createLocationMutation = useMutation({
    mutationFn: (payload) => warehousesApi.createLocation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      showToast('Location created successfully');
      setShowLocationModal(false);
    },
    onError: (err) => showToast(err.message || 'Failed to create location'),
  });

  // Active navigation tab
  const [activeSection, setActiveSection] = useState('overview');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(INITIAL_WAREHOUSES[0].id);
  const [isModified, setIsModified] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [facilityFilter, setFacilityFilter] = useState('ALL');

  // Modals state
  const [showNewWarehouseModal, setShowNewWarehouseModal] = useState(false);
  const [newWarehouseForm, setNewWarehouseForm] = useState({
    name: '',
    code: '',
    category: 'Regional Fulfillment Center',
    city: '',
    country: 'United States',
    address: '',
    manager: '',
    operatingHours: '08:00 - 18:00',
    totalCapacity: 2000,
    incomingShipments: true,
    outgoingShipments: true,
    resupplySubcontractors: false,
  });

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [newLocationForm, setNewLocationForm] = useState({
    warehouseCode: 'WH',
    name: '',
    zone: 'Zone A (Ground Floor)',
    type: 'Internal Storage',
    barcode: '',
    maxCapacity: 500,
  });

  const [showStaffModal, setShowStaffModal] = useState(false);
  const [newStaffForm, setNewStaffForm] = useState({
    name: '',
    role: 'Warehouse Operator',
    warehouseCode: 'WH',
    assignedZone: 'Main Stock Floor',
    shift: 'Morning (06:00 - 14:30)',
    accessLevel: 'Operator',
    email: '',
  });

  const currentWarehouse = useMemo(() => {
    return warehousesList.find(w => w.id === selectedWarehouseId || w.code === selectedWarehouseId) || warehousesList[0];
  }, [warehousesList, selectedWarehouseId]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleWarehouseFieldChange = (field, value) => {
    setLocalWarehouses(prev =>
      prev.map(w => (w.id === currentWarehouse.id ? { ...w, [field]: value } : w))
    );
    setIsModified(true);
  };

  const handleSave = () => {
    if (currentWarehouse.id && typeof currentWarehouse.id === 'number') {
      updateWarehouseMutation.mutate({
        id: currentWarehouse.id,
        payload: {
          name: currentWarehouse.name,
          code: currentWarehouse.code,
          address: currentWarehouse.address,
        },
      });
    } else {
      setIsModified(false);
      showToast(`Configuration for "${currentWarehouse.name}" saved successfully`);
    }
  };

  const handleDiscard = () => {
    setIsModified(false);
    showToast('Changes discarded');
  };

  // Filtered lists
  const filteredWarehouses = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return warehousesList.filter(wh =>
      wh.name.toLowerCase().includes(q) ||
      wh.code.toLowerCase().includes(q) ||
      wh.manager?.toLowerCase().includes(q) ||
      wh.city?.toLowerCase().includes(q)
    );
  }, [warehousesList, searchQuery]);

  const filteredSubLocations = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return subLocations.filter(loc => {
      const matchFacility = facilityFilter === 'ALL' || loc.warehouseCode === facilityFilter;
      const matchQuery =
        !q ||
        loc.name.toLowerCase().includes(q) ||
        loc.path.toLowerCase().includes(q) ||
        loc.zone.toLowerCase().includes(q) ||
        loc.barcode.toLowerCase().includes(q);
      return matchFacility && matchQuery;
    });
  }, [subLocations, searchQuery, facilityFilter]);

  const filteredStaff = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return staffMembers.filter(staff => {
      const matchFacility = facilityFilter === 'ALL' || staff.warehouseCode === facilityFilter;
      const matchQuery =
        !q ||
        staff.name.toLowerCase().includes(q) ||
        staff.role.toLowerCase().includes(q) ||
        staff.assignedZone.toLowerCase().includes(q) ||
        staff.email.toLowerCase().includes(q);
      return matchFacility && matchQuery;
    });
  }, [staffMembers, searchQuery, facilityFilter]);

  // Handlers
  const handleCreateWarehouseSubmit = (e) => {
    e.preventDefault();
    if (!newWarehouseForm.name.trim() || !newWarehouseForm.code.trim()) {
      showToast('Please enter warehouse name and code');
      return;
    }
    const cleanCode = newWarehouseForm.code.trim().toUpperCase();
    const cleanName = newWarehouseForm.name.trim();

    createWarehouseMutation.mutate({
      name: cleanName,
      code: cleanCode,
      address: newWarehouseForm.address || `${cleanName}\n${newWarehouseForm.city || ''}`,
    });

    const newWh = {
      id: `WH-${Date.now().toString().slice(-4)}`,
      name: cleanName,
      code: cleanCode,
      category: newWarehouseForm.category,
      city: newWarehouseForm.city || 'San Francisco, CA',
      country: newWarehouseForm.country || 'United States',
      address: newWarehouseForm.address || `${cleanName}\n${newWarehouseForm.city || ''}`,
      incomingShipments: newWarehouseForm.incomingShipments,
      outgoingShipments: newWarehouseForm.outgoingShipments,
      resupplySubcontractors: newWarehouseForm.resupplySubcontractors,
      manager: newWarehouseForm.manager || 'Mitchell Admin',
      operatingHours: newWarehouseForm.operatingHours || '08:00 - 18:00',
      totalCapacity: Number(newWarehouseForm.totalCapacity) || 2000,
      status: 'Active',
    };
    setLocalWarehouses(prev => [newWh, ...prev]);
    setSelectedWarehouseId(newWh.id);
  };

  const handleCreateLocationSubmit = (e) => {
    e.preventDefault();
    if (!newLocationForm.name.trim()) {
      showToast('Please enter a location name');
      return;
    }

    createLocationMutation.mutate({
      name: newLocationForm.name.trim(),
      type: 'internal',
    });

    const newLoc = {
      id: `LOC-${Date.now().toString().slice(-4)}`,
      warehouseCode: newLocationForm.warehouseCode,
      name: newLocationForm.name.trim(),
      path: `${newLocationForm.warehouseCode}/${newLocationForm.name.trim().replace(/\s+/g, '-')}`,
      zone: newLocationForm.zone,
      type: newLocationForm.type,
      category: 'Standard Shelving',
      barcode: newLocationForm.barcode || `LOC-${Date.now().toString().slice(-4)}`,
      itemsHeld: 0,
      maxCapacity: Number(newLocationForm.maxCapacity) || 500,
      status: 'In Service',
    };
    setLocalSubLocations(prev => [newLoc, ...prev]);
  };

  const handleAddStaffSubmit = (e) => {
    e.preventDefault();
    if (!newStaffForm.name.trim() || !newStaffForm.email.trim()) {
      showToast('Please enter staff name and email address');
      return;
    }
    const initials = newStaffForm.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    const targetWh = warehousesList.find(w => w.code === newStaffForm.warehouseCode) || currentWarehouse;
    const newStaff = {
      id: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      name: newStaffForm.name.trim(),
      initials: initials || 'ST',
      role: newStaffForm.role,
      warehouseCode: targetWh.code,
      warehouseName: targetWh.name,
      assignedZone: newStaffForm.assignedZone,
      shift: newStaffForm.shift,
      accessLevel: newStaffForm.accessLevel,
      email: newStaffForm.email.trim(),
      status: 'On Shift',
    };
    setStaffMembers(prev => [newStaff, ...prev]);
    setShowStaffModal(false);
    showToast(`Assigned ${newStaff.name} to ${targetWh.name}`);
  };

  const handleDeleteLocation = (id) => {
    setLocalSubLocations(prev => prev.filter(l => l.id !== id));
    showToast('Sub-location removed');
  };

  return (
    <div className="settings-shell">
      <AppHeader />

      {/* ── Control Ribbon ────────────────────────────────────────── */}
      <div className="control-ribbon">
        <div className="ribbon-left">
          {activeSection === 'overview' && (
            <button
              className="btn-new-record"
              type="button"
              onClick={() => setShowNewWarehouseModal(true)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
              <span>New Warehouse</span>
            </button>
          )}

          {activeSection === 'profile' && (
            <button
              className="btn-new-record"
              type="button"
              onClick={handleSave}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>save</span>
              <span>Save Profile</span>
            </button>
          )}

          {activeSection === 'locations' && (
            <button
              className="btn-new-record"
              type="button"
              onClick={() => setShowLocationModal(true)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_location</span>
              <span>New Sub-Location</span>
            </button>
          )}

          {activeSection === 'staff' && (
            <button
              className="btn-new-record"
              type="button"
              onClick={() => setShowStaffModal(true)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person_add</span>
              <span>Assign Staff</span>
            </button>
          )}

          <div className="breadcrumbs">
            <Link to={ROUTES.DASHBOARD} className="crumb-parent">StockFlow</Link>
            <span className="crumb-separator">/</span>
            <span className="crumb-parent">Settings</span>
            <span className="crumb-separator">/</span>
            <h1 className="crumb-current">
              {activeSection === 'overview' && 'Warehouses Directory'}
              {activeSection === 'profile' && `Facility Profile (${currentWarehouse.code})`}
              {activeSection === 'locations' && 'Sub-Locations & Racks'}
              {activeSection === 'staff' && 'Staff & Deployments'}
            </h1>
          </div>
        </div>

        <div className="ribbon-right">
          {/* Global Search Bar */}
          <div className="search-container">
            <span className="material-symbols-outlined" style={{ color: '#756f82', fontSize: '19px' }}>search</span>
            <input
              type="text"
              className="search-input"
              placeholder={
                activeSection === 'overview' ? 'Search warehouses...' :
                activeSection === 'locations' ? 'Search rack, zone, barcode...' :
                activeSection === 'staff' ? 'Search personnel, role, email...' :
                'Search facility details...'
              }
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
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
              </button>
            )}
          </div>

          {/* Facility Filter Dropdown (Used in Sub-Locations & Staff tabs) */}
          {(activeSection === 'locations' || activeSection === 'staff') && (
            <div className="facility-dropdown-wrapper">
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#714b67' }}>warehouse</span>
              <select
                className="facility-select"
                value={facilityFilter}
                onChange={(e) => setFacilityFilter(e.target.value)}
              >
                <option value="ALL">All Facilities</option>
                {warehousesList.map(w => (
                  <option key={w.code} value={w.code}>{w.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ── Slim Top Tabs Ribbon (Clean & Uncluttered) ─────────────── */}
      <div className="settings-subnav-ribbon">
        <div className="settings-subnav-pills">
          <button
            type="button"
            className={`settings-pill-tab ${activeSection === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveSection('overview')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>domain</span>
            <span>All Warehouses ({warehousesList.length})</span>
          </button>

          <button
            type="button"
            className={`settings-pill-tab ${activeSection === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveSection('profile')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>warehouse</span>
            <span>Facility Profile ({currentWarehouse.code})</span>
          </button>

          <button
            type="button"
            className={`settings-pill-tab ${activeSection === 'locations' ? 'active' : ''}`}
            onClick={() => setActiveSection('locations')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>location_on</span>
            <span>Sub-Locations ({subLocations.length})</span>
          </button>

          <button
            type="button"
            className={`settings-pill-tab ${activeSection === 'staff' ? 'active' : ''}`}
            onClick={() => setActiveSection('staff')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>badge</span>
            <span>Staff Deployments ({staffMembers.length})</span>
          </button>
        </div>

        <div className="records-count-text">
          <span>
            {activeSection === 'overview' && `${filteredWarehouses.length} operating facilities`}
            {activeSection === 'profile' && `Managing: ${currentWarehouse.name}`}
            {activeSection === 'locations' && `${filteredSubLocations.length} storage locations`}
            {activeSection === 'staff' && `${filteredStaff.length} active personnel`}
          </span>
        </div>
      </div>

      {/* ── Main Canvas ───────────────────────────────────────────── */}
      <main className="settings-canvas">

        {/* ── 1. ALL WAREHOUSES DIRECTORY ─────────────────────────── */}
        {activeSection === 'overview' && (
          <div className="settings-sheet-card">
            <div className="enterprise-section-header">
              <div>
                <h2 className="section-heading-title">Operating Facilities</h2>
                <p className="section-heading-sub">
                  Primary distribution centers, fulfillment depots, and storage nodes.
                </p>
              </div>

              <button
                type="button"
                className="btn-add-entity"
                onClick={() => setShowNewWarehouseModal(true)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                <span>New Warehouse</span>
              </button>
            </div>

            <div className="settings-table-wrapper">
              <table className="settings-data-table">
                <thead>
                  <tr>
                    <th>Facility Name</th>
                    <th>Code</th>
                    <th>Facility Manager</th>
                    <th>City / Location</th>
                    <th>Sub-Locations</th>
                    <th>Stationed Staff</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWarehouses.map((wh) => {
                    const whLocs = subLocations.filter(l => l.warehouseCode === wh.code);
                    const whStaff = staffMembers.filter(s => s.warehouseCode === wh.code);

                    return (
                      <tr
                        key={wh.id}
                        onClick={() => {
                          setSelectedWarehouseId(wh.id);
                          setActiveSection('profile');
                        }}
                      >
                        <td>
                          <div className="wh-title-cell">
                            <div className="wh-table-icon">
                              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                                warehouse
                              </span>
                            </div>
                            <span className="wh-name-text">{wh.name}</span>
                          </div>
                        </td>
                        <td>
                          <span className="wh-code-badge">{wh.code}</span>
                        </td>
                        <td>
                          <span className="wh-manager-text">{wh.manager}</span>
                        </td>
                        <td>
                          <span className="wh-city-text">{wh.city || wh.country}</span>
                        </td>
                        <td>
                          <span className="wh-count-tag">
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>shelves</span>
                            {whLocs.length} zones
                          </span>
                        </td>
                        <td>
                          <span className="wh-count-tag">
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>badge</span>
                            {whStaff.length} staff
                          </span>
                        </td>
                        <td>
                          <span className="status-badge-active">
                            <span className="sync-dot-green" />
                            {wh.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn-manage-row"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedWarehouseId(wh.id);
                              setActiveSection('profile');
                            }}
                          >
                            <span>Manage</span>
                            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>arrow_forward</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 2. FACILITY PROFILE (IMPROVED & CLEAN) ──────────────── */}
        {activeSection === 'profile' && (
          <div className="settings-sheet-card">
            {/* Facility Header Card */}
            <div className="profile-hero-banner">
              <div className="profile-identity">
                <div className="profile-icon-box">
                  <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>warehouse</span>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 className="profile-title">{currentWarehouse.name}</h2>
                    <span className="wh-code-badge">{currentWarehouse.code}</span>
                  </div>
                  <p className="profile-subtitle">
                    {currentWarehouse.category} • Lead: <strong>{currentWarehouse.manager}</strong> • {currentWarehouse.city || 'United States'}
                  </p>
                </div>
              </div>

              <div className="profile-stat-pills">
                <div className="profile-stat-box">
                  <span className="profile-stat-num">
                    {subLocations.filter(l => l.warehouseCode === currentWarehouse.code).length}
                  </span>
                  <span className="profile-stat-lbl">Sub-Locations</span>
                </div>
                <div className="profile-stat-box">
                  <span className="profile-stat-num">
                    {staffMembers.filter(s => s.warehouseCode === currentWarehouse.code).length}
                  </span>
                  <span className="profile-stat-lbl">Personnel</span>
                </div>
                <div className="profile-stat-box">
                  <span className="profile-stat-num">{currentWarehouse.totalCapacity}</span>
                  <span className="profile-stat-lbl">Pallet Capacity</span>
                </div>
              </div>
            </div>

            {/* Profile Form Grid */}
            <div className="profile-form-layout">
              {/* Left Column: Details */}
              <div className="profile-section-col">
                <h3 className="profile-section-heading">Facility Information</h3>
                
                <div className="form-field-group">
                  <label className="form-label">Warehouse Name</label>
                  <input
                    type="text"
                    className="form-input-text"
                    value={currentWarehouse.name}
                    onChange={(e) => handleWarehouseFieldChange('name', e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-field-group">
                    <label className="form-label">Short Code</label>
                    <input
                      type="text"
                      className="form-input-text"
                      style={{ textTransform: 'uppercase' }}
                      value={currentWarehouse.code}
                      onChange={(e) => handleWarehouseFieldChange('code', e.target.value.toUpperCase())}
                    />
                  </div>

                  <div className="form-field-group">
                    <label className="form-label">Facility Category</label>
                    <input
                      type="text"
                      className="form-input-text"
                      value={currentWarehouse.category}
                      onChange={(e) => handleWarehouseFieldChange('category', e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-field-group">
                    <label className="form-label">Facility Lead / Manager</label>
                    <input
                      type="text"
                      className="form-input-text"
                      value={currentWarehouse.manager}
                      onChange={(e) => handleWarehouseFieldChange('manager', e.target.value)}
                    />
                  </div>

                  <div className="form-field-group">
                    <label className="form-label">Operating Schedule</label>
                    <input
                      type="text"
                      className="form-input-text"
                      value={currentWarehouse.operatingHours}
                      onChange={(e) => handleWarehouseFieldChange('operatingHours', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-field-group">
                  <label className="form-label">Full Address & Dock Instructions</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={currentWarehouse.address}
                    onChange={(e) => handleWarehouseFieldChange('address', e.target.value)}
                  />
                </div>
              </div>

              {/* Right Column: Routing & Rules */}
              <div className="profile-section-col">
                <h3 className="profile-section-heading">Operational Routing Rules</h3>

                <div className="rules-card-container">
                  <label className="rule-toggle-card">
                    <input
                      type="checkbox"
                      className="rule-checkbox"
                      checked={currentWarehouse.incomingShipments}
                      onChange={(e) => handleWarehouseFieldChange('incomingShipments', e.target.checked)}
                    />
                    <div className="rule-content">
                      <div className="rule-title">Direct Inbound Receipts</div>
                      <div className="rule-desc">Receive incoming supplier vendor stock directly in 1 step without dock staging.</div>
                    </div>
                  </label>

                  <label className="rule-toggle-card">
                    <input
                      type="checkbox"
                      className="rule-checkbox"
                      checked={currentWarehouse.outgoingShipments}
                      onChange={(e) => handleWarehouseFieldChange('outgoingShipments', e.target.checked)}
                    />
                    <div className="rule-content">
                      <div className="rule-title">Direct Outbound Deliveries</div>
                      <div className="rule-desc">Pick, pack, and dispatch sales orders straight from stock storage bins.</div>
                    </div>
                  </label>

                  <label className="rule-toggle-card">
                    <input
                      type="checkbox"
                      className="rule-checkbox"
                      checked={currentWarehouse.resupplySubcontractors}
                      onChange={(e) => handleWarehouseFieldChange('resupplySubcontractors', e.target.checked)}
                    />
                    <div className="rule-content">
                      <div className="rule-title">Resupply Subcontractors & Hubs</div>
                      <div className="rule-desc">Enable automated replenishment routes to secondary external locations.</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Profile Action Bar */}
            <div className="profile-action-bar">
              <div className="profile-status-note">
                <span className={isModified ? 'sync-dot-amber' : 'sync-dot-green'} />
                <span>{isModified ? 'Unsaved profile modifications' : 'Configuration synchronized with system'}</span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary-action"
                  onClick={handleDiscard}
                  disabled={!isModified}
                >
                  Discard
                </button>
                <button
                  type="button"
                  className="btn-primary-action"
                  onClick={handleSave}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>save</span>
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── 3. SUB-LOCATIONS & RACKS ────────────────────────────── */}
        {activeSection === 'locations' && (
          <div className="settings-sheet-card">
            <div className="enterprise-section-header">
              <div>
                <h2 className="section-heading-title">Storage Sub-Locations & Racks</h2>
                <p className="section-heading-sub">
                  Manage storage bays, cold vaults, pick aisles, and loading dock staging zones.
                </p>
              </div>

              <button
                type="button"
                className="btn-add-entity"
                onClick={() => setShowLocationModal(true)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_location</span>
                <span>New Sub-Location</span>
              </button>
            </div>

            <div className="settings-table-wrapper">
              <table className="settings-data-table">
                <thead>
                  <tr>
                    <th>Facility</th>
                    <th>Location Name</th>
                    <th>Hierarchy Path</th>
                    <th>Zone</th>
                    <th>Type</th>
                    <th>Barcode</th>
                    <th>Capacity Load</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubLocations.map((loc) => {
                    const loadPct = loc.maxCapacity > 0 ? Math.round((loc.itemsHeld / loc.maxCapacity) * 100) : 0;
                    return (
                      <tr key={loc.id}>
                        <td>
                          <span className="wh-code-badge">{loc.warehouseCode}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="material-symbols-outlined" style={{ color: '#714b67', fontSize: '18px' }}>
                              shelves
                            </span>
                            <span style={{ fontWeight: 700, color: '#212529' }}>{loc.name}</span>
                          </div>
                        </td>
                        <td>
                          <span className="location-path-mono">{loc.path}</span>
                        </td>
                        <td>
                          <span className="zone-pill">{loc.zone}</span>
                        </td>
                        <td>
                          <span className="wh-city-text">{loc.type}</span>
                        </td>
                        <td>
                          <span className="barcode-badge">{loc.barcode}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#212529' }}>
                              {loc.itemsHeld} / {loc.maxCapacity} units ({loadPct}%)
                            </div>
                            <div className="progress-bar-bg">
                              <div
                                className="progress-bar-fill"
                                style={{ width: `${Math.min(loadPct, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="status-badge-active">
                            <span className="sync-dot-green" />
                            {loc.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn-delete-row"
                            onClick={() => handleDeleteLocation(loc.id)}
                            title="Delete Sub-Location"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 4. STAFF & DEPLOYMENTS (CLEAN & PROPORTIONAL) ────────── */}
        {activeSection === 'staff' && (
          <div className="settings-sheet-card">
            <div className="enterprise-section-header">
              <div>
                <h2 className="section-heading-title">Warehouse Staff & Deployments</h2>
                <p className="section-heading-sub">
                  Active operations personnel, assigned facility nodes, and duty shift rotations.
                </p>
              </div>

              <button
                type="button"
                className="btn-add-entity"
                onClick={() => setShowStaffModal(true)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person_add</span>
                <span>Assign Staff</span>
              </button>
            </div>

            <div className="settings-table-wrapper">
              <table className="settings-data-table">
                <thead>
                  <tr>
                    <th>Staff Member</th>
                    <th>Role / Designation</th>
                    <th>Assigned Facility</th>
                    <th>Working Zone</th>
                    <th>Shift Rotation</th>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="wh-code-badge">{staff.warehouseCode}</span>
                          <span style={{ fontWeight: 600, color: '#212529', fontSize: '13px' }}>
                            {staff.warehouseName}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="zone-pill">{staff.assignedZone}</span>
                      </td>
                      <td>
                        <span className="shift-pill">
                          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>schedule</span>
                          {staff.shift}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, fontSize: '13px', color: '#714b67' }}>
                          {staff.accessLevel}
                        </span>
                      </td>
                      <td>
                        <a
                          href={`mailto:${staff.email}`}
                          className="staff-email-link"
                        >
                          {staff.email}
                        </a>
                      </td>
                      <td>
                        <span className={staff.status === 'On Shift' ? 'status-badge-active' : 'status-badge-break'}>
                          <span className={staff.status === 'On Shift' ? 'sync-dot-green' : 'sync-dot-amber'} />
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

      {/* ── MODAL 1: CREATE WAREHOUSE ─────────────────────────────── */}
      {showNewWarehouseModal && (
        <div className="modal-overlay" onClick={() => setShowNewWarehouseModal(false)}>
          <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="profile-icon-box" style={{ width: '40px', height: '40px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>domain_add</span>
                </div>
                <h3 className="modal-header-title">Create Warehouse Facility</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowNewWarehouseModal(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateWarehouseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
                <div className="form-field-group">
                  <label className="form-label">Warehouse Name <span className="req-star">*</span></label>
                  <input
                    type="text"
                    className="form-input-text"
                    placeholder="e.g. Pacific Logistics Hub"
                    value={newWarehouseForm.name}
                    onChange={(e) => setNewWarehouseForm(p => ({ ...p, name: e.target.value }))}
                    autoFocus
                    required
                  />
                </div>

                <div className="form-field-group">
                  <label className="form-label">Short Code <span className="req-star">*</span></label>
                  <input
                    type="text"
                    className="form-input-text"
                    style={{ textTransform: 'uppercase' }}
                    placeholder="WH-PACIFIC"
                    value={newWarehouseForm.code}
                    onChange={(e) => setNewWarehouseForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-field-group">
                  <label className="form-label">Category</label>
                  <input
                    type="text"
                    className="form-input-text"
                    value={newWarehouseForm.category}
                    onChange={(e) => setNewWarehouseForm(p => ({ ...p, category: e.target.value }))}
                  />
                </div>

                <div className="form-field-group">
                  <label className="form-label">Facility Lead</label>
                  <input
                    type="text"
                    className="form-input-text"
                    placeholder="Mitchell Admin"
                    value={newWarehouseForm.manager}
                    onChange={(e) => setNewWarehouseForm(p => ({ ...p, manager: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-field-group">
                <label className="form-label">Address</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Street address, Dock number, City, State..."
                  value={newWarehouseForm.address}
                  onChange={(e) => setNewWarehouseForm(p => ({ ...p, address: e.target.value }))}
                />
              </div>

              <div className="modal-actions-row">
                <button
                  type="button"
                  className="btn-secondary-action"
                  onClick={() => setShowNewWarehouseModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary-action">
                  Create Warehouse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: ADD SUB-LOCATION ─────────────────────────────── */}
      {showLocationModal && (
        <div className="modal-overlay" onClick={() => setShowLocationModal(false)}>
          <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="profile-icon-box" style={{ width: '40px', height: '40px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>add_location</span>
                </div>
                <h3 className="modal-header-title">Add Storage Sub-Location</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowLocationModal(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateLocationSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-field-group">
                  <label className="form-label">Target Facility</label>
                  <select
                    className="form-input-select"
                    value={newLocationForm.warehouseCode}
                    onChange={(e) => setNewLocationForm(p => ({ ...p, warehouseCode: e.target.value }))}
                  >
                    {warehousesList.map(w => (
                      <option key={w.code} value={w.code}>{w.name} ({w.code})</option>
                    ))}
                  </select>
                </div>

                <div className="form-field-group">
                  <label className="form-label">Location Name <span className="req-star">*</span></label>
                  <input
                    type="text"
                    className="form-input-text"
                    placeholder="e.g. Rack B - High Aisle"
                    value={newLocationForm.name}
                    onChange={(e) => setNewLocationForm(p => ({ ...p, name: e.target.value }))}
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-field-group">
                  <label className="form-label">Zone / Area</label>
                  <input
                    type="text"
                    className="form-input-text"
                    value={newLocationForm.zone}
                    onChange={(e) => setNewLocationForm(p => ({ ...p, zone: e.target.value }))}
                  />
                </div>

                <div className="form-field-group">
                  <label className="form-label">Max Pallet Capacity</label>
                  <input
                    type="number"
                    className="form-input-text"
                    value={newLocationForm.maxCapacity}
                    onChange={(e) => setNewLocationForm(p => ({ ...p, maxCapacity: e.target.value }))}
                  />
                </div>
              </div>

              <div className="modal-actions-row">
                <button
                  type="button"
                  className="btn-secondary-action"
                  onClick={() => setShowLocationModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary-action">
                  Save Sub-Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: ASSIGN STAFF ─────────────────────────────────── */}
      {showStaffModal && (
        <div className="modal-overlay" onClick={() => setShowStaffModal(false)}>
          <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="profile-icon-box" style={{ width: '40px', height: '40px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>person_add</span>
                </div>
                <h3 className="modal-header-title">Assign Staff Member</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowStaffModal(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAddStaffSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-field-group">
                  <label className="form-label">Full Name <span className="req-star">*</span></label>
                  <input
                    type="text"
                    className="form-input-text"
                    placeholder="e.g. Alex Morgan"
                    value={newStaffForm.name}
                    onChange={(e) => setNewStaffForm(p => ({ ...p, name: e.target.value }))}
                    autoFocus
                    required
                  />
                </div>

                <div className="form-field-group">
                  <label className="form-label">Email Address <span className="req-star">*</span></label>
                  <input
                    type="email"
                    className="form-input-text"
                    placeholder="alex.m@stockflow.internal"
                    value={newStaffForm.email}
                    onChange={(e) => setNewStaffForm(p => ({ ...p, email: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-field-group">
                  <label className="form-label">Role / Designation</label>
                  <input
                    type="text"
                    className="form-input-text"
                    value={newStaffForm.role}
                    onChange={(e) => setNewStaffForm(p => ({ ...p, role: e.target.value }))}
                  />
                </div>

                <div className="form-field-group">
                  <label className="form-label">Assigned Facility</label>
                  <select
                    className="form-input-select"
                    value={newStaffForm.warehouseCode}
                    onChange={(e) => setNewStaffForm(p => ({ ...p, warehouseCode: e.target.value }))}
                  >
                    {warehousesList.map(w => (
                      <option key={w.code} value={w.code}>{w.name} ({w.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-field-group">
                  <label className="form-label">Shift Rotation</label>
                  <select
                    className="form-input-select"
                    value={newStaffForm.shift}
                    onChange={(e) => setNewStaffForm(p => ({ ...p, shift: e.target.value }))}
                  >
                    <option value="Morning (06:00 - 14:30)">Morning (06:00 - 14:30)</option>
                    <option value="General (08:00 - 17:00)">General (08:00 - 17:00)</option>
                    <option value="Evening (14:00 - 22:30)">Evening (14:00 - 22:30)</option>
                    <option value="Night (22:00 - 06:30)">Night (22:00 - 06:30)</option>
                  </select>
                </div>

                <div className="form-field-group">
                  <label className="form-label">Access Level</label>
                  <select
                    className="form-input-select"
                    value={newStaffForm.accessLevel}
                    onChange={(e) => setNewStaffForm(p => ({ ...p, accessLevel: e.target.value }))}
                  >
                    <option value="Operator">Operator</option>
                    <option value="Equipment Specialist">Equipment Specialist</option>
                    <option value="Warehouse Supervisor">Warehouse Supervisor</option>
                    <option value="Regional Admin">Regional Admin</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions-row">
                <button
                  type="button"
                  className="btn-secondary-action"
                  onClick={() => setShowStaffModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary-action">
                  Confirm Staff Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

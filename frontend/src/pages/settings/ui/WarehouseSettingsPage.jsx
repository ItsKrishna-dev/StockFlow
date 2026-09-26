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
  const queryClient = useQueryClient();

  // Real data from backend (falls back to mock lists when empty)
  const { data: apiWarehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesApi.listWarehouses(),
  });

  const { data: apiLocations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => warehousesApi.listLocations(),
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

  // Merge: use real API data if available, otherwise fall back to seed mocks
  const warehousesList = apiWarehouses.length > 0
    ? apiWarehouses.map(w => ({
        id: w.id,
        name: w.name,
        code: w.code,
        category: 'Warehouse',
        city: w.city || '',
        country: w.country || '',
        address: w.address || '',
        incomingShipments: true,
        outgoingShipments: true,
        resupplySubcontractors: false,
        manager: '',
        operatingHours: '',
        totalCapacity: 0,
        status: w.is_active !== false ? 'Active' : 'Inactive',
      }))
    : INITIAL_WAREHOUSES;

  const subLocations = apiLocations.length > 0
    ? apiLocations.map(l => ({
        id: l.id,
        warehouseCode: l.warehouse_id,
        name: l.name,
        path: l.complete_name || l.name,
        zone: l.type,
        type: l.type === 'internal' ? 'Internal Storage' : l.type,
        category: l.type,
        barcode: l.barcode || '',
        itemsHeld: 0,
        maxCapacity: 0,
        status: l.is_active !== false ? 'In Service' : 'Out of Service',
      }))
    : INITIAL_SUB_LOCATIONS;

  const [selectedWarehouseId, setSelectedWarehouseId] = useState(null);
  // Staff: not yet in backend API, use mock data for demo
  const [staffMembers] = useState(INITIAL_STAFF_MEMBERS);

  // Active navigation tab: 'overview' | 'profile' | 'locations' | 'staff'
  const [activeSection, setActiveSection] = useState('overview');
  const [isModified, setIsModified] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Search queries
  const [warehouseSearchQuery, setWarehouseSearchQuery] = useState('');
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [staffSearchQuery, setStaffSearchQuery] = useState('');

  // Filters
  const [locationWarehouseFilter, setLocationWarehouseFilter] = useState('ALL');
  const [staffWarehouseFilter, setStaffWarehouseFilter] = useState('ALL');

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
    autoCreateDefaultLocations: true,
  });

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [newLocationForm, setNewLocationForm] = useState({
    warehouseCode: 'WH',
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

  // Create New Warehouse Submit
  const handleCreateWarehouseSubmit = (e) => {
    e.preventDefault();
    const cleanCode = newWarehouseForm.code.trim().toUpperCase();
    const cleanName = newWarehouseForm.name.trim();

    if (!cleanName || !cleanCode) {
      showToast('Please enter warehouse name and unique short code');
      return;
    }

    if (warehousesList.some((w) => w.code === cleanCode)) {
      showToast(`Warehouse code "${cleanCode}" already exists. Please choose a unique code.`);
      return;
    }

    const newWhId = `WH-${Date.now().toString().slice(-4)}`;
    const newWarehouse = {
      id: newWhId,
      name: cleanName,
      code: cleanCode,
      category: newWarehouseForm.category,
      city: newWarehouseForm.city || 'Undisclosed City',
      country: newWarehouseForm.country || 'United States',
      address: newWarehouseForm.address || `${cleanName}\n${newWarehouseForm.city || ''}`,
      incomingShipments: newWarehouseForm.incomingShipments,
      outgoingShipments: newWarehouseForm.outgoingShipments,
      resupplySubcontractors: newWarehouseForm.resupplySubcontractors,
      manager: newWarehouseForm.manager || 'Unassigned Lead',
      operatingHours: newWarehouseForm.operatingHours,
      totalCapacity: Number(newWarehouseForm.totalCapacity) || 2000,
      status: 'Active',
    };

    setWarehousesList((prev) => [...prev, newWarehouse]);

    // Automatically generate standard sub-locations if selected
    if (newWarehouseForm.autoCreateDefaultLocations) {
      const generatedLocations = [
        {
          id: `LOC-${Date.now().toString().slice(-3)}-1`,
          warehouseCode: cleanCode,
          name: 'Main Storage Racks',
          path: `${cleanCode}/Stock1`,
          zone: 'Zone A (Ground Floor)',
          type: 'Internal Storage',
          category: 'Standard Pallet Rack (5T)',
          barcode: `LOC-${cleanCode}-001`,
          itemsHeld: 0,
          maxCapacity: Math.round(Number(newWarehouseForm.totalCapacity) * 0.6) || 1200,
          status: 'In Service',
        },
        {
          id: `LOC-${Date.now().toString().slice(-3)}-2`,
          warehouseCode: cleanCode,
          name: 'Receiving Dock 1',
          path: `${cleanCode}/Input-Dock-1`,
          zone: 'Docking Staging',
          type: 'Incoming Staging',
          category: 'Cross-Dock Buffer',
          barcode: `LOC-${cleanCode}-002`,
          itemsHeld: 0,
          maxCapacity: 300,
          status: 'In Service',
        },
        {
          id: `LOC-${Date.now().toString().slice(-3)}-3`,
          warehouseCode: cleanCode,
          name: 'Outbound Dispatch Bay',
          path: `${cleanCode}/Output-Dock-1`,
          zone: 'Dispatch Bay',
          type: 'Outgoing Dispatch',
          category: 'Fast Packing Station',
          barcode: `LOC-${cleanCode}-003`,
          itemsHeld: 0,
          maxCapacity: 300,
          status: 'In Service',
        },
      ];
      setSubLocations((prev) => [...prev, ...generatedLocations]);
    }

    setSelectedWarehouseId(newWhId);
    setShowNewWarehouseModal(false);
    setNewWarehouseForm({
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
      autoCreateDefaultLocations: true,
    });
    showToast(`Warehouse "${cleanName} (${cleanCode})" created successfully!`);
  };

  // Add Location Submit
  const handleAddLocationSubmit = (e) => {
    e.preventDefault();
    if (!newLocationForm.name.trim() || !newLocationForm.pathSuffix.trim()) {
      showToast('Please enter both location name and path identifier');
      return;
    }

    const targetWhCode = newLocationForm.warehouseCode || currentWarehouse.code;
    const fullPath = `${targetWhCode}/${newLocationForm.pathSuffix.replace(/^\/+/, '')}`;
    const newLoc = {
      id: `LOC-${Date.now().toString().slice(-4)}`,
      warehouseCode: targetWhCode,
      name: newLocationForm.name,
      path: fullPath,
      zone: newLocationForm.zone,
      type: newLocationForm.type,
      category: newLocationForm.category,
      barcode: newLocationForm.barcode || `LOC-${targetWhCode}-${Date.now().toString().slice(-3)}`,
      itemsHeld: 0,
      maxCapacity: Number(newLocationForm.maxCapacity) || 500,
      status: 'In Service',
    };

    setSubLocations((prev) => [newLoc, ...prev]);
    setShowLocationModal(false);
    setNewLocationForm({
      warehouseCode: currentWarehouse.code,
      name: '',
      pathSuffix: '',
      zone: 'Zone A (Ground Floor)',
      type: 'Internal Storage',
      category: 'Standard Pallet Rack (5T)',
      barcode: '',
      maxCapacity: 500,
    });
    showToast(`Added sub-location "${fullPath}"`);
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
      status: 'On Shift',
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

  // Filtered warehouses
  const filteredWarehouses = warehousesList.filter((wh) => {
    const q = warehouseSearchQuery.toLowerCase();
    return (
      wh.name.toLowerCase().includes(q) ||
      wh.code.toLowerCase().includes(q) ||
      wh.manager.toLowerCase().includes(q) ||
      (wh.city && wh.city.toLowerCase().includes(q))
    );
  });

  // Filtered sub-locations
  const filteredSubLocations = subLocations.filter((loc) => {
    const matchesWh = locationWarehouseFilter === 'ALL' || loc.warehouseCode === locationWarehouseFilter;
    const q = locationSearchQuery.toLowerCase();
    const matchesQuery =
      loc.name.toLowerCase().includes(q) ||
      loc.path.toLowerCase().includes(q) ||
      loc.zone.toLowerCase().includes(q) ||
      loc.type.toLowerCase().includes(q);
    return matchesWh && matchesQuery;
  });

  // Filtered staff members
  const filteredStaff = staffMembers.filter((staff) => {
    const matchesWh = staffWarehouseFilter === 'ALL' || staff.warehouseCode === staffWarehouseFilter;
    const q = staffSearchQuery.toLowerCase();
    const matchesQuery =
      staff.name.toLowerCase().includes(q) ||
      staff.role.toLowerCase().includes(q) ||
      staff.assignedZone.toLowerCase().includes(q) ||
      staff.email.toLowerCase().includes(q);
    return matchesWh && matchesQuery;
  });

  return (
    <div className="settings-shell">
      <AppHeader />

      {/* Control Ribbon */}
      <div className="control-ribbon">
        <div className="ribbon-left">
          <button
            className="btn-new-record"
            type="button"
            onClick={() => {
              if (activeSection === 'overview') setShowNewWarehouseModal(true);
              else if (activeSection === 'locations') setShowLocationModal(true);
              else if (activeSection === 'staff') setShowStaffModal(true);
              else setShowNewWarehouseModal(true);
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
            <span>
              {activeSection === 'overview'
                ? 'New Warehouse'
                : activeSection === 'locations'
                ? 'New Location'
                : activeSection === 'staff'
                ? 'New Staff'
                : 'New Warehouse'}
            </span>
          </button>

          <div className="breadcrumbs">
            <Link to={ROUTES.DASHBOARD} className="crumb-parent">StockFlow</Link>
            <span className="crumb-separator">/</span>
            <span className="crumb-parent" onClick={() => setActiveSection('overview')}>Configuration</span>
            <span className="crumb-separator">/</span>
            <h1 className="crumb-current">
              {activeSection === 'overview'
                ? 'Warehouses Directory'
                : activeSection === 'profile'
                ? `Warehouse (${currentWarehouse.code})`
                : activeSection === 'locations'
                ? 'Sub-Locations & Racks'
                : 'Staff & Deployments'}
            </h1>
          </div>

          <div className="action-tool-buttons">
            <button
              className="tool-icon-btn"
              title="Export Warehouse Directory to CSV"
              type="button"
              onClick={() => {
                const headers = ['ID', 'Name', 'Code', 'Category', 'City', 'Country', 'Manager', 'Status'];
                const rows = warehousesList.map((w) => [
                  w.id,
                  `"${w.name}"`,
                  w.code,
                  `"${w.category}"`,
                  `"${w.city}"`,
                  `"${w.country}"`,
                  `"${w.manager}"`,
                  w.status,
                ]);
                const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                const link = document.createElement('a');
                link.setAttribute('href', encodeURI(csv));
                link.setAttribute('download', 'warehouses_directory.csv');
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                showToast('Warehouse directory exported to CSV');
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>file_download</span>
            </button>
            <button
              className="tool-icon-btn"
              title="Print Warehouse Catalog"
              type="button"
              onClick={() => { window.print(); showToast('Printing warehouse catalog'); }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>print</span>
            </button>
            <button
              className="tool-icon-btn"
              title="Global Location Rules"
              type="button"
              onClick={() => navigate(ROUTES.LOCATION_SETTINGS)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>alt_route</span>
            </button>
          </div>
        </div>

        <div className="ribbon-right">
          <div className="search-container">
            <span className="material-symbols-outlined" style={{ color: '#80747a', fontSize: '19px' }}>search</span>
            <input
              type="text"
              className="search-input"
              placeholder={
                activeSection === 'overview'
                  ? 'Search warehouse, code, manager, city...'
                  : activeSection === 'locations'
                  ? 'Search racks, sub-locations, zones...'
                  : activeSection === 'staff'
                  ? 'Search staff, role, email...'
                  : 'Search...'
              }
              value={
                activeSection === 'overview'
                  ? warehouseSearchQuery
                  : activeSection === 'locations'
                  ? locationSearchQuery
                  : activeSection === 'staff'
                  ? staffSearchQuery
                  : ''
              }
              onChange={(e) => {
                if (activeSection === 'overview') setWarehouseSearchQuery(e.target.value);
                else if (activeSection === 'locations') setLocationSearchQuery(e.target.value);
                else if (activeSection === 'staff') setStaffSearchQuery(e.target.value);
              }}
            />
            {(activeSection === 'overview' && warehouseSearchQuery) ||
            (activeSection === 'locations' && locationSearchQuery) ||
            (activeSection === 'staff' && staffSearchQuery) ? (
              <button
                type="button"
                className="chip-close"
                onClick={() => {
                  setWarehouseSearchQuery('');
                  setLocationSearchQuery('');
                  setStaffSearchQuery('');
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
              </button>
            ) : null}
          </div>

          {activeSection !== 'overview' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select
                className="form-input-select"
                style={{ width: 'auto', minWidth: '180px', padding: '5px 10px', fontSize: '13px', fontWeight: 600 }}
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
          )}
        </div>
      </div>

      {/* Slim Info & Subnav Bar */}
      <div className="settings-subnav-ribbon">
        <div className="settings-subnav-pills">
          <button
            type="button"
            className={`settings-pill-tab ${activeSection === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveSection('overview')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>domain</span>
            <span>Warehouses Directory ({warehousesList.length})</span>
          </button>

          <button
            type="button"
            className={`settings-pill-tab ${activeSection === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveSection('profile')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>warehouse</span>
            <span>Facility Profile ({currentWarehouse.code})</span>
          </button>

          <button
            type="button"
            className={`settings-pill-tab ${activeSection === 'locations' ? 'active' : ''}`}
            onClick={() => setActiveSection('locations')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>location_on</span>
            <span>Sub-Locations & Racks ({subLocations.length})</span>
          </button>

          <button
            type="button"
            className={`settings-pill-tab ${activeSection === 'staff' ? 'active' : ''}`}
            onClick={() => setActiveSection('staff')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>badge</span>
            <span>Staff Deployments ({staffMembers.length})</span>
          </button>
        </div>

        <div className="records-count-text">
          <span>
            {activeSection === 'overview'
              ? `${filteredWarehouses.length} records | Tip: Click any row to expand sub-locations and staff`
              : activeSection === 'locations'
              ? `${filteredSubLocations.length} locations | Storage zones across facilities`
              : activeSection === 'staff'
              ? `${filteredStaff.length} personnel | Active warehouse deployments`
              : `Managing ${currentWarehouse.name}`}
          </span>
        </div>
      </div>

      {/* Main Canvas Container */}
      <main className="settings-canvas">
        {/* ============================================================== */}
        {/* SECTION 1: MASTER ALL WAREHOUSES DIRECTORY (SIMPLE & CLEAN)   */}
        {/* ============================================================== */}
        {activeSection === 'overview' && (
          <div className="settings-sheet-card">
            {/* Simple Top Header */}
            <div className="enterprise-section-header">
              <div>
                <h2 className="section-heading-title">Warehouses</h2>
                <p className="section-heading-sub">
                  Overview of all operating facilities, storage sub-locations, and stationed staff.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-add-entity"
                  onClick={() => setShowNewWarehouseModal(true)}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                  <span>New Warehouse</span>
                </button>
              </div>
            </div>

            {/* Simple Warehouses Master Table */}
            <div className="settings-table-wrapper">
              <table className="settings-data-table">
                <thead>
                  <tr>
                    <th>Warehouse</th>
                    <th>Code</th>
                    <th>Manager</th>
                    <th>Location / City</th>
                    <th>Sub-Locations</th>
                    <th>Stationed Staff</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWarehouses.map((wh) => {
                    const whLocs = subLocations.filter((l) => l.warehouseCode === wh.code);
                    const whStaff = staffMembers.filter((s) => s.warehouseCode === wh.code);

                    return (
                      <tr
                        key={wh.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setSelectedWarehouseId(wh.id);
                          setActiveSection('profile');
                        }}
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="material-symbols-outlined" style={{ color: '#714b67', fontSize: '20px' }}>
                              warehouse
                            </span>
                            <span style={{ fontWeight: 700, color: '#212529' }}>{wh.name}</span>
                          </div>
                        </td>
                        <td>
                          <span className="wh-code-badge">{wh.code}</span>
                        </td>
                        <td>
                          <span style={{ color: '#4e444a', fontWeight: 600 }}>{wh.manager}</span>
                        </td>
                        <td>
                          <span style={{ color: '#756f82' }}>{wh.city || wh.country}</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="count-badge-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedWarehouseId(wh.id);
                              setLocationWarehouseFilter(wh.code);
                              setActiveSection('locations');
                            }}
                            title="View locations for this warehouse"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>shelves</span>
                            <span>{whLocs.length} locations</span>
                          </button>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="count-badge-btn staff-badge"
                            onClick={(e) => {
                              e.stopPropagation();
                              setStaffWarehouseFilter(wh.code);
                              setActiveSection('staff');
                            }}
                            title="View staff stationed here"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>badge</span>
                            <span>{whStaff.length} staff</span>
                          </button>
                        </td>
                        <td>
                          <span className="status-badge-active">
                            <span className="sync-dot-green"></span>
                            {wh.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="action-pill-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedWarehouseId(wh.id);
                              setActiveSection('profile');
                            }}
                          >
                            <span>Manage</span>
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_forward</span>
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

        {/* ============================================================== */}
        {/* SECTION 2: WAREHOUSE PROFILE & CONFIGURATION */}
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
                  onClick={() => {
                    setLocationWarehouseFilter(currentWarehouse.code);
                    setActiveSection('locations');
                  }}
                  title="View Locations of this warehouse"
                >
                  <span className="material-symbols-outlined stat-icon" style={{ fontSize: '24px' }}>
                    location_on
                  </span>
                  <div>
                    <div className="stat-value">
                      {subLocations.filter((l) => l.warehouseCode === currentWarehouse.code).length}
                    </div>
                    <div className="stat-label">Sub-Locations</div>
                  </div>
                </button>

                <button
                  type="button"
                  className="smart-stat-btn"
                  onClick={() => {
                    setStaffWarehouseFilter(currentWarehouse.code);
                    setActiveSection('staff');
                  }}
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
                <label className="form-label">Facility Category</label>
                <input
                  type="text"
                  className="form-input-text"
                  value={currentWarehouse.category || 'Regional Distribution Hub'}
                  onChange={(e) => handleWarehouseFieldChange('category', e.target.value)}
                />
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

            {/* Profile Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1.5px solid #f0edf2', paddingTop: '18px', marginTop: '24px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#756f82' }}>
                <span className={isModified ? 'sync-dot-amber' : 'sync-dot-green'}></span>
                <span>{isModified ? 'Unsaved modifications in profile' : 'Configuration synchronized with database'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-secondary-action"
                  onClick={handleDiscard}
                  disabled={!isModified}
                  style={{ opacity: !isModified ? 0.5 : 1 }}
                >
                  Discard
                </button>
                <button
                  type="button"
                  className="btn-primary-action"
                  onClick={handleSave}
                  disabled={!isModified}
                  style={{ opacity: !isModified ? 0.7 : 1 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>save</span>
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SECTION 3: WAREHOUSE SUB-LOCATIONS & ZONES                     */}
        {/* ============================================================== */}
        {activeSection === 'locations' && (
          <div className="settings-sheet-card">
            <div className="enterprise-section-header">
              <div>
                <h2 className="section-heading-title">
                  Sub-Locations, Storage Racks & Docks
                </h2>
                <p className="section-heading-sub">
                  Define specific storage racks, aisles, bays, and inspection zones across all warehouses.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="table-search-box">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#756f82' }}>search</span>
                  <input
                    type="text"
                    className="table-search-input"
                    placeholder="Search rack, path, zone..."
                    value={locationSearchQuery}
                    onChange={(e) => setLocationSearchQuery(e.target.value)}
                  />
                  {locationSearchQuery && (
                    <button
                      type="button"
                      className="search-clear-btn"
                      onClick={() => setLocationSearchQuery('')}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className="btn-add-entity"
                  onClick={() => {
                    setNewLocationForm((p) => ({ ...p, warehouseCode: currentWarehouse.code }));
                    setShowLocationModal(true);
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>add_location</span>
                  <span>+ Add Sub-Location</span>
                </button>
              </div>
            </div>

            {/* Warehouse Filter Chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#756f82' }}>Filter by Facility:</span>
              <button
                type="button"
                className={`filter-pill-btn ${locationWarehouseFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setLocationWarehouseFilter('ALL')}
              >
                All Facilities ({subLocations.length})
              </button>
              {warehousesList.map((wh) => (
                <button
                  key={wh.code}
                  type="button"
                  className={`filter-pill-btn ${locationWarehouseFilter === wh.code ? 'active' : ''}`}
                  onClick={() => setLocationWarehouseFilter(wh.code)}
                >
                  {wh.name} ({subLocations.filter((l) => l.warehouseCode === wh.code).length})
                </button>
              ))}
            </div>

            {/* Sub-Locations Table */}
            <div className="settings-table-wrapper">
              <table className="settings-data-table">
                <thead>
                  <tr>
                    <th>Warehouse</th>
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
                  {filteredSubLocations.map((loc) => {
                    const parentWh = warehousesList.find((w) => w.code === loc.warehouseCode);
                    const loadPct = loc.maxCapacity > 0 ? Math.round((loc.itemsHeld / loc.maxCapacity) * 100) : 0;
                    return (
                      <tr key={loc.id}>
                        <td>
                          <span className="wh-code-badge">{loc.warehouseCode}</span>
                          <div style={{ fontSize: '11.5px', color: '#756f82' }}>
                            {parentWh ? parentWh.name : loc.warehouseCode}
                          </div>
                        </td>
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
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{ fontWeight: 700, color: '#212529', fontSize: '12.5px' }}>
                              {loc.itemsHeld} / {loc.maxCapacity} units ({loadPct}%)
                            </span>
                            <div className="progress-bar-bg" style={{ width: '120px' }}>
                              <div
                                className="progress-bar-fill"
                                style={{
                                  width: `${Math.min(loadPct, 100)}%`,
                                  backgroundColor: loadPct > 85 ? '#e11d48' : '#714b67',
                                }}
                              ></div>
                            </div>
                          </div>
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SECTION 4: STAFF MEMBERS DIRECTORY (ADMIN TABLE)              */}
        {/* ============================================================== */}
        {activeSection === 'staff' && (
          <div className="settings-sheet-card">
            <div className="enterprise-section-header">
              <div>
                <h2 className="section-heading-title">Warehouse Staff & Deployment Directory</h2>
                <p className="section-heading-sub">
                  Admin view of active personnel, assigned warehouses, stationed storage zones, work shifts, and clearance.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="table-search-box">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#756f82' }}>search</span>
                  <input
                    type="text"
                    className="table-search-input"
                    placeholder="Search staff name, role, zone..."
                    value={staffSearchQuery}
                    onChange={(e) => setStaffSearchQuery(e.target.value)}
                  />
                  {staffSearchQuery && (
                    <button
                      type="button"
                      className="search-clear-btn"
                      onClick={() => setStaffSearchQuery('')}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                    </button>
                  )}
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
            </div>

            {/* Warehouse Filter Chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#756f82' }}>Filter Facility:</span>
              <button
                type="button"
                className={`filter-pill-btn ${staffWarehouseFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setStaffWarehouseFilter('ALL')}
              >
                All Facilities ({staffMembers.length})
              </button>
              {warehousesList.map((wh) => (
                <button
                  key={wh.code}
                  type="button"
                  className={`filter-pill-btn ${staffWarehouseFilter === wh.code ? 'active' : ''}`}
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="wh-code-badge">{staff.warehouseCode}</span>
                          <span style={{ fontWeight: 700, color: '#212529', fontSize: '13px' }}>
                            {staff.warehouseName}
                          </span>
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
      {/* MODAL 0: CREATE NEW WAREHOUSE                                  */}
      {/* ============================================================== */}
      {showNewWarehouseModal && (
        <div className="modal-overlay" onClick={() => setShowNewWarehouseModal(false)}>
          <div className="modal-content-card" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="sheet-icon-box" style={{ width: '40px', height: '40px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>domain_add</span>
                </div>
                <div>
                  <h3 className="modal-header-title">Create New Warehouse Facility</h3>
                  <p style={{ fontSize: '12px', color: '#756f82', margin: 0 }}>
                    Register an operating facility, storage capacity, and automatic sub-location routing.
                  </p>
                </div>
              </div>
              <button
                type="button"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#756f82' }}
                onClick={() => setShowNewWarehouseModal(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateWarehouseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
                <div className="form-field-group">
                  <label className="form-label">
                    Warehouse Name <span className="req-star">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input-text"
                    placeholder="e.g. Pacific Northwest Fulfillment Center"
                    value={newWarehouseForm.name}
                    onChange={(e) => setNewWarehouseForm((p) => ({ ...p, name: e.target.value }))}
                    autoFocus
                    required
                  />
                </div>

                <div className="form-field-group">
                  <label className="form-label">
                    Short Code <span className="req-star">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input-text"
                    style={{ textTransform: 'uppercase' }}
                    placeholder="WH-PACIFIC"
                    value={newWarehouseForm.code}
                    onChange={(e) => setNewWarehouseForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-field-group">
                  <label className="form-label">Facility Category</label>
                  <select
                    className="form-input-select"
                    value={newWarehouseForm.category}
                    onChange={(e) => setNewWarehouseForm((p) => ({ ...p, category: e.target.value }))}
                  >
                    <option value="Primary Distribution Center">Primary Distribution Center</option>
                    <option value="Regional Fulfillment Center">Regional Fulfillment Center</option>
                    <option value="Cross-Dock Depot">Cross-Dock Depot</option>
                    <option value="Cold Chain Storage Vault">Cold Chain Storage Vault</option>
                    <option value="International Gateway Hub">International Gateway Hub</option>
                  </select>
                </div>

                <div className="form-field-group">
                  <label className="form-label">Facility Lead / Manager</label>
                  <input
                    type="text"
                    className="form-input-text"
                    placeholder="e.g. Rachel Adams"
                    value={newWarehouseForm.manager}
                    onChange={(e) => setNewWarehouseForm((p) => ({ ...p, manager: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-field-group">
                  <label className="form-label">City / Region</label>
                  <input
                    type="text"
                    className="form-input-text"
                    placeholder="e.g. Seattle, WA"
                    value={newWarehouseForm.city}
                    onChange={(e) => setNewWarehouseForm((p) => ({ ...p, city: e.target.value }))}
                  />
                </div>

                <div className="form-field-group">
                  <label className="form-label">Operating Schedule</label>
                  <input
                    type="text"
                    className="form-input-text"
                    placeholder="e.g. 06:00 - 22:00 PST"
                    value={newWarehouseForm.operatingHours}
                    onChange={(e) => setNewWarehouseForm((p) => ({ ...p, operatingHours: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-field-group">
                <label className="form-label">Full Street Address & Dock Location</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="e.g. 450 Logistics Way, Dock Bay 10, Seattle, WA 98101"
                  value={newWarehouseForm.address}
                  onChange={(e) => setNewWarehouseForm((p) => ({ ...p, address: e.target.value }))}
                />
              </div>

              <div style={{ backgroundColor: '#fcfbfd', border: '1.5px solid #f0edf2', borderRadius: '8px', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#212529' }}>Logistics Configuration</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#4e444a', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      style={{ accentColor: '#714b67' }}
                      checked={newWarehouseForm.incomingShipments}
                      onChange={(e) => setNewWarehouseForm((p) => ({ ...p, incomingShipments: e.target.checked }))}
                    />
                    <span>Direct Inbound Receiving</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#4e444a', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      style={{ accentColor: '#714b67' }}
                      checked={newWarehouseForm.outgoingShipments}
                      onChange={(e) => setNewWarehouseForm((p) => ({ ...p, outgoingShipments: e.target.checked }))}
                    />
                    <span>Direct Outbound Dispatch</span>
                  </label>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#714b67', fontWeight: 700, cursor: 'pointer', marginTop: '4px' }}>
                  <input
                    type="checkbox"
                    style={{ accentColor: '#714b67' }}
                    checked={newWarehouseForm.autoCreateDefaultLocations}
                    onChange={(e) => setNewWarehouseForm((p) => ({ ...p, autoCreateDefaultLocations: e.target.checked }))}
                  />
                  <span>Auto-generate standard sub-locations (Stock Floor, Inbound Dock, Dispatch Bay)</span>
                </label>
              </div>

              <div className="modal-footer-actions">
                <button
                  type="button"
                  className="btn-secondary-action"
                  onClick={() => setShowNewWarehouseModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary-action">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check</span>
                  <span>Register Warehouse</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: ADD SUB-LOCATION                                      */}
      {/* ============================================================== */}
      {showLocationModal && (
        <div className="modal-overlay" onClick={() => setShowLocationModal(false)}>
          <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3 className="modal-header-title">Add Sub-Location / Storage Rack</h3>
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
                <label className="form-label">Target Warehouse Facility</label>
                <select
                  className="form-input-select"
                  value={newLocationForm.warehouseCode}
                  onChange={(e) => setNewLocationForm((p) => ({ ...p, warehouseCode: e.target.value }))}
                >
                  {warehousesList.map((wh) => (
                    <option key={wh.code} value={wh.code}>
                      {wh.name} ({wh.code})
                    </option>
                  ))}
                </select>
              </div>

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
                    {newLocationForm.warehouseCode}/
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
                    placeholder={`LOC-${newLocationForm.warehouseCode}-AUTO`}
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
      {/* MODAL 2: ASSIGN STAFF MEMBER                                  */}
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
                        {wh.name} ({wh.code})
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

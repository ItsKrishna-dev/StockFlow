import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ROUTES } from '../../../shared/config/routes';
import { AppHeader } from '../../../widgets/app-header';
import { AppFooter } from '../../../widgets/app-footer';
import { warehousesApi } from '../../../shared/api/warehousesApi';
import './WarehouseSettings.css';

// ─── Default Demo Seed Fallbacks ──────────────────────────────────────────────
const INITIAL_WAREHOUSES = [
  {
    id: 'WH-01',
    name: 'Central Warehouse (WH)',
    code: 'WH',
    address: '250 Executive Park Blvd, Suite 3400, San Francisco, CA 94134',
    status: 'Active',
  },
  {
    id: 'WH-02',
    name: 'East Coast Distribution Hub (WH-EAST)',
    code: 'WH-EAST',
    address: '100 Industrial Parkway, Dock 12, Secaucus, NJ 07094',
    status: 'Active',
  },
  {
    id: 'WH-03',
    name: 'Europe Distribution Center (WH-EU)',
    code: 'WH-EU',
    address: 'Havenlaan 86C, Box 402, 1000 Brussels, Belgium',
    status: 'Active',
  },
];

const INITIAL_SUB_LOCATIONS = [
  {
    id: 'LOC-001',
    warehouseCode: 'WH',
    name: 'Main Stock Floor',
    code: 'WH/Stock1',
    type: 'Internal Storage',
    status: 'In Service',
  },
  {
    id: 'LOC-002',
    warehouseCode: 'WH',
    name: 'North Racks - Heavy Items',
    code: 'WH/Rack-A',
    type: 'Internal Storage',
    status: 'In Service',
  },
  {
    id: 'LOC-003',
    warehouseCode: 'WH-EAST',
    name: 'East Receiving Bay 1',
    code: 'WH-EAST/Bay-1',
    type: 'Incoming Staging',
    status: 'In Service',
  },
  {
    id: 'LOC-004',
    warehouseCode: 'WH-EU',
    name: 'Brussels Central Floor',
    code: 'WH-EU/Stock1',
    type: 'Internal Storage',
    status: 'In Service',
  },
];

const INITIAL_STAFF_MEMBERS = [
  {
    id: 'STF-001',
    name: 'Marcus Vance',
    role: 'Warehouse Operator',
    warehouseCode: 'WH',
    warehouseName: 'Central Warehouse (WH)',
    loginId: 'marcus_vance',
    email: 'marcus.v@stockflow.internal',
    status: 'Active',
    initials: 'MV',
  },
  {
    id: 'STF-002',
    name: 'Sarah Jenkins',
    role: 'Warehouse Staff',
    warehouseCode: 'WH-EAST',
    warehouseName: 'East Coast Distribution Hub',
    loginId: 'sarah_j',
    email: 'sarah.j@stockflow.internal',
    status: 'Active',
    initials: 'SJ',
  },
  {
    id: 'STF-003',
    name: 'Jean-Luc Dubois',
    role: 'Warehouse Operator',
    warehouseCode: 'WH-EU',
    warehouseName: 'Europe Distribution Center',
    loginId: 'jeanluc_d',
    email: 'jeanluc.d@stockflow.eu',
    status: 'Active',
    initials: 'JD',
  },
];

export default function WarehouseSettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // ─── Real Backend Queries ──────────────────────────────────────────────────
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

  // ─── Data Normalization ───────────────────────────────────────────────────
  const warehousesList = useMemo(() => {
    if (apiWarehouses && apiWarehouses.length > 0) {
      return apiWarehouses.map((w) => ({
        id: w.id,
        name: w.name,
        code: w.code,
        address: w.address || '',
        status: w.is_active !== false ? 'Active' : 'Inactive',
      }));
    }
    return INITIAL_WAREHOUSES;
  }, [apiWarehouses]);

  const subLocations = useMemo(() => {
    if (apiLocations && apiLocations.length > 0) {
      return apiLocations.map((l) => {
        // Resolve warehouse code from warehouse_id
        const parentWh = warehousesList.find((w) => w.id === l.warehouse_id);
        return {
          id: l.id,
          warehouseId: l.warehouse_id,
          warehouseCode: parentWh ? parentWh.code : (l.warehouse_id || 'WH'),
          warehouseName: parentWh ? parentWh.name : 'Warehouse',
          name: l.name,
          code: l.code,
          type: l.type === 'internal' ? 'Internal Storage' : l.type,
          status: l.is_active !== false ? 'In Service' : 'Out of Service',
        };
      });
    }
    return INITIAL_SUB_LOCATIONS;
  }, [apiLocations, warehousesList]);

  const staffMembers = useMemo(() => {
    if (apiStaff && apiStaff.length > 0) {
      return apiStaff.map((s) => {
        const parentWh = warehousesList.find((w) => w.id === s.warehouse_id);
        const whName = s.warehouse_name || (parentWh ? parentWh.name : 'Warehouse');
        const whCode = parentWh ? parentWh.code : 'WH';
        const initials = (s.full_name || 'WS')
          .split(' ')
          .map((n) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();

        return {
          id: s.id,
          name: s.full_name,
          role: s.role === 'warehouse_staff' ? 'Warehouse Operator' : s.role,
          warehouseId: s.warehouse_id,
          warehouseCode: whCode,
          warehouseName: whName,
          loginId: s.login_id || s.email.split('@')[0],
          email: s.email,
          status: s.is_active !== false ? 'Active' : 'Inactive',
          initials,
        };
      });
    }
    return INITIAL_STAFF_MEMBERS;
  }, [apiStaff, warehousesList]);

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const createWarehouseMutation = useMutation({
    mutationFn: (payload) => warehousesApi.createWarehouse(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      showToast(`Warehouse "${data.name} (${data.code})" created with locations successfully!`);
      setShowNewWarehouseModal(false);
      setNewWarehouseForm({
        name: '',
        code: '',
        numLocations: 1,
        locationNames: ['Main Stock Floor'],
      });
    },
    onError: (err) => showToast(err.message || 'Failed to create warehouse'),
  });

  const updateWarehouseMutation = useMutation({
    mutationFn: ({ id, payload }) => warehousesApi.updateWarehouse(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      showToast(`Warehouse "${data.name} (${data.code})" updated successfully!`);
      setShowEditWarehouseModal(false);
      setEditingWarehouse(null);
    },
    onError: (err) => showToast(err.message || 'Failed to update warehouse'),
  });

  const addStaffMutation = useMutation({
    mutationFn: ({ warehouseId, payload }) =>
      warehousesApi.addWarehouseStaff(warehouseId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      showToast(`Staff "${data.full_name}" registered! Credentials sent to ${data.email}.`);
      setNewStaffForm({ full_name: '', email: '', password: '' });
      setShowAddStaffForm(false);
    },
    onError: (err) => showToast(err.message || 'Failed to add staff member'),
  });

  // ─── View & Filter States ──────────────────────────────────────────────────
  // Sections: 'overview' (Warehouses Directory) | 'locations' | 'staff'
  const [activeSection, setActiveSection] = useState('overview');

  // Filter by particular warehouse: 'ALL' or specific warehouse id/code
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState('ALL');

  // Search filters
  const [warehouseSearchQuery, setWarehouseSearchQuery] = useState('');
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [staffSearchQuery, setStaffSearchQuery] = useState('');

  // ─── Modal States ──────────────────────────────────────────────────────────
  // 1. Create Warehouse Modal (Strictly: Name, Short Code, Number of Locations -> Dynamic Location Names)
  const [showNewWarehouseModal, setShowNewWarehouseModal] = useState(false);
  const [newWarehouseForm, setNewWarehouseForm] = useState({
    name: '',
    code: '',
    numLocations: 1,
    locationNames: ['Main Stock Floor'],
  });

  const handleNumLocationsChange = (count) => {
    const n = Math.max(0, Math.min(25, parseInt(count, 10) || 0));
    setNewWarehouseForm((prev) => {
      const current = [...prev.locationNames];
      const updated = Array.from({ length: n }, (_, i) => current[i] || `Stock Location ${i + 1}`);
      return {
        ...prev,
        numLocations: n,
        locationNames: updated,
      };
    });
  };

  const handleLocationNameChange = (index, value) => {
    setNewWarehouseForm((prev) => {
      const names = [...prev.locationNames];
      names[index] = value;
      return { ...prev, locationNames: names };
    });
  };

  const handleCreateWarehouseSubmit = (e) => {
    e.preventDefault();
    const cleanName = newWarehouseForm.name.trim();
    const cleanCode = newWarehouseForm.code.trim().toUpperCase();

    if (!cleanName || !cleanCode) {
      showToast('Please enter both warehouse name and short code');
      return;
    }

    const locNames = newWarehouseForm.locationNames
      .map((l) => l.trim())
      .filter(Boolean);

    createWarehouseMutation.mutate({
      name: cleanName,
      code: cleanCode,
      location_names: locNames,
    });
  };

  // 2. Edit Warehouse Modal (Details + Staff Addition with real-time email dispatch)
  const [showEditWarehouseModal, setShowEditWarehouseModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [editWarehouseForm, setEditWarehouseForm] = useState({
    name: '',
    code: '',
    address: '',
    is_active: true,
  });

  const [showAddStaffForm, setShowAddStaffForm] = useState(false);
  const [newStaffForm, setNewStaffForm] = useState({
    full_name: '',
    email: '',
    password: '',
  });

  const handleOpenEditWarehouse = (wh) => {
    setEditingWarehouse(wh);
    setEditWarehouseForm({
      name: wh.name,
      code: wh.code,
      address: wh.address || '',
      is_active: wh.status !== 'Inactive',
    });
    setShowAddStaffForm(false);
    setNewStaffForm({ full_name: '', email: '', password: '' });
    setShowEditWarehouseModal(true);
  };

  const handleUpdateWarehouseSubmit = (e) => {
    e.preventDefault();
    if (!editingWarehouse) return;
    updateWarehouseMutation.mutate({
      id: editingWarehouse.id,
      payload: {
        name: editWarehouseForm.name.trim(),
        code: editWarehouseForm.code.trim().toUpperCase(),
        address: editWarehouseForm.address.trim(),
        is_active: editWarehouseForm.is_active,
      },
    });
  };

  const handleAddStaffSubmit = (e) => {
    e.preventDefault();
    if (!editingWarehouse) return;
    if (!newStaffForm.full_name.trim() || !newStaffForm.email.trim() || !newStaffForm.password.trim()) {
      showToast('Please fill in staff name, email, and password');
      return;
    }
    addStaffMutation.mutate({
      warehouseId: editingWarehouse.id,
      payload: {
        full_name: newStaffForm.full_name.trim(),
        email: newStaffForm.email.trim(),
        password: newStaffForm.password.trim(),
      },
    });
  };

  // ─── Filtered Data Lists ──────────────────────────────────────────────────
  const filteredWarehouses = useMemo(() => {
    return warehousesList.filter((wh) => {
      const matchesFilter =
        selectedWarehouseFilter === 'ALL' ||
        wh.id === selectedWarehouseFilter ||
        wh.code === selectedWarehouseFilter;
      const q = warehouseSearchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        wh.name.toLowerCase().includes(q) ||
        wh.code.toLowerCase().includes(q) ||
        (wh.address && wh.address.toLowerCase().includes(q));
      return matchesFilter && matchesSearch;
    });
  }, [warehousesList, selectedWarehouseFilter, warehouseSearchQuery]);

  const filteredSubLocations = useMemo(() => {
    return subLocations.filter((loc) => {
      const matchesFilter =
        selectedWarehouseFilter === 'ALL' ||
        loc.warehouseId === selectedWarehouseFilter ||
        loc.warehouseCode === selectedWarehouseFilter;
      const q = locationSearchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        loc.name.toLowerCase().includes(q) ||
        loc.code.toLowerCase().includes(q) ||
        loc.type.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [subLocations, selectedWarehouseFilter, locationSearchQuery]);

  const filteredStaff = useMemo(() => {
    return staffMembers.filter((staff) => {
      const matchesFilter =
        selectedWarehouseFilter === 'ALL' ||
        staff.warehouseId === selectedWarehouseFilter ||
        staff.warehouseCode === selectedWarehouseFilter;
      const q = staffSearchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        staff.name.toLowerCase().includes(q) ||
        staff.email.toLowerCase().includes(q) ||
        (staff.loginId && staff.loginId.toLowerCase().includes(q));
      return matchesFilter && matchesSearch;
    });
  }, [staffMembers, selectedWarehouseFilter, staffSearchQuery]);

  return (
    <div className="settings-shell">
      <AppHeader />

      {/* Control Ribbon */}
      <div className="control-ribbon">
        <div className="ribbon-left">
          <button
            className="btn-new-record"
            type="button"
            onClick={() => setShowNewWarehouseModal(true)}
            title="Create New Warehouse"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
            <span>New Warehouse</span>
          </button>
        </div>

        <div className="ribbon-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Global Warehouse Filter */}
          <div className="warehouse-filter-container">
            <span className="warehouse-filter-label">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>filter_alt</span>
              Filter Warehouse:
            </span>
            <select
              className="warehouse-filter-select"
              value={selectedWarehouseFilter}
              onChange={(e) => setSelectedWarehouseFilter(e.target.value)}
              title="Filter views to a particular warehouse"
            >
              <option value="ALL">All Warehouses ({warehousesList.length})</option>
              {warehousesList.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name} ({wh.code})
                </option>
              ))}
            </select>
            {selectedWarehouseFilter !== 'ALL' && (
              <button
                type="button"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ba1a1a', display: 'flex' }}
                onClick={() => setSelectedWarehouseFilter('ALL')}
                title="Clear warehouse filter"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>cancel</span>
              </button>
            )}
          </div>

          {/* Search Input for Current Section */}
          <div className="search-container">
            <span className="material-symbols-outlined" style={{ color: '#80747a', fontSize: '19px' }}>search</span>
            <input
              type="text"
              className="search-input"
              placeholder={
                activeSection === 'overview'
                  ? 'Search warehouse name, code...'
                  : activeSection === 'locations'
                  ? 'Search location name, code...'
                  : 'Search staff name, email...'
              }
              value={
                activeSection === 'overview'
                  ? warehouseSearchQuery
                  : activeSection === 'locations'
                  ? locationSearchQuery
                  : staffSearchQuery
              }
              onChange={(e) => {
                const val = e.target.value;
                if (activeSection === 'overview') setWarehouseSearchQuery(val);
                else if (activeSection === 'locations') setLocationSearchQuery(val);
                else setStaffSearchQuery(val);
              }}
            />
          </div>
        </div>
      </div>

      {/* Subnav Ribbon: Switch between Warehouses, Locations, and Staff */}
      <div className="settings-subnav-ribbon">
        <div className="settings-subnav-pills">
          <button
            type="button"
            className={`settings-pill-tab ${activeSection === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveSection('overview')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>warehouse</span>
            <span>Warehouses ({filteredWarehouses.length})</span>
          </button>

          <button
            type="button"
            className={`settings-pill-tab ${activeSection === 'locations' ? 'active' : ''}`}
            onClick={() => setActiveSection('locations')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>shelves</span>
            <span>Locations &amp; Racks ({filteredSubLocations.length})</span>
          </button>

          <button
            type="button"
            className={`settings-pill-tab ${activeSection === 'staff' ? 'active' : ''}`}
            onClick={() => setActiveSection('staff')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>group</span>
            <span>Warehouse Staff ({filteredStaff.length})</span>
          </button>
        </div>

        <div className="records-count-text">
          <span>
            {selectedWarehouseFilter !== 'ALL'
              ? `Filtered to: ${warehousesList.find((w) => w.id === selectedWarehouseFilter)?.name || selectedWarehouseFilter}`
              : `Total active entities: ${warehousesList.length} Warehouses | ${subLocations.length} Locations | ${staffMembers.length} Staff`}
          </span>
        </div>
      </div>

      {/* Main Canvas Container */}
      <main className="settings-canvas">
        {/* ============================================================== */}
        {/* SECTION 1: MASTER WAREHOUSES DIRECTORY                         */}
        {/* ============================================================== */}
        {activeSection === 'overview' && (
          <div className="settings-sheet-card">
            <div className="enterprise-section-header">
              <div>
                <h2 className="section-heading-title">Operating Warehouses</h2>
                <p className="section-heading-sub">
                  Configure facilities, storage layout, and stationed personnel. Click "Edit" to modify warehouse details or add staff.
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
                    <th>Warehouse Name</th>
                    <th>Short Code</th>
                    <th>Address / Location</th>
                    <th>Sub-Locations</th>
                    <th>Staff Deployed</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWarehouses.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#756f82' }}>
                        No warehouses found matching the current search / filter.
                      </td>
                    </tr>
                  ) : (
                    filteredWarehouses.map((wh) => {
                      const whLocs = subLocations.filter(
                        (l) => l.warehouseId === wh.id || l.warehouseCode === wh.code
                      );
                      const whStaff = staffMembers.filter(
                        (s) => s.warehouseId === wh.id || s.warehouseCode === wh.code
                      );

                      return (
                        <tr key={wh.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '6px',
                                  backgroundColor: '#f6eaf3',
                                  color: '#714b67',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                                  warehouse
                                </span>
                              </div>
                              <span style={{ fontWeight: 700, color: '#212529', fontSize: '14px' }}>
                                {wh.name}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="wh-code-badge">{wh.code}</span>
                          </td>
                          <td>
                            <span style={{ color: '#495057', fontSize: '13px' }}>
                              {wh.address || '—'}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="count-badge-btn"
                              onClick={() => {
                                setSelectedWarehouseFilter(wh.id);
                                setActiveSection('locations');
                              }}
                              title="Filter locations to this warehouse"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                                shelves
                              </span>
                              <span>{whLocs.length} locations</span>
                            </button>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="count-badge-btn staff-badge"
                              onClick={() => {
                                setSelectedWarehouseFilter(wh.id);
                                setActiveSection('staff');
                              }}
                              title="Filter staff to this warehouse"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                                group
                              </span>
                              <span>{whStaff.length} staff</span>
                            </button>
                          </td>
                          <td>
                            <span className={wh.status === 'Active' ? 'status-badge-active' : 'status-badge-inactive'}>
                              <span className="sync-dot-green"></span>
                              {wh.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="btn-edit-warehouse"
                              onClick={() => handleOpenEditWarehouse(wh)}
                              title="Edit warehouse & manage staff"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                                edit
                              </span>
                              <span>Edit &amp; Staff</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SECTION 2: SUB-LOCATIONS & RACKS                               */}
        {/* ============================================================== */}
        {activeSection === 'locations' && (
          <div className="settings-sheet-card">
            <div className="enterprise-section-header">
              <div>
                <h2 className="section-heading-title">Storage Locations &amp; Racks</h2>
                <p className="section-heading-sub">
                  Physical storage areas mapped to warehouses. Filter by warehouse above to view specific racks.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#756f82' }}>
                  Showing {filteredSubLocations.length} locations
                </span>
              </div>
            </div>

            <div className="settings-table-wrapper">
              <table className="settings-data-table">
                <thead>
                  <tr>
                    <th>Location Name</th>
                    <th>Code / Path</th>
                    <th>Warehouse Facility</th>
                    <th>Location Type</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubLocations.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: '#756f82' }}>
                        No storage locations found for this warehouse filter.
                      </td>
                    </tr>
                  ) : (
                    filteredSubLocations.map((loc) => (
                      <tr key={loc.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="material-symbols-outlined" style={{ color: '#714b67', fontSize: '18px' }}>
                              shelves
                            </span>
                            <span style={{ fontWeight: 700, color: '#212529' }}>{loc.name}</span>
                          </div>
                        </td>
                        <td>
                          <span className="barcode-badge">{loc.code}</span>
                        </td>
                        <td>
                          <span className="wh-code-badge" style={{ fontWeight: 600 }}>
                            {loc.warehouseCode || 'WH'}
                          </span>
                        </td>
                        <td>
                          <span className="zone-pill">{loc.type}</span>
                        </td>
                        <td>
                          <span className="status-badge-active">
                            <span className="sync-dot-green"></span>
                            {loc.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SECTION 3: WAREHOUSE STAFF DEPLOYMENTS                         */}
        {/* ============================================================== */}
        {activeSection === 'staff' && (
          <div className="settings-sheet-card">
            <div className="enterprise-section-header">
              <div>
                <h2 className="section-heading-title">Warehouse Staff Members</h2>
                <p className="section-heading-sub">
                  Personnel assigned to operations. To assign a new staff member to a warehouse, click "Edit &amp; Staff" on that warehouse.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#756f82' }}>
                  Showing {filteredStaff.length} staff members
                </span>
              </div>
            </div>

            <div className="settings-table-wrapper">
              <table className="settings-data-table">
                <thead>
                  <tr>
                    <th>Staff Member</th>
                    <th>Email Contact</th>
                    <th>Login ID</th>
                    <th>Role</th>
                    <th>Stationed Warehouse</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: '#756f82' }}>
                        No staff members assigned to this warehouse yet.
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((staff) => (
                      <tr key={staff.id}>
                        <td>
                          <div className="staff-user-cell">
                            <div className="staff-avatar-circle">{staff.initials}</div>
                            <span className="staff-name-title">{staff.name}</span>
                          </div>
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
                          <code style={{ background: '#f4eff3', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>
                            {staff.loginId}
                          </code>
                        </td>
                        <td>
                          <span className="role-pill">{staff.role}</span>
                        </td>
                        <td>
                          <span className="wh-code-badge">{staff.warehouseCode || staff.warehouseName}</span>
                        </td>
                        <td>
                          <span className="status-badge-active">
                            <span className="sync-dot-green"></span>
                            {staff.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* MODAL 1: CREATE NEW WAREHOUSE                                  */}
      {/* Strictly: Name, Short Code, Number of Locations -> Dynamic Inputs */}
      {/* ============================================================== */}
      {showNewWarehouseModal && (
        <div className="modal-overlay" onClick={() => setShowNewWarehouseModal(false)}>
          <div
            className="modal-content-card"
            style={{ maxWidth: '580px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="sheet-icon-box" style={{ width: '38px', height: '38px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#714b67' }}>
                    domain_add
                  </span>
                </div>
                <div>
                  <h3 className="modal-header-title">Create New Warehouse</h3>
                  <p style={{ fontSize: '12px', color: '#756f82', margin: 0 }}>
                    Enter warehouse name, short code, and specify the number of storage locations.
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
              <div className="form-field-group">
                <label className="form-label">
                  Warehouse Name <span className="req-star">*</span>
                </label>
                <input
                  type="text"
                  className="form-input-text"
                  placeholder="e.g. Mumbai Logistics Hub"
                  value={newWarehouseForm.name}
                  onChange={(e) => setNewWarehouseForm((p) => ({ ...p, name: e.target.value }))}
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-field-group">
                  <label className="form-label">
                    Short Code <span className="req-star">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input-text"
                    style={{ textTransform: 'uppercase' }}
                    placeholder="e.g. MUM-01"
                    value={newWarehouseForm.code}
                    onChange={(e) => setNewWarehouseForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                    required
                  />
                </div>

                <div className="form-field-group">
                  <label className="form-label">
                    Number of Locations <span className="req-star">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="25"
                    className="form-input-text"
                    value={newWarehouseForm.numLocations}
                    onChange={(e) => handleNumLocationsChange(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Dynamic Location Names Input Fields */}
              {newWarehouseForm.numLocations > 0 && (
                <div className="form-field-group">
                  <label className="form-label">
                    Enter Location Names ({newWarehouseForm.numLocations})
                  </label>
                  <div className="location-names-container">
                    {newWarehouseForm.locationNames.map((locName, idx) => (
                      <div key={idx} className="location-input-row">
                        <span className="location-input-label">Location {idx + 1}:</span>
                        <input
                          type="text"
                          className="form-input-text"
                          placeholder={`e.g. Storage Floor ${idx + 1}`}
                          value={locName}
                          onChange={(e) => handleLocationNameChange(idx, e.target.value)}
                          required
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="modal-footer-actions">
                <button
                  type="button"
                  className="btn-secondary-action"
                  onClick={() => setShowNewWarehouseModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary-action"
                  disabled={createWarehouseMutation.isPending}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check</span>
                  <span>{createWarehouseMutation.isPending ? 'Creating...' : 'Create Warehouse'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: EDIT WAREHOUSE & MANAGE STAFF                         */}
      {/* Allows editing warehouse details and adding staff with email dispatch */}
      {/* ============================================================== */}
      {showEditWarehouseModal && editingWarehouse && (
        <div className="modal-overlay" onClick={() => setShowEditWarehouseModal(false)}>
          <div
            className="modal-content-card"
            style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="sheet-icon-box" style={{ width: '38px', height: '38px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#714b67' }}>
                    edit_note
                  </span>
                </div>
                <div>
                  <h3 className="modal-header-title">Edit Warehouse: {editingWarehouse.name}</h3>
                  <p style={{ fontSize: '12px', color: '#756f82', margin: 0 }}>
                    Update facility details or assign staff with credentials email dispatch.
                  </p>
                </div>
              </div>
              <button
                type="button"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#756f82' }}
                onClick={() => setShowEditWarehouseModal(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Warehouse Edit Form */}
            <form onSubmit={handleUpdateWarehouseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div className="form-field-group">
                  <label className="form-label">Warehouse Name</label>
                  <input
                    type="text"
                    className="form-input-text"
                    value={editWarehouseForm.name}
                    onChange={(e) => setEditWarehouseForm((p) => ({ ...p, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-field-group">
                  <label className="form-label">Short Code</label>
                  <input
                    type="text"
                    className="form-input-text"
                    style={{ textTransform: 'uppercase' }}
                    value={editWarehouseForm.code}
                    onChange={(e) => setEditWarehouseForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                    required
                  />
                </div>
              </div>

              <div className="form-field-group">
                <label className="form-label">Address / Notes</label>
                <input
                  type="text"
                  className="form-input-text"
                  placeholder="Street address, city, state"
                  value={editWarehouseForm.address}
                  onChange={(e) => setEditWarehouseForm((p) => ({ ...p, address: e.target.value }))}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  className="btn-primary-action"
                  disabled={updateWarehouseMutation.isPending}
                >
                  <span>{updateWarehouseMutation.isPending ? 'Saving...' : 'Save Warehouse Details'}</span>
                </button>
              </div>
            </form>

            {/* Staff Assigned to this Warehouse */}
            <div className="staff-manager-section">
              <div className="staff-manager-header">
                <h4 className="staff-manager-title">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#714b67' }}>
                    group
                  </span>
                  <span>Stationed Staff ({staffMembers.filter((s) => s.warehouseId === editingWarehouse.id || s.warehouseCode === editingWarehouse.code).length})</span>
                </h4>
                <button
                  type="button"
                  className="btn-edit-warehouse"
                  onClick={() => setShowAddStaffForm((prev) => !prev)}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                    {showAddStaffForm ? 'close' : 'person_add'}
                  </span>
                  <span>{showAddStaffForm ? 'Cancel Staff' : 'Add Staff Member'}</span>
                </button>
              </div>

              {/* Add Staff Form with Real-time Email Dispatch */}
              {showAddStaffForm && (
                <form onSubmit={handleAddStaffSubmit} className="staff-add-card">
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#714b67' }}>
                    Add Staff Member to {editingWarehouse.name}
                  </div>

                  <div className="smtp-badge-info">
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>mail</span>
                    <span>An invitation email with login credentials will be dispatched to this email address via SMTP.</span>
                  </div>

                  <div className="form-field-group">
                    <label className="form-label">Staff Full Name <span className="req-star">*</span></label>
                    <input
                      type="text"
                      className="form-input-text"
                      placeholder="e.g. Ramesh Kumar"
                      value={newStaffForm.full_name}
                      onChange={(e) => setNewStaffForm((p) => ({ ...p, full_name: e.target.value }))}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-field-group">
                      <label className="form-label">Staff Email <span className="req-star">*</span></label>
                      <input
                        type="email"
                        className="form-input-text"
                        placeholder="staff@example.com"
                        value={newStaffForm.email}
                        onChange={(e) => setNewStaffForm((p) => ({ ...p, email: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="form-field-group">
                      <label className="form-label">Temporary Password <span className="req-star">*</span></label>
                      <input
                        type="password"
                        className="form-input-text"
                        placeholder="Min 6 characters"
                        value={newStaffForm.password}
                        onChange={(e) => setNewStaffForm((p) => ({ ...p, password: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                    <button
                      type="button"
                      className="btn-secondary-action"
                      onClick={() => setShowAddStaffForm(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary-action"
                      disabled={addStaffMutation.isPending}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>send</span>
                      <span>{addStaffMutation.isPending ? 'Sending...' : 'Assign Staff & Dispatch Email'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Current Staff List in this Warehouse */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                {staffMembers
                  .filter((s) => s.warehouseId === editingWarehouse.id || s.warehouseCode === editingWarehouse.code)
                  .map((staff) => (
                    <div
                      key={staff.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        backgroundColor: '#fbf9fb',
                        borderRadius: '6px',
                        border: '1px solid #ebd9e6',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="staff-avatar-circle" style={{ width: '28px', height: '28px', fontSize: '11px' }}>
                          {staff.initials}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: '#212529' }}>{staff.name}</div>
                          <div style={{ fontSize: '11.5px', color: '#756f82' }}>{staff.email}</div>
                        </div>
                      </div>
                      <span className="role-pill" style={{ fontSize: '11px' }}>{staff.role}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="modal-footer-actions">
              <button
                type="button"
                className="btn-secondary-action"
                onClick={() => setShowEditWarehouseModal(false)}
              >
                Close
              </button>
            </div>
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

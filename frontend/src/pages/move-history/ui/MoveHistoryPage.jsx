import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '../../../widgets/app-header';
import { AppFooter } from '../../../widgets/app-footer';
import { ledgerApi } from '../../../shared/api/ledgerApi';
import { warehousesApi } from '../../../shared/api/warehousesApi';
import { productApi } from '../../../entities/product';
import './MoveHistory.css';

export default function MoveHistoryPage() {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('ALL');
  const [selectedLocation, setSelectedLocation] = useState('ALL');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'product_addition' | 'receipt' | 'delivery' | 'transfer' | 'adjustment'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'done' | 'ready' | 'draft'
  const [activeView, setActiveView] = useState('list'); // list | kanban
  const [toastMessage, setToastMessage] = useState('');

  // 1. Fetch metadata lookup collections to decrypt any raw IDs/hashes
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesApi.listWarehouses(),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => warehousesApi.listLocations(),
  });

  const { data: partners = [] } = useQuery({
    queryKey: ['partners'],
    queryFn: () => warehousesApi.listPartners(),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => warehousesApi.listStaff(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => productApi.getProducts(),
  });

  // 2. Fetch Move History operations
  const { data: rawMoves = [], isLoading } = useQuery({
    queryKey: ['move-history', selectedWarehouse, selectedLocation],
    queryFn: () =>
      ledgerApi.getMoveHistory({
        warehouse_id: selectedWarehouse !== 'ALL' ? selectedWarehouse : undefined,
        location_id: selectedLocation !== 'ALL' ? selectedLocation : undefined,
      }),
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Build Fast Decryption Maps
  const warehouseMap = useMemo(() => {
    const map = {};
    warehouses.forEach((w) => {
      map[w.id] = w.name;
    });
    return map;
  }, [warehouses]);

  const locationMap = useMemo(() => {
    const map = {};
    locations.forEach((l) => {
      map[l.id] = l.name;
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

  const staffMap = useMemo(() => {
    const map = {};
    staff.forEach((u) => {
      map[u.id] = u.full_name || u.email;
    });
    return map;
  }, [staff]);

  const productMap = useMemo(() => {
    const map = {};
    products.forEach((p) => {
      map[p.id] = { name: p.name, code: p.code || p.sku };
    });
    return map;
  }, [products]);

  // Dynamic sublocations available based on selected warehouse
  const availableSublocations = useMemo(() => {
    if (selectedWarehouse === 'ALL') return locations;
    return locations.filter((l) => l.warehouse_id === selectedWarehouse);
  }, [locations, selectedWarehouse]);

  // 3. Compile Master Ledger merging ALL operations & product additions
  const allLedgerItems = useMemo(() => {
    const items = [];

    // A. Operations documents (Receipts, Deliveries, Transfers, Adjustments)
    rawMoves.forEach((doc) => {
      const typeKey = (doc.type || '').toLowerCase();
      let normalizedType = 'transfer';
      let typeLabel = 'Internal Transfer';

      if (typeKey.includes('receipt') || typeKey === 'incoming') {
        normalizedType = 'receipt';
        typeLabel = 'Receipt';
      } else if (typeKey.includes('delivery') || typeKey === 'outgoing') {
        normalizedType = 'delivery';
        typeLabel = 'Delivery Order';
      } else if (typeKey.includes('adjustment')) {
        normalizedType = 'adjustment';
        typeLabel = 'Inventory Adjustment';
      } else if (typeKey.includes('transfer')) {
        normalizedType = 'transfer';
        typeLabel = 'Internal Transfer';
      }

      const pInfo = doc.lines?.[0]?.product_id ? productMap[doc.lines[0].product_id] : null;
      const productName = doc.product_name || pInfo?.name || 'Inventory Product';
      const productCode = doc.product_sku || pInfo?.code || '';

      const fromName =
        doc.source_location_name ||
        locationMap[doc.source_location_id] ||
        (normalizedType === 'receipt' ? 'Vendor Receiving Dock' : 'Main Bay');

      const toName =
        doc.dest_location_name ||
        locationMap[doc.dest_location_id] ||
        (normalizedType === 'delivery' ? 'Customer Dispatch Dock' : 'Storage Bay');

      const whName =
        doc.warehouse_name ||
        warehouseMap[doc.warehouse_id] ||
        'Main Distribution Hub';

      const contactName =
        doc.partner_name ||
        partnerMap[doc.partner_id] ||
        (normalizedType === 'transfer' ? 'Internal Operation' : normalizedType === 'adjustment' ? 'Inventory Audit' : 'Direct Operation');

      const performedBy =
        doc.created_by_name ||
        staffMap[doc.created_by] ||
        'Admin User';

      const totalQty = doc.lines?.[0]
        ? Number(doc.lines[0].quantity_done || doc.lines[0].quantity_expected || 0)
        : Number(doc.total_quantity || 0);

      items.push({
        id: doc.id,
        reference: doc.document_number || `#WH/OP/${String(doc.id).slice(0, 6).toUpperCase()}`,
        type: normalizedType,
        typeLabel,
        date: doc.created_at
          ? new Date(doc.created_at).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '—',
        rawDate: doc.created_at ? new Date(doc.created_at).getTime() : 0,
        contact: contactName,
        product: productName,
        productCode: productCode,
        fromLocation: fromName,
        toLocation: toName,
        warehouse: whName,
        warehouseId: doc.warehouse_id,
        sourceLocationId: doc.source_location_id,
        destLocationId: doc.dest_location_id,
        quantity: totalQty.toFixed(2),
        byWhom: performedBy,
        status: doc.status || 'done',
        link:
          normalizedType === 'receipt'
            ? `/receipts/${doc.id}`
            : normalizedType === 'delivery'
            ? `/delivery-orders/${doc.id}`
            : null,
      });
    });

    // B. Product Additions from catalog
    products.forEach((p) => {
      // If product was created, include as a product addition audit entry
      const pWh = p.warehouseName || warehouseMap[p.warehouseId] || 'Main Distribution Hub';
      const pLoc = p.locationName || locationMap[p.locationId] || 'Main Storage Bay';
      items.push({
        id: `prod-${p.id}`,
        reference: `PROD/NEW/${p.code || p.sku || String(p.id).slice(0, 6).toUpperCase()}`,
        type: 'product_addition',
        typeLabel: 'Product Addition',
        date: p.created_at
          ? new Date(p.created_at).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'Catalog Item',
        rawDate: p.created_at ? new Date(p.created_at).getTime() : 1,
        contact: 'Product Catalog',
        product: p.name,
        productCode: p.code || p.sku || '',
        fromLocation: 'Vendor Receiving Dock',
        toLocation: pLoc,
        warehouse: pWh,
        warehouseId: p.warehouseId,
        sourceLocationId: null,
        destLocationId: p.locationId,
        quantity: Number(p.onHand || 0).toFixed(2),
        byWhom: 'Admin / Inventory Manager',
        status: 'done',
        link: null,
      });
    });

    // Sort newest to oldest
    return items.sort((a, b) => b.rawDate - a.rawDate);
  }, [rawMoves, products, locationMap, warehouseMap, partnerMap, staffMap, productMap]);

  // 4. Multi-dimensional filtering
  const filteredMoves = useMemo(() => {
    return allLedgerItems.filter((item) => {
      // Search Query
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        q === '' ||
        item.reference.toLowerCase().includes(q) ||
        item.contact.toLowerCase().includes(q) ||
        item.product.toLowerCase().includes(q) ||
        item.productCode.toLowerCase().includes(q) ||
        item.fromLocation.toLowerCase().includes(q) ||
        item.toLocation.toLowerCase().includes(q) ||
        item.warehouse.toLowerCase().includes(q) ||
        item.byWhom.toLowerCase().includes(q);

      // Warehouse Filter
      let matchesWarehouse = true;
      if (selectedWarehouse !== 'ALL') {
        matchesWarehouse =
          item.warehouseId === selectedWarehouse ||
          item.warehouse.toLowerCase().includes((warehouseMap[selectedWarehouse] || '').toLowerCase());
      }

      // Sublocation Filter
      let matchesLocation = true;
      if (selectedLocation !== 'ALL') {
        matchesLocation =
          item.sourceLocationId === selectedLocation ||
          item.destLocationId === selectedLocation ||
          item.fromLocation.toLowerCase().includes((locationMap[selectedLocation] || '').toLowerCase()) ||
          item.toLocation.toLowerCase().includes((locationMap[selectedLocation] || '').toLowerCase());
      }

      // Operation Type Filter
      let matchesType = true;
      if (filterType !== 'all') {
        matchesType = item.type === filterType;
      }

      // Status Filter
      let matchesStatus = true;
      if (filterStatus !== 'all') {
        matchesStatus = item.status === filterStatus;
      }

      return matchesSearch && matchesWarehouse && matchesLocation && matchesType && matchesStatus;
    });
  }, [allLedgerItems, searchQuery, selectedWarehouse, selectedLocation, filterType, filterStatus, warehouseMap, locationMap]);

  // Master Checkbox Logic
  const isAllSelected = filteredMoves.length > 0 && selectedIds.length === filteredMoves.length;
  const isSomeSelected = selectedIds.length > 0 && selectedIds.length < filteredMoves.length;
  const selectAllRef = useRef(null);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = isSomeSelected;
    }
  }, [isSomeSelected]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredMoves.map((m) => m.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id, e) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleRowClick = (move) => {
    if (move.link) {
      navigate(move.link);
    } else {
      showToast(`Viewing audit ledger details for ${move.reference}`);
    }
  };

  const handleDownloadCSV = () => {
    const headers = [
      'Reference',
      'Date & Time',
      'Operation Type',
      'Contact',
      'Product Name',
      'Product SKU',
      'From Location',
      'To Location',
      'Warehouse',
      'Quantity',
      'By Whom',
      'Status',
    ];
    const rows = filteredMoves.map((m) => [
      `"${m.reference}"`,
      `"${m.date}"`,
      `"${m.typeLabel}"`,
      `"${m.contact}"`,
      `"${m.product}"`,
      `"${m.productCode}"`,
      `"${m.fromLocation}"`,
      `"${m.toLocation}"`,
      `"${m.warehouse}"`,
      `"${m.quantity}"`,
      `"${m.byWhom}"`,
      `"${m.status}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'stockflow_movement_ledger.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('StockFlow Complete Move Ledger exported to CSV');
  };

  // Count by types for filter tabs
  const typeCounts = useMemo(() => {
    return {
      all: allLedgerItems.length,
      product_addition: allLedgerItems.filter((i) => i.type === 'product_addition').length,
      receipt: allLedgerItems.filter((i) => i.type === 'receipt').length,
      delivery: allLedgerItems.filter((i) => i.type === 'delivery').length,
      transfer: allLedgerItems.filter((i) => i.type === 'transfer').length,
      adjustment: allLedgerItems.filter((i) => i.type === 'adjustment').length,
    };
  }, [allLedgerItems]);

  return (
    <div className="move-history-shell">
      <AppHeader />

      {/* Control Ribbon */}
      <div className="move-control-ribbon">
        <div className="move-ribbon-left">
          <button
            className="btn-new-move"
            type="button"
            onClick={() => showToast('New Stock Move ledger entry initialized')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
            <span>New</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              style={{
                background: '#ffffff',
                border: '1.5px solid #e8e4ec',
                color: '#756f82',
                padding: '6px 10px',
                cursor: 'pointer',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Print Move Report"
              onClick={() => {
                window.print();
                showToast('Printing Move History Report...');
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>print</span>
              <span style={{ fontSize: '12.5px', fontWeight: 600 }}>Print</span>
            </button>
            <button
              type="button"
              style={{
                background: '#ffffff',
                border: '1.5px solid #e8e4ec',
                color: '#756f82',
                padding: '6px 10px',
                cursor: 'pointer',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Export Full Ledger"
              onClick={handleDownloadCSV}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>file_download</span>
              <span style={{ fontSize: '12.5px', fontWeight: 600 }}>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filters & Search in Ribbon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Warehouse Filter */}
          <div className="move-filter-select-wrapper" title="Filter by Warehouse">
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#714b67' }}>
              warehouse
            </span>
            <select
              className="move-filter-select"
              value={selectedWarehouse}
              onChange={(e) => {
                setSelectedWarehouse(e.target.value);
                setSelectedLocation('ALL');
              }}
            >
              <option value="ALL">All Warehouses</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} {w.code ? `(${w.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Sublocation Filter */}
          <div className="move-filter-select-wrapper" title="Filter by Sublocation">
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#714b67' }}>
              pin_drop
            </span>
            <select
              className="move-filter-select"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
            >
              <option value="ALL">
                {selectedWarehouse === 'ALL' ? 'All Sublocations' : 'All Warehouse Sublocations'}
              </option>
              {availableSublocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} {loc.code ? `(${loc.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#ffffff',
              border: '1.5px solid #d8d4dc',
              borderRadius: '6px',
              padding: '5px 12px',
              gap: '8px',
              minWidth: '260px',
            }}
          >
            <span className="material-symbols-outlined" style={{ color: '#80747a', fontSize: '18px' }}>
              search
            </span>
            <input
              type="text"
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '13.5px',
                color: '#2f2937',
                width: '100%',
                fontWeight: 500,
              }}
              placeholder="Search Reference, Product, Location, By Whom..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                style={{ background: 'transparent', border: 'none', color: '#756f82', cursor: 'pointer', padding: 0 }}
                onClick={() => setSearchQuery('')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>close</span>
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#efeded', padding: '2px', borderRadius: '4px', gap: '2px' }}>
            <button
              type="button"
              style={{
                background: activeView === 'list' ? '#ffffff' : 'transparent',
                color: activeView === 'list' ? '#714b67' : '#756f82',
                border: 'none',
                padding: '4px 6px',
                borderRadius: '3px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                boxShadow: activeView === 'list' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
              title="List View"
              onClick={() => setActiveView('list')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>format_list_bulleted</span>
            </button>
            <button
              type="button"
              style={{
                background: activeView === 'kanban' ? '#ffffff' : 'transparent',
                color: activeView === 'kanban' ? '#714b67' : '#756f82',
                border: 'none',
                padding: '4px 6px',
                borderRadius: '3px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                boxShadow: activeView === 'kanban' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
              title="Kanban View"
              onClick={() => setActiveView('kanban')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>view_kanban</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs Bar (Operation Types & Status) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px 0', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            style={{
              backgroundColor: filterType === 'all' ? '#714b67' : '#ffffff',
              color: filterType === 'all' ? '#ffffff' : '#2f2937',
              border: '1.5px solid #d1c3ca',
              borderRadius: '16px',
              padding: '4px 14px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onClick={() => setFilterType('all')}
          >
            <span>All Actions</span>
            <span style={{ opacity: 0.85, fontSize: '11px' }}>({typeCounts.all})</span>
          </button>
          <button
            type="button"
            style={{
              backgroundColor: filterType === 'product_addition' ? '#7c3aed' : '#ffffff',
              color: filterType === 'product_addition' ? '#ffffff' : '#7c3aed',
              border: '1.5px solid #d1c3ca',
              borderRadius: '16px',
              padding: '4px 14px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onClick={() => setFilterType('product_addition')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>add_box</span>
            <span>Product Additions ({typeCounts.product_addition})</span>
          </button>
          <button
            type="button"
            style={{
              backgroundColor: filterType === 'receipt' ? '#047857' : '#ffffff',
              color: filterType === 'receipt' ? '#ffffff' : '#047857',
              border: '1.5px solid #d1c3ca',
              borderRadius: '16px',
              padding: '4px 14px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onClick={() => setFilterType('receipt')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>arrow_downward_alt</span>
            <span>Receipts ({typeCounts.receipt})</span>
          </button>
          <button
            type="button"
            style={{
              backgroundColor: filterType === 'delivery' ? '#ba1a1a' : '#ffffff',
              color: filterType === 'delivery' ? '#ffffff' : '#ba1a1a',
              border: '1.5px solid #d1c3ca',
              borderRadius: '16px',
              padding: '4px 14px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onClick={() => setFilterType('delivery')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>arrow_upward_alt</span>
            <span>Deliveries ({typeCounts.delivery})</span>
          </button>
          <button
            type="button"
            style={{
              backgroundColor: filterType === 'transfer' ? '#0284c7' : '#ffffff',
              color: filterType === 'transfer' ? '#ffffff' : '#0284c7',
              border: '1.5px solid #d1c3ca',
              borderRadius: '16px',
              padding: '4px 14px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onClick={() => setFilterType('transfer')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>sync_alt</span>
            <span>Internal Transfers ({typeCounts.transfer})</span>
          </button>
          <button
            type="button"
            style={{
              backgroundColor: filterType === 'adjustment' ? '#d97706' : '#ffffff',
              color: filterType === 'adjustment' ? '#ffffff' : '#d97706',
              border: '1.5px solid #d1c3ca',
              borderRadius: '16px',
              padding: '4px 14px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onClick={() => setFilterType('adjustment')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>tune</span>
            <span>Adjustments ({typeCounts.adjustment})</span>
          </button>
        </div>

        {/* Status Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {['all', 'done', 'ready', 'draft'].map((st) => (
            <button
              key={st}
              type="button"
              style={{
                backgroundColor: filterStatus === st ? '#2f2937' : 'transparent',
                color: filterStatus === st ? '#ffffff' : '#756f82',
                border: 'none',
                borderRadius: '4px',
                padding: '3px 8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
              onClick={() => setFilterStatus(st)}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table View */}
      {activeView === 'list' ? (
        <div className="move-table-wrapper">
          <div className="move-table-card">
            <table className="move-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      ref={selectAllRef}
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>Reference</th>
                  <th>Date & Time</th>
                  <th>Operation Type</th>
                  <th>Product</th>
                  <th>From Location</th>
                  <th>To Location</th>
                  <th>Warehouse</th>
                  <th style={{ textAlign: 'right' }}>Quantity</th>
                  <th>By Whom</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredMoves.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ textAlign: 'center', padding: '40px 16px', color: '#756f82' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#b0a8b4', display: 'block', marginBottom: '8px' }}>
                        receipt_long
                      </span>
                      <strong style={{ fontSize: '15px', color: '#2f2937' }}>No ledger movements found</strong>
                      <p style={{ margin: '4px 0 0', fontSize: '13px' }}>
                        Try changing the warehouse filter, sublocation, or search terms.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredMoves.map((move) => {
                    const isSelected = selectedIds.includes(move.id);
                    return (
                      <tr
                        key={move.id}
                        className={`move-row ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleRowClick(move)}
                      >
                        <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleToggleSelect(move.id, e)}
                          />
                        </td>
                        <td>
                          <div
                            className={
                              move.type === 'receipt'
                                ? 'ref-cell-incoming'
                                : move.type === 'delivery'
                                ? 'ref-cell-outgoing'
                                : move.type === 'adjustment'
                                ? 'ref-cell-adjustment'
                                : move.type === 'product_addition'
                                ? 'ref-cell-addition'
                                : 'ref-cell-internal'
                            }
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                              {move.type === 'receipt'
                                ? 'arrow_downward_alt'
                                : move.type === 'delivery'
                                ? 'arrow_upward_alt'
                                : move.type === 'adjustment'
                                ? 'tune'
                                : move.type === 'product_addition'
                                ? 'add_box'
                                : 'sync_alt'}
                            </span>
                            <span>{move.reference}</span>
                          </div>
                        </td>
                        <td style={{ color: '#756f82', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                          {move.date}
                        </td>
                        <td>
                          <span
                            className={`op-badge ${
                              move.type === 'receipt'
                                ? 'op-badge-receipt'
                                : move.type === 'delivery'
                                ? 'op-badge-delivery'
                                : move.type === 'adjustment'
                                ? 'op-badge-adjustment'
                                : move.type === 'product_addition'
                                ? 'op-badge-addition'
                                : 'op-badge-transfer'
                            }`}
                          >
                            {move.typeLabel}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontWeight: 600, color: '#1f2937' }}>{move.product}</span>
                            {move.productCode && (
                              <span style={{ fontSize: '11px', color: '#714b67', fontWeight: 600 }}>
                                {move.productCode}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ color: '#4b5563', fontSize: '13px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#9ca3af' }}>
                              upload
                            </span>
                            <span>{move.fromLocation}</span>
                          </div>
                        </td>
                        <td style={{ fontWeight: 600, color: '#111827', fontSize: '13px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#714b67' }}>
                              download
                            </span>
                            <span>{move.toLocation}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', fontWeight: 600, color: '#374151' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#714b67' }}>
                              warehouse
                            </span>
                            <span>{move.warehouse}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>
                          <span>{move.quantity}</span>{' '}
                          <span style={{ fontSize: '11px', fontWeight: 500, color: '#6b7280' }}>Units</span>
                        </td>
                        <td>
                          <div className="user-avatar-cell">
                            <div className="user-avatar-circle">
                              {move.byWhom.charAt(0).toUpperCase()}
                            </div>
                            <span>{move.byWhom}</span>
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '3px 9px',
                              borderRadius: '12px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              backgroundColor:
                                move.status === 'ready'
                                  ? '#e0f2fe'
                                  : move.status === 'done'
                                  ? '#d1fae5'
                                  : '#f1f3f5',
                              color:
                                move.status === 'ready'
                                  ? '#0284c7'
                                  : move.status === 'done'
                                  ? '#047857'
                                  : '#6c757d',
                            }}
                          >
                            {move.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Footer Summary */}
            <div className="move-table-footer-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span>Total records: <strong style={{ color: '#2f2937' }}>{filteredMoves.length}</strong></span>
                {selectedIds.length > 0 && (
                  <span style={{ color: '#714b67', fontWeight: 600 }}>
                    {selectedIds.length} row(s) selected
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#047857' }}>
                  verified_user
                </span>
                <span>Cryptographically verified live movements ledger</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Kanban View */
        <div style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {filteredMoves.map((m) => (
            <div
              key={m.id}
              onClick={() => handleRowClick(m)}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e8e4ec',
                borderRadius: '8px',
                padding: '14px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <strong style={{ color: '#714b67', fontSize: '13.5px' }}>{m.reference}</strong>
                <span className={`op-badge ${m.type === 'receipt' ? 'op-badge-receipt' : m.type === 'delivery' ? 'op-badge-delivery' : m.type === 'adjustment' ? 'op-badge-adjustment' : m.type === 'product_addition' ? 'op-badge-addition' : 'op-badge-transfer'}`}>
                  {m.typeLabel}
                </span>
              </div>
              <div>
                <h4 style={{ margin: '0 0 2px', fontSize: '14.5px', color: '#1f2937' }}>{m.product}</h4>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>SKU: {m.productCode || 'N/A'}</span>
              </div>
              <div style={{ fontSize: '12.5px', color: '#4b5563', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>From: <strong>{m.fromLocation}</strong></div>
                <div>To: <strong>{m.toLocation}</strong></div>
                <div>Warehouse: <strong>{m.warehouse}</strong></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f3f4f6', paddingTop: '8px', fontSize: '12px' }}>
                <span style={{ fontWeight: 700, color: '#111827', fontSize: '14px' }}>{m.quantity} Units</span>
                <span style={{ color: '#6b7280' }}>By {m.byWhom}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <AppFooter />

      {/* Toast */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: '#2f2937',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: '6px',
            fontSize: '13.5px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
            zIndex: 9999,
          }}
        >
          <span className="material-symbols-outlined" style={{ color: '#6ffbbe', fontSize: '18px' }}>
            check_circle
          </span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

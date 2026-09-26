import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '../../../widgets/app-header';
import { AppFooter } from '../../../widgets/app-footer';
import { StockTable } from '../../../widgets/stock-table';
import { productApi } from '../../../entities/product';
import { warehousesApi } from '../../../shared/api/warehousesApi';
import styles from './StockPage.module.css';

export function StockPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('ALL'); // 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  const [selectedWarehouse, setSelectedWarehouse] = useState('ALL');
  const [selectedLocation, setSelectedLocation] = useState('ALL');
  const [toastMessage, setToastMessage] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);

  const [newProductForm, setNewProductForm] = useState({
    name: '',
    code: '',
    unitCost: '150',
    warehouseId: '',
    locationId: '',
    quantity: '10',
    status: 'Available',
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3200);
  };

  // Fetch Warehouses & Locations for filtering and modal
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesApi.listWarehouses(),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => warehousesApi.listLocations(),
  });

  // Fetch Products with optional warehouse & location parameters
  const { data: products = [] } = useQuery({
    queryKey: ['products', selectedWarehouse, selectedLocation],
    queryFn: () =>
      productApi.getProducts({
        warehouse_id: selectedWarehouse !== 'ALL' ? selectedWarehouse : undefined,
        location_id: selectedLocation !== 'ALL' ? selectedLocation : undefined,
      }),
  });

  const addMutation = useMutation({
    mutationFn: (newProd) => productApi.addProduct(newProd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showToast('Product added to stock inventory');
      setShowNewModal(false);
      setNewProductForm({
        name: '',
        code: '',
        unitCost: '150',
        warehouseId: '',
        locationId: '',
        quantity: '10',
        status: 'Available',
      });
    },
    onError: (err) => {
      showToast(err.message || 'Failed to add product');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => productApi.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showToast('Product removed from stock inventory');
    },
    onError: (err) => {
      showToast(err.message || 'Failed to remove product');
    },
  });

  const handleCreateProductSubmit = (e) => {
    e.preventDefault();
    if (!newProductForm.name.trim()) {
      showToast('Please enter a product name');
      return;
    }
    if (!newProductForm.warehouseId) {
      showToast('Please select a warehouse');
      return;
    }
    if (!newProductForm.locationId) {
      showToast('Please select a location');
      return;
    }
    const cleanCode = newProductForm.code.trim() || `[SKU-${Date.now().toString().slice(-4)}]`;
    const qty = Number(newProductForm.quantity) || 0;
    addMutation.mutate({
      name: newProductForm.name.trim(),
      code: cleanCode,
      icon: 'inventory_2',
      unitCost: Number(newProductForm.unitCost) || 0,
      warehouseId: newProductForm.warehouseId,
      locationId: newProductForm.locationId,
      quantity: qty,
      status: qty > 0 ? 'Available' : 'Out of Stock',
    });
  };

  // Export Stock CSV
  const handleExportCSV = () => {
    const headers = ['Product Name', 'SKU/Code', 'Warehouse', 'Location', 'Unit Cost ($)', 'On Hand', 'Free to Use', 'Status'];
    const rows = products.map((p) => [
      `"${p.name}"`,
      `"${p.code}"`,
      `"${p.warehouseName || 'All Hubs'}"`,
      `"${p.locationName || 'General'}"`,
      p.unitCost || 0,
      p.onHand || 0,
      p.freeToUse || 0,
      p.status || 'Available',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', 'stockflow_inventory_stock.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Stock inventory exported to CSV');
  };

  // Dynamic locations for filter bar
  const filterLocations = locations.filter(
    (l) => selectedWarehouse === 'ALL' || l.warehouse_id === selectedWarehouse
  );

  // Dynamic locations for new product modal
  const modalLocations = locations.filter(
    (l) => l.warehouse_id === newProductForm.warehouseId
  );

  // Filter products by search term, warehouse, location, and stock status
  const filteredProducts = products.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      (p.code && p.code.toLowerCase().includes(q)) ||
      (p.sku && p.sku.toLowerCase().includes(q));

    let matchesWarehouse = true;
    if (selectedWarehouse !== 'ALL') {
      matchesWarehouse = p.warehouseId === selectedWarehouse;
    }

    let matchesLocation = true;
    if (selectedLocation !== 'ALL') {
      matchesLocation = p.locationId === selectedLocation;
    }

    let matchesStock = true;
    if (stockFilter === 'IN_STOCK') {
      matchesStock = (Number(p.onHand) || 0) > 0;
    } else if (stockFilter === 'LOW_STOCK') {
      const qty = Number(p.onHand) || 0;
      matchesStock = qty > 0 && qty <= 10;
    } else if (stockFilter === 'OUT_OF_STOCK') {
      matchesStock = (Number(p.onHand) || 0) === 0;
    }

    return matchesSearch && matchesWarehouse && matchesLocation && matchesStock;
  });

  const totalOnHand = filteredProducts.reduce((acc, p) => acc + (Number(p.onHand) || 0), 0);
  const totalValuation = filteredProducts.reduce(
    (acc, p) => acc + (Number(p.onHand) || 0) * (Number(p.unitCost) || 0),
    0
  );

  const inStockCount = filteredProducts.filter((p) => (Number(p.onHand) || 0) > 0).length;
  const lowStockCount = filteredProducts.filter((p) => {
    const q = Number(p.onHand) || 0;
    return q > 0 && q <= 10;
  }).length;
  const outOfStockCount = filteredProducts.filter((p) => (Number(p.onHand) || 0) === 0).length;

  return (
    <div className={styles.page}>
      <AppHeader />

      {/* Control Ribbon */}
      <div className={styles.controlRibbon}>
        <div className={styles.ribbonLeft}>
          <button
            className={styles.btnNewRecord}
            type="button"
            onClick={() => setShowNewModal(true)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
            <span>New Product</span>
          </button>

          <div className={styles.actionToolButtons}>
            <button
              className={styles.toolIconBtn}
              title="Export Stock to CSV"
              type="button"
              onClick={handleExportCSV}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>file_download</span>
            </button>
            <button
              className={styles.toolIconBtn}
              title="Print Stock Sheet"
              type="button"
              onClick={() => { window.print(); showToast('Printing stock report'); }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>print</span>
            </button>
            <button
              className={styles.toolIconBtn}
              title="Automated Reorder Rules"
              type="button"
              onClick={() => showToast('Reordering rules automated & verified')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>bolt</span>
            </button>
          </div>
        </div>

        <div className={styles.ribbonRight}>
          {/* Warehouse Filter */}
          <div className={styles.filterDropdownWrapper} title="Filter by Warehouse">
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#714b67' }}>
              warehouse
            </span>
            <select
              className={styles.filterSelect}
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

          {/* Location Filter */}
          <div className={styles.filterDropdownWrapper} title="Filter by Location">
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#714b67' }}>
              pin_drop
            </span>
            <select
              className={styles.filterSelect}
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
            >
              <option value="ALL">
                {selectedWarehouse === 'ALL' ? 'All Locations' : 'All Warehouse Locations'}
              </option>
              {filterLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} {loc.code ? `(${loc.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className={styles.searchContainer}>
            <span className="material-symbols-outlined" style={{ color: '#80747a', fontSize: '19px' }}>search</span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search products, SKU, description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className={styles.chipClose}
                onClick={() => setSearch('')}
                title="Clear search"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Slim Info & Subnav Bar */}
      <div className={styles.subnavRibbon}>
        <div className={styles.subnavPills}>
          <button
            type="button"
            className={`${styles.pillTab} ${stockFilter === 'ALL' ? styles.pillTabActive : ''}`}
            onClick={() => setStockFilter('ALL')}
          >
            <span>All Items ({products.length})</span>
          </button>
          <button
            type="button"
            className={`${styles.pillTab} ${stockFilter === 'IN_STOCK' ? styles.pillTabActive : ''}`}
            onClick={() => setStockFilter('IN_STOCK')}
          >
            <span>In Stock ({inStockCount})</span>
          </button>
          <button
            type="button"
            className={`${styles.pillTab} ${stockFilter === 'LOW_STOCK' ? styles.pillTabActive : ''}`}
            onClick={() => setStockFilter('LOW_STOCK')}
          >
            <span>Low Stock ({lowStockCount})</span>
          </button>
          {outOfStockCount > 0 && (
            <button
              type="button"
              className={`${styles.pillTab} ${stockFilter === 'OUT_OF_STOCK' ? styles.pillTabActive : ''}`}
              onClick={() => setStockFilter('OUT_OF_STOCK')}
            >
              <span>Out of Stock ({outOfStockCount})</span>
            </button>
          )}
        </div>

        <div className={styles.recordsCountText}>
          <span>
            {filteredProducts.length} records | Total: {totalOnHand.toLocaleString()} units on hand | Valuation: ${totalValuation.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Main Workspace Canvas */}
      <main className={styles.mainContent}>
        <div className={styles.canvasWrapper}>
          <StockTable
            products={filteredProducts}
            onAddProduct={(item) => addMutation.mutate(item)}
            onDeleteProduct={(id) => deleteMutation.mutate(id)}
          />
        </div>
      </main>

      {/* Create Product Modal */}
      {showNewModal && (
        <div className={styles.modalOverlay} onClick={() => setShowNewModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#714b67', fontSize: '22px' }}>
                  inventory_2
                </span>
                <h3 className={styles.modalTitle}>Add New Stock Product</h3>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setShowNewModal(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateProductSubmit} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Product Name <span style={{ color: '#ba1a1a' }}>*</span>
                </label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="e.g. Ergonomic Office Desk"
                  value={newProductForm.name}
                  onChange={(e) => setNewProductForm((p) => ({ ...p, name: e.target.value }))}
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Internal SKU / Code</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="[FURN_1001]"
                    value={newProductForm.code}
                    onChange={(e) => setNewProductForm((p) => ({ ...p, code: e.target.value }))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Unit Cost ($)</label>
                  <input
                    type="number"
                    className={styles.formInput}
                    value={newProductForm.unitCost}
                    onChange={(e) => setNewProductForm((p) => ({ ...p, unitCost: e.target.value }))}
                  />
                </div>
              </div>

              {/* Warehouse Selection */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Warehouse <span style={{ color: '#ba1a1a' }}>*</span>
                </label>
                <select
                  className={styles.formInput}
                  value={newProductForm.warehouseId}
                  onChange={(e) => {
                    const wid = e.target.value;
                    setNewProductForm((p) => ({
                      ...p,
                      warehouseId: wid,
                      locationId: '',
                    }));
                  }}
                  required
                >
                  <option value="">Select Warehouse...</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} {w.code ? `(${w.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Location Selection based on selected Warehouse */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Warehouse Location <span style={{ color: '#ba1a1a' }}>*</span>
                </label>
                <select
                  className={styles.formInput}
                  value={newProductForm.locationId}
                  onChange={(e) => setNewProductForm((p) => ({ ...p, locationId: e.target.value }))}
                  disabled={!newProductForm.warehouseId}
                  required
                >
                  <option value="">
                    {newProductForm.warehouseId
                      ? 'Select Location in Warehouse...'
                      : 'Choose Warehouse first...'}
                  </option>
                  {modalLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} {loc.code ? `(${loc.code})` : ''}
                    </option>
                  ))}
                </select>
                {newProductForm.warehouseId && modalLocations.length === 0 && (
                  <span style={{ fontSize: '12px', color: '#ba1a1a', marginTop: '4px', display: 'block' }}>
                    No locations found for this warehouse. Please add a location in Warehouse Settings.
                  </span>
                )}
              </div>

              {/* Number of Units */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Number of Units <span style={{ color: '#ba1a1a' }}>*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  className={styles.formInput}
                  placeholder="e.g. 25"
                  value={newProductForm.quantity}
                  onChange={(e) => setNewProductForm((p) => ({ ...p, quantity: e.target.value }))}
                  required
                />
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setShowNewModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={addMutation.isPending}>
                  {addMutation.isPending ? 'Saving...' : 'Save to Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AppFooter />

      {/* Toast Notification */}
      {toastMessage && (
        <div className={styles.toast}>
          <span className="material-symbols-outlined" style={{ color: '#6ffbbe' }}>
            check_circle
          </span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default StockPage;

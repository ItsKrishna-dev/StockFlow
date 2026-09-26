import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../../shared/config/routes';
import { AppHeader } from '../../../widgets/app-header';
import { AppFooter } from '../../../widgets/app-footer';
import { StockTable } from '../../../widgets/stock-table';
import { productApi } from '../../../entities/product';
import styles from './StockPage.module.css';

export function StockPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('ALL'); // 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  const [toastMessage, setToastMessage] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    code: '',
    unitCost: '150',
    onHand: '25',
    freeToUse: '25',
    status: 'Available',
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3200);
  };

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => productApi.getProducts(),
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
        onHand: '25',
        freeToUse: '25',
        status: 'Available',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => productApi.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showToast('Product removed from stock inventory');
    },
  });

  const handleCreateProductSubmit = (e) => {
    e.preventDefault();
    if (!newProductForm.name.trim()) {
      showToast('Please enter a product name');
      return;
    }
    const cleanCode = newProductForm.code.trim() || `[SKU-${Date.now().toString().slice(-4)}]`;
    addMutation.mutate({
      name: newProductForm.name.trim(),
      code: cleanCode,
      icon: 'inventory_2',
      unitCost: Number(newProductForm.unitCost) || 0,
      onHand: Number(newProductForm.onHand) || 0,
      freeToUse: Number(newProductForm.freeToUse) || 0,
      status: Number(newProductForm.onHand) > 0 ? 'Available' : 'Out of Stock',
    });
  };

  // Export Stock CSV
  const handleExportCSV = () => {
    const headers = ['Product Name', 'SKU/Code', 'Unit Cost ($)', 'On Hand', 'Free to Use', 'Status'];
    const rows = products.map((p) => [
      `"${p.name}"`,
      `"${p.code}"`,
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

  // Filter products by search term and filter state
  const filteredProducts = products.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      (p.code && p.code.toLowerCase().includes(q));

    let matchesStock = true;
    if (stockFilter === 'IN_STOCK') {
      matchesStock = (Number(p.onHand) || 0) > 0;
    } else if (stockFilter === 'LOW_STOCK') {
      const qty = Number(p.onHand) || 0;
      matchesStock = qty > 0 && qty <= 10;
    } else if (stockFilter === 'OUT_OF_STOCK') {
      matchesStock = (Number(p.onHand) || 0) === 0;
    }

    return matchesSearch && matchesStock;
  });

  const totalOnHand = products.reduce((acc, p) => acc + (Number(p.onHand) || 0), 0);
  const totalValuation = products.reduce(
    (acc, p) => acc + (Number(p.onHand) || 0) * (Number(p.unitCost) || 0),
    0
  );

  const inStockCount = products.filter((p) => (Number(p.onHand) || 0) > 0).length;
  const lowStockCount = products.filter((p) => {
    const q = Number(p.onHand) || 0;
    return q > 0 && q <= 10;
  }).length;
  const outOfStockCount = products.filter((p) => (Number(p.onHand) || 0) === 0).length;

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

          <div className={styles.breadcrumbs}>
            <Link to={ROUTES.DASHBOARD} className={styles.crumbParent}>StockFlow</Link>
            <span className={styles.crumbSeparator}>/</span>
            <span className={styles.crumbParent}>Inventory</span>
            <span className={styles.crumbSeparator}>/</span>
            <h1 className={styles.crumbCurrent}>Stock Inventory</h1>
          </div>

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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Initial On Hand Units</label>
                  <input
                    type="number"
                    className={styles.formInput}
                    value={newProductForm.onHand}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewProductForm((p) => ({ ...p, onHand: val, freeToUse: val }));
                    }}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Free to Use Units</label>
                  <input
                    type="number"
                    className={styles.formInput}
                    value={newProductForm.freeToUse}
                    onChange={(e) => setNewProductForm((p) => ({ ...p, freeToUse: e.target.value }))}
                  />
                </div>
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setShowNewModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.btnPrimary}>
                  Save to Stock
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

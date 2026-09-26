import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '../../../widgets/app-header';
import { AppFooter } from '../../../widgets/app-footer';
import { ControlPanel } from '../../../widgets/control-panel';
import { StockTable } from '../../../widgets/stock-table';
import { StockFilterChips } from '../../../features/stock-search-filter';
import { productApi } from '../../../entities/product';
import styles from './StockPage.module.css';

export function StockPage() {
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState('list');
  const [search, setSearch] = useState('');
  const [filterState, setFilterState] = useState({ inStock: true, location: 'WH/Stock' });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => productApi.getProducts(),
  });

  const addMutation = useMutation({
    mutationFn: (newProd) => productApi.addProduct(newProd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => productApi.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  // Filter products by search term and filter state
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase());
    const matchesStock = filterState.inStock ? p.onHand > 0 : true;
    return matchesSearch && matchesStock;
  });

  return (
    <div className={styles.page}>
      <AppHeader />

      <main className={styles.mainContent}>
        {/* Operational Ribbon */}
        <ControlPanel
          parentSection="Inventory"
          title="Stock"
          onNew={() => {
            addMutation.mutate({
              name: 'New Office Chair',
              code: '[FURN_8820] Ergonomic Swivel Chair',
              icon: 'chair',
              unitCost: 4500,
              onHand: 20,
              freeToUse: 18,
              status: 'Available',
            });
          }}
          onUpload={() => alert('Import wizard: CSV / Excel upload ready.')}
          searchValue={search}
          onSearchChange={setSearch}
          placeholder="Search products or locations..."
          activeView={activeView}
          onViewChange={setActiveView}
          availableViews={['list', 'kanban', 'pivot', 'graph']}
          pager={{
            current: filteredProducts.length > 0 ? `1-${filteredProducts.length}` : '0',
            total: String(filteredProducts.length),
            hasPrev: false,
            hasNext: false,
          }}
        />

        {/* Operational Filter Chips Row */}
        <StockFilterChips onFilterChange={setFilterState} />

        {/* Workspace Canvas */}
        <div className={styles.canvasWrapper}>
          <StockTable
            products={filteredProducts}
            onAddProduct={(item) => addMutation.mutate(item)}
            onDeleteProduct={(id) => deleteMutation.mutate(id)}
          />
        </div>
      </main>

      <AppFooter />
    </div>
  );
}

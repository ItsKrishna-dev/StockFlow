import React, { useState } from 'react';
import { cn } from '../../../shared/lib/classNames';
import styles from './StockTable.module.css';

export function StockTable({ products, onAddProduct, onDeleteProduct }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newRow, setNewRow] = useState({
    name: '',
    code: '',
    unitCost: '3000',
    onHand: '10',
    freeToUse: '10',
  });

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(products.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSaveNewRow = () => {
    if (!newRow.name.trim()) return;
    if (onAddProduct) {
      onAddProduct({
        name: newRow.name,
        code: newRow.code || `[FURN_${Math.floor(1000 + Math.random() * 9000)}] Standard Item`,
        unitCost: Number(newRow.unitCost) || 0,
        onHand: Number(newRow.onHand) || 1,
        freeToUse: Number(newRow.freeToUse) || 1,
        status: 'Available',
      });
    }
    setNewRow({ name: '', code: '', unitCost: '3000', onHand: '10', freeToUse: '10' });
    setIsAdding(false);
  };

  // Aggregations
  const totalOnHand = products.reduce((acc, p) => acc + (Number(p.onHand) || 0), 0);
  const totalFreeToUse = products.reduce((acc, p) => acc + (Number(p.freeToUse) || 0), 0);
  const totalValue = products.reduce(
    (acc, p) => acc + (Number(p.onHand) || 0) * (Number(p.unitCost) || 0),
    0
  );

  return (
    <div>
      <div className={styles.sheetContainer}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.theadRow}>
                <th className={cn(styles.th, styles.thCheckbox)}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={products.length > 0 && selectedIds.length === products.length}
                    onChange={handleSelectAll}
                    title="Select all"
                  />
                </th>
                <th className={styles.th}>Product</th>
                <th className={styles.th}>Warehouse & Location</th>
                <th className={cn(styles.th, styles.thRight)}>Per Unit Cost</th>
                <th className={cn(styles.th, styles.thRight)}>On Hand</th>
                <th className={cn(styles.th, styles.thRight)}>Free to Use</th>
                <th className={cn(styles.th, styles.thCenter)}>Status</th>
                <th className={cn(styles.th, styles.actionsCell)}></th>
              </tr>
            </thead>
            <tbody className={styles.tbody}>
              {products.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <tr
                    key={item.id}
                    className={cn(styles.tr, isSelected ? styles.editingRow : '')}
                    onClick={() => handleToggleRow(item.id)}
                  >
                    <td
                      className={cn(styles.td, styles.tdCheckbox)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={isSelected}
                        onChange={() => handleToggleRow(item.id)}
                      />
                    </td>
                    <td className={styles.td}>
                      <div className={styles.productCell}>
                        <div className={styles.productIconBox}>
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: '18px' }}
                          >
                            {item.icon || 'inventory_2'}
                          </span>
                        </div>
                        <div className={styles.productInfo}>
                          <div className={styles.productTitle}>
                            <span>{item.name}</span>
                          </div>
                          <span className={styles.productCode}>{item.code}</span>
                        </div>
                      </div>
                    </td>
                    <td className={styles.td}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: 600, color: '#332d3b' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#714b67' }}>warehouse</span>
                          <span>{item.warehouseName || 'Main Hub'}</span>
                        </div>
                        {item.locationName && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: '#714b67' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>pin_drop</span>
                            <span>{item.locationName}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className={cn(styles.td, styles.textRight, styles.costCell)}>
                      {Number(item.unitCost).toLocaleString()} Rs
                    </td>
                    <td className={cn(styles.td, styles.textRight)}>
                      <span style={{ fontWeight: 600 }}>
                        {Number(item.onHand).toFixed(2)}
                      </span>{' '}
                      <span style={{ color: 'var(--stockflow-text-secondary)', fontSize: '12px' }}>
                        Units
                      </span>
                    </td>
                    <td className={cn(styles.td, styles.textRight)}>
                      <span className={cn(styles.quantityBadge, styles.freeToUseBadge)}>
                        <span className={styles.greenDot} />
                        <span>{Number(item.freeToUse).toFixed(2)}</span>
                        <span style={{ fontSize: '11px' }}>Units</span>
                      </span>
                    </td>
                    <td className={cn(styles.td, styles.textCenter)}>
                      <span className={styles.statusPill}>{item.status || 'Available'}</span>
                    </td>
                    <td
                      className={cn(styles.td, styles.actionsCell)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className={styles.actionIconBtn}
                        title="Delete product"
                        onClick={() => onDeleteProduct && onDeleteProduct(item.id)}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                          delete
                        </span>
                      </button>
                    </td>
                  </tr>
                );
              })}

              {/* Inline Editable Add a Line row */}
              {isAdding ? (
                <tr className={styles.editingRow}>
                  <td className={cn(styles.td, styles.tdCheckbox)}>
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: '16px', color: 'var(--stockflow-primary)' }}
                    >
                      add
                    </span>
                  </td>
                  <td className={styles.td}>
                    <input
                      type="text"
                      className={styles.editInput}
                      placeholder="Product name..."
                      value={newRow.name}
                      autoFocus
                      onChange={(e) => setNewRow({ ...newRow, name: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveNewRow()}
                    />
                  </td>
                  <td className={styles.td}>
                    <span style={{ color: '#8d8594', fontSize: '12px' }}>Auto-assigned</span>
                  </td>
                  <td className={cn(styles.td, styles.textRight)}>
                    <input
                      type="number"
                      className={styles.editInput}
                      style={{ width: '90px', textAlign: 'right' }}
                      value={newRow.unitCost}
                      onChange={(e) => setNewRow({ ...newRow, unitCost: e.target.value })}
                    />
                  </td>
                  <td className={cn(styles.td, styles.textRight)}>
                    <input
                      type="number"
                      className={styles.editInput}
                      style={{ width: '70px', textAlign: 'right' }}
                      value={newRow.onHand}
                      onChange={(e) => setNewRow({ ...newRow, onHand: e.target.value })}
                    />
                  </td>
                  <td className={cn(styles.td, styles.textRight)}>
                    <input
                      type="number"
                      className={styles.editInput}
                      style={{ width: '70px', textAlign: 'right' }}
                      value={newRow.freeToUse}
                      onChange={(e) => setNewRow({ ...newRow, freeToUse: e.target.value })}
                    />
                  </td>
                  <td className={cn(styles.td, styles.textCenter)}>
                    <span className={styles.statusPill}>Draft</span>
                  </td>
                  <td className={cn(styles.td, styles.actionsCell)}>
                    <button
                      type="button"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--stockflow-primary)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        marginRight: '6px',
                      }}
                      onClick={handleSaveNewRow}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--stockflow-text-secondary)',
                        cursor: 'pointer',
                      }}
                      onClick={() => setIsAdding(false)}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ) : (
                <tr className={styles.addLineRow}>
                  <td className={cn(styles.td, styles.tdCheckbox)}>
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: '16px', color: 'var(--stockflow-text-secondary)', opacity: 0.5 }}
                    >
                      subdirectory_arrow_right
                    </span>
                  </td>
                  <td className={styles.td} colSpan={7}>
                    <button
                      type="button"
                      className={styles.btnAddLine}
                      onClick={() => setIsAdding(true)}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                        add
                      </span>
                      <span>Add a line</span>
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Aggregation & Status Footer Bar */}
        <div className={styles.aggregationFooter}>
          <div className={styles.aggLeft}>
            <div className={styles.aggItem}>
              <span>Records:</span>
              <span className={styles.aggValue}>{products.length} products</span>
            </div>
            <div className={styles.aggItem}>
              <span>Total On Hand:</span>
              <span className={styles.aggValue}>{totalOnHand.toFixed(2)} Units</span>
            </div>
            <div className={styles.aggItem}>
              <span>Total Free to Use:</span>
              <span className={styles.aggValueHighlight}>
                {totalFreeToUse.toFixed(2)} Units
              </span>
            </div>
          </div>
          <div className={styles.aggRight}>
            <div className={styles.totalValueBox}>
              <span className={styles.totalLabel}>Total Inventory Value:</span>
              <span className={styles.totalAmount}>{totalValue.toLocaleString()} Rs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Contextual Information Helper */}
      <div className={styles.helperSection}>
        <div className={styles.helperTip}>
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
            info
          </span>
          <span>
            Tip: Click any cell to modify quantities or inline pricing. Changes are auto-saved
            to current valuation layer.
          </span>
        </div>
        <div className={styles.helperMeta}>
          <span>Warehouse WH (Main)</span>
          <span>•</span>
          <span>Valuation: Automated (AVCO)</span>
        </div>
      </div>
    </div>
  );
}

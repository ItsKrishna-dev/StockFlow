import React, { useState } from 'react';
import styles from './StockFilterChips.module.css';

export function StockFilterChips({ onFilterChange }) {
  const [inStockActive, setInStockActive] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState('WH/Stock');

  const toggleInStock = () => {
    const next = !inStockActive;
    setInStockActive(next);
    if (onFilterChange) onFilterChange({ inStock: next, location: selectedLocation });
  };

  return (
    <div className={styles.bar}>
      {inStockActive && (
        <div className={styles.activeChip}>
          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
            check_circle
          </span>
          <span>In Stock</span>
          <button
            type="button"
            className={styles.chipCloseBtn}
            onClick={toggleInStock}
            title="Remove filter"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
              close
            </span>
          </button>
        </div>
      )}

      <div className={styles.filterChip}>
        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
          warehouse
        </span>
        <span>Location: {selectedLocation}</span>
      </div>

      <div className={styles.customFilter}>
        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
          tune
        </span>
        <span>Custom Filter</span>
      </div>
    </div>
  );
}

import React from 'react';
import { cn } from '../../../shared/lib/classNames';
import styles from './WarehouseTransfersTable.module.css';

export function WarehouseTransfersTable({ transfers = [] }) {
  const getPillStyle = (variant) => {
    switch (variant) {
      case 'error':
        return styles.pillError;
      case 'secondary':
        return styles.pillSecondary;
      default:
        return styles.pillNeutral;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Live Warehouse Activity</h3>
        <span className={styles.subtitle}>Today's Transfers</span>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.theadRow}>
              <th className={styles.th}>Reference</th>
              <th className={styles.th}>Type</th>
              <th className={styles.th}>Partner</th>
              <th className={styles.th}>Scheduled Date</th>
              <th className={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map((item) => (
              <tr key={item.reference} className={styles.tr}>
                <td className={cn(styles.td, styles.reference)}>{item.reference}</td>
                <td className={styles.td}>{item.type}</td>
                <td className={styles.td}>{item.partner}</td>
                <td className={cn(styles.td, item.statusVariant === 'error' ? styles.lateDate : '')}>
                  {item.date}
                </td>
                <td className={styles.td}>
                  <span className={cn(styles.pill, getPillStyle(item.statusVariant))}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

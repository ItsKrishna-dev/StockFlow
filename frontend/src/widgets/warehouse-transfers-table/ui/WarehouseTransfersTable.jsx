import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../shared/config/routes';
import { cn } from '../../../shared/lib/classNames';
import styles from './WarehouseTransfersTable.module.css';

export function WarehouseTransfersTable({ transfers = [] }) {
  const navigate = useNavigate();

  const handleRowClick = (item) => {
    if (item.type?.toLowerCase().includes('in') || item.reference?.startsWith('WH/IN')) {
      navigate(ROUTES.RECEIPTS);
    } else if (item.type?.toLowerCase().includes('out') || item.reference?.startsWith('WH/OUT')) {
      navigate(ROUTES.DELIVERY_ORDERS);
    } else if (item.type?.toLowerCase().includes('int') || item.reference?.startsWith('WH/INT')) {
      navigate(ROUTES.TRANSFERS);
    } else {
      navigate(ROUTES.STOCK);
    }
  };

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
        <div className={styles.titleGroup}>
          <div className={styles.iconCircle}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#714b67' }}>
              sync_alt
            </span>
          </div>
          <div>
            <h3 className={styles.title}>Live Warehouse Activity</h3>
            <span className={styles.subtitle}>Real-time Inbound, Outbound & Internal Movements</span>
          </div>
        </div>
        <button
          type="button"
          className={styles.viewAllBtn}
          onClick={() => navigate(ROUTES.MOVE_HISTORY)}
        >
          <span>Move History</span>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
            arrow_forward
          </span>
        </button>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.theadRow}>
              <th className={styles.th}>Reference</th>
              <th className={styles.th}>Operation Type</th>
              <th className={styles.th}>Partner / Location</th>
              <th className={styles.th}>Scheduled Date</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {transfers.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: '#80747a' }}>
                  No pending transfers recorded today.
                </td>
              </tr>
            ) : (
              transfers.map((item) => (
                <tr
                  key={item.reference}
                  className={styles.tr}
                  onClick={() => handleRowClick(item)}
                >
                  <td className={cn(styles.td, styles.reference)}>
                    <span className={styles.refLink}>{item.reference}</span>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.typeBadge}>
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                        {item.type?.includes('Delivery') ? 'local_shipping' : item.type?.includes('Receipt') ? 'move_to_inbox' : 'swap_horiz'}
                      </span>
                      <span>{item.type}</span>
                    </div>
                  </td>
                  <td className={styles.td}>
                    <span style={{ fontWeight: 600, color: '#1b1c1c' }}>{item.partner}</span>
                  </td>
                  <td className={cn(styles.td, item.statusVariant === 'error' ? styles.lateDate : '')}>
                    {item.date}
                  </td>
                  <td className={styles.td}>
                    <span className={cn(styles.pill, getPillStyle(item.statusVariant))}>
                      {item.statusVariant === 'error' ? (
                        <span className={styles.dotError} />
                      ) : (
                        <span className={styles.dotSuccess} />
                      )}
                      {item.status}
                    </span>
                  </td>
                  <td className={cn(styles.td, styles.actionCell)}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#80747a' }}>
                      chevron_right
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export default WarehouseTransfersTable;


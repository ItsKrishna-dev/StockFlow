import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '../../../widgets/app-header';
import { AppFooter } from '../../../widgets/app-footer';
import { ControlPanel } from '../../../widgets/control-panel';
import { KpiCard } from '../../../widgets/kpi-card';
import { WarehouseTransfersTable } from '../../../widgets/warehouse-transfers-table';
import { kpiApi } from '../../../entities/inventory-kpi';
import { transfersApi, adjustmentsApi, deliveriesApi, receiptsApi } from '../../../shared/api/operationsApi';
import { ROUTES } from '../../../shared/config/routes';
import styles from './DashboardPage.module.css';

export function DashboardPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('ALL'); // 'ALL' | 'ATTENTION' | 'OUTBOUND' | 'INBOUND'
  const [groupByType, setGroupByType] = useState(false);

  // Core dashboard KPIs from backend
  const { data: kpis = {} } = useQuery({
    queryKey: ['kpis'],
    queryFn: () => kpiApi.getKpis(),
  });

  // Low-stock items feed & today's moves
  const { data: transfers = [] } = useQuery({
    queryKey: ['dashboard-transfers'],
    queryFn: () => kpiApi.getTransfers(),
  });

  // Raw KPIs for summary stats strip
  const { data: rawKpis = {} } = useQuery({
    queryKey: ['raw-kpis'],
    queryFn: () => kpiApi.getRawKpis(),
  });

  // Live counts for operations
  const { data: allTransfers = [] } = useQuery({
    queryKey: ['transfers'],
    queryFn: () => transfersApi.list(),
  });
  const { data: allAdjustments = [] } = useQuery({
    queryKey: ['adjustments'],
    queryFn: () => adjustmentsApi.list(),
  });
  const { data: allDeliveries = [] } = useQuery({
    queryKey: ['deliveries'],
    queryFn: () => deliveriesApi.list(),
  });
  const { data: allReceipts = [] } = useQuery({
    queryKey: ['receipts'],
    queryFn: () => receiptsApi.list(),
  });

  const pendingTransfers = useMemo(() => allTransfers.filter(t => !['done', 'cancelled'].includes(t.status)).length, [allTransfers]);
  const pendingAdjustments = useMemo(() => allAdjustments.filter(a => !['done', 'cancelled'].includes(a.status)).length, [allAdjustments]);
  const readyDeliveries = useMemo(() => allDeliveries.filter(d => d.status === 'ready').length, [allDeliveries]);
  const readyReceipts = useMemo(() => allReceipts.filter(r => r.status === 'ready').length, [allReceipts]);

  const handleNew = () => {
    navigate(ROUTES.STOCK);
  };

  // Combine real operations + low stock alerts into unified live activities feed
  const liveActivities = useMemo(() => {
    const list = [];

    // Receipts
    allReceipts.forEach(r => {
      const docNum = r.document_number || `RCPT-${String(r.id).slice(0, 6).toUpperCase()}`;
      list.push({
        id: r.id,
        reference: docNum,
        type: 'Receipt',
        partner: 'Vendor Inbound',
        date: r.status === 'done' ? 'Completed' : (r.status === 'ready' ? 'Ready to Process' : 'Draft / Scheduled'),
        status: r.status === 'done' ? 'Done' : (r.status === 'ready' ? 'Ready' : (r.status === 'waiting' ? 'Waiting' : 'Draft')),
        statusVariant: r.status === 'done' ? 'secondary' : (r.status === 'ready' ? 'error' : 'neutral'),
        productName: r.notes || 'Inbound Shipment',
        category: 'Inbound',
        isAttention: r.status === 'ready' || r.status === 'waiting',
      });
    });

    // Deliveries
    allDeliveries.forEach(d => {
      const docNum = d.document_number || `DELV-${String(d.id).slice(0, 6).toUpperCase()}`;
      list.push({
        id: d.id,
        reference: docNum,
        type: 'Delivery',
        partner: 'Customer Outbound',
        date: d.status === 'done' ? 'Dispatched' : (d.status === 'ready' ? 'Ready to Ship' : (d.status === 'waiting' ? 'Waiting for Stock' : 'Draft')),
        status: d.status === 'done' ? 'Done' : (d.status === 'ready' ? 'Ready' : (d.status === 'waiting' ? 'Waiting' : 'Draft')),
        statusVariant: d.status === 'done' ? 'secondary' : (d.status === 'ready' || d.status === 'waiting' ? 'error' : 'neutral'),
        productName: d.notes || 'Outbound Delivery',
        category: 'Outbound',
        isAttention: d.status === 'ready' || d.status === 'waiting',
      });
    });

    // Transfers
    allTransfers.forEach(t => {
      const docNum = t.document_number || `TRF-${String(t.id).slice(0, 6).toUpperCase()}`;
      list.push({
        id: t.id,
        reference: docNum,
        type: 'Internal Transfer',
        partner: 'Internal Rack Transfer',
        date: t.status === 'done' ? 'Moved' : (t.status === 'ready' ? 'Ready' : 'Draft'),
        status: t.status === 'done' ? 'Done' : (t.status === 'ready' ? 'Ready' : 'Draft'),
        statusVariant: t.status === 'done' ? 'secondary' : 'neutral',
        productName: t.notes || 'Internal Move',
        category: 'Transfer',
        isAttention: t.status === 'ready',
      });
    });

    // Adjustments
    allAdjustments.forEach(a => {
      const docNum = a.document_number || `ADJ-${String(a.id).slice(0, 6).toUpperCase()}`;
      list.push({
        id: a.id,
        reference: docNum,
        type: 'Stock Adjustment',
        partner: 'Cycle Count Audit',
        date: a.status === 'done' ? 'Reconciled' : 'Pending Review',
        status: a.status === 'done' ? 'Done' : 'Draft',
        statusVariant: a.status === 'done' ? 'secondary' : 'neutral',
        productName: a.notes || 'Physical Count Variance',
        category: 'Adjustment',
        isAttention: a.status === 'ready',
      });
    });

    // Low Stock Alerts
    transfers.forEach(item => {
      list.push({
        id: item.reference,
        reference: item.reference,
        type: 'Low Stock',
        partner: item.partner || 'Warehouse Storage',
        date: item.date,
        status: item.status,
        statusVariant: item.statusVariant,
        productName: item.productName || item.reference,
        category: 'LowStock',
        isAttention: true,
      });
    });

    return list;
  }, [allReceipts, allDeliveries, allTransfers, allAdjustments, transfers]);

  // Filter and search logic
  const filteredTransfers = useMemo(() => {
    let list = liveActivities;

    // Full search across Reference/SKU, Product, Location, Type, Status, Date
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(t => 
        t.reference?.toLowerCase().includes(q) ||
        t.productName?.toLowerCase().includes(q) ||
        t.partner?.toLowerCase().includes(q) ||
        t.type?.toLowerCase().includes(q) ||
        t.status?.toLowerCase().includes(q) ||
        t.date?.toLowerCase().includes(q)
      );
    }

    if (filterTab === 'ATTENTION') {
      list = list.filter(t => t.isAttention || t.statusVariant === 'error' || t.status?.toLowerCase().includes('low') || t.status?.toLowerCase().includes('out'));
    } else if (filterTab === 'OUTBOUND') {
      list = list.filter(t => t.category === 'Outbound' || t.type?.toLowerCase().includes('delivery') || t.reference?.includes('DELV') || t.reference?.includes('OUT'));
    } else if (filterTab === 'INBOUND') {
      list = list.filter(t => t.category === 'Inbound' || t.type?.toLowerCase().includes('receipt') || t.reference?.includes('RCPT') || t.reference?.includes('IN'));
    }

    if (groupByType) {
      list = [...list].sort((a, b) => (a.type || '').localeCompare(b.type || ''));
    }

    return list;
  }, [liveActivities, search, filterTab, groupByType]);

  const handleToggleFilter = () => {
    setFilterTab(prev => (prev === 'ATTENTION' ? 'ALL' : 'ATTENTION'));
  };

  const handleToggleGroup = () => {
    setGroupByType(prev => !prev);
  };

  const handleToggleFavorite = () => {
    setFilterTab(prev => (prev === 'ATTENTION' ? 'ALL' : 'ATTENTION'));
  };

  return (
    <div className={styles.page}>
      <AppHeader />

      <main className={styles.mainContent}>
        {/* Operational Control Ribbon */}
        <ControlPanel
          parentSection={null}
          title="Overview & Warehouse Ops"
          onNew={handleNew}
          searchValue={search}
          onSearchChange={setSearch}
          placeholder="Search reference, SKU, location..."
          availableViews={[]}
          onFilterClick={handleToggleFilter}
          isFilterActive={filterTab !== 'ALL'}
          onGroupClick={handleToggleGroup}
          isGroupActive={groupByType}
          onFavoriteClick={handleToggleFavorite}
          isFavoriteActive={filterTab === 'ATTENTION'}
        />

        {/* Dashboard Canvas */}
        <div className={styles.contentWrapper}>

          {/* ── Operations KPI Cards Grid (Primary) ─────────────────── */}
          <div className={styles.kpiGrid}>
            {/* Inbound Receipts Card */}
            <KpiCard
              title={kpis.receipt?.title || "Receipts"}
              icon={kpis.receipt?.icon || "move_to_inbox"}
              stripeColor="#714b67"
              actionText={kpis.receipt?.actionText || `${readyReceipts} to process`}
              onActionClick={() => navigate(ROUTES.RECEIPTS)}
              lateCount={kpis.receipt?.lateCount || 0}
              operationsCount={allReceipts.length || kpis.receipt?.operationsCount || 0}
              progressDone={allReceipts.filter(r => r.status === 'done').length}
              progressTotal={allReceipts.length || 1}
              subReference="WH/IN Orders"
            />

            {/* Outbound Delivery Orders Card */}
            <KpiCard
              title={kpis.delivery?.title || "Delivery Orders"}
              icon={kpis.delivery?.icon || "local_shipping"}
              stripeColor="#714b67"
              actionText={kpis.delivery?.actionText || `${readyDeliveries} to process`}
              onActionClick={() => navigate(ROUTES.DELIVERY_ORDERS)}
              lateCount={kpis.delivery?.lateCount || 0}
              waitingCount={allDeliveries.filter(d => d.status === 'waiting').length}
              operationsCount={allDeliveries.length || kpis.delivery?.operationsCount || 0}
              progressDone={allDeliveries.filter(d => d.status === 'done').length}
              progressTotal={allDeliveries.length || 1}
              subReference="WH/OUT Shipments"
            />

            {/* Internal Transfers KPI Card */}
            <KpiCard
              title="Internal Transfers"
              icon="swap_horiz"
              stripeColor="#714b67"
              actionText={`${pendingTransfers} pending`}
              onActionClick={() => navigate(ROUTES.TRANSFERS)}
              operationsCount={allTransfers.length}
              progressDone={allTransfers.filter(t => t.status === 'done').length}
              progressTotal={allTransfers.length || 1}
              subReference="WH/INT Transfers"
            />

            {/* Stock Adjustments KPI Card */}
            <KpiCard
              title="Stock Adjustments"
              icon="tune"
              stripeColor="#714b67"
              actionText={`${pendingAdjustments} open`}
              onActionClick={() => navigate(ROUTES.ADJUSTMENTS)}
              operationsCount={allAdjustments.length}
              progressDone={allAdjustments.filter(a => a.status === 'done').length}
              progressTotal={allAdjustments.length || 1}
              subReference="Physical Counts & Audits"
            />
          </div>

          {/* ── Summary Stats Strip (Simple & Clean) ──────────────────── */}
          <div className={styles.statsStrip}>
            <div
              className={styles.statCard}
              onClick={() => navigate(ROUTES.STOCK)}
            >
              <div className={styles.statIconBox}>
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>inventory_2</span>
              </div>
              <div className={styles.statMeta}>
                <div className={styles.statValue}>{rawKpis.total_products ?? '—'}</div>
                <div className={styles.statLabel}>Total Products</div>
              </div>
            </div>

            <div
              className={styles.statCard}
              onClick={() => navigate(ROUTES.STOCK)}
            >
              <div className={styles.statIconBox}>
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>warning_amber</span>
              </div>
              <div className={styles.statMeta}>
                <div className={styles.statValue}>
                  {rawKpis.low_stock_count ?? '0'}
                </div>
                <div className={styles.statLabel}>Low Stock Items</div>
              </div>
              {Number(rawKpis.low_stock_count || 0) > 0 && (
                <span className={styles.statTagWarning}>Action needed</span>
              )}
            </div>

            <div
              className={styles.statCard}
              onClick={() => navigate(ROUTES.TRANSFERS)}
            >
              <div className={styles.statIconBox}>
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>swap_horiz</span>
              </div>
              <div className={styles.statMeta}>
                <div className={styles.statValue}>
                  {pendingTransfers}
                </div>
                <div className={styles.statLabel}>Pending Transfers</div>
              </div>
            </div>

            <div
              className={styles.statCard}
              onClick={() => navigate(ROUTES.ADJUSTMENTS)}
            >
              <div className={styles.statIconBox}>
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>tune</span>
              </div>
              <div className={styles.statMeta}>
                <div className={styles.statValue}>
                  {pendingAdjustments}
                </div>
                <div className={styles.statLabel}>Open Adjustments</div>
              </div>
            </div>

            <div
              className={styles.statCard}
              onClick={() => navigate(ROUTES.STOCK)}
            >
              <div className={styles.statIconBox}>
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>remove_shopping_cart</span>
              </div>
              <div className={styles.statMeta}>
                <div className={styles.statValue}>
                  {rawKpis.out_of_stock_count ?? '0'}
                </div>
                <div className={styles.statLabel}>Out of Stock</div>
              </div>
            </div>
          </div>

          {/* ── Quick Filter Navigation Pills ────────────────────────── */}
          <div className={styles.filterSection}>
            <div className={styles.filterPills}>
              <button
                type="button"
                className={`${styles.filterPill} ${filterTab === 'ALL' ? styles.filterPillActive : ''}`}
                onClick={() => setFilterTab('ALL')}
              >
                <span>All Live Operations</span>
                <span className={styles.filterCountBadge}>{liveActivities.length}</span>
              </button>
              <button
                type="button"
                className={`${styles.filterPill} ${filterTab === 'ATTENTION' ? styles.filterPillActive : ''}`}
                onClick={() => setFilterTab('ATTENTION')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  priority_high
                </span>
                <span>Needs Attention</span>
              </button>
              <button
                type="button"
                className={`${styles.filterPill} ${filterTab === 'OUTBOUND' ? styles.filterPillActive : ''}`}
                onClick={() => setFilterTab('OUTBOUND')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  local_shipping
                </span>
                <span>Outbound Dispatches</span>
              </button>
              <button
                type="button"
                className={`${styles.filterPill} ${filterTab === 'INBOUND' ? styles.filterPillActive : ''}`}
                onClick={() => setFilterTab('INBOUND')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  move_to_inbox
                </span>
                <span>Inbound Receipts</span>
              </button>
            </div>
          </div>

          {/* ── Live Warehouse Activity Table ────────────────────────── */}
          <WarehouseTransfersTable transfers={filteredTransfers} />

          {/* ── Quick Access Launcher Grid (Simple & Unified) ────────── */}
          <div className={styles.quickLinks}>
            <div className={styles.quickLinksHeader}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#714b67' }}>
                grid_view
              </span>
              <p className={styles.quickLinksTitle}>Quick Navigation & Modules</p>
            </div>
            <div className={styles.quickLinksGrid}>
              {[
                { label: 'Receipts', icon: 'move_to_inbox', path: ROUTES.RECEIPTS },
                { label: 'Deliveries', icon: 'local_shipping', path: ROUTES.DELIVERY_ORDERS },
                { label: 'Transfers', icon: 'swap_horiz', path: ROUTES.TRANSFERS },
                { label: 'Adjustments', icon: 'tune', path: ROUTES.ADJUSTMENTS },
                { label: 'Stock Levels', icon: 'inventory_2', path: ROUTES.STOCK },
                { label: 'Move History', icon: 'receipt_long', path: ROUTES.MOVE_HISTORY },
                { label: 'Warehouses', icon: 'warehouse', path: ROUTES.WAREHOUSE_SETTINGS },
                { label: 'Locations', icon: 'shelves', path: ROUTES.LOCATION_SETTINGS },
              ].map(item => (
                <Link key={item.label} to={item.path} className={styles.quickLink}>
                  <div className={styles.quickLinkIconBox}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{item.icon}</span>
                  </div>
                  <span className={styles.quickLinkLabel}>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </main>

      <AppFooter />
    </div>
  );
}
export default DashboardPage;



import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '../../../widgets/app-header';
import { AppFooter } from '../../../widgets/app-footer';
import { ControlPanel } from '../../../widgets/control-panel';
import { KpiCard } from '../../../widgets/kpi-card';
import { WarehouseTransfersTable } from '../../../widgets/warehouse-transfers-table';
import { kpiApi } from '../../../entities/inventory-kpi';
import { transfersApi, adjustmentsApi } from '../../../shared/api/operationsApi';
import { ROUTES } from '../../../shared/config/routes';
import styles from './DashboardPage.module.css';

export function DashboardPage() {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('kanban');
  const [search, setSearch] = useState('');

  // Core dashboard KPIs from backend
  const { data: kpis = {}, isLoading: kpisLoading } = useQuery({
    queryKey: ['kpis'],
    queryFn: () => kpiApi.getKpis(),
  });

  // Low-stock items feed
  const { data: transfers = [] } = useQuery({
    queryKey: ['dashboard-transfers'],
    queryFn: () => kpiApi.getTransfers(),
  });

  // Raw KPIs for summary stats strip
  const { data: rawKpis = {} } = useQuery({
    queryKey: ['raw-kpis'],
    queryFn: () => kpiApi.getRawKpis(),
  });

  // Live counts for new operations
  const { data: allTransfers = [] } = useQuery({
    queryKey: ['transfers'],
    queryFn: () => transfersApi.list(),
  });
  const { data: allAdjustments = [] } = useQuery({
    queryKey: ['adjustments'],
    queryFn: () => adjustmentsApi.list(),
  });

  const pendingTransfers = useMemo(() => allTransfers.filter(t => !['done','cancelled'].includes(t.status)).length, [allTransfers]);
  const pendingAdjustments = useMemo(() => allAdjustments.filter(a => !['done','cancelled'].includes(a.status)).length, [allAdjustments]);

  const handleNew = () => {
    navigate(ROUTES.STOCK);
  };

  return (
    <div className={styles.page}>
      <AppHeader />

      <main className={styles.mainContent}>
        {/* Operational Control Ribbon */}
        <ControlPanel
          parentSection="Inventory"
          title="Dashboard"
          onNew={handleNew}
          searchValue={search}
          onSearchChange={setSearch}
          placeholder="Search..."
          activeView={activeView}
          onViewChange={setActiveView}
          availableViews={['kanban', 'list']}
        />

        {/* Dashboard Canvas */}
        <div className={styles.contentWrapper}>

          {/* ── Summary Stats Strip ─────────────────────────────────── */}
          <div className={styles.statsStrip}>
            <div className={styles.statCard} onClick={() => navigate(ROUTES.STOCK)} style={{ cursor: 'pointer' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#714b67' }}>inventory_2</span>
              <div>
                <div className={styles.statValue}>{rawKpis.total_products ?? '—'}</div>
                <div className={styles.statLabel}>Total Products</div>
              </div>
            </div>
            <div className={styles.statCard} style={{ borderLeftColor: '#d97706' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#d97706' }}>warning_amber</span>
              <div>
                <div className={styles.statValue} style={{ color: '#d97706' }}>{rawKpis.low_stock_count ?? '—'}</div>
                <div className={styles.statLabel}>Low Stock Items</div>
              </div>
            </div>
            <div className={styles.statCard} onClick={() => navigate(ROUTES.TRANSFERS)} style={{ cursor: 'pointer', borderLeftColor: '#006398' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#006398' }}>swap_horiz</span>
              <div>
                <div className={styles.statValue} style={{ color: '#006398' }}>{pendingTransfers}</div>
                <div className={styles.statLabel}>Pending Transfers</div>
              </div>
            </div>
            <div className={styles.statCard} onClick={() => navigate(ROUTES.ADJUSTMENTS)} style={{ cursor: 'pointer', borderLeftColor: '#006443' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#006443' }}>tune</span>
              <div>
                <div className={styles.statValue} style={{ color: '#006443' }}>{pendingAdjustments}</div>
                <div className={styles.statLabel}>Open Adjustments</div>
              </div>
            </div>
            <div className={styles.statCard} style={{ borderLeftColor: '#ba1a1a' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#ba1a1a' }}>remove_shopping_cart</span>
              <div>
                <div className={styles.statValue} style={{ color: '#ba1a1a' }}>{rawKpis.out_of_stock_count ?? '—'}</div>
                <div className={styles.statLabel}>Out of Stock</div>
              </div>
            </div>
          </div>

          {/* ── Operations KPI Cards ─────────────────────────────────── */}
          <div className={styles.kpiGrid}>
            {kpis.receipt && (
              <KpiCard
                title={kpis.receipt.title}
                icon={kpis.receipt.icon}
                stripeColor={kpis.receipt.stripeColor}
                actionText={kpis.receipt.actionText}
                onActionClick={() => navigate(ROUTES.RECEIPTS)}
                lateCount={kpis.receipt.lateCount}
                operationsCount={kpis.receipt.operationsCount}
                progressDone={kpis.receipt.progressDone}
                progressTotal={kpis.receipt.progressTotal}
                subReference={kpis.receipt.subReference}
                segments={kpis.receipt.segments}
              />
            )}

            {kpis.delivery && (
              <KpiCard
                title={kpis.delivery.title}
                icon={kpis.delivery.icon}
                stripeColor={kpis.delivery.stripeColor}
                actionText={kpis.delivery.actionText}
                onActionClick={() => navigate(ROUTES.DELIVERY_ORDERS)}
                lateCount={kpis.delivery.lateCount}
                waitingCount={kpis.delivery.waitingCount}
                operationsCount={kpis.delivery.operationsCount}
                progressDone={kpis.delivery.progressDone}
                progressTotal={kpis.delivery.progressTotal}
                subReference={kpis.delivery.subReference}
                segments={kpis.delivery.segments}
              />
            )}

            {/* Transfers KPI Card (synthetic from live data) */}
            <KpiCard
              title="Internal Transfers"
              icon="swap_horiz"
              stripeColor="#006398"
              actionText={`${pendingTransfers} pending`}
              onActionClick={() => navigate(ROUTES.TRANSFERS)}
              operationsCount={allTransfers.length}
              progressDone={allTransfers.filter(t => t.status === 'done').length}
              progressTotal={allTransfers.length || 1}
              subReference="WH/INT Transfers"
              segments={[
                { color: '#006398', width: `${allTransfers.length ? Math.round((pendingTransfers / allTransfers.length) * 100) : 0}%` },
                { color: '#e4e2e2', width: '100%' },
              ]}
            />

            {/* Adjustments KPI Card (synthetic from live data) */}
            <KpiCard
              title="Stock Adjustments"
              icon="tune"
              stripeColor="#006443"
              actionText={`${pendingAdjustments} open`}
              onActionClick={() => navigate(ROUTES.ADJUSTMENTS)}
              operationsCount={allAdjustments.length}
              progressDone={allAdjustments.filter(a => a.status === 'done').length}
              progressTotal={allAdjustments.length || 1}
              subReference="Physical Counts"
              segments={[
                { color: '#006443', width: `${allAdjustments.length ? Math.round((pendingAdjustments / allAdjustments.length) * 100) : 0}%` },
                { color: '#e4e2e2', width: '100%' },
              ]}
            />
          </div>

          {/* ── Live Warehouse Activity (Low Stock / Recent Docs) ────── */}
          <WarehouseTransfersTable transfers={transfers} />

          {/* ── Quick Navigation Links ───────────────────────────────── */}
          <div className={styles.quickLinks}>
            <p className={styles.quickLinksTitle}>Quick Access</p>
            <div className={styles.quickLinksGrid}>
              {[
                { label: 'Receipts', icon: 'move_to_inbox', path: ROUTES.RECEIPTS, color: '#57344f' },
                { label: 'Deliveries', icon: 'local_shipping', path: ROUTES.DELIVERY_ORDERS, color: '#006398' },
                { label: 'Transfers', icon: 'swap_horiz', path: ROUTES.TRANSFERS, color: '#006398' },
                { label: 'Adjustments', icon: 'tune', path: ROUTES.ADJUSTMENTS, color: '#006443' },
                { label: 'Stock', icon: 'inventory', path: ROUTES.STOCK, color: '#57344f' },
                { label: 'Move History', icon: 'receipt_long', path: ROUTES.MOVE_HISTORY, color: '#004a31' },
                { label: 'Warehouses', icon: 'warehouse', path: ROUTES.WAREHOUSE_SETTINGS, color: '#714b67' },
                { label: 'Locations', icon: 'shelves', path: ROUTES.LOCATION_SETTINGS, color: '#714b67' },
              ].map(item => (
                <Link key={item.label} to={item.path} className={styles.quickLink}>
                  <span className="material-symbols-outlined" style={{ fontSize: 22, color: item.color }}>{ item.icon }</span>
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

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '../../../widgets/app-header';
import { AppFooter } from '../../../widgets/app-footer';
import { ControlPanel } from '../../../widgets/control-panel';
import { KpiCard } from '../../../widgets/kpi-card';
import { WarehouseTransfersTable } from '../../../widgets/warehouse-transfers-table';
import { kpiApi } from '../../../entities/inventory-kpi';
import { ROUTES } from '../../../shared/config/routes';
import styles from './DashboardPage.module.css';

export function DashboardPage() {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('kanban');
  const [search, setSearch] = useState('');

  const { data: kpis = {} } = useQuery({
    queryKey: ['kpis'],
    queryFn: () => kpiApi.getKpis(),
  });

  const { data: transfers = [] } = useQuery({
    queryKey: ['transfers'],
    queryFn: () => kpiApi.getTransfers(),
  });

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
          {/* Operations KPI Cards */}
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
          </div>

          {/* Live Warehouse Activity */}
          <WarehouseTransfersTable transfers={transfers} />
        </div>
      </main>

      <AppFooter />
    </div>
  );
}

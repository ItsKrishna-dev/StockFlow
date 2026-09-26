import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import {
  LoginPage,
  SignUpPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  DashboardPage,
  StockPage,
  WarehouseSettingsPage,
  LocationSettingsPage,
  MoveHistoryPage,
} from '../../pages';
import DeliveryOrdersPage from '../../components/delivery/DeliveryOrdersPage';
import DeliveryOrderDetailView from '../../components/delivery/DeliveryOrderDetailView';
import ReceiptsListPage from '../../components/receipts/ReceiptsListPage';
import ReceiptDetailPage from '../../components/receipts/ReceiptDetailPage';
import InternalTransfersPage from '../../components/transfers/InternalTransfersPage';
import StockAdjustmentsPage from '../../components/transfers/StockAdjustmentsPage';
import { RequireRole } from '../../shared/ui/RequireRole';
import { ROUTES } from '../../shared/config/routes';

export function AppRouterProvider() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default route */}
        <Route path={ROUTES.HOME} element={<DashboardPage />} />

        {/* Authentication Routes */}
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.SIGNUP} element={<SignUpPage />} />
        <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
        <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />

        {/* Core Inventory Routes */}
        <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
        <Route path={ROUTES.STOCK} element={<StockPage />} />

        {/* Delivery Orders & Operations Routes */}
        <Route path={ROUTES.OPERATIONS} element={<Navigate to={ROUTES.RECEIPTS} replace />} />
        <Route path={ROUTES.DELIVERY_ORDERS} element={<DeliveryOrdersPage />} />
        <Route path={ROUTES.DELIVERY_DETAIL} element={<DeliveryOrderDetailView />} />

        {/* Receipt Routes: List page first, then Detail page on receipt click */}
        <Route path={ROUTES.RECEIPTS} element={<ReceiptsListPage />} />
        <Route path={ROUTES.RECEIPT_DETAIL} element={<ReceiptDetailPage />} />

        {/* Internal Transfers */}
        <Route path={ROUTES.TRANSFERS} element={<InternalTransfersPage />} />

        {/* Stock Adjustments */}
        <Route path={ROUTES.ADJUSTMENTS} element={<StockAdjustmentsPage />} />

        {/* Move History Audit Route */}
        <Route path={ROUTES.MOVE_HISTORY} element={<MoveHistoryPage />} />

        {/* Settings & Warehouse/Location Configuration Routes (Admin & Managers only) */}
        <Route
          path={ROUTES.SETTINGS}
          element={
            <RequireRole>
              <WarehouseSettingsPage />
            </RequireRole>
          }
        />
        <Route
          path={ROUTES.WAREHOUSE_SETTINGS}
          element={
            <RequireRole>
              <WarehouseSettingsPage />
            </RequireRole>
          }
        />
        <Route
          path={ROUTES.LOCATION_SETTINGS}
          element={
            <RequireRole>
              <LocationSettingsPage />
            </RequireRole>
          }
        />

        {/* Catch-all route */}
        <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

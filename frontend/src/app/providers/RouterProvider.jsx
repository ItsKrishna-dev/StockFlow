import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage, SignUpPage, DashboardPage, StockPage } from '../../pages';
import DeliveryOrdersPage from '../../components/delivery/DeliveryOrdersPage';
import DeliveryOrderDetailView from '../../components/delivery/DeliveryOrderDetailView';
import { ROUTES } from '../../shared/config/routes';

export function AppRouterProvider() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default route redirects to Dashboard */}
        <Route path={ROUTES.HOME} element={<Navigate to={ROUTES.DASHBOARD} replace />} />
        
        {/* Authentication Routes */}
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.SIGNUP} element={<SignUpPage />} />

        {/* Core Inventory Routes */}
        <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
        <Route path={ROUTES.STOCK} element={<StockPage />} />

        {/* Delivery Orders & Operations Routes */}
        <Route path={ROUTES.OPERATIONS} element={<DeliveryOrdersPage />} />
        <Route path={ROUTES.DELIVERY_ORDERS} element={<DeliveryOrdersPage />} />
        <Route path={ROUTES.DELIVERY_DETAIL} element={<DeliveryOrderDetailView />} />
        
        {/* Auxiliary Routes */}
        <Route path={ROUTES.MOVE_HISTORY} element={<StockPage />} />
        <Route path={ROUTES.SETTINGS} element={<DashboardPage />} />

        {/* Catch-all route */}
        <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage, SignUpPage } from '../../pages';
import DeliveryOrdersPage from '../../components/delivery/DeliveryOrdersPage';
import { ROUTES } from '../../shared/config/routes';

export function AppRouterProvider() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default route */}
        <Route path={ROUTES.HOME} element={<Navigate to={ROUTES.DELIVERY_ORDERS} replace />} />
        
        {/* Authentication Routes */}
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.SIGNUP} element={<SignUpPage />} />

        {/* Operations & Delivery Routes */}
        <Route path={ROUTES.DELIVERY_ORDERS} element={<DeliveryOrdersPage />} />
        <Route path={ROUTES.DASHBOARD} element={<DeliveryOrdersPage />} />

        {/* Catch-all route */}
        <Route path="*" element={<Navigate to={ROUTES.DELIVERY_ORDERS} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

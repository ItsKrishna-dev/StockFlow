import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LoginPage, SignUpPage } from '../../pages';
import DeliveryOrdersPage from '../../components/delivery/DeliveryOrdersPage';
import ReceiptDetailPage from '../../components/receipts/ReceiptDetailPage';
import { ROUTES } from '../../shared/config/routes';

export function AppRouterProvider() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default route renders Delivery Orders UI */}
        <Route path={ROUTES.HOME} element={<DeliveryOrdersPage />} />
        
        {/* Authentication Routes */}
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.SIGNUP} element={<SignUpPage />} />

        {/* Dashboard / Delivery Routes */}
        <Route path={ROUTES.DELIVERY_ORDERS} element={<DeliveryOrdersPage />} />
        <Route path={ROUTES.DASHBOARD} element={<DeliveryOrdersPage />} />

        {/* Receipt Routes */}
        <Route path={ROUTES.RECEIPTS} element={<ReceiptDetailPage />} />
        <Route path={ROUTES.RECEIPT_DETAIL} element={<ReceiptDetailPage />} />

        {/* Catch-all route */}
        <Route path="*" element={<DeliveryOrdersPage />} />
      </Routes>
    </BrowserRouter>
  );
}

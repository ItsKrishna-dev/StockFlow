import React from 'react';
import { QueryProvider, AppRouterProvider } from './providers';
import './styles/base.css';

export default function App() {
  return (
    <QueryProvider>
      <AppRouterProvider />
    </QueryProvider>
  );
}

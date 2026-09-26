import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../lib/usePermissions';
import { ROUTES } from '../config/routes';

/**
 * Route protection wrapper. Restricts access to allowed roles (default: managers & admins).
 * Unauthorized users are redirected to the dashboard.
 */
export function RequireRole({
  allowedRoles = ['admin', 'inventory_manager'],
  children,
  redirectTo = ROUTES.DASHBOARD,
}) {
  const { role } = usePermissions();

  if (allowedRoles.includes(role)) {
    return children;
  }

  return <Navigate to={redirectTo} replace />;
}

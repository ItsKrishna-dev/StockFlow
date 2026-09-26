import { useState, useEffect } from 'react';
import { sessionStore } from '../../entities/session/model/sessionStore';
import { authApi } from '../../entities/session/api/authApi';

/**
 * Hook providing role-based permission flags and facility scoping.
 *
 * Roles:
 * - admin: Global access, settings management, validation, multi-facility
 * - inventory_manager: Global operations access, multi-facility switcher, validation
 * - warehouse_staff: Locked to single assigned facility, can create/edit lines, cannot validate or access settings
 */
export function usePermissions() {
  const [currentUser, setCurrentUser] = useState(() => sessionStore.getUser());

  useEffect(() => {
    if (sessionStore.isAuthenticated()) {
      const user = sessionStore.getUser();
      // Hydrate user profile if role or warehouse_id is not yet cached in session
      if (!user?.role || (user.role === 'warehouse_staff' && user.warehouse_id === undefined)) {
        authApi
          .getMe()
          .then((me) => {
            sessionStore.updateUser(me);
            setCurrentUser(sessionStore.getUser());
          })
          .catch(() => {});
      }
    }
  }, []);

  const role = currentUser?.role || 'warehouse_staff';
  const isAdmin = role === 'admin';
  const isManager = role === 'inventory_manager';
  const isStaff = role === 'warehouse_staff';

  // Action capabilities
  const canValidate = isAdmin || isManager;
  const canCancel = isAdmin || isManager;
  const canManageSettings = isAdmin || isManager;
  const canManageWarehouses = isAdmin || isManager;

  // Multi-Facility Access (Approved Option A)
  // Admins and Managers have enterprise-wide facility switcher access.
  // Warehouse Staff are strictly confined to their assigned facility.
  const hasMultiFacilityAccess = isAdmin || isManager;
  const assignedWarehouseId = isStaff ? (currentUser?.warehouse_id || null) : null;

  return {
    user: currentUser,
    role,
    isAdmin,
    isManager,
    isStaff,
    canValidate,
    canCancel,
    canManageSettings,
    canManageWarehouses,
    hasMultiFacilityAccess,
    assignedWarehouseId,
  };
}

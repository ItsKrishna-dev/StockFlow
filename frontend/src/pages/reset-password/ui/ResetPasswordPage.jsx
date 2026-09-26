import React from 'react';
import { AuthCardLayout } from '../../../widgets/auth-card';
import { ResetPasswordForm } from '../../../features/auth-by-reset-password';

export function ResetPasswordPage() {
  return (
    <AuthCardLayout
      title="Create New Password"
      subtitle="StockFlow Security & Access"
    >
      <ResetPasswordForm />
    </AuthCardLayout>
  );
}
export default ResetPasswordPage;

import React from 'react';
import { AuthCardLayout } from '../../../widgets/auth-card';
import { ForgotPasswordForm } from '../../../features/auth-by-forgot-password';

export function ForgotPasswordPage() {
  return (
    <AuthCardLayout
      title="Reset Password"
      subtitle="StockFlow Account Recovery"
    >
      <ForgotPasswordForm />
    </AuthCardLayout>
  );
}
export default ForgotPasswordPage;

import React from 'react';
import { AuthCardLayout } from '../../../widgets/auth-card';
import { LoginForm } from '../../../features/auth-by-login-id';

export function LoginPage() {
  return (
    <AuthCardLayout
      title="Login"
      subtitle="Access your enterprise workspace"
    >
      <LoginForm />
    </AuthCardLayout>
  );
}

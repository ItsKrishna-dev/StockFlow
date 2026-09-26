import React from 'react';
import { AuthCardLayout } from '../../../widgets/auth-card';
import { SignUpForm } from '../../../features/auth-by-signup';

export function SignUpPage() {
  return (
    <AuthCardLayout
      title="Sign Up"
      subtitle="Create your enterprise workspace account"
    >
      <SignUpForm />
    </AuthCardLayout>
  );
}

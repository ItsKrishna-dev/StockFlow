import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input, Button, Alert } from '../../../shared/ui';
import { ROUTES } from '../../../shared/config/routes';
import { useSignUpForm } from '../model/useSignUpForm';
import styles from './SignUpForm.module.css';

export function SignUpForm() {
  const navigate = useNavigate();
  const {
    values,
    errors,
    handleChange,
    handleSubmit,
    isPending,
    serverError,
    isSuccess,
  } = useSignUpForm({
    onSuccess: () => {
      setTimeout(() => {
        navigate(ROUTES.LOGIN);
      }, 700);
    },
  });

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {serverError && <Alert variant="error" message={serverError} />}
      {isSuccess && (
        <Alert
          variant="success"
          message="Account created successfully! Redirecting to login..."
        />
      )}

      {/* Enter Login Id */}
      <Input
        label="Enter Login Id"
        id="signup-login-id"
        name="loginId"
        placeholder="e.g. admin or employee ID"
        value={values.loginId}
        onChange={handleChange}
        error={errors.loginId}
        required
      />

      {/* Enter Email */}
      <Input
        label="Enter Email"
        id="signup-email"
        name="email"
        type="email"
        placeholder="name@company.com"
        value={values.email}
        onChange={handleChange}
        error={errors.email}
        required
      />

      {/* Enter Password */}
      <Input
        label="Enter Password"
        id="signup-password"
        name="password"
        type="password"
        placeholder="••••••••"
        value={values.password}
        onChange={handleChange}
        error={errors.password}
        required
      />

      {/* Re-enter Password */}
      <Input
        label="Re-enter Password"
        id="signup-confirm-password"
        name="confirmPassword"
        type="password"
        placeholder="••••••••"
        value={values.confirmPassword}
        onChange={handleChange}
        error={errors.confirmPassword}
        required
      />

      {/* Sign up Button */}
      <div className={styles.submitWrapper}>
        <Button type="submit" loading={isPending}>
          Sign up
        </Button>
      </div>

      {/* Already have an account? Login */}
      <div className={styles.footerRow}>
        <span>Already have an account?</span>
        <Link to={ROUTES.LOGIN} className={styles.loginLink}>
          Login
        </Link>
      </div>
    </form>
  );
}

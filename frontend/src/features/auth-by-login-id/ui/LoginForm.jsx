import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input, Button, Alert } from '../../../shared/ui';
import { ROUTES } from '../../../shared/config/routes';
import { useLoginForm } from '../model/useLoginForm';
import styles from './LoginForm.module.css';

export function LoginForm() {
  const navigate = useNavigate();
  const {
    values,
    errors,
    handleChange,
    handleSubmit,
    isPending,
    serverError,
    isSuccess,
  } = useLoginForm({
    onSuccess: () => {
      // Navigate to dashboard or show success
      setTimeout(() => {
        navigate(ROUTES.DASHBOARD || ROUTES.HOME);
      }, 500);
    },
  });

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {serverError && <Alert variant="error" message={serverError} />}
      {isSuccess && (
        <Alert variant="success" message="Authentication successful. Redirecting..." />
      )}

      {/* Login Id Input */}
      <Input
        label="Login Id"
        id="login-id"
        name="loginId"
        placeholder="e.g. admin@company.com"
        value={values.loginId}
        onChange={handleChange}
        error={errors.loginId}
        required
        autoComplete="username"
      />

      {/* Password Input */}
      <Input
        label="Password"
        id="password"
        name="password"
        type="password"
        placeholder="••••••••"
        value={values.password}
        onChange={handleChange}
        error={errors.password}
        required
        autoComplete="current-password"
      />

      {/* Primary Purple Button labeled "Login" */}
      <div className={styles.submitWrapper}>
        <Button type="submit" loading={isPending}>
          Login
        </Button>
      </div>

      {/* Below the button: Two small text links side by side */}
      <div className={styles.footerLinks}>
        <Link to={ROUTES.FORGOT_PASSWORD} className={styles.forgotLink}>
          Forgot Password?
        </Link>
        <Link to={ROUTES.SIGNUP} className={styles.signupLink}>
          Sign up
        </Link>
      </div>
    </form>
  );
}

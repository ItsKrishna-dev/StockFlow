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

      {/* Full Name */}
      <Input
        label="Full Name"
        id="signup-full-name"
        name="full_name"
        placeholder="e.g. John Smith"
        value={values.full_name}
        onChange={handleChange}
        error={errors.full_name}
        required
        autoComplete="name"
      />

      {/* Enter Email */}
      <Input
        label="Email Address"
        id="signup-email"
        name="email"
        type="email"
        placeholder="name@company.com"
        value={values.email}
        onChange={handleChange}
        error={errors.email}
        required
        autoComplete="email"
      />

      {/* Role Selection */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label htmlFor="signup-role" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary, #637381)' }}>
          Role
        </label>
        <select
          id="signup-role"
          name="role"
          value={values.role}
          onChange={handleChange}
          style={{
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1.5px solid var(--color-border, #e0e0e0)',
            background: 'var(--color-surface, #fff)',
            fontSize: '14px',
            color: 'var(--color-text, #1c1c1e)',
            cursor: 'pointer',
          }}
        >
          <option value="warehouse_staff">Warehouse Staff</option>
          <option value="inventory_manager">Inventory Manager</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {/* Enter Password */}
      <Input
        label="Password"
        id="signup-password"
        name="password"
        type="password"
        placeholder="Min 8 characters"
        value={values.password}
        onChange={handleChange}
        error={errors.password}
        required
        autoComplete="new-password"
      />

      {/* Re-enter Password */}
      <Input
        label="Confirm Password"
        id="signup-confirm-password"
        name="confirmPassword"
        type="password"
        placeholder="••••••••"
        value={values.confirmPassword}
        onChange={handleChange}
        error={errors.confirmPassword}
        required
        autoComplete="new-password"
      />

      {/* Sign up Button */}
      <div className={styles.submitWrapper}>
        <Button type="submit" loading={isPending}>
          Create Account
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

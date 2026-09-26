import React, { useState, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button, Input, Alert } from '../../../shared/ui';
import { ROUTES } from '../../../shared/config/routes';
import styles from './ResetPasswordForm.module.css';

export function ResetPasswordForm() {
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve email or identifier from route state if available
  const email = location.state?.email || 'your account';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Compute password strength
  const passwordStrength = useMemo(() => {
    if (!newPassword) return { score: 0, label: '', color: '' };
    let score = 0;
    if (newPassword.length >= 6) score += 1;
    if (newPassword.length >= 10) score += 1;
    if (/[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 1;

    switch (score) {
      case 1:
        return { score: 25, label: 'Weak', color: '#ba1a1a' };
      case 2:
        return { score: 50, label: 'Fair', color: '#d97706' };
      case 3:
        return { score: 75, label: 'Good', color: '#0369a1' };
      case 4:
        return { score: 100, label: 'Strong', color: '#006443' };
      default:
        return { score: 15, label: 'Very Weak', color: '#ba1a1a' };
    }
  }, [newPassword]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!newPassword) {
      setError('Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must contain at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter both fields.');
      return;
    }

    setIsPending(true);

    setTimeout(() => {
      setIsPending(false);
      setIsSuccess(true);
    }, 900);
  };

  if (isSuccess) {
    return (
      <div className={styles.successWrapper}>
        <div className={styles.successIconBox}>
          <span className="material-symbols-outlined" style={{ fontSize: '38px', color: '#006443' }}>
            verified_user
          </span>
        </div>

        <h3 className={styles.successTitle}>Password Changed Successfully!</h3>
        <p className={styles.successSub}>
          Your new password is now active. You can sign in immediately with your updated credentials.
        </p>

        <div className={styles.submitWrapper} style={{ marginTop: '14px', width: '100%' }}>
          <Button
            type="button"
            onClick={() => navigate(ROUTES.LOGIN)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              login
            </span>
            <span>Back to Login</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      {error && <Alert variant="error" message={error} />}

      <div className={styles.infoBanner}>
        <div className={styles.infoIconBox}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            vpn_key
          </span>
        </div>
        <div style={{ flex: 1 }}>
          <div className={styles.infoHeading}>Set New Password</div>
          <div className={styles.infoDesc}>
            Creating new credentials for <strong style={{ color: '#714b67' }}>{email}</strong>
          </div>
        </div>
      </div>

      {/* New Password Input */}
      <div style={{ position: 'relative' }}>
        <Input
          label="New Password"
          id="new-password"
          name="newPassword"
          type={showPassword ? 'text' : 'password'}
          placeholder="Enter new password (min. 6 chars)"
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            setError('');
          }}
          required
          autoFocus
          autoComplete="new-password"
        />
        <button
          type="button"
          className={styles.passwordToggle}
          onClick={() => setShowPassword((p) => !p)}
          title={showPassword ? 'Hide password' : 'Show password'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            {showPassword ? 'visibility_off' : 'visibility'}
          </span>
        </button>
      </div>

      {/* Password Strength Meter */}
      {newPassword && (
        <div className={styles.strengthWrapper}>
          <div className={styles.strengthTrack}>
            <div
              className={styles.strengthFill}
              style={{
                width: `${passwordStrength.score}%`,
                backgroundColor: passwordStrength.color,
              }}
            />
          </div>
          <div className={styles.strengthLabel} style={{ color: passwordStrength.color }}>
            Strength: <strong>{passwordStrength.label}</strong>
          </div>
        </div>
      )}

      {/* Confirm Password Input */}
      <div style={{ position: 'relative' }}>
        <Input
          label="Confirm New Password"
          id="confirm-password"
          name="confirmPassword"
          type={showConfirmPassword ? 'text' : 'password'}
          placeholder="Re-enter your new password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            setError('');
          }}
          required
          autoComplete="new-password"
        />
        <button
          type="button"
          className={styles.passwordToggle}
          onClick={() => setShowConfirmPassword((p) => !p)}
          title={showConfirmPassword ? 'Hide password' : 'Show password'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            {showConfirmPassword ? 'visibility_off' : 'visibility'}
          </span>
        </button>
      </div>

      <div className={styles.submitWrapper}>
        <Button type="submit" loading={isPending}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            check_circle
          </span>
          <span>Update Password</span>
        </Button>
      </div>

      <div className={styles.footerLinks}>
        <Link to={ROUTES.LOGIN} className={styles.cancelLink}>
          Cancel and return to Login
        </Link>
      </div>
    </form>
  );
}
export default ResetPasswordForm;

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input, Alert } from '../../../shared/ui';
import { ROUTES } from '../../../shared/config/routes';
import { authApi } from '../../../entities/session';
import styles from './ForgotPasswordForm.module.css';

export function ForgotPasswordForm() {
  const navigate = useNavigate();

  // Multi-step state: 'REQUEST_OTP' | 'VERIFY_OTP'
  const [step, setStep] = useState('REQUEST_OTP');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [resendTimer, setResendTimer] = useState(60);

  const canResend = resendTimer === 0;
  const otpInputRefs = useRef([]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (step !== 'VERIFY_OTP' || resendTimer <= 0) return;

    const interval = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [step, resendTimer]);

  // Handle OTP digit changes
  const handleOtpChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError('');

    // Auto focus next input
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);

    // Focus last filled or next input
    const nextIndex = Math.min(pastedData.length, 5);
    otpInputRefs.current[nextIndex]?.focus();
  };

  // Step 1: Request OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your registered email address');
      return;
    }

    setIsPending(true);
    try {
      await authApi.forgotPassword(email.trim());
      setStep('VERIFY_OTP');
      setResendTimer(60);
      setInfoMsg(`A 6-digit verification code has been sent to ${email}`);
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsPending(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (!canResend) return;
    setIsPending(true);
    setError('');
    try {
      await authApi.forgotPassword(email.trim());
      setResendTimer(60);
      setOtp(['', '', '', '', '', '']);
      setInfoMsg(`New verification code sent to ${email}`);
    } catch (err) {
      setError(err.message || 'Failed to resend OTP.');
    } finally {
      setIsPending(false);
    }
  };

  // Step 2: Verify OTP -> Navigate to separate New Password Page with otp
  const handleVerifyOtp = (e) => {
    e.preventDefault();
    setError('');

    const fullOtp = otp.join('');
    if (fullOtp.length < 6) {
      setError('Please enter the complete 6-digit verification code');
      return;
    }

    // Pass email + OTP to reset-password page via route state
    navigate(ROUTES.RESET_PASSWORD, { state: { email, otp: fullOtp } });
  };

  return (
    <div className={styles.container}>
      {error && <Alert variant="error" message={error} />}
      {infoMsg && step === 'VERIFY_OTP' && !error && (
        <Alert variant="info" message={infoMsg} />
      )}

      {/* ============================================================== */}
      {/* STEP 1: REQUEST OTP CODE                                      */}
      {/* ============================================================== */}
      {step === 'REQUEST_OTP' && (
        <form onSubmit={handleRequestOtp} className={styles.form} noValidate>
          <div className={styles.stepHeader}>
            <div className={styles.stepIconBox}>
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                lock_reset
              </span>
            </div>
            <p className={styles.instructionText}>
              Enter your registered email address or login identifier. We'll send you an OTP verification code.
            </p>
          </div>

          <Input
            label="Email Address / Login ID"
            id="forgot-email"
            name="email"
            type="email"
            placeholder="e.g. alex@company.internal or user@stockflow.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            required
            autoFocus
            autoComplete="email"
          />

          <div className={styles.submitWrapper}>
            <Button type="submit" loading={isPending}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                send
              </span>
              <span>Send Verification Code</span>
            </Button>
          </div>

          <div className={styles.footerLinks}>
            <Link to={ROUTES.LOGIN} className={styles.backLink}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                arrow_back
              </span>
              <span>Remember password? Back to Login</span>
            </Link>
          </div>
        </form>
      )}

      {/* ============================================================== */}
      {/* STEP 2: VERIFY OTP CODE                                        */}
      {/* ============================================================== */}
      {step === 'VERIFY_OTP' && (
        <form onSubmit={handleVerifyOtp} className={styles.form} noValidate>
          <div className={styles.emailBadgeRow}>
            <span className={styles.emailBadge}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#714b67' }}>
                mark_email_read
              </span>
              <span>Sent to: {email}</span>
            </span>
            <button
              type="button"
              className={styles.changeEmailBtn}
              onClick={() => {
                setStep('REQUEST_OTP');
                setError('');
              }}
            >
              Change
            </button>
          </div>

          {/* 6-Digit OTP Boxes */}
          <div className={styles.otpSection}>
            <label className={styles.otpLabel}>Enter 6-Digit Verification Code</label>
            <div className={styles.otpGrid} onPaste={handleOtpPaste}>
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (otpInputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className={`${styles.otpBox} ${digit ? styles.otpBoxFilled : ''}`}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  autoFocus={idx === 0}
                />
              ))}
            </div>

            <div className={styles.resendRow}>
              {canResend ? (
                <button
                  type="button"
                  className={styles.resendBtn}
                  onClick={handleResendOtp}
                  disabled={isPending}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                    refresh
                  </span>
                  <span>Resend OTP Code</span>
                </button>
              ) : (
                <span className={styles.timerText}>
                  Resend code in <strong>{resendTimer}s</strong>
                </span>
              )}
            </div>
          </div>

          <div className={styles.submitWrapper}>
            <Button type="submit" loading={isPending}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                verified
              </span>
              <span>Verify Code & Continue</span>
            </Button>
          </div>

          <div className={styles.footerLinks}>
            <button
              type="button"
              className={styles.backLinkBtn}
              onClick={() => {
                setStep('REQUEST_OTP');
                setError('');
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                arrow_back
              </span>
              <span>Back to email entry</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
export default ForgotPasswordForm;

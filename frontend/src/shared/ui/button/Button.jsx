import React from 'react';
import { cn } from '../../lib/classNames';
import styles from './Button.module.css';

export function Button({
  children,
  type = 'button',
  variant = 'primary',
  loading = false,
  disabled = false,
  className = '',
  onClick,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={cn(
        styles.button,
        styles[variant] || styles.primary,
        loading ? styles.loading : '',
        className
      )}
      {...props}
    >
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : children}
    </button>
  );
}

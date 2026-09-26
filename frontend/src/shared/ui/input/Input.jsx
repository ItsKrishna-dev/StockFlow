import React from 'react';
import { cn } from '../../lib/classNames';
import styles from './Input.module.css';

export function Input({
  label,
  id,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  required = false,
  className = '',
  rightElement = null,
  ...props
}) {
  return (
    <div className={cn(styles.group, className)}>
      {label && (
        <div className={styles.labelRow}>
          <label htmlFor={id} className={styles.label}>
            {label}
          </label>
          {rightElement}
        </div>
      )}
      <div className={styles.inputWrapper}>
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={cn(styles.input, error ? styles.hasError : '')}
          {...props}
        />
      </div>
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
}

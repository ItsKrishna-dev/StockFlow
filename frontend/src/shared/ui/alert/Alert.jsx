import React from 'react';
import { cn } from '../../lib/classNames';
import styles from './Alert.module.css';

export function Alert({ variant = 'error', message, className = '' }) {
  if (!message) return null;

  return (
    <div role="alert" className={cn(styles.alert, styles[variant], className)}>
      <span>{message}</span>
    </div>
  );
}

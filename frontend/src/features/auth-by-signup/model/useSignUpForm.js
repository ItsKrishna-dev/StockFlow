import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../../../entities/session';

export function useSignUpForm({ onSuccess } = {}) {
  const [values, setValues] = useState({
    login_id: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'warehouse_staff',
    full_name: '',
  });

  const [errors, setErrors] = useState({});

  const mutation = useMutation({
    mutationFn: (data) =>
      authApi.signUp({
        login_id: data.login_id,
        email: data.email,
        password: data.password,
        full_name: data.full_name || data.login_id,
        role: data.role || 'warehouse_staff',
      }),
    onSuccess: (data) => {
      if (onSuccess) onSuccess(data);
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    // 1. login ID should be unique and must be in between 6-12 characters
    const cleanLoginId = values.login_id.trim();
    if (!cleanLoginId) {
      newErrors.login_id = 'Login ID is required';
    } else if (cleanLoginId.length < 6 || cleanLoginId.length > 12) {
      newErrors.login_id = 'Login ID must be between 6 and 12 characters';
    }

    // 2. Email Id should not be a duplicate in database
    const cleanEmail = values.email.trim();
    if (!cleanEmail) {
      newErrors.email = 'Email ID is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // 3. Password must contain small case, large case, special character and length more than 8
    const pwd = values.password;
    if (!pwd) {
      newErrors.password = 'Password is required';
    } else if (pwd.length <= 8) {
      newErrors.password = 'Password length must be more than 8 characters';
    } else if (!/[a-z]/.test(pwd)) {
      newErrors.password = 'Password must contain at least one lowercase letter';
    } else if (!/[A-Z]/.test(pwd)) {
      newErrors.password = 'Password must contain at least one uppercase letter';
    } else if (!/[^A-Za-z0-9]/.test(pwd)) {
      newErrors.password = 'Password must contain at least one special character';
    }

    // Re-enter password match
    if (!values.confirmPassword) {
      newErrors.confirmPassword = 'Please re-enter your password';
    } else if (values.password !== values.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      mutation.mutate(values);
    }
  };

  return {
    values,
    errors,
    handleChange,
    handleSubmit,
    isPending: mutation.isPending,
    serverError: mutation.error?.message,
    isSuccess: mutation.isSuccess,
  };
}

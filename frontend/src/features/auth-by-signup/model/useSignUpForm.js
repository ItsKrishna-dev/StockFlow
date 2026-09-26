import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../../../entities/session';

export function useSignUpForm({ onSuccess } = {}) {
  const [values, setValues] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'warehouse_staff',
  });

  const [errors, setErrors] = useState({});

  const mutation = useMutation({
    mutationFn: (data) =>
      authApi.signUp({
        email: data.email,
        password: data.password,
        full_name: data.full_name,
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
    if (!values.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }
    if (!values.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!values.password) {
      newErrors.password = 'Password is required';
    } else if (values.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (values.password !== values.confirmPassword) {
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

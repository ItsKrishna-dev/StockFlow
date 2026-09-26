import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { authApi, sessionStore } from '../../../entities/session';

export function useLoginForm({ onSuccess } = {}) {
  const [values, setValues] = useState({
    loginId: '',
    password: '',
  });

  const [errors, setErrors] = useState({});

  const mutation = useMutation({
    mutationFn: (data) => authApi.login(data),
    onSuccess: (data, variables) => {
      sessionStore.setUser({ ...data, email: variables.loginId });
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
    if (!values.loginId.trim()) {
      newErrors.loginId = 'Login Id is required';
    }
    if (!values.password) {
      newErrors.password = 'Password is required';
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

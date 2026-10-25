import { createContext, useState, useContext } from 'react';

const AuthContext = createContext(null);

export const API_URL = (import.meta.env && import.meta.env.VITE_API_URL) 
  ? import.meta.env.VITE_API_URL 
  : 'http://localhost:8000';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('paddy_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = async (username, password) => {
    const res = await fetch(`${API_URL}/api/auth/login-json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.detail || 'Login failed');
    }

    const data = await res.json();
    const userData = {
      token: data.access_token,
      role: data.role,
      username: data.username,
      full_name: data.full_name,
      email: data.email
    };
    setUser(userData);
    localStorage.setItem('paddy_user', JSON.stringify(userData));
    return userData;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('paddy_user');
  };

  const register = async (username, email, password, fullName, role = 'staff') => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username, 
        email, 
        password, 
        full_name: fullName, 
        role 
      })
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.detail || 'Registration failed');
    }

    const data = await res.json();
    return data;
  };

  const forgotPassword = async (email) => {
    const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to send password reset request');
    }
    return data;
  };

  const verifyResetToken = async (token) => {
    const res = await fetch(`${API_URL}/api/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Invalid or expired password reset link');
    }
    return data;
  };

  const resetPassword = async (token, newPassword) => {
    const res = await fetch(`${API_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, new_password: newPassword })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to reset password');
    }
    return data;
  };

  const apiFetch = async (endpoint, options = {}) => {
    const headers = { ...options.headers };
    if (user?.token) {
      headers['Authorization'] = `Bearer ${user.token}`;
    }

    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    });

    if (res.status === 401) {
      logout();
      window.location.href = '/login';
      throw new Error('Session expired. Please login again.');
    }

    return res;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      register, 
      forgotPassword, 
      verifyResetToken, 
      resetPassword, 
      apiFetch 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};

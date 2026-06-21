import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

export const API_URL = 'http://localhost:8000';

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
      full_name: data.full_name
    };
    setUser(userData);
    localStorage.setItem('paddy_user', JSON.stringify(userData));
    return userData;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('paddy_user');
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
    <AuthContext.Provider value={{ user, login, logout, apiFetch }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};

/**
 * Auth Context
 * ─────────────────────────────────────────────────────────────
 * Global authentication state using React Context + useReducer.
 * Provides login, logout, register, and user state to ALL components.
 *
 * Usage in any component:
 *   const { user, login, logout, isAuthenticated } = useAuth();
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

// ─── Context ──────────────────────────────────────────────────
const AuthContext = createContext(null);

// ─── State Shape ──────────────────────────────────────────────
const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,  // True while checking localStorage on mount
  error: null
};

// ─── Reducer ──────────────────────────────────────────────────
const authReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null
      };

    case 'LOGOUT':
      return {
        ...initialState,
        isLoading: false
      };

    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };

    default:
      return state;
  }
};

// ─── Provider ─────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // ── On Mount: Restore Session from LocalStorage ─────────────
  useEffect(() => {
    const token = localStorage.getItem('agri_token');
    const userData = localStorage.getItem('agri_user');

    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user, token }
        });
      } catch {
        // Corrupted data — clear it
        localStorage.removeItem('agri_token');
        localStorage.removeItem('agri_user');
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // ── Save to LocalStorage Helper ──────────────────────────────
  const persistAuth = (user, token) => {
    localStorage.setItem('agri_token', token);
    localStorage.setItem('agri_user', JSON.stringify(user));
  };

  // ── Register ─────────────────────────────────────────────────
  const register = useCallback(async (formData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const { data } = await api.post('/auth/register', formData);

      persistAuth(data.data, data.data.token);
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user: data.data, token: data.data.token }
      });

      toast.success(`Welcome to AgriAI, ${data.data.name}! 🌱`);
      return { success: true };

    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      toast.error(error.message || 'Registration failed');
      return { success: false, error: error.message };
    }
  }, []);

  // ── Login ─────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const { data } = await api.post('/auth/login', { email, password });

      persistAuth(data.data, data.data.token);
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user: data.data, token: data.data.token }
      });

      toast.success(`Welcome back, ${data.data.name}! 👋`);
      return { success: true };

    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      toast.error(error.message || 'Login failed');
      return { success: false, error: error.message };
    }
  }, []);

  // ── Logout ────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem('agri_token');
    localStorage.removeItem('agri_user');
    dispatch({ type: 'LOGOUT' });
    toast.success('Logged out successfully.');
  }, []);

  // ── Update Local User State ───────────────────────────────────
  const updateUser = useCallback((updatedData) => {
    dispatch({ type: 'UPDATE_USER', payload: updatedData });
    // Also update localStorage
    const current = JSON.parse(localStorage.getItem('agri_user') || '{}');
    localStorage.setItem('agri_user', JSON.stringify({ ...current, ...updatedData }));
  }, []);

  const value = {
    ...state,
    register,
    login,
    logout,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// ─── Custom Hook ──────────────────────────────────────────────
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return context;
};

export default AuthContext;
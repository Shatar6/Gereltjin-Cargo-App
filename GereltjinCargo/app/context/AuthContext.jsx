import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authService } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  //const [isLoading, setIsLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    //loadUser();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      const userData = await SecureStore.getItemAsync('user');
      
      if (token && userData) {
        // Check if token is valid by making a test API call
        try {
          await authService.verifyToken();
          setUser(JSON.parse(userData));
        } catch (error) {
          // Token is invalid or expired
          console.log('Token expired or invalid, logging out');
          await logout();
        }
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      await logout();
    } finally {
      setLoading(false);
    }
  };

  // const loadUser = async () => {
  //   try {
  //     const userStr = await SecureStore.getItemAsync('user');
  //     if (userStr) {
  //       setUser(JSON.parse(userStr));
  //     }
  //   } catch (error) {
  //     console.error('Error loading user:', error);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  const login = (user) => {
    setUser(user);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading}}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
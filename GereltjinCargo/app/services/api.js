import axios from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'http://192.168.1.175:5258/api'; 

// const API_URL = Platform.OS === 'android'
//     ? 'http://10.0.2.2:5258/api'
//     : 'http://localhost:5258/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add auth token to requests
// if (SecureStore) {
//   api.interceptors.request.use(async (config) => {
//     const token = await SecureStore.getItemAsync('token');
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   });
// }

// export default api;

// Request interceptor - add token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('token');
      console.log('Token exists:', !!token);
      console.log('Request URL:', config.url);
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('Auth header set:', config.headers.Authorization.substring(0, 20) + '...');
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => {
    console.log('Response success:', response.config.url);
    return response;
  },
  async (error) => {
    console.error('Response error:', error.response?.status, error.response?.data);
    
    if (error.response?.status === 401) {
      // Token might be expired or invalid
      console.log('401 Unauthorized - clearing token');
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('user');
      // You might want to redirect to login here
    }
    
    return Promise.reject(error);
  }
);

// Auth services
export const authService = {
  login: async (email, password) => {
    console.log("Trying to login with", email, password);
    const response = await api.post('/auth/login', { email, password });
    if (response.data.token) {
      await SecureStore.setItemAsync('token', response.data.token);
      await SecureStore.setItemAsync('user', JSON.stringify(response.data));
    }
    console.log("Response is", response);
    return response.data;
  },
  
  logout: async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
  },
  
  getToken: async () => {
    const token = await SecureStore.getItemAsync('token');
    console.log('Retrieved token:', !!token);
    return token;
  },

  verifyToken: async () => {
    // This will fail if token is invalid, triggering the 401 interceptor
    const response = await api.get('/orders/next-order-number');
    return response.data;
  }
};

// Orders services
export const ordersService = {
  getOrders: async (search) => {
    const params = search ? { search } : {};
    const response = await api.get('/orders', { params });
    return response.data;
  },

  getNextOrderNumber: async () => {
    const response = await api.get('/orders/next-order-number');
    return response.data;
  },

  updateOrder: async (orderId, updates) => {
    const response = await api.put(`/orders/${orderId}`, updates);
    return response.data;
  },
  
  createOrder: async (order) => {
    const response = await api.post('/orders', order);
    return response.data;
  },
  
  updateStatus: async (orderId, status) => {
    const response = await api.put(`/orders/${orderId}/status`, { status });
    return response.data;
  },

  getOrderHistory: async (orderId) => {
    const response = await api.get(`/orders/${orderId}/history`);
    return response.data;
  }
};
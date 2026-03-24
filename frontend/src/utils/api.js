import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const loginUser = (data) => api.post('/auth/login', data).then(r => r.data);
export const registerUser = (data) => api.post('/auth/register', data).then(r => r.data);
export const googleLogin = (credential) => api.post('/auth/google', { credential }).then(r => r.data);
export const updateProfile = (data) => api.put('/auth/profile', data).then(r => r.data);
export const updatePassword = (data) => api.put('/auth/password', data).then(r => r.data);
export const forgotPassword = (data) => api.post('/auth/forgot-password', data).then(r => r.data);

export const getDashboard = () => api.get('/dashboard').then(r => r.data);
export const getKeys = () => api.get('/keys').then(r => r.data);
export const getKey = (id) => api.get(`/keys/${id}`).then(r => r.data);
export const addKey = (data) => api.post('/keys', data).then(r => r.data);
export const updateKey = (id, data) => api.put(`/keys/${id}`, data).then(r => r.data);
export const deleteKey = (id) => api.delete(`/keys/${id}`).then(r => r.data);
export const syncKey = (id) => api.post(`/keys/${id}/sync`).then(r => r.data);
export const syncAll = () => api.post('/sync-all').then(r => r.data);
export const revealKey = (id) => api.get(`/keys/${id}/reveal`).then(r => r.data);

export default api;

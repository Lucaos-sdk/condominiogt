import axios from 'axios';

// Configuração base da API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar respostas
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Serviços de API organizados por módulo
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  profile: () => api.get('/auth/profile'),
  register: (userData) => api.post('/auth/register', userData),
  changePassword: (passwords) => api.put('/auth/change-password', passwords),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
};

export const condominiumAPI = {
  getAll: (params) => api.get('/condominiums', { params }),
  getById: (id) => api.get(`/condominiums/${id}`),
  create: (data) => api.post('/condominiums', data),
  update: (id, data) => api.put(`/condominiums/${id}`, data),
  delete: (id) => api.delete(`/condominiums/${id}`),
  getStats: (id) => api.get(`/condominiums/${id}/stats`),
};

export const userAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  getByCondominium: (condominiumId, params) => 
    api.get(`/users/condominium/${condominiumId}`, { params }),
  changePassword: (id, passwords) => api.put(`/users/${id}/password`, passwords),
  associateCondominium: (userId, condominiumData) => 
    api.post(`/users/${userId}/condominiums`, condominiumData),
  removeCondominium: (userId, condominiumId) => 
    api.delete(`/users/${userId}/condominiums/${condominiumId}`),
};

export const unitAPI = {
  getAll: (params) => api.get('/units', { params }),
  getById: (id) => api.get(`/units/${id}`),
  create: (data) => api.post('/units', data),
  update: (id, data) => api.put(`/units/${id}`, data),
  delete: (id) => api.delete(`/units/${id}`),
  getByCondominium: (condominiumId, params) => 
    api.get(`/units/condominium/${condominiumId}`, { params }),
  
  // Gestão de moradores
  getResidents: (unitId) => api.get(`/units/${unitId}/residents`),
  addResident: (unitId, userId, data) => api.post(`/units/${unitId}/residents/${userId}`, data),
  updateResident: (unitId, userId, data) => api.put(`/units/${unitId}/residents/${userId}`, data),
  removeResident: (unitId, userId) => api.delete(`/units/${unitId}/residents/${userId}`),
  
  // Histórico da unidade
  getHistory: (unitId, params) => api.get(`/units/${unitId}/history`, { params }),
  addHistoryEntry: (unitId, data) => api.post(`/units/${unitId}/history`, data),
  
  // Detalhes completos da unidade
  getDetails: (id) => api.get(`/units/${id}/details`),
  
  // Debug endpoint
  debugDelete: (id) => api.post('/units/debug-delete', { id }),
};

export const financialAPI = {
  getTransactions: (params) => api.get('/financial/transactions', { params }),
  getTransactionById: (id) => api.get(`/financial/transactions/${id}`),
  createTransaction: (data) => api.post('/financial/transactions', data),
  updateTransaction: (id, data) => api.put(`/financial/transactions/${id}`, data),
  deleteTransaction: (id) => api.delete(`/financial/transactions/${id}`),
  confirmCash: (id) => api.post(`/financial/transactions/${id}/confirm-cash`),
  approve: (id, data) => api.post(`/financial/transactions/${id}/approve`, data),
  cancelTransaction: (id, data) => api.post(`/financial/transactions/${id}/cancel`, data),
  softDeleteTransaction: (id, data) => api.post(`/financial/transactions/${id}/soft-delete`, data),
  getBalance: (condominiumId) => api.get(`/financial/balance/${condominiumId}`),
  getReport: (condominiumId, params) => 
    api.get(`/financial/report/${condominiumId}`, { params }),
};

export const maintenanceAPI = {
  getRequests: (params) => api.get('/maintenance/requests', { params }),
  getRequestById: (id) => api.get(`/maintenance/requests/${id}`),
  createRequest: (data) => api.post('/maintenance/requests', data),
  updateRequest: (id, data) => api.put(`/maintenance/requests/${id}`, data),
  deleteRequest: (id) => api.delete(`/maintenance/requests/${id}`),
  approve: (id, data) => api.post(`/maintenance/requests/${id}/approve`, data),
  reject: (id, data) => api.post(`/maintenance/requests/${id}/reject`, data),
  rate: (id, data) => api.post(`/maintenance/requests/${id}/rate`, data),
  getStats: (condominiumId, params) => 
    api.get(`/maintenance/stats/${condominiumId}`, { params }),
  getByCondominium: (condominiumId, params) => 
    api.get(`/maintenance/condominium/${condominiumId}`, { params }),
};

export const commonAreaAPI = {
  getAll: (params) => api.get('/common-areas', { params }),
  getById: (id) => api.get(`/common-areas/${id}`),
  create: (data) => api.post('/common-areas', data),
  update: (id, data) => api.put(`/common-areas/${id}`, data),
  delete: (id) => api.delete(`/common-areas/${id}`),
  getByCondominium: (condominiumId, params) => 
    api.get(`/common-areas/condominium/${condominiumId}`, { params }),
  getStats: (condominiumId, params) => 
    api.get(`/common-areas/stats/${condominiumId}`, { params }),
};

export const bookingAPI = {
  getAll: (params) => api.get('/bookings', { params }),
  getById: (id) => api.get(`/bookings/${id}`),
  create: (data) => api.post('/bookings', data),
  update: (id, data) => api.put(`/bookings/${id}`, data),
  delete: (id) => api.delete(`/bookings/${id}`),
  approve: (id, data) => api.post(`/bookings/${id}/approve`, data),
  reject: (id, data) => api.post(`/bookings/${id}/reject`, data),
  cancel: (id, data) => api.post(`/bookings/${id}/cancel`, data),
  markAsPaid: (id) => api.post(`/bookings/${id}/pay`),
  getByCommonArea: (commonAreaId, params) => 
    api.get(`/bookings/common-area/${commonAreaId}`, { params }),
  getStats: (condominiumId, params) => 
    api.get(`/bookings/stats/${condominiumId}`, { params }),
};

export const communicationAPI = {
  getAll: (params) => api.get('/communications', { params }),
  getById: (id) => api.get(`/communications/${id}`),
  create: (data) => api.post('/communications', data),
  update: (id, data) => api.put(`/communications/${id}`, data),
  delete: (id) => api.delete(`/communications/${id}`),
  like: (id) => api.post(`/communications/${id}/like`),
  getByCondominium: (condominiumId, params) => 
    api.get(`/communications/condominium/${condominiumId}`, { params }),
  getStats: (condominiumId, params) => 
    api.get(`/communications/stats/${condominiumId}`, { params }),
};

// Export default api instance for backward compatibility
export { api };
export default api;
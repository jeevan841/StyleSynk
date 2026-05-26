// client/src/api/index.js
// Axios base client with JWT interceptor + all module API functions

import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 15000,
});

// ── Request interceptor: attach JWT ───────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: unwrap data, handle 401 ─────────
api.interceptors.response.use(
  (response) => {
    // All our responses: { success, data, message }
    return response.data?.data !== undefined ? response.data.data : response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    const message = error.response?.data?.error || error.message || 'Request failed';
    return Promise.reject(new Error(message));
  }
);

// ── Auth ──────────────────────────────────────────────────
export const authAPI = {
  login:    (data)  => api.post('/auth/login', data),
  register: (data)  => api.post('/auth/register', data),
  me:       ()      => api.get('/auth/me'),
  logout:   ()      => api.post('/auth/logout'),
};

// ── Branches ──────────────────────────────────────────────
export const branchesAPI = {
  getAll: (params) => api.get('/branches', { params }),
  getOne: (id)     => api.get(`/branches/${id}`),
  create: (data)   => api.post('/branches', data),
  update: (id, d)  => api.patch(`/branches/${id}`, d),
};

// ── Staff ─────────────────────────────────────────────────
export const staffAPI = {
  getAll:          (params) => api.get('/staff', { params }),
  getOne:          (id)     => api.get(`/staff/${id}`),
  create:          (data)   => api.post('/staff', data),
  update:          (id, d)  => api.patch(`/staff/${id}`, d),
  getCommissions:  (id, p)  => api.get(`/staff/${id}/commissions`, { params: p }),
};

// ── Customers ─────────────────────────────────────────────
export const customersAPI = {
  getAll:  (params) => api.get('/customers', { params }),
  getOne:  (id)     => api.get(`/customers/${id}`),
  create:  (data)   => api.post('/customers', data),
  update:  (id, d)  => api.patch(`/customers/${id}`, d),
};

// Keep old alias for backward compatibility
export const clientsAPI = customersAPI;

// ── Services ──────────────────────────────────────────────
export const servicesAPI = {
  getAll:  (params) => api.get('/services', { params }),
  getOne:  (id)     => api.get(`/services/${id}`),
  create:  (data)   => api.post('/services', data),
  update:  (id, d)  => api.patch(`/services/${id}`, d),
};

// ── Appointments ──────────────────────────────────────────
export const appointmentsAPI = {
  getAll:  (params) => api.get('/appointments', { params }),
  getOne:  (id)     => api.get(`/appointments/${id}`),
  create:  (data)   => api.post('/appointments', data),
  update:  (id, d)  => api.patch(`/appointments/${id}`, d),
  remove:  (id)     => api.delete(`/appointments/${id}`),
};

// ── Billing ───────────────────────────────────────────────
export const billingAPI = {
  getAll:       (params) => api.get('/billing', { params }),
  getOne:       (id)     => api.get(`/billing/${id}`),
  createDraft:  (data)   => api.post('/billing/draft', data),
  addItem:      (id, d)  => api.post(`/billing/${id}/items`, d),
  closeBill:    (id, d)  => api.post(`/billing/${id}/close`, d),
};

// ── Inventory ─────────────────────────────────────────────
export const inventoryAPI = {
  getAll:  (params) => api.get('/inventory', { params }),
  getOne:  (id)     => api.get(`/inventory/${id}`),
  create:  (data)   => api.post('/inventory', data),
  update:  (id, d)  => api.patch(`/inventory/${id}`, d),
  remove:  (id)     => api.delete(`/inventory/${id}`),
};

// ── Analytics ─────────────────────────────────────────────
export const analyticsAPI = {
  overview:           (p) => api.get('/analytics/overview', { params: p }),
  revenueChart:       (p) => api.get('/analytics/revenue-chart', { params: p }),
  appointmentsChart:  (p) => api.get('/analytics/appointments-chart', { params: p }),
  branchPerformance:  (p) => api.get('/analytics/branch-performance', { params: p }),
  servicesPopularity: (p) => api.get('/analytics/services-popularity', { params: p }),
};

// ── AI ────────────────────────────────────────────────────
export const aiAPI = {
  parseBooking: (message) => api.post('/ai/parse-booking', { message }),
};

// ── Notifications ─────────────────────────────────────────
export const notificationsAPI = {
  getAll:      (params) => api.get('/notifications', { params }),
  markRead:    (id)     => api.patch(`/notifications/${id}/read`),
  markAllRead: (data)   => api.post('/notifications/mark-all-read', data),
};

export default api;

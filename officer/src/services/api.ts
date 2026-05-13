const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
};

const api = async (url, options = {}) => {
  const res = await fetch(`${API_BASE}${url}`, { headers: getHeaders(), ...options });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return res.json();
};

export const AuthService = {
  login: async (email, password) => {
    const data = await api('/auth/officer/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    localStorage.setItem('token', data.token);
    localStorage.setItem('currentOfficer', JSON.stringify(data.officer));
    return data;
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentOfficer');
  },
  getCurrentOfficer: () => {
    const stored = localStorage.getItem('currentOfficer');
    return stored ? JSON.parse(stored) : null;
  },
  getStatus: () => api('/officer/me'),
  updateProfile: async (updates) => {
    await api('/officer/profile', { method: 'PUT', body: JSON.stringify(updates) });
    const current = AuthService.getCurrentOfficer();
    if (current) {
      Object.assign(current, updates);
      localStorage.setItem('currentOfficer', JSON.stringify(current));
    }
    return current;
  },
  updatePassword: async (newPassword) => {
    await api('/officer/password', { method: 'PUT', body: JSON.stringify({ newPassword }) });
    return true;
  },
  confirmPasswordReset: async (token, newPassword) => {
    await api('/auth/user/reset-password', { method: 'PUT', body: JSON.stringify({ token, newPassword }) });
    return true;
  }
};

export const ComplaintService = {
  getMyComplaints: () => api('/officer/complaints'),
  getById: (id) => api(`/officer/complaints/${id}`),
  updateStatus: (id, status, remark) =>
    api(`/officer/complaints/${id}/status`, { method: 'PUT', body: JSON.stringify({ status, remark }) }),
  escalate: (id, reason) =>
    api(`/officer/complaints/${id}/escalate`, { method: 'PUT', body: JSON.stringify({ reason }) })
};

export const NotificationService = {
  getAll: () => api('/officer/notifications'),
  getRecent: async () => {
    const all = await NotificationService.getAll();
    return all.slice(0, 5);
  }
};

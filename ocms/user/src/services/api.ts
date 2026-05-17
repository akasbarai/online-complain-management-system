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
    const data = await api('/auth/user/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    localStorage.setItem('token', data.token);
    localStorage.setItem('currentUser', JSON.stringify(data.user));
    return data;
  },
  register: async (data) => {
    const res = await api('/auth/user/register', { method: 'POST', body: JSON.stringify(data) });
    localStorage.setItem('token', res.token);
    localStorage.setItem('currentUser', JSON.stringify(res.user));
    return res;
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
  },
  getCurrentUser: () => {
    const stored = localStorage.getItem('currentUser');
    return stored ? JSON.parse(stored) : null;
  },
  getStatus: () => api('/user/me'),
  updateProfile: async (data) => {
    await api('/user/profile', { method: 'PUT', body: JSON.stringify(data) });
    const current = AuthService.getCurrentUser();
    if (current) {
      Object.assign(current, data);
      localStorage.setItem('currentUser', JSON.stringify(current));
    }
    return current;
  },
  forgotPassword: (email) => api('/auth/user/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  updatePasswordWithToken: (token, newPassword) =>
    api('/auth/user/reset-password', { method: 'PUT', body: JSON.stringify({ token, newPassword }) }),
  verifyToken: async (_token) => true
};

export const DeptService = {
  getAll: async () => {
    try {
      const depts = await api('/public/departments');
      return depts.map(d => ({ id: d.id, name: d.name }));
    } catch {
      return [];
    }
  }
};

export const ComplaintService = {
  getMyComplaints: () => api('/user/complaints'),
  getById: (id) => api(`/user/complaints/${id}`),
  lodge: (data) => api('/user/complaints', { method: 'POST', body: JSON.stringify(data) }),
  withdraw: (id, reason) => api(`/user/complaints/${id}/withdraw`, { method: 'PUT', body: JSON.stringify({ reason }) })
};

export const NotificationService = {
  getAll: () => api('/user/notifications'),
  markAsRead: (id) => api(`/user/notifications/${id}/read`, { method: 'PUT' })
};

export const AttentionService = {
  getSummary: () => api('/user/attention')
};

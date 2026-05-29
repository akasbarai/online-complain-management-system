const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:4000/api').replace(/\/$/, '');
const NETWORK_ERROR = 'Cannot reach the OCMS server. Please make sure the API is running and try again.';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
};

const api = async (url, options = {}) => {
  let res;
  try {
    res = await fetch(`${API_BASE}${url}`, { headers: getHeaders(), ...options });
  } catch (err) {
    console.error(`API request failed: ${API_BASE}${url}`, err);
    throw new Error(NETWORK_ERROR);
  }

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
  verifyResetToken: (token) => api('/auth/user/reset-password/verify', { method: 'POST', body: JSON.stringify({ token }) }),
  updatePasswordWithToken: (token, newPassword) =>
    api('/auth/user/reset-password', { method: 'PUT', body: JSON.stringify({ token, newPassword }) })
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
  withdraw: (id, reason) => api(`/user/complaints/${id}/withdraw`, { method: 'PUT', body: JSON.stringify({ reason }) }),
  provideMaterials: (id, materials) => api(`/user/complaints/${id}/materials`, { method: 'PUT', body: JSON.stringify({ materials }) }),
  acceptResolution: (id) => api(`/user/complaints/${id}/accept-resolution`, { method: 'PUT' }),
  reopen: (id, reason) => api(`/user/complaints/${id}/reopen`, { method: 'PUT', body: JSON.stringify({ reason }) })
};

export const NotificationService = {
  getAll: () => api('/user/notifications'),
  markAsRead: (id) => api(`/user/notifications/${id}/read`, { method: 'PUT' })
};

export const AttentionService = {
  getSummary: () => api('/user/attention')
};

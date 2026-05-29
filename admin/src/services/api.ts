import type { Department, HierarchyLevel, Officer, User, Complaint, Notification } from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:4000/api').replace(/\/$/, '');
const NETWORK_ERROR = 'Cannot reach the OCMS server. Please make sure the API is running and try again.';

const getHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const api = async <T = any>(url: string, options: RequestInit = {}): Promise<T> => {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${url}`, { headers: getHeaders(), ...options });
  } catch (err) {
    console.error(`API request failed: ${API_BASE}${url}`, err);
    throw new Error(NETWORK_ERROR);
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('isAuthenticated');
      if (window.location.hash !== '#/login') {
        window.location.hash = '#/login';
      }
    }
    throw new Error(error.error || 'Request failed');
  }
  return res.json();
};

export const DeptService = {
  getAll: () => api<Department[]>('/admin/departments'),
  create: (data: Partial<Department>) => api<Department>('/admin/departments', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Department>) => api(`/admin/departments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleStatus: (id: string) => api(`/admin/departments/${id}/status`, { method: 'PUT' }),
  delete: (id: string) => api(`/admin/departments/${id}`, { method: 'DELETE' })
};

export const HierarchyService = {
  getAll: () => api<HierarchyLevel[]>('/admin/hierarchy'),
  create: (data: Partial<HierarchyLevel>) => api<HierarchyLevel>('/admin/hierarchy', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<HierarchyLevel>) => api(`/admin/hierarchy/${id}`, { method: 'PUT', body: JSON.stringify({ name: data.name }) }),
  toggleStatus: (id: string) => api(`/admin/hierarchy/${id}/status`, { method: 'PUT' }),
  delete: (id: string) => api(`/admin/hierarchy/${id}`, { method: 'DELETE' }),
  getByDept: async (deptId: string) => {
    const all = await api<HierarchyLevel[]>('/admin/hierarchy');
    return all.filter(h => h.departmentId === deptId);
  },
  getOfficerCount: async (levelId: string) => {
    const officers = await OfficerService.getAll();
    return officers.filter(o => o.hierarchyLevelId === levelId).length;
  },
  getParentLevel: async (levelId: string) => {
    const all = await api<HierarchyLevel[]>('/admin/hierarchy');
    const current = all.find(h => h.id === levelId);
    if (!current || !current.parentId) return null;
    return all.find(h => h.id === current.parentId) || null;
  }
};

export const OfficerService = {
  getAll: () => api<Officer[]>('/admin/officers'),
  create: (data: Partial<Officer>) => api<{ officer: Officer; password: string }>('/admin/officers', { method: 'POST', body: JSON.stringify(data) }),
  updateAssignment: (id: string, data: Partial<Officer>) => api(`/admin/officers/${id}/assignment`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleStatus: (id: string) => api(`/admin/officers/${id}/status`, { method: 'PUT' }),
  delete: (id: string) => api(`/admin/officers/${id}`, { method: 'DELETE' }),
  getByLevel: async (levelId: string) => {
    const officers = await OfficerService.getAll();
    return officers.filter(o => o.hierarchyLevelId === levelId && o.status === 'Active');
  }
};

export const UserService = {
  getAll: () => api<User[]>('/admin/users'),
  toggleStatus: (id: string, status: string) => api(`/admin/users/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  verifyUser: async (id: string) => {
    return api<{ message: string; emailSent: boolean; emailError?: string | null }>(`/admin/users/${id}/verify`, { method: 'PUT' });
  },
  delete: (id: string) => api(`/admin/users/${id}`, { method: 'DELETE' })
};

export const NotificationService = {
  getAll: () => api<Notification[]>('/admin/notifications'),
  markAsRead: (id: string) => api(`/admin/notifications/${id}/read`, { method: 'PUT' }),
  send: (data: Partial<Notification>) => api<Notification>('/admin/notifications', { method: 'POST', body: JSON.stringify(data) }),
  clearAll: () => api('/admin/notifications', { method: 'DELETE' })
};

export const AttentionService = {
  getSummary: () => api<Record<string, number>>('/admin/attention')
};

export const ComplaintService = {
  getAll: () => api<Complaint[]>('/admin/complaints'),
  reassign: (complaintId: string, officerId: string, reason: string) =>
    api(`/admin/complaints/${complaintId}/reassign`, { method: 'PUT', body: JSON.stringify({ officerId, reason }) }),
  updateStatus: (complaintId: string, status: string, notes?: string) =>
    api(`/admin/complaints/${complaintId}/status`, { method: 'PUT', body: JSON.stringify({ status, notes }) }),
  reopen: (complaintId: string, reason: string) =>
    api(`/admin/complaints/${complaintId}/reopen`, { method: 'PUT', body: JSON.stringify({ reason }) }),
  updatePriority: (complaintId: string, priority: string) =>
    api(`/admin/complaints/${complaintId}/priority`, { method: 'PUT', body: JSON.stringify({ priority }) }),
  getAnalytics: () => api('/admin/analytics')
};

export const DBService = {
  clearAll: () => {
    localStorage.clear();
  }
};

export const AuthService = {
  login: async (email: string, password: string) => {
    const data = await api<{ token: string; officer: Officer }>('/auth/officer/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    if (data.officer.role !== 'Admin') {
      throw new Error('Admin access required.');
    }
    localStorage.setItem('token', data.token);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('adminEmail', data.officer.email);
    localStorage.setItem('lastLogin', new Date().toISOString());
    return data;
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('isAuthenticated');
  }
};

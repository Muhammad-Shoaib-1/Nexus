const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const TOKEN_KEY = 'business_nexus_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

export const api = {
  register: (name: string, email: string, password: string, role: string) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, role }) }),

  login: (email: string, password: string, role: string) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password, role }) }),

  me: () => request('/auth/me'),

  forgotPassword: (email: string) =>
    request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),

  resetPassword: (token: string, newPassword: string) =>
    request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, newPassword }) }),

  updateProfile: (userId: string, updates: Record<string, unknown>) =>
    request(`/users/${userId}`, { method: 'PUT', body: JSON.stringify(updates) }),

  listUsers: (role?: string) =>
    request(`/users${role ? `?role=${role}` : ''}`),

  getUser: (id: string) => request(`/users/${id}`),

  sendCollaborationRequest: (entrepreneurId: string, message: string) =>
    request('/requests', { method: 'POST', body: JSON.stringify({ entrepreneurId, message }) }),

  getRequestsForEntrepreneur: () => request('/requests/entrepreneur'),

  getRequestsForInvestor: () => request('/requests/investor'),

  updateRequestStatus: (requestId: string, status: 'accepted' | 'rejected') =>
    request(`/requests/${requestId}`, { method: 'PUT', body: JSON.stringify({ status }) }),

  getConversations: () => request('/messages/conversations'),

  getThread: (userId: string) => request(`/messages/${userId}`),

  sendChatMessage: (receiverId: string, content: string) =>
    request('/messages', { method: 'POST', body: JSON.stringify({ receiverId, content }) }),

  getDeals: () => request('/deals'),

  createDeal: (entrepreneurId: string, amount: number, equity: number, stage: string) =>
    request('/deals', { method: 'POST', body: JSON.stringify({ entrepreneurId, amount, equity, stage }) }),

  updateDeal: (dealId: string, updates: Record<string, unknown>) =>
    request(`/deals/${dealId}`, { method: 'PUT', body: JSON.stringify(updates) }),

  listDocuments: () => request('/documents'),

  uploadDocument: async (file: File, shared: boolean) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('shared', String(shared));

    const res = await fetch(`${API_URL}/documents`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Upload failed');
    return data;
  },

  downloadDocumentUrl: (id: string) => `${API_URL}/documents/${id}/download`,

  deleteDocument: (id: string) => request(`/documents/${id}`, { method: 'DELETE' }),

  signDocument: (id: string, signatureText: string) =>
    request(`/documents/${id}/sign`, { method: 'POST', body: JSON.stringify({ signatureText }) })
};

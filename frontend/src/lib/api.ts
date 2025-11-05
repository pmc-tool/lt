const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1';

interface RequestOptions extends RequestInit {
  token?: string;
}

async function fetchAPI(endpoint: string, options: RequestOptions = {}) {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// Auth API
export const authAPI = {
  requestOTP: (identifier: string, language?: string) =>
    fetchAPI('/auth/otp/request', {
      method: 'POST',
      body: JSON.stringify({ identifier, language }),
    }),

  verifyOTP: (identifier: string, otp_code: string, name?: string) =>
    fetchAPI('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ identifier, otp_code, name }),
    }),
};

// Draws API
export const drawsAPI = {
  list: (params?: { status?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams(params as any).toString();
    return fetchAPI(`/draws${query ? `?${query}` : ''}`);
  },

  get: (id: string) => fetchAPI(`/draws/${id}`),
};

// Orders API
export const ordersAPI = {
  create: (data: { draw_id: string; quantity: number; address_id: string }, token: string) =>
    fetchAPI('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  list: (params: { draw_id?: string; status?: string; page?: number; limit?: number }, token: string) => {
    const query = new URLSearchParams(params as any).toString();
    return fetchAPI(`/orders${query ? `?${query}` : ''}`, { token });
  },

  get: (id: string, token: string) => fetchAPI(`/orders/${id}`, { token }),
};

// Tickets API
export const ticketsAPI = {
  list: (params: { draw_id?: string; status?: string; page?: number; limit?: number }, token: string) => {
    const query = new URLSearchParams(params as any).toString();
    return fetchAPI(`/tickets${query ? `?${query}` : ''}`, { token });
  },

  get: (id: string, token: string) => fetchAPI(`/tickets/${id}`, { token }),
};

// Users API
export const usersAPI = {
  getProfile: (token: string) => fetchAPI('/users/me', { token }),

  updateProfile: (data: { name?: string; language?: string }, token: string) =>
    fetchAPI('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
      token,
    }),

  getAddresses: (token: string) => fetchAPI('/users/me/addresses', { token }),

  createAddress: (
    data: {
      label?: string;
      street: string;
      city: string;
      state?: string;
      postal_code: string;
      country: string;
      phone: string;
      is_default?: boolean;
    },
    token: string
  ) =>
    fetchAPI('/users/me/addresses', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),
};

// Fairness API
export const fairnessAPI = {
  getVerificationData: (drawId: string) => fetchAPI(`/fairness/verify/${drawId}`),

  verifyDrawResult: (drawId: string) => fetchAPI(`/fairness/verify/${drawId}/compute`),

  getTicketProof: (ticketId: string) => fetchAPI(`/fairness/ticket/${ticketId}/proof`),
};

// Admin API
export const adminAPI = {
  login: (email: string, password: string) =>
    fetchAPI('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  listDraws: (params: { status?: string; page?: number; limit?: number }, token: string) => {
    const query = new URLSearchParams(params as any).toString();
    return fetchAPI(`/admin/draws${query ? `?${query}` : ''}`, { token });
  },

  createDraw: (
    data: {
      title: string;
      start_at: string;
      end_at: string;
      ticket_price: number;
      max_tickets: number;
      low_sales_threshold_pct: number;
      beacon_source: string;
      beacon_rule: string;
      terms_url?: string;
    },
    token: string
  ) =>
    fetchAPI('/admin/draws', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  updateDraw: (
    drawId: string,
    data: {
      title?: string;
      start_at?: string;
      end_at?: string;
      ticket_price?: number;
      max_tickets?: number;
      low_sales_threshold_pct?: number;
    },
    token: string
  ) =>
    fetchAPI(`/admin/draws/${drawId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      token,
    }),

  closeDraw: (drawId: string, token: string) =>
    fetchAPI(`/admin/draws/${drawId}/close`, {
      method: 'POST',
      token,
    }),

  settleDraw: (drawId: string, token: string) =>
    fetchAPI(`/admin/draws/${drawId}/settle`, {
      method: 'POST',
      token,
    }),
};

// COD API
export const codAPI = {
  listTasks: (
    params: { status?: string; agent?: string; draw_id?: string; page?: number; limit?: number },
    token: string
  ) => {
    const query = new URLSearchParams(params as any).toString();
    return fetchAPI(`/cod/tasks${query ? `?${query}` : ''}`, { token });
  },

  assignTasks: (data: { task_ids: string[]; agent_name: string }, token: string) =>
    fetchAPI('/cod/assign', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  updateTaskStatus: (
    taskId: string,
    data: {
      status: string;
      fail_reason?: string;
    },
    token: string
  ) =>
    fetchAPI(`/cod/tasks/${taskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      token,
    }),

  exportRoute: (params: { agent?: string; status?: string }, token: string) => {
    const query = new URLSearchParams(params as any).toString();
    return fetchAPI(`/cod/export${query ? `?${query}` : ''}`, { token });
  },

  getStats: (token: string) => fetchAPI('/cod/stats', { token }),
};

// Users Admin API
export const usersAdminAPI = {
  listUsers: (
    params: { status?: string; phone?: string; email?: string; page?: number; limit?: number },
    token: string
  ) => {
    const query = new URLSearchParams(params as any).toString();
    return fetchAPI(`/admin/users${query ? `?${query}` : ''}`, { token });
  },

  getUser: (userId: string, token: string) => fetchAPI(`/admin/users/${userId}`, { token }),

  getUserHistory: (userId: string, token: string) =>
    fetchAPI(`/admin/users/${userId}/history`, { token }),

  banUser: (
    userId: string,
    data: {
      ban_type: 'SOFT' | 'HARD';
      reason: string;
      duration_hours?: number;
    },
    token: string
  ) =>
    fetchAPI(`/admin/users/${userId}/ban`, {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  unbanUser: (userId: string, token: string) =>
    fetchAPI(`/admin/users/${userId}/unban`, {
      method: 'POST',
      token,
    }),

  flagUser: (
    userId: string,
    data: {
      flag_type: string;
      reason: string;
    },
    token: string
  ) =>
    fetchAPI(`/admin/users/${userId}/flag`, {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),
};

// Audit API
export const auditAPI = {
  list: (
    params: {
      action_type?: string;
      entity_type?: string;
      actor_id?: string;
      start_date?: string;
      end_date?: string;
      page?: number;
      limit?: number;
    },
    token: string
  ) => {
    const query = new URLSearchParams(params as any).toString();
    return fetchAPI(`/audit${query ? `?${query}` : ''}`, { token });
  },

  getStats: (params: { start_date?: string; end_date?: string }, token: string) => {
    const query = new URLSearchParams(params as any).toString();
    return fetchAPI(`/audit/stats${query ? `?${query}` : ''}`, { token });
  },

  export: (params: { start_date?: string; end_date?: string }, token: string) => {
    const query = new URLSearchParams(params as any).toString();
    return fetchAPI(`/audit/export${query ? `?${query}` : ''}`, { token });
  },
};

// Reports API
export const reportsAPI = {
  getSalesReport: (params: { start_date?: string; end_date?: string }, token: string) => {
    const query = new URLSearchParams(params as any).toString();
    return fetchAPI(`/reports/sales${query ? `?${query}` : ''}`, { token });
  },

  getCODReport: (params: { start_date?: string; end_date?: string }, token: string) => {
    const query = new URLSearchParams(params as any).toString();
    return fetchAPI(`/reports/cod${query ? `?${query}` : ''}`, { token });
  },

  getDrawReport: (drawId: string, token: string) => fetchAPI(`/reports/draw/${drawId}`, { token }),

  getAbuseMetrics: (params: { start_date?: string; end_date?: string }, token: string) => {
    const query = new URLSearchParams(params as any).toString();
    return fetchAPI(`/reports/abuse${query ? `?${query}` : ''}`, { token });
  },

  getDashboardStats: (token: string) => fetchAPI('/reports/dashboard', { token }),
};

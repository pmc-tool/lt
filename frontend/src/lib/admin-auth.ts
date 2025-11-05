'use client';

const ADMIN_TOKEN_KEY = 'admin_token';
const ADMIN_USER_KEY = 'admin_user';

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  name?: string;
}

export const adminAuth = {
  setToken: (token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
    }
  },

  getToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(ADMIN_TOKEN_KEY);
    }
    return null;
  },

  removeToken: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      localStorage.removeItem(ADMIN_USER_KEY);
    }
  },

  setAdminUser: (user: AdminUser) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
    }
  },

  getAdminUser: (): AdminUser | null => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem(ADMIN_USER_KEY);
      if (userStr) {
        try {
          return JSON.parse(userStr);
        } catch {
          return null;
        }
      }
    }
    return null;
  },

  isAuthenticated: (): boolean => {
    return !!adminAuth.getToken();
  },

  logout: () => {
    adminAuth.removeToken();
  },
};

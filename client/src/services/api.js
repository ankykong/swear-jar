import axios from 'axios';

// API service class for organized endpoint management
class ApiService {
  constructor() {
    // Use relative URLs in production (Vercel), full URLs in development
    this.baseURL = process.env.NODE_ENV === 'production' 
      ? '/api'  // Relative URL for Vercel
      : process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
  }

  // Helper method to handle API responses
  async request(method, url, data = null, config = {}) {
    try {
      const response = await axios({
        method,
        url: `${this.baseURL}${url}`,
        data,
        ...config,
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error(`API ${method.toUpperCase()} ${url} error:`, error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
      };
    }
  }

  // Swear Jars API
  swearJars = {
    getAll: () => this.request('GET', '/swear-jars'),
    getById: (id) => this.request('GET', `/swear-jars/${id}`),
    create: (data) => this.request('POST', '/swear-jars', data),
    update: (id, data) => this.request('PUT', `/swear-jars/${id}`, data),
    delete: (id) => this.request('DELETE', `/swear-jars/${id}`),
    invite: (id, data) => this.request('POST', `/swear-jars/${id}/invite`, data),
    removeMember: (jarId, userId) => this.request('DELETE', `/swear-jars/${jarId}/members/${userId}`),
    updateMemberRole: (jarId, userId, data) => this.request('PUT', `/swear-jars/${jarId}/members/${userId}/role`, data),
    getStats: (id, params = {}) => this.request('GET', `/swear-jars/${id}/stats`, null, { params }),
  };

  // Transactions API
  transactions = {
    getAll: (params = {}) => this.request('GET', '/transactions', null, { params }),
    getById: (id) => this.request('GET', `/transactions/${id}`),
    deposit: (data) => this.request('POST', '/transactions/deposit', data),
    withdraw: (data) => this.request('POST', '/transactions/withdrawal', data),
    penalty: (data) => this.request('POST', '/transactions/penalty', data),
    approve: (id) => this.request('PUT', `/transactions/${id}/approve`),
    cancel: (id) => this.request('PUT', `/transactions/${id}/cancel`),
  };

  // Plaid API
  plaid = {
    createLinkToken: (data = {}) => this.request('POST', '/plaid/link-token', data),
    exchangeToken: (data) => this.request('POST', '/plaid/exchange-token', data),
    getAccounts: () => this.request('GET', '/plaid/accounts'),
    updateBalance: (id) => this.request('POST', `/plaid/accounts/${id}/update-balance`),
    getTransactions: (id, params = {}) => this.request('GET', `/plaid/accounts/${id}/transactions`, null, { params }),
    verifyAccount: (id, data) => this.request('POST', `/plaid/accounts/${id}/verify`, data),
    disconnectAccount: (id) => this.request('DELETE', `/plaid/accounts/${id}`),
  };

  // Users API
  users = {
    search: (params = {}) => this.request('GET', '/users/search', null, { params }),
    getById: (id) => this.request('GET', `/users/${id}`),
    getSwearJars: (id) => this.request('GET', `/users/${id}/swear-jars`),
    getActivity: () => this.request('GET', '/users/me/activity'),
    updateSettings: (data) => this.request('PUT', '/users/me/settings', data),
    block: (id) => this.request('PUT', `/users/${id}/block`),
    unblock: (id) => this.request('DELETE', `/users/${id}/block`),
  };

  // Auth API (for convenience, though handled in AuthContext)
  auth = {
    login: (data) => this.request('POST', '/auth/login', data),
    register: (data) => this.request('POST', '/auth/register', data),
    getProfile: () => this.request('GET', '/auth/me'),
    updateProfile: (data) => this.request('PUT', '/auth/profile', data),
    changePassword: (data) => this.request('PUT', '/auth/change-password', data),
    refreshToken: () => this.request('POST', '/auth/refresh'),
    logout: () => this.request('POST', '/auth/logout'),
  };

  // Utility methods
  formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  formatRelativeTime = (date) => {
    const now = new Date();
    const diffInMs = now - new Date(date);
    const diffInHours = diffInMs / (1000 * 60 * 60);
    const diffInDays = diffInHours / 24;

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else if (diffInDays < 7) {
      return `${Math.floor(diffInDays)} days ago`;
    } else {
      return this.formatDate(date);
    }
  };
}

// Export singleton instance
const api = new ApiService();
export default api; 
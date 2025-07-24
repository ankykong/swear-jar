import { supabase } from '../lib/supabase';

// API service class for organized Supabase operations
class ApiService {
  constructor() {
    this.supabase = supabase;
  }

  // Helper method to handle responses consistently
  handleResponse(result) {
    if (result.error) {
      console.error('Supabase error:', result.error);
      return {
        success: false,
        error: result.error.message,
        code: result.error.code,
      };
    }
    return {
      success: true,
      data: result.data,
    };
  }

  // Swear Jars API
  swearJars = {
    getAll: async () => {
      try {
        // Get owned jars
        const ownedJarsResult = await this.supabase
          .from('swear_jars')
          .select(`
            id,
            name,
            description,
            balance,
            currency,
            settings,
            statistics,
            created_at,
            owner:users!owner_id(id, name, email, avatar)
          `)
          .order('created_at', { ascending: false });

        if (ownedJarsResult.error) {
          return this.handleResponse(ownedJarsResult);
        }

        // Note: Member jars will be handled by Edge Functions when needed

        // Transform owned jars to include role
        const ownedJars = ownedJarsResult.data.map(jar => ({
          ...jar,
          role: 'owner',
          joined_at: jar.created_at,
          permissions: {
            canDeposit: true,
            canWithdraw: true,
            canInvite: true,
            canViewTransactions: true
          }
        }));

        // For now, just return owned jars (member jars will be handled by Edge Functions later)
        return {
          success: true,
          data: ownedJars
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    },

    getById: async (id) => {
      const result = await this.supabase
        .from('swear_jars')
        .select(`
          *,
          owner:users!owner_id(id, name, email, avatar),
          members:swear_jar_members(
            role,
            joined_at,
            permissions,
            users(id, name, email, avatar)
          )
        `)
        .eq('id', id)
        .single();
      
      return this.handleResponse(result);
    },

    create: async (data) => {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const result = await this.supabase
        .from('swear_jars')
        .insert([{
          name: data.name,
          description: data.description,
          currency: data.currency || 'USD',
          owner_id: user.id,
          settings: data.settings || {}
        }])
        .select()
        .single();

      return this.handleResponse(result);
    },

    update: async (id, data) => {
      const result = await this.supabase
        .from('swear_jars')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      return this.handleResponse(result);
    },

    delete: async (id) => {
      const result = await this.supabase
        .from('swear_jars')
        .update({ is_active: false })
        .eq('id', id);
      
      return this.handleResponse(result);
    },

    invite: async (id, data) => {
      const result = await this.supabase
        .from('swear_jar_members')
        .insert([{
          swear_jar_id: id,
          user_id: data.userId,
          role: data.role || 'member',
          permissions: data.permissions
        }])
        .select(`
          *,
          users(id, name, email, avatar)
        `)
        .single();

      return this.handleResponse(result);
    },

    removeMember: async (jarId, userId) => {
      const result = await this.supabase
        .from('swear_jar_members')
        .delete()
        .eq('swear_jar_id', jarId)
        .eq('user_id', userId);

      return this.handleResponse(result);
    },

    updateMemberRole: async (jarId, userId, data) => {
      const result = await this.supabase
        .from('swear_jar_members')
        .update({ role: data.role, permissions: data.permissions })
        .eq('swear_jar_id', jarId)
        .eq('user_id', userId)
        .select(`
          *,
          users(id, name, email, avatar)
        `)
        .single();

      return this.handleResponse(result);
    },

    getStats: async (id, params = {}) => {
      // Get transaction statistics for the jar
      const result = await this.supabase
        .from('transactions')
        .select('type, amount, created_at, status')
        .eq('swear_jar_id', id)
        .eq('status', 'completed');

      if (result.error) return this.handleResponse(result);

      // Calculate statistics
      const transactions = result.data;
      const stats = {
        totalTransactions: transactions.length,
        totalDeposits: transactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0),
        totalWithdrawals: transactions.filter(t => t.type === 'withdrawal').reduce((sum, t) => sum + t.amount, 0),
        totalPenalties: transactions.filter(t => t.type === 'penalty').reduce((sum, t) => sum + t.amount, 0),
      };

      return { success: true, data: stats };
    },
  };

  // Transactions API
  transactions = {
    getAll: async (params = {}) => {
      let query = this.supabase
        .from('transactions')
        .select(`
          *,
          users(id, name, email, avatar),
          swear_jars(id, name, currency),
          bank_accounts(id, institution_name, account_name, mask)
        `)
        .order('created_at', { ascending: false });

      if (params.swearJarId) {
        query = query.eq('swear_jar_id', params.swearJarId);
      }

      if (params.limit) {
        query = query.limit(params.limit);
      }

      const result = await query;
      return this.handleResponse(result);
    },

    getById: async (id) => {
      const result = await this.supabase
        .from('transactions')
        .select(`
          *,
          users(id, name, email, avatar),
          swear_jars(id, name, currency),
          bank_accounts(id, institution_name, account_name, mask)
        `)
        .eq('id', id)
        .single();

      return this.handleResponse(result);
    },

    deposit: async (data) => {
      // Call Edge Function for complex transaction logic
      const result = await this.supabase.functions.invoke('transactions', {
        body: { 
          action: 'deposit',
          ...data 
        }
      });

      return this.handleResponse(result);
    },

    withdraw: async (data) => {
      const result = await this.supabase.functions.invoke('transactions', {
        body: { 
          action: 'withdraw',
          ...data 
        }
      });

      return this.handleResponse(result);
    },

    penalty: async (data) => {
      const result = await this.supabase.functions.invoke('transactions', {
        body: { 
          action: 'penalty',
          ...data 
        }
      });

      return this.handleResponse(result);
    },

    approve: async (id) => {
      const result = await this.supabase
        .from('transactions')
        .update({ status: 'completed', processed_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      return this.handleResponse(result);
    },

    cancel: async (id) => {
      const result = await this.supabase
        .from('transactions')
        .update({ status: 'cancelled', processed_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      return this.handleResponse(result);
    },
  };

  // Plaid API (handled by Edge Functions)
  plaid = {
    createLinkToken: async (data = {}) => {
      const result = await this.supabase.functions.invoke('plaid', {
        body: { 
          action: 'createLinkToken',
          ...data 
        }
      });

      return this.handleResponse(result);
    },

    exchangeToken: async (data) => {
      const result = await this.supabase.functions.invoke('plaid', {
        body: { 
          action: 'exchangeToken',
          ...data 
        }
      });

      return this.handleResponse(result);
    },

    getAccounts: async () => {
      const result = await this.supabase
        .from('bank_accounts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      return this.handleResponse(result);
    },

    updateBalance: async (id) => {
      const result = await this.supabase.functions.invoke('plaid', {
        body: { 
          action: 'updateBalance',
          accountId: id 
        }
      });

      return this.handleResponse(result);
    },

    getTransactions: async (id, params = {}) => {
      const result = await this.supabase.functions.invoke('plaid', {
        body: { 
          action: 'getTransactions',
          accountId: id,
          ...params 
        }
      });

      return this.handleResponse(result);
    },

    verifyAccount: async (id, data) => {
      const result = await this.supabase.functions.invoke('plaid', {
        body: { 
          action: 'verifyAccount',
          accountId: id,
          ...data 
        }
      });

      return this.handleResponse(result);
    },

    disconnectAccount: async (id) => {
      const result = await this.supabase
        .from('bank_accounts')
        .update({ is_active: false })
        .eq('id', id);

      return this.handleResponse(result);
    },
  };

  // Users API
  users = {
    search: async (params = {}) => {
      let query = this.supabase
        .from('users')
        .select('id, name, email, avatar')
        .eq('is_active', true);

      if (params.email) {
        query = query.ilike('email', `%${params.email}%`);
      }

      if (params.name) {
        query = query.ilike('name', `%${params.name}%`);
      }

      const result = await query.limit(params.limit || 10);
      return this.handleResponse(result);
    },

    getById: async (id) => {
      const result = await this.supabase
        .from('users')
        .select('id, name, email, avatar, created_at')
        .eq('id', id)
        .single();

      return this.handleResponse(result);
    },

    getSwearJars: async (id) => {
      const result = await this.supabase
        .from('swear_jar_members')
        .select(`
          role,
          joined_at,
          permissions,
          swear_jars(*)
        `)
        .eq('user_id', id);

      return this.handleResponse(result);
    },

    getActivity: async () => {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const result = await this.supabase
        .from('transactions')
        .select(`
          *,
          swear_jars(id, name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      return this.handleResponse(result);
    },

    updateSettings: async (data) => {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const result = await this.supabase
        .from('users')
        .update(data)
        .eq('id', user.id)
        .select()
        .single();

      return this.handleResponse(result);
    },
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
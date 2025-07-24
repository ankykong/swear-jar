const { supabase } = require('../config/supabase');

// SwearJar model for Supabase
class SwearJar {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.balance = parseFloat(data.balance) || 0;
    this.currency = data.currency || 'USD';
    this.owner_id = data.owner_id;
    this.settings = data.settings || {};
    this.statistics = data.statistics || {};
    this.is_active = data.is_active;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Static methods for database operations
  static async create(jarData) {
    const defaultSettings = {
      isPublic: false,
      requireApprovalForWithdrawals: true,
      minimumDeposit: 0.01,
      maximumDeposit: 1000,
      swearWords: [],
      autoDeductOnSwear: false
    };

    const defaultStatistics = {
      totalDeposits: 0,
      totalWithdrawals: 0,
      transactionCount: 0,
      averageDeposit: 0,
      mostActiveUser: null,
      popularSwearWord: null,
      streakDays: 0,
      lastActivity: null
    };

    // Create the swear jar
    const { data: jarResult, error: jarError } = await supabase
      .from('swear_jars')
      .insert([{
        name: jarData.name,
        description: jarData.description,
        currency: jarData.currency || 'USD',
        owner_id: jarData.owner_id,
        settings: { ...defaultSettings, ...jarData.settings },
        statistics: defaultStatistics
      }])
      .select()
      .single();

    if (jarError) throw jarError;

    // Add owner as a member with owner role
    const { error: memberError } = await supabase
      .from('swear_jar_members')
      .insert([{
        swear_jar_id: jarResult.id,
        user_id: jarData.owner_id,
        role: 'owner',
        permissions: {
          canDeposit: true,
          canWithdraw: true,
          canInvite: true,
          canViewTransactions: true
        }
      }]);

    if (memberError) throw memberError;

    return new SwearJar(jarResult);
  }

  static async findById(id, userId = null) {
    let query = supabase
      .from('swear_jars')
      .select(`
        *,
        owner:users!owner_id(id, name, email, avatar)
      `)
      .eq('id', id)
      .eq('is_active', true);

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw error;
    }

    const jar = new SwearJar(data);
    jar.owner = data.owner;

    // If userId is provided, check if user has access
    if (userId) {
      const hasAccess = await jar.userHasAccess(userId);
      if (!hasAccess) return null;
    }

    return jar;
  }

  static async findByOwnerId(ownerId, limit = 50) {
    const { data, error } = await supabase
      .from('swear_jars')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data.map(jar => new SwearJar(jar));
  }

  static async findByUserId(userId, limit = 50) {
    const { data, error } = await supabase
      .from('swear_jar_members')
      .select(`
        role,
        joined_at,
        permissions,
        swear_jars (*)
      `)
      .eq('user_id', userId)
      .order('joined_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data.map(item => {
      const jar = new SwearJar(item.swear_jars);
      jar.userRole = item.role;
      jar.userPermissions = item.permissions;
      jar.userJoinedAt = item.joined_at;
      return jar;
    });
  }

  // Instance methods
  async save() {
    const { data, error } = await supabase
      .from('swear_jars')
      .update({
        name: this.name,
        description: this.description,
        balance: this.balance,
        currency: this.currency,
        settings: this.settings,
        statistics: this.statistics,
        is_active: this.is_active
      })
      .eq('id', this.id)
      .select()
      .single();

    if (error) throw error;

    Object.assign(this, data);
    return this;
  }

  async updateBalance(amount, isDeposit = true) {
    if (!isDeposit && this.balance < amount) {
      throw new Error('Insufficient funds');
    }

    const newBalance = isDeposit ? this.balance + amount : this.balance - amount;
    const newStats = { ...this.statistics };

    if (isDeposit) {
      newStats.totalDeposits = (newStats.totalDeposits || 0) + amount;
    } else {
      newStats.totalWithdrawals = (newStats.totalWithdrawals || 0) + amount;
    }

    newStats.transactionCount = (newStats.transactionCount || 0) + 1;
    newStats.averageDeposit = newStats.totalDeposits / newStats.transactionCount;
    newStats.lastActivity = new Date().toISOString();

    const { data, error } = await supabase
      .from('swear_jars')
      .update({
        balance: newBalance,
        statistics: newStats
      })
      .eq('id', this.id)
      .select()
      .single();

    if (error) throw error;

    this.balance = data.balance;
    this.statistics = data.statistics;
    return this;
  }

  // Get formatted balance
  getFormattedBalance() {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currency
    }).format(this.balance);
  }

  // Member management
  async getMembers() {
    const { data, error } = await supabase
      .from('swear_jar_members')
      .select(`
        role,
        joined_at,
        permissions,
        users (id, name, email, avatar)
      `)
      .eq('swear_jar_id', this.id)
      .order('joined_at', { ascending: true });

    if (error) throw error;

    return data.map(member => ({
      user: member.users,
      role: member.role,
      joinedAt: member.joined_at,
      permissions: member.permissions
    }));
  }

  async addMember(userId, role = 'member', permissions = null) {
    const defaultPermissions = {
      canDeposit: true,
      canWithdraw: false,
      canInvite: false,
      canViewTransactions: true
    };

    const { data, error } = await supabase
      .from('swear_jar_members')
      .insert([{
        swear_jar_id: this.id,
        user_id: userId,
        role: role,
        permissions: permissions || defaultPermissions
      }])
      .select(`
        *,
        users (id, name, email, avatar)
      `)
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('User is already a member of this swear jar');
      }
      throw error;
    }

    return {
      user: data.users,
      role: data.role,
      joinedAt: data.joined_at,
      permissions: data.permissions
    };
  }

  async removeMember(userId) {
    // Don't allow removing the owner
    if (userId === this.owner_id) {
      throw new Error('Cannot remove the owner from the swear jar');
    }

    const { error } = await supabase
      .from('swear_jar_members')
      .delete()
      .eq('swear_jar_id', this.id)
      .eq('user_id', userId);

    if (error) throw error;

    return true;
  }

  async updateMemberRole(userId, newRole) {
    const { data, error } = await supabase
      .from('swear_jar_members')
      .update({ role: newRole })
      .eq('swear_jar_id', this.id)
      .eq('user_id', userId)
      .select(`
        *,
        users (id, name, email, avatar)
      `)
      .single();

    if (error) throw error;

    return {
      user: data.users,
      role: data.role,
      joinedAt: data.joined_at,
      permissions: data.permissions
    };
  }

  async updateMemberPermissions(userId, newPermissions) {
    const { data, error } = await supabase
      .from('swear_jar_members')
      .update({ permissions: newPermissions })
      .eq('swear_jar_id', this.id)
      .eq('user_id', userId)
      .select(`
        *,
        users (id, name, email, avatar)
      `)
      .single();

    if (error) throw error;

    return {
      user: data.users,
      role: data.role,
      joinedAt: data.joined_at,
      permissions: data.permissions
    };
  }

  // Check if user has access to this swear jar
  async userHasAccess(userId) {
    const { data, error } = await supabase
      .from('swear_jar_members')
      .select('role')
      .eq('swear_jar_id', this.id)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return !!data;
  }

  // Get user's role in this swear jar
  async getUserRole(userId) {
    const { data, error } = await supabase
      .from('swear_jar_members')
      .select('role, permissions')
      .eq('swear_jar_id', this.id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data;
  }

  // Get transactions for this swear jar
  async getTransactions(limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        users (id, name, email, avatar),
        bank_accounts (id, institution_name, account_name, mask)
      `)
      .eq('swear_jar_id', this.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return data;
  }

  // Soft delete swear jar
  async softDelete() {
    const { data, error } = await supabase
      .from('swear_jars')
      .update({ is_active: false })
      .eq('id', this.id)
      .select()
      .single();

    if (error) throw error;

    this.is_active = false;
    return this;
  }

  // Update settings
  async updateSettings(newSettings) {
    const updatedSettings = { ...this.settings, ...newSettings };

    const { data, error } = await supabase
      .from('swear_jars')
      .update({ settings: updatedSettings })
      .eq('id', this.id)
      .select()
      .single();

    if (error) throw error;

    this.settings = data.settings;
    return this;
  }

  // Search public swear jars
  static async searchPublic(query = '', limit = 20) {
    const { data, error } = await supabase
      .from('swear_jars')
      .select(`
        *,
        owner:users!owner_id(id, name, email, avatar)
      `)
      .eq('is_active', true)
      .eq('settings->isPublic', true)
      .ilike('name', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data.map(jar => {
      const swearJar = new SwearJar(jar);
      swearJar.owner = jar.owner;
      return swearJar;
    });
  }

  // Validation methods
  static validateName(name) {
    return name && name.trim().length > 0 && name.length <= 100;
  }

  static validateDescription(description) {
    return !description || description.length <= 500;
  }

  static validateCurrency(currency) {
    const validCurrencies = ['USD', 'CAD', 'EUR', 'GBP'];
    return validCurrencies.includes(currency);
  }

  static validateBalance(balance) {
    return balance >= 0;
  }
}

module.exports = SwearJar; 
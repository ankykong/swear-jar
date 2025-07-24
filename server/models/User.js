const bcrypt = require('bcryptjs');
const { supabase } = require('../config/supabase');

// User model for Supabase
class User {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.password = data.password;
    this.avatar = data.avatar;
    this.is_active = data.is_active;
    this.last_login = data.last_login;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Static methods for database operations
  static async create(userData) {
    // Hash password before saving
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    
    const { data, error } = await supabase
      .from('users')
      .insert([{
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        avatar: userData.avatar || null
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Email already exists');
      }
      throw error;
    }

    return new User(data);
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw error;
    }

    return data ? new User(data) : null;
  }

  static async findByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw error;
    }

    return data ? new User(data) : null;
  }

  static async findByEmailWithPassword(email) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw error;
    }

    return data ? new User(data) : null;
  }

  // Instance methods
  async save() {
    const { data, error } = await supabase
      .from('users')
      .update({
        name: this.name,
        email: this.email,
        avatar: this.avatar,
        is_active: this.is_active,
        last_login: this.last_login
      })
      .eq('id', this.id)
      .select()
      .single();

    if (error) throw error;

    // Update instance with new data
    Object.assign(this, data);
    return this;
  }

  async updatePassword(newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    const { data, error } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', this.id)
      .select()
      .single();

    if (error) throw error;

    this.password = data.password;
    return this;
  }

  async updateLastLogin() {
    const { data, error } = await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', this.id)
      .select()
      .single();

    if (error) throw error;

    this.last_login = data.last_login;
    return this;
  }

  // Compare password method
  async comparePassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  }

  // Get user's swear jars with role information
  async getSwearJarsWithRole() {
    const { data, error } = await supabase
      .from('swear_jar_members')
      .select(`
        role,
        joined_at,
        permissions,
        swear_jars (
          id,
          name,
          description,
          balance,
          currency,
          created_at
        )
      `)
      .eq('user_id', this.id);

    if (error) throw error;

    return data.map(item => ({
      jar: item.swear_jars,
      role: item.role,
      joinedAt: item.joined_at,
      permissions: item.permissions
    }));
  }

  // Check if user has permission for a swear jar
  async hasPermission(swearJarId, requiredRole = 'member') {
    const { data, error } = await supabase
      .from('swear_jar_members')
      .select('role')
      .eq('user_id', this.id)
      .eq('swear_jar_id', swearJarId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return false; // No rows found
      throw error;
    }

    const roleHierarchy = { member: 0, admin: 1, owner: 2 };
    return roleHierarchy[data.role] >= roleHierarchy[requiredRole];
  }

  // Get user's bank accounts
  async getBankAccounts() {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('user_id', this.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data;
  }

  // Add user to swear jar
  async addToSwearJar(swearJarId, role = 'member', permissions = null) {
    const defaultPermissions = {
      canDeposit: true,
      canWithdraw: false,
      canInvite: false,
      canViewTransactions: true
    };

    const { data, error } = await supabase
      .from('swear_jar_members')
      .insert([{
        user_id: this.id,
        swear_jar_id: swearJarId,
        role: role,
        permissions: permissions || defaultPermissions
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('User is already a member of this swear jar');
      }
      throw error;
    }

    return data;
  }

  // Remove user from swear jar
  async removeFromSwearJar(swearJarId) {
    const { error } = await supabase
      .from('swear_jar_members')
      .delete()
      .eq('user_id', this.id)
      .eq('swear_jar_id', swearJarId);

    if (error) throw error;

    return true;
  }

  // Remove sensitive information when converting to JSON
  toJSON() {
    const user = { ...this };
    delete user.password;
    return user;
  }

  // Soft delete user
  async softDelete() {
    const { data, error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', this.id)
      .select()
      .single();

    if (error) throw error;

    this.is_active = false;
    return this;
  }

  // Static method to search users by email (for invitations)
  static async searchByEmail(email, limit = 10) {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, avatar')
      .ilike('email', `%${email}%`)
      .eq('is_active', true)
      .limit(limit);

    if (error) throw error;

    return data.map(user => new User(user));
  }

  // Validation methods
  static validateEmail(email) {
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    return emailRegex.test(email);
  }

  static validatePassword(password) {
    return password && password.length >= 6;
  }

  static validateName(name) {
    return name && name.trim().length > 0 && name.length <= 50;
  }
}

module.exports = User; 
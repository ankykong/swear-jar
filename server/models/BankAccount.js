const { supabase } = require('../config/supabase');

// BankAccount model for Supabase
class BankAccount {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.plaid_account_id = data.plaid_account_id;
    this.plaid_item_id = data.plaid_item_id;
    this.plaid_access_token = data.plaid_access_token;
    this.institution_id = data.institution_id;
    this.institution_name = data.institution_name;
    this.account_name = data.account_name;
    this.account_type = data.account_type;
    this.account_subtype = data.account_subtype;
    this.mask = data.mask;
    this.balance = data.balance || {};
    this.verification = data.verification || {};
    this.permissions = data.permissions || {};
    this.metadata = data.metadata || {};
    this.is_active = data.is_active;
    this.last_sync_at = data.last_sync_at;
    this.sync_errors = data.sync_errors || [];
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Static methods for database operations
  static async create(accountData) {
    const defaultBalance = {
      available: null,
      current: null,
      limit: null,
      isoCurrencyCode: 'USD',
      lastUpdated: null
    };

    const defaultVerification = {
      status: 'pending',
      verifiedAt: null,
      method: null
    };

    const defaultPermissions = {
      canDeposit: true,
      canWithdraw: false
    };

    const { data, error } = await supabase
      .from('bank_accounts')
      .insert([{
        user_id: accountData.user_id,
        plaid_account_id: accountData.plaid_account_id,
        plaid_item_id: accountData.plaid_item_id,
        plaid_access_token: accountData.plaid_access_token,
        institution_id: accountData.institution_id,
        institution_name: accountData.institution_name,
        account_name: accountData.account_name,
        account_type: accountData.account_type,
        account_subtype: accountData.account_subtype,
        mask: accountData.mask,
        balance: { ...defaultBalance, ...accountData.balance },
        verification: { ...defaultVerification, ...accountData.verification },
        permissions: { ...defaultPermissions, ...accountData.permissions },
        metadata: accountData.metadata || {}
      }])
      .select()
      .single();

    if (error) throw error;

    return new BankAccount(data);
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw error;
    }

    return data ? new BankAccount(data) : null;
  }

  static async findByUser(userId) {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(account => new BankAccount(account));
  }

  static async findByPlaidId(plaidAccountId) {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('plaid_account_id', plaidAccountId)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw error;
    }

    return data ? new BankAccount(data) : null;
  }

  static async findByItemId(plaidItemId) {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('plaid_item_id', plaidItemId)
      .eq('is_active', true);

    if (error) throw error;

    return data.map(account => new BankAccount(account));
  }

  // Instance methods
  async save() {
    const { data, error } = await supabase
      .from('bank_accounts')
      .update({
        institution_name: this.institution_name,
        account_name: this.account_name,
        account_type: this.account_type,
        account_subtype: this.account_subtype,
        mask: this.mask,
        balance: this.balance,
        verification: this.verification,
        permissions: this.permissions,
        metadata: this.metadata,
        is_active: this.is_active,
        last_sync_at: this.last_sync_at,
        sync_errors: this.sync_errors
      })
      .eq('id', this.id)
      .select()
      .single();

    if (error) throw error;

    Object.assign(this, data);
    return this;
  }

  async updateBalance(balanceData) {
    const updatedBalance = {
      ...this.balance,
      ...balanceData,
      lastUpdated: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('bank_accounts')
      .update({
        balance: updatedBalance,
        last_sync_at: new Date().toISOString()
      })
      .eq('id', this.id)
      .select()
      .single();

    if (error) throw error;

    this.balance = data.balance;
    this.last_sync_at = data.last_sync_at;
    return this;
  }

  async addSyncError(error) {
    const newError = {
      error: error.toString(),
      timestamp: new Date().toISOString(),
      resolved: false
    };

    // Keep only last 10 errors
    const updatedErrors = [...this.sync_errors, newError].slice(-10);

    const { data, error: updateError } = await supabase
      .from('bank_accounts')
      .update({ sync_errors: updatedErrors })
      .eq('id', this.id)
      .select()
      .single();

    if (updateError) throw updateError;

    this.sync_errors = data.sync_errors;
    return this;
  }

  async resolveSyncErrors() {
    const resolvedErrors = this.sync_errors.map(error => ({
      ...error,
      resolved: true
    }));

    const { data, error } = await supabase
      .from('bank_accounts')
      .update({ sync_errors: resolvedErrors })
      .eq('id', this.id)
      .select()
      .single();

    if (error) throw error;

    this.sync_errors = data.sync_errors;
    return this;
  }

  async updateVerification(verificationData) {
    const updatedVerification = {
      ...this.verification,
      ...verificationData
    };

    if (verificationData.status === 'verified' && !updatedVerification.verifiedAt) {
      updatedVerification.verifiedAt = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('bank_accounts')
      .update({ verification: updatedVerification })
      .eq('id', this.id)
      .select()
      .single();

    if (error) throw error;

    this.verification = data.verification;
    return this;
  }

  async updatePermissions(permissionData) {
    const updatedPermissions = {
      ...this.permissions,
      ...permissionData
    };

    const { data, error } = await supabase
      .from('bank_accounts')
      .update({ permissions: updatedPermissions })
      .eq('id', this.id)
      .select()
      .single();

    if (error) throw error;

    this.permissions = data.permissions;
    return this;
  }

  // Get formatted balance
  getFormattedBalance() {
    if (!this.balance.current) return 'N/A';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.balance.isoCurrencyCode
    }).format(this.balance.current);
  }

  // Get account display name
  getDisplayName() {
    return `${this.institution_name} ${this.account_name} (...${this.mask})`;
  }

  // Check if account needs reauth
  needsReauth() {
    const now = new Date();
    const lastSync = new Date(this.last_sync_at);
    const daysSinceSync = (now - lastSync) / (1000 * 60 * 60 * 24);
    
    // If haven't synced in 7 days or have recent sync errors
    return daysSinceSync > 7 || this.sync_errors.some(err => 
      !err.resolved && 
      (now - new Date(err.timestamp)) < (1000 * 60 * 60 * 24) // errors in last 24 hours
    );
  }

  // Get transactions for this account
  async getTransactions(limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        users (id, name, email, avatar),
        swear_jars (id, name)
      `)
      .eq('bank_account_id', this.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return data;
  }

  // Soft delete account
  async softDelete() {
    const { data, error } = await supabase
      .from('bank_accounts')
      .update({ is_active: false })
      .eq('id', this.id)
      .select()
      .single();

    if (error) throw error;

    this.is_active = false;
    return this;
  }

  // Remove sensitive data when converting to JSON
  toJSON() {
    const account = { ...this };
    // Don't expose access token in API responses
    delete account.plaid_access_token;
    return account;
  }

  // Update access token (for token refresh scenarios)
  async updateAccessToken(newToken) {
    const { data, error } = await supabase
      .from('bank_accounts')
      .update({ plaid_access_token: newToken })
      .eq('id', this.id)
      .select()
      .single();

    if (error) throw error;

    this.plaid_access_token = data.plaid_access_token;
    return this;
  }

  // Check if account is verified for withdrawals
  isVerifiedForWithdrawals() {
    return this.verification.status === 'verified' && this.permissions.canWithdraw;
  }

  // Check if account can be used for deposits
  canDeposit() {
    return this.permissions.canDeposit && this.is_active;
  }

  // Check if account can be used for withdrawals
  canWithdraw() {
    return this.permissions.canWithdraw && 
           this.is_active && 
           this.verification.status === 'verified';
  }

  // Static validation methods
  static validateAccountType(type) {
    const validTypes = ['checking', 'savings', 'credit', 'investment', 'loan', 'other'];
    return validTypes.includes(type);
  }

  static validateInstitutionId(institutionId) {
    return institutionId && typeof institutionId === 'string' && institutionId.length > 0;
  }

  static validatePlaidAccountId(plaidAccountId) {
    return plaidAccountId && typeof plaidAccountId === 'string' && plaidAccountId.length > 0;
  }
}

module.exports = BankAccount; 
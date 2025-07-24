const { supabase } = require('../config/supabase');

// Transaction model for Supabase
class Transaction {
  constructor(data) {
    this.id = data.id;
    this.swear_jar_id = data.swear_jar_id;
    this.user_id = data.user_id;
    this.type = data.type;
    this.amount = parseFloat(data.amount);
    this.currency = data.currency || 'USD';
    this.description = data.description;
    this.metadata = data.metadata || {};
    this.status = data.status || 'pending';
    this.bank_account_id = data.bank_account_id;
    this.balance_after = parseFloat(data.balance_after);
    this.fees = data.fees || { amount: 0, description: null };
    this.external_transaction_id = data.external_transaction_id;
    this.plaid_data = data.plaid_data || {};
    this.created_at = data.created_at;
    this.processed_at = data.processed_at;
    this.updated_at = data.updated_at;
  }

  // Static methods for database operations
  static async create(transactionData) {
    const defaultFees = {
      amount: 0,
      description: null
    };

    const { data, error } = await supabase
      .from('transactions')
      .insert([{
        swear_jar_id: transactionData.swear_jar_id,
        user_id: transactionData.user_id,
        type: transactionData.type,
        amount: transactionData.amount,
        currency: transactionData.currency || 'USD',
        description: transactionData.description,
        metadata: transactionData.metadata || {},
        status: transactionData.status || 'pending',
        bank_account_id: transactionData.bank_account_id,
        balance_after: transactionData.balance_after,
        fees: { ...defaultFees, ...transactionData.fees },
        external_transaction_id: transactionData.external_transaction_id,
        plaid_data: transactionData.plaid_data || {}
      }])
      .select()
      .single();

    if (error) throw error;

    return new Transaction(data);
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        users (id, name, email, avatar),
        swear_jars (id, name, currency),
        bank_accounts (id, institution_name, account_name, mask)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw error;
    }

    const transaction = new Transaction(data);
    transaction.user = data.users;
    transaction.swear_jar = data.swear_jars;
    transaction.bank_account = data.bank_accounts;

    return transaction;
  }

  static async findBySwearJarId(swearJarId, limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        users (id, name, email, avatar),
        bank_accounts (id, institution_name, account_name, mask)
      `)
      .eq('swear_jar_id', swearJarId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return data.map(txn => {
      const transaction = new Transaction(txn);
      transaction.user = txn.users;
      transaction.bank_account = txn.bank_accounts;
      return transaction;
    });
  }

  static async findByUserId(userId, limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        swear_jars (id, name, currency),
        bank_accounts (id, institution_name, account_name, mask)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return data.map(txn => {
      const transaction = new Transaction(txn);
      transaction.swear_jar = txn.swear_jars;
      transaction.bank_account = txn.bank_accounts;
      return transaction;
    });
  }

  static async findByBankAccountId(bankAccountId, limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        users (id, name, email, avatar),
        swear_jars (id, name, currency)
      `)
      .eq('bank_account_id', bankAccountId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return data.map(txn => {
      const transaction = new Transaction(txn);
      transaction.user = txn.users;
      transaction.swear_jar = txn.swear_jars;
      return transaction;
    });
  }

  static async findPendingTransactions(limit = 100) {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        users (id, name, email, avatar),
        swear_jars (id, name, currency),
        bank_accounts (id, institution_name, account_name, mask)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;

    return data.map(txn => {
      const transaction = new Transaction(txn);
      transaction.user = txn.users;
      transaction.swear_jar = txn.swear_jars;
      transaction.bank_account = txn.bank_accounts;
      return transaction;
    });
  }

  // Instance methods
  async save() {
    const { data, error } = await supabase
      .from('transactions')
      .update({
        type: this.type,
        amount: this.amount,
        currency: this.currency,
        description: this.description,
        metadata: this.metadata,
        status: this.status,
        balance_after: this.balance_after,
        fees: this.fees,
        external_transaction_id: this.external_transaction_id,
        plaid_data: this.plaid_data,
        processed_at: this.processed_at
      })
      .eq('id', this.id)
      .select()
      .single();

    if (error) throw error;

    Object.assign(this, data);
    return this;
  }

  async updateStatus(newStatus, processedAt = null) {
    const updateData = { status: newStatus };
    
    if (processedAt) {
      updateData.processed_at = processedAt;
    } else if (newStatus === 'completed' || newStatus === 'failed') {
      updateData.processed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', this.id)
      .select()
      .single();

    if (error) throw error;

    this.status = data.status;
    this.processed_at = data.processed_at;
    return this;
  }

  async updateMetadata(newMetadata) {
    const updatedMetadata = { ...this.metadata, ...newMetadata };

    const { data, error } = await supabase
      .from('transactions')
      .update({ metadata: updatedMetadata })
      .eq('id', this.id)
      .select()
      .single();

    if (error) throw error;

    this.metadata = data.metadata;
    return this;
  }

  async addFees(amount, description) {
    const updatedFees = {
      amount: (this.fees.amount || 0) + amount,
      description: description || this.fees.description
    };

    const { data, error } = await supabase
      .from('transactions')
      .update({ fees: updatedFees })
      .eq('id', this.id)
      .select()
      .single();

    if (error) throw error;

    this.fees = data.fees;
    return this;
  }

  // Get formatted amount
  getFormattedAmount() {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currency
    }).format(this.amount);
  }

  // Get formatted balance after
  getFormattedBalanceAfter() {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currency
    }).format(this.balance_after);
  }

  // Get formatted fees
  getFormattedFees() {
    if (!this.fees.amount || this.fees.amount === 0) return null;
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currency
    }).format(this.fees.amount);
  }

  // Check if transaction is reversible
  isReversible() {
    const reversibleTypes = ['deposit', 'penalty'];
    const reversibleStatuses = ['completed'];
    
    return reversibleTypes.includes(this.type) && 
           reversibleStatuses.includes(this.status);
  }

  // Create a reverse transaction
  async createReverseTransaction(reason = null) {
    if (!this.isReversible()) {
      throw new Error('Transaction is not reversible');
    }

    const reverseType = this.type === 'deposit' || this.type === 'penalty' ? 'refund' : 'deposit';
    
    const reverseMetadata = {
      ...this.metadata,
      originalTransactionId: this.id,
      reverseReason: reason
    };

    const reverseTransaction = await Transaction.create({
      swear_jar_id: this.swear_jar_id,
      user_id: this.user_id,
      type: reverseType,
      amount: this.amount,
      currency: this.currency,
      description: `Reversal: ${this.description}`,
      metadata: reverseMetadata,
      bank_account_id: this.bank_account_id,
      balance_after: this.balance_after - this.amount // This will be recalculated
    });

    return reverseTransaction;
  }

  // Static methods for analytics
  static async getSwearJarTotals(swearJarId, startDate = null, endDate = null) {
    let query = supabase
      .from('transactions')
      .select('type, amount, status')
      .eq('swear_jar_id', swearJarId)
      .eq('status', 'completed');

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    const totals = {
      deposits: 0,
      withdrawals: 0,
      penalties: 0,
      refunds: 0,
      transfers: 0,
      count: data.length
    };

    data.forEach(txn => {
      if (txn.type === 'deposit') totals.deposits += txn.amount;
      else if (txn.type === 'withdrawal') totals.withdrawals += txn.amount;
      else if (txn.type === 'penalty') totals.penalties += txn.amount;
      else if (txn.type === 'refund') totals.refunds += txn.amount;
      else if (txn.type === 'transfer') totals.transfers += txn.amount;
    });

    return totals;
  }

  static async getUserTotals(userId, startDate = null, endDate = null) {
    let query = supabase
      .from('transactions')
      .select('type, amount, status')
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    const totals = {
      deposits: 0,
      withdrawals: 0,
      penalties: 0,
      refunds: 0,
      transfers: 0,
      count: data.length
    };

    data.forEach(txn => {
      if (txn.type === 'deposit') totals.deposits += txn.amount;
      else if (txn.type === 'withdrawal') totals.withdrawals += txn.amount;
      else if (txn.type === 'penalty') totals.penalties += txn.amount;
      else if (txn.type === 'refund') totals.refunds += txn.amount;
      else if (txn.type === 'transfer') totals.transfers += txn.amount;
    });

    return totals;
  }

  // Validation methods
  static validateType(type) {
    const validTypes = ['deposit', 'withdrawal', 'transfer', 'penalty', 'refund'];
    return validTypes.includes(type);
  }

  static validateAmount(amount) {
    return amount && amount >= 0.01;
  }

  static validateCurrency(currency) {
    const validCurrencies = ['USD', 'CAD', 'EUR', 'GBP'];
    return validCurrencies.includes(currency);
  }

  static validateStatus(status) {
    const validStatuses = ['pending', 'completed', 'failed', 'cancelled'];
    return validStatuses.includes(status);
  }
}

module.exports = Transaction; 
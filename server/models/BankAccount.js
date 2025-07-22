const mongoose = require('mongoose');

const bankAccountSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  plaidAccountId: {
    type: String,
    required: true
  },
  plaidItemId: {
    type: String,
    required: true
  },
  plaidAccessToken: {
    type: String,
    required: true
  },
  institutionId: {
    type: String,
    required: true
  },
  institutionName: {
    type: String,
    required: true
  },
  accountName: {
    type: String,
    required: true
  },
  accountType: {
    type: String,
    required: true,
    enum: ['checking', 'savings', 'credit', 'investment', 'loan', 'other']
  },
  accountSubtype: {
    type: String
  },
  mask: {
    type: String // Last 4 digits of account number
  },
  balance: {
    available: {
      type: Number
    },
    current: {
      type: Number
    },
    limit: {
      type: Number
    },
    isoCurrencyCode: {
      type: String,
      default: 'USD'
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  verification: {
    status: {
      type: String,
      enum: ['pending', 'verified', 'failed'],
      default: 'pending'
    },
    verifiedAt: Date,
    method: {
      type: String,
      enum: ['instant', 'microdeposits', 'manual']
    }
  },
  permissions: {
    canDeposit: {
      type: Boolean,
      default: true
    },
    canWithdraw: {
      type: Boolean,
      default: false // Requires additional verification
    }
  },
  metadata: {
    logo: String,
    primaryColor: String,
    url: String,
    plaidProducts: [String]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastSyncAt: {
    type: Date,
    default: Date.now
  },
  syncErrors: [{
    error: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    resolved: {
      type: Boolean,
      default: false
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
bankAccountSchema.index({ user: 1 });
bankAccountSchema.index({ plaidAccountId: 1 });
bankAccountSchema.index({ plaidItemId: 1 });
bankAccountSchema.index({ isActive: 1 });

// Update the updatedAt field before saving
bankAccountSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Instance method to get formatted balance
bankAccountSchema.methods.getFormattedBalance = function() {
  if (!this.balance.current) return 'N/A';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: this.balance.isoCurrencyCode
  }).format(this.balance.current);
};

// Instance method to get account display name
bankAccountSchema.methods.getDisplayName = function() {
  return `${this.institutionName} ${this.accountName} (...${this.mask})`;
};

// Instance method to check if account needs reauth
bankAccountSchema.methods.needsReauth = function() {
  const now = new Date();
  const lastSync = new Date(this.lastSyncAt);
  const daysSinceSync = (now - lastSync) / (1000 * 60 * 60 * 24);
  
  // If haven't synced in 7 days or have recent sync errors
  return daysSinceSync > 7 || this.syncErrors.some(err => !err.resolved && 
    (now - err.timestamp) < (1000 * 60 * 60 * 24)); // errors in last 24 hours
};

// Instance method to update balance
bankAccountSchema.methods.updateBalance = function(balanceData) {
  this.balance = {
    ...this.balance,
    ...balanceData,
    lastUpdated: Date.now()
  };
  this.lastSyncAt = Date.now();
  return this.save();
};

// Instance method to add sync error
bankAccountSchema.methods.addSyncError = function(error) {
  this.syncErrors.push({
    error: error.toString(),
    timestamp: Date.now()
  });
  
  // Keep only last 10 errors
  if (this.syncErrors.length > 10) {
    this.syncErrors = this.syncErrors.slice(-10);
  }
  
  return this.save();
};

// Instance method to resolve sync errors
bankAccountSchema.methods.resolveSyncErrors = function() {
  this.syncErrors.forEach(error => {
    error.resolved = true;
  });
  return this.save();
};

// Static method to find accounts by user
bankAccountSchema.statics.findByUser = function(userId) {
  return this.find({ user: userId, isActive: true })
    .sort({ createdAt: -1 });
};

// Static method to find account by Plaid ID
bankAccountSchema.statics.findByPlaidId = function(plaidAccountId) {
  return this.findOne({ plaidAccountId, isActive: true });
};

// Remove sensitive data when converting to JSON
bankAccountSchema.methods.toJSON = function() {
  const account = this.toObject();
  // Don't expose access token in API responses
  delete account.plaidAccessToken;
  return account;
};

module.exports = mongoose.model('BankAccount', bankAccountSchema); 
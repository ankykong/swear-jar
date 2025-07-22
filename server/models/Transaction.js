const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  swearJar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SwearJar',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'transfer', 'penalty', 'refund'],
    required: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be at least 0.01']
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'CAD', 'EUR', 'GBP']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  metadata: {
    swearWord: String, // For penalty transactions
    bankAccountId: String, // For bank transfers
    plaidTransactionId: String, // Reference to Plaid transaction
    transferToJar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SwearJar'
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  bankAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount'
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  fees: {
    amount: {
      type: Number,
      default: 0
    },
    description: String
  },
  externalTransactionId: String, // For third-party payment processors
  plaidData: {
    accountId: String,
    transactionId: String,
    merchantName: String,
    category: [String]
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  processedAt: {
    type: Date
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for performance
transactionSchema.index({ swearJar: 1, createdAt: -1 });
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ createdAt: -1 });

// Update the updatedAt field before saving
transactionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Set processedAt when status changes to completed
  if (this.isModified('status') && this.status === 'completed' && !this.processedAt) {
    this.processedAt = Date.now();
  }
  
  next();
});

// Static method to get transactions summary
transactionSchema.statics.getSummary = function(swearJarId, startDate, endDate) {
  const matchStage = {
    swearJar: mongoose.Types.ObjectId(swearJarId),
    status: 'completed'
  };

  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$type',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
        averageAmount: { $avg: '$amount' }
      }
    },
    {
      $group: {
        _id: null,
        types: {
          $push: {
            type: '$_id',
            totalAmount: '$totalAmount',
            count: '$count',
            averageAmount: '$averageAmount'
          }
        },
        totalTransactions: { $sum: '$count' },
        totalAmount: { $sum: '$totalAmount' }
      }
    }
  ]);
};

// Instance method to format amount
transactionSchema.methods.getFormattedAmount = function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: this.currency
  }).format(this.amount);
};

// Instance method to get transaction display info
transactionSchema.methods.getDisplayInfo = function() {
  let icon, color, prefix;
  
  switch (this.type) {
    case 'deposit':
      icon = '↗️';
      color = 'green';
      prefix = '+';
      break;
    case 'withdrawal':
      icon = '↙️';
      color = 'red';
      prefix = '-';
      break;
    case 'penalty':
      icon = '😬';
      color = 'orange';
      prefix = '-';
      break;
    case 'transfer':
      icon = '↔️';
      color = 'blue';
      prefix = this.amount > 0 ? '+' : '-';
      break;
    default:
      icon = '💰';
      color = 'gray';
      prefix = this.amount > 0 ? '+' : '-';
  }

  return {
    icon,
    color,
    prefix,
    formattedAmount: this.getFormattedAmount()
  };
};

// Static method to get recent transactions
transactionSchema.statics.getRecent = function(swearJarId, limit = 10) {
  return this.find({
    swearJar: swearJarId,
    status: 'completed'
  })
  .populate('user', 'name email avatar')
  .sort({ createdAt: -1 })
  .limit(limit);
};

module.exports = mongoose.model('Transaction', transactionSchema); 
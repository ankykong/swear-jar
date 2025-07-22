const mongoose = require('mongoose');

const swearJarSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Swear jar name is required'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  balance: {
    type: Number,
    default: 0,
    min: [0, 'Balance cannot be negative']
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'CAD', 'EUR', 'GBP']
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member'],
      default: 'member'
    },
    permissions: {
      canDeposit: {
        type: Boolean,
        default: true
      },
      canWithdraw: {
        type: Boolean,
        default: false
      },
      canInvite: {
        type: Boolean,
        default: false
      },
      canViewTransactions: {
        type: Boolean,
        default: true
      }
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  settings: {
    isPublic: {
      type: Boolean,
      default: false
    },
    requireApprovalForWithdrawals: {
      type: Boolean,
      default: true
    },
    minimumDeposit: {
      type: Number,
      default: 0.01,
      min: 0
    },
    maximumDeposit: {
      type: Number,
      default: 1000,
      min: 0
    },
    swearWords: [{
      word: String,
      penalty: {
        type: Number,
        default: 1.00,
        min: 0
      }
    }],
    autoDeductOnSwear: {
      type: Boolean,
      default: false
    }
  },
  statistics: {
    totalDeposits: {
      type: Number,
      default: 0
    },
    totalWithdrawals: {
      type: Number,
      default: 0
    },
    transactionCount: {
      type: Number,
      default: 0
    },
    averageDeposit: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for performance
swearJarSchema.index({ owner: 1 });
swearJarSchema.index({ 'members.user': 1 });
swearJarSchema.index({ createdAt: -1 });
swearJarSchema.index({ isActive: 1 });

// Update the updatedAt field before saving
swearJarSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Add member method
swearJarSchema.methods.addMember = function(userId, role = 'member', permissions = {}) {
  const existingMember = this.members.find(m => m.user.toString() === userId.toString());
  if (existingMember) {
    throw new Error('User is already a member of this swear jar');
  }

  const defaultPermissions = {
    canDeposit: true,
    canWithdraw: role === 'owner' || role === 'admin',
    canInvite: role === 'owner' || role === 'admin',
    canViewTransactions: true
  };

  this.members.push({
    user: userId,
    role,
    permissions: { ...defaultPermissions, ...permissions }
  });

  return this.save();
};

// Remove member method
swearJarSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(m => m.user.toString() !== userId.toString());
  return this.save();
};

// Update member role method
swearJarSchema.methods.updateMemberRole = function(userId, newRole, newPermissions = {}) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  if (!member) {
    throw new Error('User is not a member of this swear jar');
  }

  member.role = newRole;
  if (Object.keys(newPermissions).length > 0) {
    member.permissions = { ...member.permissions, ...newPermissions };
  }

  return this.save();
};

// Check if user has permission
swearJarSchema.methods.hasPermission = function(userId, permission) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  if (!member) return false;

  // Owner has all permissions
  if (member.role === 'owner') return true;

  return member.permissions[permission] || false;
};

// Update balance method
swearJarSchema.methods.updateBalance = function(amount, isDeposit = true) {
  if (isDeposit) {
    this.balance += amount;
    this.statistics.totalDeposits += amount;
  } else {
    if (this.balance < amount) {
      throw new Error('Insufficient funds');
    }
    this.balance -= amount;
    this.statistics.totalWithdrawals += amount;
  }

  this.statistics.transactionCount += 1;
  this.statistics.averageDeposit = this.statistics.totalDeposits / this.statistics.transactionCount;

  return this.save();
};

// Get formatted balance
swearJarSchema.methods.getFormattedBalance = function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: this.currency
  }).format(this.balance);
};

module.exports = mongoose.model('SwearJar', swearJarSchema); 
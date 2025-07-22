const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  avatar: {
    type: String,
    default: null
  },
  swearJars: [{
    jar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SwearJar'
    },
    role: {
      type: String,
      enum: ['owner', 'member', 'admin'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  bankAccounts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
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

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ 'swearJars.jar': 1 });

// Encrypt password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get user's swear jars with role information
userSchema.methods.getSwearJarsWithRole = function() {
  return this.populate({
    path: 'swearJars.jar',
    model: 'SwearJar',
    select: 'name description balance currency createdAt'
  });
};

// Check if user has permission for a swear jar
userSchema.methods.hasPermission = function(swearJarId, requiredRole = 'member') {
  const roleHierarchy = { member: 0, admin: 1, owner: 2 };
  const userJar = this.swearJars.find(sj => sj.jar.toString() === swearJarId.toString());
  
  if (!userJar) return false;
  
  return roleHierarchy[userJar.role] >= roleHierarchy[requiredRole];
};

// Remove sensitive information
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema); 
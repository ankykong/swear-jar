const express = require('express');
const { body, validationResult } = require('express-validator');
const Transaction = require('../models/Transaction');
const SwearJar = require('../models/SwearJar');
const BankAccount = require('../models/BankAccount');
const { auth, checkSwearJarPermission } = require('../middleware/auth');
const plaidService = require('../services/plaidService');

const router = express.Router();

// @route   GET /api/transactions
// @desc    Get transactions for user's swear jars
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { jarId, type, status, limit = 20, skip = 0 } = req.query;

    let query = { user: req.user.id };

    if (jarId) {
      // Verify user has access to this jar
      const hasAccess = req.user.hasPermission(jarId, 'member');
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this swear jar' });
      }
      query.swearJar = jarId;
    }

    if (type) query.type = type;
    if (status) query.status = status;

    const transactions = await Transaction.find(query)
      .populate('swearJar', 'name currency')
      .populate('user', 'name email avatar')
      .populate('bankAccount', 'institutionName accountName mask')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Transaction.countDocuments(query);

    res.json({
      transactions,
      pagination: {
        total,
        page: Math.floor(skip / limit) + 1,
        pages: Math.ceil(total / limit),
        hasNext: skip + limit < total
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      message: 'Error fetching transactions',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/transactions/deposit
// @desc    Create a deposit transaction
// @access  Private
router.post('/deposit', [
  auth,
  body('swearJarId')
    .isMongoId()
    .withMessage('Valid swear jar ID is required'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be at least 0.01'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('bankAccountId')
    .optional()
    .isMongoId()
    .withMessage('Valid bank account ID required if provided'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { swearJarId, amount, description, bankAccountId } = req.body;

    // Verify user has deposit permission
    const hasPermission = req.user.hasPermission(swearJarId, 'member');
    if (!hasPermission) {
      return res.status(403).json({ message: 'No permission to deposit to this swear jar' });
    }

    const swearJar = await SwearJar.findById(swearJarId);
    if (!swearJar) {
      return res.status(404).json({ message: 'Swear jar not found' });
    }

    // Check deposit limits
    if (amount < swearJar.settings.minimumDeposit) {
      return res.status(400).json({
        message: `Minimum deposit is ${swearJar.settings.minimumDeposit}`
      });
    }

    if (amount > swearJar.settings.maximumDeposit) {
      return res.status(400).json({
        message: `Maximum deposit is ${swearJar.settings.maximumDeposit}`
      });
    }

    let bankAccount = null;
    if (bankAccountId) {
      bankAccount = await BankAccount.findOne({
        _id: bankAccountId,
        user: req.user.id,
        isActive: true
      });

      if (!bankAccount) {
        return res.status(404).json({ message: 'Bank account not found' });
      }

      // Verify bank account has sufficient funds (in a real app)
      // This would involve calling Plaid to check real-time balance
    }

    // Create transaction
    const transaction = new Transaction({
      swearJar: swearJarId,
      user: req.user.id,
      type: 'deposit',
      amount,
      currency: swearJar.currency,
      description: description || 'Manual deposit',
      bankAccount: bankAccountId,
      balanceAfter: swearJar.balance + amount,
      status: bankAccountId ? 'pending' : 'completed' // Bank transfers need processing
    });

    await transaction.save();

    // If it's a manual deposit (no bank account), update balance immediately
    if (!bankAccountId) {
      await swearJar.updateBalance(amount, true);
    } else {
      // For bank transfers, you would initiate the transfer here
      // This is a simplified version - in production you'd use Plaid Transfer API
      try {
        // Simulate bank transfer processing
        setTimeout(async () => {
          try {
            await swearJar.updateBalance(amount, true);
            transaction.status = 'completed';
            transaction.processedAt = Date.now();
            await transaction.save();
          } catch (error) {
            console.error('Error processing bank transfer:', error);
            transaction.status = 'failed';
            await transaction.save();
          }
        }, 5000); // 5 second delay for demo
      } catch (error) {
        transaction.status = 'failed';
        await transaction.save();
        throw error;
      }
    }

    // Populate the response
    await transaction.populate([
      { path: 'swearJar', select: 'name currency' },
      { path: 'user', select: 'name email avatar' },
      { path: 'bankAccount', select: 'institutionName accountName mask' }
    ]);

    res.status(201).json({
      message: 'Deposit created successfully',
      transaction
    });
  } catch (error) {
    console.error('Deposit error:', error);
    res.status(500).json({
      message: 'Error creating deposit',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/transactions/withdrawal
// @desc    Create a withdrawal transaction
// @access  Private
router.post('/withdrawal', [
  auth,
  body('swearJarId')
    .isMongoId()
    .withMessage('Valid swear jar ID is required'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be at least 0.01'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('bankAccountId')
    .isMongoId()
    .withMessage('Bank account ID is required for withdrawals'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { swearJarId, amount, description, bankAccountId } = req.body;

    // Verify user has withdrawal permission
    const swearJar = await SwearJar.findById(swearJarId);
    if (!swearJar) {
      return res.status(404).json({ message: 'Swear jar not found' });
    }

    const hasPermission = swearJar.hasPermission(req.user.id, 'canWithdraw');
    if (!hasPermission) {
      return res.status(403).json({ message: 'No permission to withdraw from this swear jar' });
    }

    // Check sufficient balance
    if (swearJar.balance < amount) {
      return res.status(400).json({
        message: 'Insufficient funds in swear jar'
      });
    }

    // Verify bank account
    const bankAccount = await BankAccount.findOne({
      _id: bankAccountId,
      user: req.user.id,
      isActive: true
    });

    if (!bankAccount) {
      return res.status(404).json({ message: 'Bank account not found' });
    }

    if (!bankAccount.permissions.canWithdraw) {
      return res.status(400).json({
        message: 'Bank account not verified for withdrawals'
      });
    }

    // Create transaction
    const transaction = new Transaction({
      swearJar: swearJarId,
      user: req.user.id,
      type: 'withdrawal',
      amount,
      currency: swearJar.currency,
      description: description || 'Withdrawal to bank account',
      bankAccount: bankAccountId,
      balanceAfter: swearJar.balance - amount,
      status: swearJar.settings.requireApprovalForWithdrawals ? 'pending' : 'completed'
    });

    await transaction.save();

    // If no approval required, process immediately
    if (!swearJar.settings.requireApprovalForWithdrawals) {
      await swearJar.updateBalance(amount, false);
      
      // In production, initiate bank transfer here
      try {
        // Simulate bank transfer
        setTimeout(async () => {
          // Update transaction status after "processing"
          transaction.processedAt = Date.now();
          await transaction.save();
        }, 3000);
      } catch (error) {
        console.error('Error initiating bank transfer:', error);
        transaction.status = 'failed';
        await transaction.save();
      }
    }

    // Populate the response
    await transaction.populate([
      { path: 'swearJar', select: 'name currency' },
      { path: 'user', select: 'name email avatar' },
      { path: 'bankAccount', select: 'institutionName accountName mask' }
    ]);

    res.status(201).json({
      message: 'Withdrawal created successfully',
      transaction
    });
  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({
      message: 'Error creating withdrawal',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/transactions/penalty
// @desc    Create a penalty transaction for swearing
// @access  Private
router.post('/penalty', [
  auth,
  body('swearJarId')
    .isMongoId()
    .withMessage('Valid swear jar ID is required'),
  body('swearWord')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Swear word is required'),
  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be at least 0.01'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { swearJarId, swearWord, amount } = req.body;

    const swearJar = await SwearJar.findById(swearJarId);
    if (!swearJar) {
      return res.status(404).json({ message: 'Swear jar not found' });
    }

    // Verify user is a member
    const hasPermission = req.user.hasPermission(swearJarId, 'member');
    if (!hasPermission) {
      return res.status(403).json({ message: 'No access to this swear jar' });
    }

    // Determine penalty amount
    let penaltyAmount = amount;
    if (!penaltyAmount) {
      const wordSetting = swearJar.settings.swearWords.find(
        w => w.word.toLowerCase() === swearWord.toLowerCase()
      );
      penaltyAmount = wordSetting ? wordSetting.penalty : 1.00; // Default $1
    }

    // Create penalty transaction
    const transaction = new Transaction({
      swearJar: swearJarId,
      user: req.user.id,
      type: 'penalty',
      amount: penaltyAmount,
      currency: swearJar.currency,
      description: `Penalty for using "${swearWord}"`,
      metadata: {
        swearWord
      },
      balanceAfter: swearJar.balance + penaltyAmount,
      status: 'completed'
    });

    await transaction.save();

    // Update swear jar balance
    await swearJar.updateBalance(penaltyAmount, true);

    // Populate the response
    await transaction.populate([
      { path: 'swearJar', select: 'name currency' },
      { path: 'user', select: 'name email avatar' }
    ]);

    res.status(201).json({
      message: 'Penalty applied successfully',
      transaction
    });
  } catch (error) {
    console.error('Penalty error:', error);
    res.status(500).json({
      message: 'Error applying penalty',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/transactions/:id
// @desc    Get a specific transaction
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('swearJar', 'name currency')
      .populate('user', 'name email avatar')
      .populate('bankAccount', 'institutionName accountName mask');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Verify user has access to this transaction
    const hasAccess = transaction.user._id.toString() === req.user.id.toString() ||
                     req.user.hasPermission(transaction.swearJar._id, 'member');

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied to this transaction' });
    }

    res.json({ transaction });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      message: 'Error fetching transaction',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   PUT /api/transactions/:id/approve
// @desc    Approve a pending withdrawal
// @access  Private
router.put('/:id/approve', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('swearJar');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.type !== 'withdrawal' || transaction.status !== 'pending') {
      return res.status(400).json({
        message: 'Only pending withdrawals can be approved'
      });
    }

    // Verify user has admin permission for the swear jar
    const hasPermission = transaction.swearJar.hasPermission(req.user.id, 'canWithdraw');
    if (!hasPermission) {
      return res.status(403).json({ message: 'No permission to approve withdrawals' });
    }

    // Approve the transaction
    transaction.status = 'completed';
    transaction.metadata.approvedBy = req.user.id;
    transaction.processedAt = Date.now();
    await transaction.save();

    // Update swear jar balance
    await transaction.swearJar.updateBalance(transaction.amount, false);

    res.json({
      message: 'Transaction approved successfully',
      transaction
    });
  } catch (error) {
    console.error('Approve transaction error:', error);
    res.status(500).json({
      message: 'Error approving transaction',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   PUT /api/transactions/:id/cancel
// @desc    Cancel a pending transaction
// @access  Private
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('swearJar');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({
        message: 'Only pending transactions can be cancelled'
      });
    }

    // Verify user can cancel (owner of transaction or admin of swear jar)
    const canCancel = transaction.user.toString() === req.user.id.toString() ||
                     transaction.swearJar.hasPermission(req.user.id, 'canWithdraw');

    if (!canCancel) {
      return res.status(403).json({ message: 'No permission to cancel this transaction' });
    }

    // Cancel the transaction
    transaction.status = 'cancelled';
    transaction.processedAt = Date.now();
    await transaction.save();

    res.json({
      message: 'Transaction cancelled successfully',
      transaction
    });
  } catch (error) {
    console.error('Cancel transaction error:', error);
    res.status(500).json({
      message: 'Error cancelling transaction',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

module.exports = router; 
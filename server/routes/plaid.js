const express = require('express');
const { body, validationResult } = require('express-validator');
const BankAccount = require('../models/BankAccount');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const plaidService = require('../services/plaidService');

const router = express.Router();

// @route   POST /api/plaid/link-token
// @desc    Create a link token for Plaid Link
// @access  Private
router.post('/link-token', auth, async (req, res) => {
  try {
    const { institutionId } = req.body;

    const linkTokenData = await plaidService.createLinkToken(req.user.id, institutionId);

    res.json({
      linkToken: linkTokenData.link_token,
      expiration: linkTokenData.expiration
    });
  } catch (error) {
    console.error('Create link token error:', error);
    res.status(500).json({
      message: 'Error creating link token',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/plaid/exchange-token
// @desc    Exchange public token for access token and save accounts
// @access  Private
router.post('/exchange-token', [
  auth,
  body('publicToken')
    .notEmpty()
    .withMessage('Public token is required'),
  body('metadata')
    .isObject()
    .withMessage('Metadata is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { publicToken, metadata } = req.body;

    // Exchange public token for access token
    const { accessToken, itemId } = await plaidService.exchangePublicToken(publicToken);

    // Get accounts from Plaid
    const accounts = await plaidService.getAccounts(accessToken);

    // Get institution information
    const institution = await plaidService.getInstitution(metadata.institution.institution_id);

    // Save accounts to database
    const savedAccounts = [];
    for (const account of accounts) {
      const bankAccount = new BankAccount({
        user: req.user.id,
        plaidAccountId: account.account_id,
        plaidItemId: itemId,
        plaidAccessToken: accessToken,
        institutionId: institution.institution_id,
        institutionName: institution.name,
        accountName: account.name,
        accountType: account.type,
        accountSubtype: account.subtype,
        mask: account.mask,
        balance: {
          available: account.balances.available,
          current: account.balances.current,
          limit: account.balances.limit,
          isoCurrencyCode: account.balances.iso_currency_code
        },
        metadata: {
          logo: institution.logo,
          primaryColor: institution.primary_color,
          url: institution.url,
          plaidProducts: metadata.institution.products
        }
      });

      await bankAccount.save();
      savedAccounts.push(bankAccount);
    }

    // Add bank accounts to user
    await User.findByIdAndUpdate(req.user.id, {
      $push: {
        bankAccounts: { $each: savedAccounts.map(acc => acc._id) }
      }
    });

    res.status(201).json({
      message: 'Bank accounts connected successfully',
      accounts: savedAccounts.map(acc => ({
        id: acc._id,
        institutionName: acc.institutionName,
        accountName: acc.accountName,
        accountType: acc.accountType,
        mask: acc.mask,
        balance: acc.getFormattedBalance(),
        displayName: acc.getDisplayName()
      }))
    });
  } catch (error) {
    console.error('Exchange token error:', error);
    res.status(500).json({
      message: 'Error connecting bank accounts',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/plaid/accounts
// @desc    Get user's connected bank accounts
// @access  Private
router.get('/accounts', auth, async (req, res) => {
  try {
    const bankAccounts = await BankAccount.findByUser(req.user.id);

    const accountsWithStatus = bankAccounts.map(account => ({
      id: account._id,
      institutionName: account.institutionName,
      accountName: account.accountName,
      accountType: account.accountType,
      mask: account.mask,
      balance: account.getFormattedBalance(),
      displayName: account.getDisplayName(),
      verification: account.verification,
      permissions: account.permissions,
      needsReauth: account.needsReauth(),
      lastSyncAt: account.lastSyncAt,
      createdAt: account.createdAt
    }));

    res.json({
      accounts: accountsWithStatus,
      count: accountsWithStatus.length
    });
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({
      message: 'Error fetching bank accounts',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/plaid/accounts/:id/update-balance
// @desc    Update account balance from Plaid
// @access  Private
router.post('/accounts/:id/update-balance', auth, async (req, res) => {
  try {
    const bankAccount = await BankAccount.findOne({
      _id: req.params.id,
      user: req.user.id,
      isActive: true
    });

    if (!bankAccount) {
      return res.status(404).json({ message: 'Bank account not found' });
    }

    // Get updated balance from Plaid
    const accounts = await plaidService.getAccountBalances(bankAccount.plaidAccessToken);
    const plaidAccount = accounts.find(acc => acc.account_id === bankAccount.plaidAccountId);

    if (!plaidAccount) {
      return res.status(404).json({ message: 'Account not found in Plaid' });
    }

    // Update balance
    await bankAccount.updateBalance({
      available: plaidAccount.balances.available,
      current: plaidAccount.balances.current,
      limit: plaidAccount.balances.limit,
      isoCurrencyCode: plaidAccount.balances.iso_currency_code
    });

    res.json({
      message: 'Balance updated successfully',
      account: {
        id: bankAccount._id,
        balance: bankAccount.getFormattedBalance(),
        lastUpdated: bankAccount.balance.lastUpdated
      }
    });
  } catch (error) {
    console.error('Update balance error:', error);
    
    // If it's a Plaid error, record it
    if (req.params.id) {
      const bankAccount = await BankAccount.findById(req.params.id);
      if (bankAccount) {
        await bankAccount.addSyncError(error.message);
      }
    }

    res.status(500).json({
      message: 'Error updating account balance',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/plaid/accounts/:id/transactions
// @desc    Get transactions from Plaid for an account
// @access  Private
router.get('/accounts/:id/transactions', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const bankAccount = await BankAccount.findOne({
      _id: req.params.id,
      user: req.user.id,
      isActive: true
    });

    if (!bankAccount) {
      return res.status(404).json({ message: 'Bank account not found' });
    }

    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const end = endDate || new Date();

    // Get transactions from Plaid
    const transactions = await plaidService.getTransactions(
      bankAccount.plaidAccessToken,
      start,
      end,
      [bankAccount.plaidAccountId]
    );

    const formattedTransactions = transactions.map(tx => ({
      id: tx.transaction_id,
      amount: tx.amount,
      date: tx.date,
      name: tx.name,
      merchantName: tx.merchant_name,
      category: tx.category,
      accountId: tx.account_id,
      pending: tx.pending,
      isoCurrencyCode: tx.iso_currency_code
    }));

    res.json({
      transactions: formattedTransactions,
      count: formattedTransactions.length,
      account: {
        id: bankAccount._id,
        displayName: bankAccount.getDisplayName()
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

// @route   POST /api/plaid/accounts/:id/verify
// @desc    Verify account with micro-deposits
// @access  Private
router.post('/accounts/:id/verify', [
  auth,
  body('amounts')
    .isArray({ min: 2, max: 2 })
    .withMessage('Exactly 2 micro-deposit amounts are required'),
  body('amounts.*')
    .isFloat({ min: 0.01, max: 1.00 })
    .withMessage('Amounts must be between 0.01 and 1.00'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { amounts } = req.body;

    const bankAccount = await BankAccount.findOne({
      _id: req.params.id,
      user: req.user.id,
      isActive: true
    });

    if (!bankAccount) {
      return res.status(404).json({ message: 'Bank account not found' });
    }

    if (bankAccount.verification.status === 'verified') {
      return res.status(400).json({ message: 'Account is already verified' });
    }

    try {
      // Verify micro-deposits with Plaid
      await plaidService.verifyMicroDeposits(
        bankAccount.plaidAccessToken,
        bankAccount.plaidAccountId,
        amounts
      );

      // Update verification status
      bankAccount.verification = {
        status: 'verified',
        verifiedAt: Date.now(),
        method: 'microdeposits'
      };
      
      // Enable withdrawal permission
      bankAccount.permissions.canWithdraw = true;
      
      await bankAccount.save();

      res.json({
        message: 'Account verified successfully',
        account: {
          id: bankAccount._id,
          verification: bankAccount.verification,
          permissions: bankAccount.permissions
        }
      });
    } catch (plaidError) {
      bankAccount.verification.status = 'failed';
      await bankAccount.save();
      
      throw new Error('Verification failed. Please check the amounts and try again.');
    }
  } catch (error) {
    console.error('Verify account error:', error);
    res.status(500).json({
      message: error.message || 'Error verifying account',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   DELETE /api/plaid/accounts/:id
// @desc    Disconnect a bank account
// @access  Private
router.delete('/accounts/:id', auth, async (req, res) => {
  try {
    const bankAccount = await BankAccount.findOne({
      _id: req.params.id,
      user: req.user.id,
      isActive: true
    });

    if (!bankAccount) {
      return res.status(404).json({ message: 'Bank account not found' });
    }

    // Remove item from Plaid
    try {
      await plaidService.removeItem(bankAccount.plaidAccessToken);
    } catch (plaidError) {
      console.error('Error removing Plaid item:', plaidError);
      // Continue with disconnection even if Plaid removal fails
    }

    // Deactivate account
    bankAccount.isActive = false;
    await bankAccount.save();

    // Remove from user's bank accounts list
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { bankAccounts: bankAccount._id }
    });

    res.json({
      message: 'Bank account disconnected successfully'
    });
  } catch (error) {
    console.error('Disconnect account error:', error);
    res.status(500).json({
      message: 'Error disconnecting bank account',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/plaid/webhook
// @desc    Handle Plaid webhooks
// @access  Public (but should be secured in production)
router.post('/webhook', async (req, res) => {
  try {
    const { webhook_type, webhook_code, item_id, error } = req.body;

    console.log('Plaid webhook received:', {
      type: webhook_type,
      code: webhook_code,
      itemId: item_id
    });

    // Handle the webhook
    await plaidService.handleWebhook(webhook_type, webhook_code, item_id, error);

    // Respond to Plaid that webhook was received
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      message: 'Error handling webhook',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

module.exports = router; 
const express = require('express');
const { body, validationResult } = require('express-validator');
const SwearJar = require('../models/SwearJar');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { auth, checkSwearJarPermission } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/swear-jars
// @desc    Get all swear jars for current user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({
        path: 'swearJars.jar',
        populate: {
          path: 'members.user',
          select: 'name email avatar'
        }
      });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const swearJars = user.swearJars.map(userJar => ({
      ...userJar.jar.toObject(),
      userRole: userJar.role,
      joinedAt: userJar.joinedAt
    }));

    res.json({
      swearJars,
      count: swearJars.length
    });
  } catch (error) {
    console.error('Get swear jars error:', error);
    res.status(500).json({
      message: 'Error fetching swear jars',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/swear-jars
// @desc    Create a new swear jar
// @access  Private
router.post('/', [
  auth,
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('currency')
    .optional()
    .isIn(['USD', 'CAD', 'EUR', 'GBP'])
    .withMessage('Invalid currency'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { name, description, currency, settings } = req.body;

    // Create new swear jar
    const swearJar = new SwearJar({
      name,
      description,
      currency: currency || 'USD',
      owner: req.user.id,
      members: [{
        user: req.user.id,
        role: 'owner',
        permissions: {
          canDeposit: true,
          canWithdraw: true,
          canInvite: true,
          canViewTransactions: true
        }
      }],
      settings: settings || {}
    });

    await swearJar.save();

    // Add swear jar to user's list
    await User.findByIdAndUpdate(req.user.id, {
      $push: {
        swearJars: {
          jar: swearJar._id,
          role: 'owner'
        }
      }
    });

    // Populate the response
    await swearJar.populate({
      path: 'members.user',
      select: 'name email avatar'
    });

    res.status(201).json({
      message: 'Swear jar created successfully',
      swearJar
    });
  } catch (error) {
    console.error('Create swear jar error:', error);
    res.status(500).json({
      message: 'Error creating swear jar',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/swear-jars/:id
// @desc    Get a specific swear jar
// @access  Private
router.get('/:id', [auth, checkSwearJarPermission('member')], async (req, res) => {
  try {
    const swearJar = await SwearJar.findById(req.params.id)
      .populate({
        path: 'members.user',
        select: 'name email avatar'
      })
      .populate('owner', 'name email avatar');

    if (!swearJar) {
      return res.status(404).json({ message: 'Swear jar not found' });
    }

    // Get recent transactions
    const recentTransactions = await Transaction.getRecent(swearJar._id, 10);

    res.json({
      swearJar,
      recentTransactions
    });
  } catch (error) {
    console.error('Get swear jar error:', error);
    res.status(500).json({
      message: 'Error fetching swear jar',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   PUT /api/swear-jars/:id
// @desc    Update a swear jar
// @access  Private
router.put('/:id', [
  auth,
  checkSwearJarPermission('admin'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const updates = {};
    const { name, description, settings } = req.body;

    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (settings) updates.settings = { ...req.body.settings, ...settings };

    const swearJar = await SwearJar.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate({
      path: 'members.user',
      select: 'name email avatar'
    });

    res.json({
      message: 'Swear jar updated successfully',
      swearJar
    });
  } catch (error) {
    console.error('Update swear jar error:', error);
    res.status(500).json({
      message: 'Error updating swear jar',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   DELETE /api/swear-jars/:id
// @desc    Delete a swear jar
// @access  Private
router.delete('/:id', [auth, checkSwearJarPermission('owner')], async (req, res) => {
  try {
    const swearJar = await SwearJar.findById(req.params.id);
    
    if (!swearJar) {
      return res.status(404).json({ message: 'Swear jar not found' });
    }

    if (swearJar.balance > 0) {
      return res.status(400).json({
        message: 'Cannot delete swear jar with positive balance. Please withdraw funds first.'
      });
    }

    // Remove from all users' swear jar lists
    await User.updateMany(
      { 'swearJars.jar': req.params.id },
      { $pull: { swearJars: { jar: req.params.id } } }
    );

    // Delete the swear jar
    await SwearJar.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Swear jar deleted successfully'
    });
  } catch (error) {
    console.error('Delete swear jar error:', error);
    res.status(500).json({
      message: 'Error deleting swear jar',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/swear-jars/:id/invite
// @desc    Invite a user to join the swear jar
// @access  Private
router.post('/:id/invite', [
  auth,
  checkSwearJarPermission('admin'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('role')
    .optional()
    .isIn(['member', 'admin'])
    .withMessage('Role must be member or admin'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { email, role = 'member' } = req.body;

    // Find the user to invite
    const userToInvite = await User.findOne({ email });
    if (!userToInvite) {
      return res.status(404).json({
        message: 'User with this email not found'
      });
    }

    const swearJar = await SwearJar.findById(req.params.id);
    if (!swearJar) {
      return res.status(404).json({ message: 'Swear jar not found' });
    }

    // Check if user is already a member
    const existingMember = swearJar.members.find(
      member => member.user.toString() === userToInvite._id.toString()
    );

    if (existingMember) {
      return res.status(400).json({
        message: 'User is already a member of this swear jar'
      });
    }

    // Add user to swear jar
    await swearJar.addMember(userToInvite._id, role);

    // Add swear jar to user's list
    await User.findByIdAndUpdate(userToInvite._id, {
      $push: {
        swearJars: {
          jar: swearJar._id,
          role
        }
      }
    });

    // Populate the updated swear jar
    await swearJar.populate({
      path: 'members.user',
      select: 'name email avatar'
    });

    res.json({
      message: 'User invited successfully',
      swearJar
    });
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({
      message: 'Error inviting user',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   DELETE /api/swear-jars/:id/members/:userId
// @desc    Remove a member from the swear jar
// @access  Private
router.delete('/:id/members/:userId', [auth, checkSwearJarPermission('admin')], async (req, res) => {
  try {
    const swearJar = await SwearJar.findById(req.params.id);
    if (!swearJar) {
      return res.status(404).json({ message: 'Swear jar not found' });
    }

    const userToRemove = req.params.userId;

    // Prevent removing the owner
    if (swearJar.owner.toString() === userToRemove) {
      return res.status(400).json({
        message: 'Cannot remove the owner from the swear jar'
      });
    }

    // Remove user from swear jar
    await swearJar.removeMember(userToRemove);

    // Remove swear jar from user's list
    await User.findByIdAndUpdate(userToRemove, {
      $pull: { swearJars: { jar: swearJar._id } }
    });

    // Populate the updated swear jar
    await swearJar.populate({
      path: 'members.user',
      select: 'name email avatar'
    });

    res.json({
      message: 'Member removed successfully',
      swearJar
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({
      message: 'Error removing member',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   PUT /api/swear-jars/:id/members/:userId/role
// @desc    Update a member's role
// @access  Private
router.put('/:id/members/:userId/role', [
  auth,
  checkSwearJarPermission('owner'),
  body('role')
    .isIn(['member', 'admin'])
    .withMessage('Role must be member or admin'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { role } = req.body;
    const userToUpdate = req.params.userId;

    const swearJar = await SwearJar.findById(req.params.id);
    if (!swearJar) {
      return res.status(404).json({ message: 'Swear jar not found' });
    }

    // Update member role
    await swearJar.updateMemberRole(userToUpdate, role);

    // Update role in user's swear jar list
    await User.findOneAndUpdate(
      { _id: userToUpdate, 'swearJars.jar': swearJar._id },
      { $set: { 'swearJars.$.role': role } }
    );

    // Populate the updated swear jar
    await swearJar.populate({
      path: 'members.user',
      select: 'name email avatar'
    });

    res.json({
      message: 'Member role updated successfully',
      swearJar
    });
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({
      message: 'Error updating member role',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/swear-jars/:id/stats
// @desc    Get swear jar statistics
// @access  Private
router.get('/:id/stats', [auth, checkSwearJarPermission('member')], async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const swearJar = await SwearJar.findById(req.params.id);
    if (!swearJar) {
      return res.status(404).json({ message: 'Swear jar not found' });
    }

    // Get transaction summary
    const summary = await Transaction.getSummary(req.params.id, startDate, endDate);

    // Get recent activity
    const recentTransactions = await Transaction.getRecent(req.params.id, 20);

    res.json({
      balance: swearJar.balance,
      formattedBalance: swearJar.getFormattedBalance(),
      statistics: swearJar.statistics,
      summary: summary[0] || {
        types: [],
        totalTransactions: 0,
        totalAmount: 0
      },
      recentTransactions
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      message: 'Error fetching statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

module.exports = router; 
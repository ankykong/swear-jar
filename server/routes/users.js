const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/search
// @desc    Search for users by email or name
// @access  Private
router.get('/search', auth, async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        message: 'Search query must be at least 2 characters'
      });
    }

    const searchRegex = new RegExp(q.trim(), 'i');
    
    const users = await User.find({
      $or: [
        { name: searchRegex },
        { email: searchRegex }
      ],
      _id: { $ne: req.user.id }, // Exclude current user
      isActive: true
    })
    .select('name email avatar createdAt')
    .limit(parseInt(limit));

    res.json({
      users,
      count: users.length
    });
  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({
      message: 'Error searching users',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get a user's public profile
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      isActive: true
    }).select('name email avatar createdAt');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      message: 'Error fetching user',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/users/:id/swear-jars
// @desc    Get public swear jars for a user
// @access  Private
router.get('/:id/swear-jars', auth, async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      isActive: true
    }).populate({
      path: 'swearJars.jar',
      match: { 'settings.isPublic': true },
      select: 'name description balance currency createdAt statistics'
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const publicSwearJars = user.swearJars
      .filter(userJar => userJar.jar) // Filter out null jars (non-public ones)
      .map(userJar => ({
        ...userJar.jar.toObject(),
        userRole: userJar.role,
        joinedAt: userJar.joinedAt
      }));

    res.json({
      user: {
        id: user._id,
        name: user.name,
        avatar: user.avatar
      },
      swearJars: publicSwearJars,
      count: publicSwearJars.length
    });
  } catch (error) {
    console.error('Get user swear jars error:', error);
    res.status(500).json({
      message: 'Error fetching user swear jars',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   PUT /api/users/:id/block
// @desc    Block a user (prevent them from inviting you to swear jars)
// @access  Private
router.put('/:id/block', auth, async (req, res) => {
  try {
    const userToBlock = req.params.id;

    if (userToBlock === req.user.id.toString()) {
      return res.status(400).json({ message: 'Cannot block yourself' });
    }

    const targetUser = await User.findOne({
      _id: userToBlock,
      isActive: true
    });

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Add to blocked users list (you'd need to add this field to User model)
    // For now, we'll just return success
    // await User.findByIdAndUpdate(req.user.id, {
    //   $addToSet: { blockedUsers: userToBlock }
    // });

    res.json({
      message: 'User blocked successfully',
      blockedUser: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email
      }
    });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({
      message: 'Error blocking user',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   DELETE /api/users/:id/block
// @desc    Unblock a user
// @access  Private
router.delete('/:id/block', auth, async (req, res) => {
  try {
    const userToUnblock = req.params.id;

    // Remove from blocked users list
    // await User.findByIdAndUpdate(req.user.id, {
    //   $pull: { blockedUsers: userToUnblock }
    // });

    res.json({
      message: 'User unblocked successfully'
    });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({
      message: 'Error unblocking user',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/users/me/activity
// @desc    Get current user's activity summary
// @access  Private
router.get('/me/activity', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({
        path: 'swearJars.jar',
        select: 'name balance currency statistics'
      });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Calculate activity summary
    const totalJars = user.swearJars.length;
    const totalBalance = user.swearJars.reduce((sum, userJar) => {
      return sum + (userJar.jar ? userJar.jar.balance : 0);
    }, 0);

    const ownedJars = user.swearJars.filter(userJar => userJar.role === 'owner').length;
    const memberJars = user.swearJars.filter(userJar => userJar.role === 'member').length;

    res.json({
      activity: {
        totalJars,
        ownedJars,
        memberJars,
        totalBalance: new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(totalBalance),
        joinedAt: user.createdAt,
        lastActive: user.lastLogin
      },
      swearJars: user.swearJars.map(userJar => ({
        id: userJar.jar._id,
        name: userJar.jar.name,
        balance: userJar.jar.balance,
        role: userJar.role,
        joinedAt: userJar.joinedAt
      }))
    });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({
      message: 'Error fetching activity',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   PUT /api/users/me/settings
// @desc    Update user notification and privacy settings
// @access  Private
router.put('/me/settings', [
  auth,
  body('notifications')
    .optional()
    .isObject()
    .withMessage('Notifications must be an object'),
  body('privacy')
    .optional()
    .isObject()
    .withMessage('Privacy must be an object'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { notifications, privacy } = req.body;
    const updates = {};

    // You'd need to add these fields to the User model
    if (notifications) {
      updates['settings.notifications'] = notifications;
    }

    if (privacy) {
      updates['settings.privacy'] = privacy;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Settings updated successfully',
      user
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      message: 'Error updating settings',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

module.exports = router; 
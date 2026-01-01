import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import ActivityLog from '../models/ActivityLog.js';

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin only)
export const getUsers = asyncHandler(async (req, res) => {
  const { role, isActive } = req.query;
  
  let query = {};
  if (role) query.role = role;
  if (isActive !== undefined) query.isActive = isActive === 'true';

  const users = await User.find(query)
    .select('-password')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: users.length,
    data: users
  });
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Only admin or the user themselves can view
  if (req.user.role !== 'Admin' && req.user._id.toString() !== user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to view this user');
  }

  res.json({
    success: true,
    data: user
  });
});

// @desc    Create user
// @route   POST /api/users
// @access  Private (Admin only)
export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role } = req.body;

  // Check if user already exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists with this email');
  }

  const user = await User.create({
    name,
    email,
    password,
    phone,
    role,
    createdBy: req.user._id
  });

  await ActivityLog.create({
    user: req.user._id,
    action: 'create',
    resource: 'user',
    resourceId: user._id,
    description: `Created new user: ${user.email} with role ${user.role}`
  });

  res.status(201).json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive
    }
  });
});

// @desc    Update user
// @route   PATCH /api/users/:id
// @access  Private
export const updateUser = asyncHandler(async (req, res) => {
  let user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Only admin or the user themselves can update
  if (req.user.role !== 'Admin' && req.user._id.toString() !== user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to update this user');
  }

  // Prevent non-admin from changing role
  if (req.body.role && req.user.role !== 'Admin') {
    delete req.body.role;
  }

  // If password is being updated, it will be hashed by the pre-save hook
  user = await User.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  ).select('-password');

  await ActivityLog.create({
    user: req.user._id,
    action: 'update',
    resource: 'user',
    resourceId: user._id,
    description: `Updated user: ${user.email}`
  });

  res.json({
    success: true,
    data: user
  });
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Prevent deleting yourself
  if (req.user._id.toString() === user._id.toString()) {
    res.status(400);
    throw new Error('You cannot delete your own account');
  }

  await user.deleteOne();

  await ActivityLog.create({
    user: req.user._id,
    action: 'delete',
    resource: 'user',
    resourceId: user._id,
    description: `Deleted user: ${user.email}`
  });

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
});

// @desc    Get user activity logs
// @route   GET /api/users/:id/activity-logs
// @access  Private
export const getUserActivityLogs = asyncHandler(async (req, res) => {
  const { limit = 50, startDate, endDate } = req.query;

  // Only admin or the user themselves can view activity logs
  if (req.user.role !== 'Admin' && req.user._id.toString() !== req.params.id) {
    res.status(403);
    throw new Error('Not authorized to view activity logs');
  }

  let query = { user: req.params.id };
  
  if (startDate && endDate) {
    query.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  const activityLogs = await ActivityLog.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

  res.json({
    success: true,
    count: activityLogs.length,
    data: activityLogs
  });
});
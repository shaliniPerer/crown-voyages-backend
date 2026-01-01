import asyncHandler from 'express-async-handler';
import Resort from '../models/Resort.js';
import ActivityLog from '../models/ActivityLog.js';

// GET /api/resorts
export const getResorts = asyncHandler(async (req, res) => {
  const resorts = await Resort.find().sort({ createdAt: -1 });
  res.json({ success: true, count: resorts.length, data: resorts });
});

// GET /api/resorts/:id
export const getResortById = asyncHandler(async (req, res) => {
  const resort = await Resort.findById(req.params.id);
  if (!resort) { res.status(404); throw new Error('Resort not found'); }
  res.json({ success: true, data: resort });
});

// POST /api/resorts
export const createResort = asyncHandler(async (req, res) => {
  const resort = await Resort.create({ ...req.body, createdBy: req.user._id });

  await ActivityLog.create({
    user: req.user._id,
    action: 'create',
    resource: 'resort',
    resourceId: resort._id,
    description: `Created resort: ${resort.name}`
  });

  res.status(201).json({ success: true, data: resort });
});

// PATCH /api/resorts/:id
export const updateResort = asyncHandler(async (req, res) => {
  let resort = await Resort.findById(req.params.id);
  if (!resort) { res.status(404); throw new Error('Resort not found'); }

  resort = await Resort.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  await ActivityLog.create({
    user: req.user._id,
    action: 'update',
    resource: 'resort',
    resourceId: resort._id,
    description: `Updated resort: ${resort.name}`
  });

  res.json({ success: true, data: resort });
});

// DELETE /api/resorts/:id
export const deleteResort = asyncHandler(async (req, res) => {
  const resort = await Resort.findById(req.params.id);
  if (!resort) { res.status(404); throw new Error('Resort not found'); }

  await resort.deleteOne();

  await ActivityLog.create({
    user: req.user._id,
    action: 'delete',
    resource: 'resort',
    resourceId: resort._id,
    description: `Deleted resort: ${resort.name}`
  });

  res.json({ success: true, message: 'Resort deleted successfully' });
});

import asyncHandler from 'express-async-handler';
import Room from '../models/Room.js';
import ActivityLog from '../models/ActivityLog.js';

/* ================= GET ALL ROOMS ================= */
export const getRooms = asyncHandler(async (req, res) => {
  const { resort, roomType, minPrice, maxPrice } = req.query;

  let query = {};

  if (resort) query.resort = resort;
  if (roomType) query.roomType = { $regex: roomType, $options: 'i' };

  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  const rooms = await Room.find(query)
    .populate('resort', 'name location starRating')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: rooms.length,
    data: rooms
  });
});

/* ================= GET SINGLE ROOM ================= */
export const getRoomById = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id)
    .populate('resort', 'name location');

  if (!room) {
    res.status(404);
    throw new Error('Room not found');
  }

  res.json({ success: true, data: room });
});

/* ================= GET ROOMS BY RESORT ================= */
export const getRoomsByResort = asyncHandler(async (req, res) => {
  const rooms = await Room.find({ resort: req.params.resortId })
    .populate('resort', 'name location')
    .sort({ price: 1 });

  res.json({
    success: true,
    count: rooms.length,
    data: rooms
  });
});

/* ================= CREATE ROOM ================= */
export const createRoom = asyncHandler(async (req, res) => {
  const payload = {
    resort: req.body.resort,
    roomName: req.body.roomName,
    roomType: req.body.roomType,
    description: req.body.description || '',
    size: req.body.size ? Number(req.body.size) : null,
    bedType: req.body.bedType || '',
    maxAdults: Number(req.body.maxAdults),
    maxChildren: Number(req.body.maxChildren || 0),
    price: Number(req.body.price),
    amenities: req.body.amenities || [],
    transportations: req.body.transportations || [],
    images: req.body.images || [],
    availabilityCalendar: req.body.availabilityCalendar || [], // added availability
  };

  const room = await Room.create(payload);

  await ActivityLog.create({
    user: req.user._id,
    action: 'create',
    resource: 'room',
    resourceId: room._id,
    description: `Created room: ${room.roomName}`
  });

  const populatedRoom = await Room.findById(room._id)
    .populate('resort', 'name location');

  res.status(201).json({
    success: true,
    data: populatedRoom
  });
});

/* ================= UPDATE ROOM ================= */
export const updateRoom = asyncHandler(async (req, res) => {
  let room = await Room.findById(req.params.id);

  if (!room) {
    res.status(404);
    throw new Error('Room not found');
  }

  const updatePayload = {
    ...req.body,
    size: req.body.size ? Number(req.body.size) : null,
    maxAdults: Number(req.body.maxAdults),
    maxChildren: Number(req.body.maxChildren || 0),
    price: Number(req.body.price),
    availabilityCalendar: req.body.availabilityCalendar || room.availabilityCalendar, // update availability
  };

  room = await Room.findByIdAndUpdate(
    req.params.id,
    updatePayload,
    { new: true, runValidators: true }
  ).populate('resort', 'name location');

  await ActivityLog.create({
    user: req.user._id,
    action: 'update',
    resource: 'room',
    resourceId: room._id,
    description: `Updated room: ${room.roomName}`
  });

  res.json({ success: true, data: room });
});

/* ================= DELETE ROOM ================= */
export const deleteRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);

  if (!room) {
    res.status(404);
    throw new Error('Room not found');
  }

  await room.deleteOne();

  await ActivityLog.create({
    user: req.user._id,
    action: 'delete',
    resource: 'room',
    resourceId: room._id,
    description: `Deleted room: ${room.roomName}`
  });

  res.json({
    success: true,
    message: 'Room deleted successfully'
  });
});

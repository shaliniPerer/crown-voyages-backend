import asyncHandler from 'express-async-handler';
import Booking from '../models/Booking.js';
import Quotation from '../models/Quotation.js';
import Lead from '../models/Lead.js';
import ActivityLog from '../models/ActivityLog.js';
import { sendEmail } from '../config/email.js';
import { quotationEmailTemplate, bookingConfirmationTemplate } from '../utils/emailTemplates.js';
import { generateQuotationPDF } from '../utils/pdfGenerator.js';

// ========== LEAD MANAGEMENT ==========

// @desc    Get all leads
// @route   GET /api/bookings/leads
// @access  Private
export const getLeads = asyncHandler(async (req, res) => {
  const { status, source } = req.query;
  
  let query = {};
  if (status) query.status = status;
  if (source) query.source = source;

  const leads = await Lead.find(query)
    .populate('interestedIn.resort', 'name location')
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: leads.length,
    data: leads
  });
});

// @desc    Create new lead
// @route   POST /api/bookings/lead
// @access  Private
export const createLead = asyncHandler(async (req, res) => {
  const lead = await Lead.create({
    ...req.body,
    createdBy: req.user._id
  });

  await ActivityLog.create({
    user: req.user._id,
    action: 'create',
    resource: 'lead',
    resourceId: lead._id,
    description: `Created new lead: ${lead.customerName}`
  });

  res.status(201).json({
    success: true,
    data: lead
  });
});

// ========== QUOTATION MANAGEMENT ==========

// @desc    Get all quotations
// @route   GET /api/bookings/quotations
// @access  Private
export const getQuotations = asyncHandler(async (req, res) => {
  const { status } = req.query;
  
  let query = {};
  if (status) query.status = status;

  const quotations = await Quotation.find(query)
    .populate('resort', 'name location starRating')
    .populate('room', 'roomType price')
    .populate('lead', 'customerName')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: quotations.length,
    data: quotations
  });
});

// @desc    Create new quotation
// @route   POST /api/bookings/quotation
// @access  Private
export const createQuotation = asyncHandler(async (req, res) => {
  const quotation = await Quotation.create({
    ...req.body,
    createdBy: req.user._id,
    versions: [{
      version: 1,
      amount: req.body.totalAmount,
      notes: req.body.notes,
      createdAt: new Date()
    }]
  });

  await ActivityLog.create({
    user: req.user._id,
    action: 'create',
    resource: 'quotation',
    resourceId: quotation._id,
    description: `Created quotation ${quotation.quotationNumber} for ${quotation.customerName}`
  });

  const populatedQuotation = await Quotation.findById(quotation._id)
    .populate('resort', 'name location')
    .populate('room', 'roomType');

  res.status(201).json({
    success: true,
    data: populatedQuotation
  });
});

// @desc    Create quotation version
// @route   POST /api/bookings/quotation/:id/version
// @access  Private
export const createQuotationVersion = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findById(req.params.id);

  if (!quotation) {
    res.status(404);
    throw new Error('Quotation not found');
  }

  const newVersion = {
    version: quotation.versions.length + 1,
    amount: req.body.amount,
    notes: req.body.notes,
    createdAt: new Date()
  };

  quotation.versions.push(newVersion);
  quotation.totalAmount = req.body.amount;
  await quotation.save();

  res.json({
    success: true,
    data: quotation
  });
});

// @desc    Update quotation status
// @route   PATCH /api/bookings/quotation/:id/status
// @access  Private
export const updateQuotationStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const quotation = await Quotation.findById(req.params.id);

  if (!quotation) {
    res.status(404);
    throw new Error('Quotation not found');
  }

  quotation.status = status;
  if (status === 'Sent') {
    quotation.sentAt = new Date();
  }
  await quotation.save();

  await ActivityLog.create({
    user: req.user._id,
    action: 'update',
    resource: 'quotation',
    resourceId: quotation._id,
    description: `Updated quotation ${quotation.quotationNumber} status to ${status}`
  });

  res.json({
    success: true,
    data: quotation
  });
});

// @desc    Send quotation via email
// @route   POST /api/bookings/quotation/:id/send-email
// @access  Private
export const sendQuotationEmail = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findById(req.params.id)
    .populate('resort', 'name location')
    .populate('room', 'roomType');

  if (!quotation) {
    res.status(404);
    throw new Error('Quotation not found');
  }

  const emailHtml = quotationEmailTemplate(quotation);

  await sendEmail({
    to: quotation.email,
    subject: `Quotation ${quotation.quotationNumber} - ${quotation.resort.name}`,
    html: emailHtml
  });

  quotation.status = 'Sent';
  quotation.sentAt = new Date();
  await quotation.save();

  await ActivityLog.create({
    user: req.user._id,
    action: 'send_email',
    resource: 'quotation',
    resourceId: quotation._id,
    description: `Sent quotation ${quotation.quotationNumber} to ${quotation.email}`
  });

  res.json({
    success: true,
    message: 'Quotation sent successfully'
  });
});

// @desc    Export quotation as PDF
// @route   GET /api/bookings/quotation/:id/pdf
// @access  Private
export const exportQuotationPDF = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findById(req.params.id)
    .populate('resort', 'name location')
    .populate('room', 'roomType price');

  if (!quotation) {
    res.status(404);
    throw new Error('Quotation not found');
  }

  const pdfBuffer = await generateQuotationPDF(quotation);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=quotation-${quotation.quotationNumber}.pdf`);
  res.send(pdfBuffer);
});

// @desc    Convert quotation to booking
// @route   POST /api/bookings/quotation/:id/convert
// @access  Private
export const convertToBooking = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findById(req.params.id)
    .populate('resort')
    .populate('room');

  if (!quotation) {
    res.status(404);
    throw new Error('Quotation not found');
  }

  if (quotation.status !== 'Accepted') {
    res.status(400);
    throw new Error('Only accepted quotations can be converted to bookings');
  }

  const booking = await Booking.create({
    guestName: quotation.customerName,
    email: quotation.email,
    phone: quotation.phone,
    resort: quotation.resort._id,
    room: quotation.room._id,
    checkIn: quotation.checkIn,
    checkOut: quotation.checkOut,
    adults: quotation.adults,
    children: quotation.children,
    totalAmount: quotation.totalAmount,
    status: 'Confirmed',
    quotation: quotation._id,
    createdBy: req.user._id
  });

  quotation.convertedToBooking = true;
  quotation.booking = booking._id;
  await quotation.save();

  await ActivityLog.create({
    user: req.user._id,
    action: 'convert_quotation',
    resource: 'booking',
    resourceId: booking._id,
    description: `Converted quotation ${quotation.quotationNumber} to booking ${booking.bookingNumber}`
  });

  res.status(201).json({
    success: true,
    data: booking
  });
});

// ========== BOOKING MANAGEMENT ==========

// @desc    Get all bookings
// @route   GET /api/bookings
// @access  Private
export const getBookings = asyncHandler(async (req, res) => {
  const { status, resort, startDate, endDate } = req.query;
  
  let query = {};
  if (status) query.status = status;
  if (resort) query.resort = resort;
  if (startDate && endDate) {
    query.checkIn = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const bookings = await Booking.find(query)
    .populate('resort', 'name location')
    .populate('room', 'roomType price')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: bookings.length,
    data: bookings
  });
});

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
export const getBookingById = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('resort')
    .populate('room')
    .populate('quotation')
    .populate('createdBy', 'name email');

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  res.json({
    success: true,
    data: booking
  });
});

// @desc    Create booking
// @route   POST /api/bookings
// @access  Private
export const createBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.create({
    ...req.body,
    createdBy: req.user._id
  });

  await ActivityLog.create({
    user: req.user._id,
    action: 'create',
    resource: 'booking',
    resourceId: booking._id,
    description: `Created booking ${booking.bookingNumber} for ${booking.guestName}`
  });

  const populatedBooking = await Booking.findById(booking._id)
    .populate('resort', 'name location')
    .populate('room', 'roomType');

  res.status(201).json({
    success: true,
    data: populatedBooking
  });
});

// @desc    Update booking
// @route   PATCH /api/bookings/:id
// @access  Private
export const updateBooking = asyncHandler(async (req, res) => {
  let booking = await Booking.findById(req.params.id);

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  booking = await Booking.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  await ActivityLog.create({
    user: req.user._id,
    action: 'update',
    resource: 'booking',
    resourceId: booking._id,
    description: `Updated booking ${booking.bookingNumber}`
  });

  res.json({
    success: true,
    data: booking
  });
});

// @desc    Delete booking
// @route   DELETE /api/bookings/:id
// @access  Private (Admin only)
export const deleteBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  await booking.deleteOne();

  await ActivityLog.create({
    user: req.user._id,
    action: 'delete',
    resource: 'booking',
    resourceId: booking._id,
    description: `Deleted booking ${booking.bookingNumber}`
  });

  res.json({
    success: true,
    message: 'Booking deleted successfully'
  });
});
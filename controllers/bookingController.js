import asyncHandler from 'express-async-handler';
import Booking from '../models/Booking.js';
import Quotation from '../models/Quotation.js';
import Invoice from '../models/Invoice.js';
import Receipt from '../models/Receipt.js';
import Lead from '../models/Lead.js';
import Room from '../models/Room.js';
import Voucher from '../models/Voucher.js';
import ActivityLog from '../models/ActivityLog.js';
import { sendEmail } from '../config/email.js';
import { quotationEmailTemplate, bookingConfirmationTemplate, voucherEmailTemplate } from '../utils/emailTemplates.js';
import { generateQuotationPDF, generateInvoicePDF, generateReceiptPDF, generateReportPDF, generateVoucherPDF } from '../utils/pdfGenerator.js';

const checkRoomAvailability = async (roomId, checkIn, checkOut, excludeBookingId = null) => {
  const room = await Room.findById(roomId);
  if (!room) return { available: false, message: 'Room not found' };

  const start = new Date(checkIn);
  const end = new Date(checkOut);

  // 1. Check availabilityCalendar (room must be open during this period)
  const isWithinCalendar = room.availabilityCalendar.some(range => {
    return start >= new Date(range.startDate) && end <= new Date(range.endDate);
  });

  if (!isWithinCalendar) {
    return { available: false, message: 'Room is not available for the selected dates based on its availability calendar' };
  }

  // 2. Check existing bookings (room must not be locked by another booking)
  // We check both Booking and Lead (if Lead has dates and is not yet a booking?) 
  // Actually, usually only Confirmed/Pending bookings lock dates.
  const overlappingBooking = await Booking.findOne({
    room: roomId,
    _id: { $ne: excludeBookingId },
    status: { $nin: ['Cancelled', 'No-show'] },
    $or: [
      { checkIn: { $lt: end }, checkOut: { $gt: start } }
    ]
  });

  if (overlappingBooking) {
    return { available: false, message: 'Room is already booked for these dates' };
  }

  return { available: true };
};

// ========== LEAD MANAGEMENT ==========

export const getLeads = asyncHandler(async (req, res) => {
  const { status, source } = req.query;
  
  let query = {};
  if (status) query.status = status;
  if (source) query.source = source;

  // Filter by createdBy for Sales Agent
  if (req.user.role === 'Sales Agent') {
    query.createdBy = req.user._id;
  }

  try {
    const leads = await Lead.find(query)
      .populate('resort', 'name location starRating description amenities mealPlan images')
      .populate('room', 'roomType roomName price description size bedType maxAdults maxChildren amenities images')
      .populate('booking', 'bookingNumber')
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: leads.length,
      data: leads
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching leads',
      error: error.message
    });
  }
});

// @desc    Create new lead
// @route   POST /api/bookings/lead
// @access  Private
export const createLead = asyncHandler(async (req, res) => {
  // Generate Lead ID (LD-XXXX)
  const lastLead = await Lead.findOne().sort({ createdAt: -1 });
  let lastNumber = 0;
  if (lastLead && lastLead.leadNumber) {
    lastNumber = parseInt(lastLead.leadNumber.replace('LD-', ''));
  }
  const leadNumber = `LD-${String(lastNumber + 1).padStart(4, '0')}`;

  // Check room availability
  if (req.body.room && req.body.checkIn && req.body.checkOut) {
    const availability = await checkRoomAvailability(req.body.room, req.body.checkIn, req.body.checkOut);
    if (!availability.available) {
      res.status(400);
      throw new Error(availability.message);
    }
  }

  const lead = await Lead.create({
    ...req.body,
    leadNumber,
    createdBy: req.user._id
  });

  await ActivityLog.create({
    user: req.user._id,
    action: 'create',
    resource: 'lead',
    resourceId: lead._id,
    description: `Created new lead: ${lead.guestName}`
  });

  res.status(201).json({
    success: true,
    data: lead
  });
});

// @desc    Get single lead
// @route   GET /api/bookings/lead/:id
// @access  Private
export const getLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id)
    .populate('resort', 'name location starRating images')
    .populate('room', 'roomType roomName price images')
    .populate('createdBy', 'name');

  if (!lead) {
    res.status(404);
    throw new Error('Lead not found');
  }

  res.json({
    success: true,
    data: lead
  });
});

// @desc    Update lead
// @route   PATCH /api/bookings/lead/:id
// @access  Private
export const updateLead = asyncHandler(async (req, res) => {
  console.log(`🔧 updateLead called with ID: ${req.params.id}`);
  console.log('📦 Request body:', req.body);
  
  let lead = await Lead.findById(req.params.id);

  if (!lead) {
    console.log(`❌ Lead not found with ID: ${req.params.id}`);
    res.status(404);
    throw new Error('Lead not found');
  }

  // Prepare update data - remove empty strings for ObjectId fields
  const updateData = { ...req.body };

  // Check room availability if room/dates are changed
  const roomId = updateData.room || lead.room;
  const checkIn = updateData.checkIn || lead.checkIn;
  const checkOut = updateData.checkOut || lead.checkOut;

  if (roomId && checkIn && checkOut) {
    // Check overlapping bookings excluding this lead's own potential booking
    const availability = await checkRoomAvailability(roomId, checkIn, checkOut, lead.booking);
    if (!availability.available) {
      res.status(400);
      throw new Error(availability.message);
    }
  }
  
  // Convert empty strings to null or undefined for ObjectId fields
  if (updateData.resort === '' || updateData.resort === null) {
    delete updateData.resort;
  }
  if (updateData.room === '' || updateData.room === null) {
    delete updateData.room;
  }

  // Calculate balance if payment fields are being updated
  if (updateData.totalAmount !== undefined || updateData.paidAmount !== undefined) {
    const totalAmount = updateData.totalAmount !== undefined ? updateData.totalAmount : lead.totalAmount;
    const paidAmount = updateData.paidAmount !== undefined ? updateData.paidAmount : (lead.paidAmount || 0);
    updateData.balance = totalAmount - paidAmount;
  }

  console.log('✏️ Updating lead with data:', updateData);
  
  try {
    lead = await Lead.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: false } // Disable validators to allow partial updates
    )
      .populate('resort', 'name location starRating images')
      .populate('room', 'roomType roomName price images');

    console.log('✅ Lead updated successfully');

    await ActivityLog.create({
      user: req.user._id,
      action: 'update',
      resource: 'lead',
      resourceId: lead._id,
      description: `Updated lead: ${lead.guestName}`
    });

    // Sync with Booking if exists
    if (lead.booking) {
      const bookingDoc = await Booking.findById(lead.booking);
      if (bookingDoc) {
        // Sync relevant fields
        bookingDoc.totalAmount = lead.totalAmount;
        bookingDoc.paidAmount = lead.paidAmount;
        // status sync might be tricky, but let's sync finances
        await bookingDoc.save();
      }
    }

    res.json({
      success: true,
      data: lead
    });
  } catch (error) {
    console.error('❌ Error updating lead:', error.message);
    throw error;
  }
});

// @desc    Delete lead
// @route   DELETE /api/bookings/lead/:id
// @access  Private/Admin
export const deleteLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);

  if (!lead) {
    res.status(404);
    throw new Error('Lead not found');
  }

  await lead.deleteOne();

  await ActivityLog.create({
    user: req.user._id,
    action: 'delete',
    resource: 'lead',
    resourceId: lead._id,
    description: `Deleted lead: ${lead.guestName}`
  });

  res.json({
    success: true,
    message: 'Lead deleted successfully'
  });
});

// ========== QUOTATION MANAGEMENT ==========

// @desc    Get all quotations
// @route   GET /api/bookings/quotations
// @access  Private
export const getQuotations = asyncHandler(async (req, res) => {
  const { status, lead } = req.query;
  
  let query = {};
  if (status) query.status = status;
  if (lead) query.lead = lead;

  // Filter by createdBy for Sales Agent
  if (req.user.role === 'Sales Agent') {
    query.createdBy = req.user._id;
  }

  const quotations = await Quotation.find(query)
    .populate('resort', 'name location starRating')
    .populate('room', 'roomType price')
    .populate('createdBy', 'name')
    .populate({
      path: 'lead',
      select: 'customerName booking leadNumber', 
      populate: { path: 'booking', select: 'bookingNumber' }
    })
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
  console.log('📋 Creating quotation with data:', req.body);
  
  const {
    customerName,
    email,
    phone,
    amount,
    discountValue = 0,
    finalAmount,
    validUntil,
    notes,
    terms,
    lead: leadId,
    booking: bookingId,
    sendEmail: shouldSendEmail
  } = req.body;

  // Validate required fields
  const missingFields = [];
  if (!customerName) missingFields.push('customerName');
  if (!email) missingFields.push('email');
  if (amount === undefined || amount === null) missingFields.push('amount');
  if (finalAmount === undefined || finalAmount === null) missingFields.push('finalAmount');

  if (missingFields.length > 0) {
    res.status(400);
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  // Generate quotation number
  const lastQuotation = await Quotation.findOne().sort({ createdAt: -1 });
  let lastNumber = 0;
  if (lastQuotation?.quotationNumber) {
    // Extract the last 6 digits if in QT-000001 format, or any trailing digits
    const match = lastQuotation.quotationNumber.match(/(\d{6})$/);
    if (match) {
      lastNumber = parseInt(match[1], 10);
    } else {
      // fallback: extract any digits
      const digits = lastQuotation.quotationNumber.replace(/\D/g, '');
      lastNumber = digits ? parseInt(digits, 10) : 0;
    }
  }
  const quotationNumber = `QT-${String(lastNumber + 1).padStart(6, '0')}`;

  const quotation = await Quotation.create({
    quotationNumber,
    customerName,
    email,
    phone,
    amount,
    discountValue,
    finalAmount,
    validUntil,
    notes,
    terms,
    lead: leadId,
    booking: bookingId,
    status: 'Draft',
    createdBy: req.user._id,
    versions: [{
      version: 1,
      amount: finalAmount,
      notes,
      createdAt: new Date()
    }]
  });

  console.log('✅ Quotation created:', quotation._id);

  await ActivityLog.create({
    user: req.user._id,
    action: 'create',
    resource: 'quotation',
    resourceId: quotation._id,
    description: `Created quotation ${quotationNumber} for ${customerName}`
  });

  // Update lead status and total amount to match quotation
  if (leadId) {
    const leadDoc = await Lead.findById(leadId);
    if (leadDoc) {
      leadDoc.status = 'Quotation';
      leadDoc.totalAmount = finalAmount;
      // balance is updated in pre-save hook
      await leadDoc.save();
    }
  }

  // Populate quotation with full lead details including savedBookings and passengerDetails
  const populatedQuotation = await Quotation.findById(quotation._id)
    .populate({
      path: 'lead',
      populate: [
        { path: 'resort', select: 'name location starRating description amenities mealPlan images' },
        { path: 'room', select: 'roomType roomName price description size bedType maxAdults maxChildren amenities images' }
      ]
    });

  // Generate and send PDF if requested
  if (shouldSendEmail) {
    try {
      console.log('📧 Generating PDF and sending email...');
      
      // Import PDF generator and email functions
      const { generateQuotationPDF } = await import('../utils/pdfGenerator.js');
      const { sendEmail } = await import('../config/email.js');
      
      // Generate PDF
      const pdfBuffer = await generateQuotationPDF(populatedQuotation);
      
      // Send email with PDF attachment
      await sendEmail({
        to: email,
        subject: `Your Travel Quotation ${quotationNumber} - Crown Voyages`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: #D4AF37; margin: 0; font-size: 28px;">CROWN VOYAGES</h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px;">Luxury Travel & Resort Management</p>
            </div>
            
            <div style="background-color: #ffffff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <h2 style="color: #1a1a2e; margin-top: 0;">Dear ${customerName},</h2>
              
              <p style="color: #333; line-height: 1.6;">Thank you for your interest in our luxury travel services.</p>
              
              <p style="color: #333; line-height: 1.6;">Please find attached your personalized travel quotation <strong style="color: #D4AF37;">${quotationNumber}</strong> with comprehensive details of your selected properties, rooms, and pricing.</p>
              
              <div style="background-color: #f8f9fa; border-left: 4px solid #D4AF37; padding: 15px; margin: 20px 0;">
                <h3 style="color: #1a1a2e; margin-top: 0; font-size: 16px;">Quotation Highlights:</h3>
                <ul style="color: #666; line-height: 1.8; margin: 10px 0;">
                  <li>Original Price: <strong>$${amount.toFixed(2)}</strong></li>
                  ${discountValue > 0 ? `<li style="color: #2e7d32;">Discount: <strong>-$${discountValue.toFixed(2)}</strong></li>` : ''}
                  <li style="color: #D4AF37; font-size: 18px;">Final Amount: <strong>$${finalAmount.toFixed(2)}</strong></li>
                  ${validUntil ? `<li>Valid Until: <strong>${new Date(validUntil).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong></li>` : ''}
                </ul>
              </div>
              
              <p style="color: #333; line-height: 1.6;">The attached PDF contains:</p>
              <ul style="color: #666; line-height: 1.8;">
                <li>Complete property and room details with images</li>
                <li>Passenger information</li>
                <li>Detailed pricing breakdown</li>
                <li>Terms and conditions</li>
              </ul>
              
              <p style="color: #333; line-height: 1.6;">Should you have any questions or wish to proceed with the booking, please don't hesitate to contact us.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="mailto:info@crownvoyages.com" style="display: inline-block; background-color: #D4AF37; color: #1a1a2e; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Contact Us</a>
              </div>
              
              <p style="color: #333; line-height: 1.6;">We look forward to making your travel dreams a reality!</p>
              
              <p style="color: #666; margin-top: 30px;">
                Best regards,<br>
                <strong style="color: #D4AF37;">Crown Voyages Team</strong>
              </p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
              <p>Email: info@crownvoyages.com | Phone: +1 (555) 123-4567</p>
              <p>www.crownvoyages.com</p>
            </div>
          </div>
        `,
        attachments: [{
          filename: `Quotation_${quotationNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }]
      });
      
      console.log('✅ Quotation email sent successfully');
    } catch (emailError) {
      console.error('❌ Error sending quotation email:', emailError);
      // Don't fail the request if email fails
    }
  }

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
    .populate('lead');

  if (!quotation) {
    res.status(404);
    throw new Error('Quotation not found');
  }

  const emailHtml = quotationEmailTemplate(quotation);

  try {
    await sendEmail({
      to: quotation.email,
      subject: `Quotation ${quotation.quotationNumber} - Crown Voyages`,
      html: emailHtml
    });
  } catch (emailError) {
    console.warn(`⚠️ Email sending skipped: ${emailError.message}`);
    // Continue without throwing error for email failures
  }

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
    .populate('room', 'roomType price')
    .populate({
      path: 'lead',
      populate: { path: 'booking', select: 'bookingNumber' }
    });

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

  // Check room availability
  if (quotation.room && quotation.checkIn && quotation.checkOut) {
    const availability = await checkRoomAvailability(quotation.room._id, quotation.checkIn, quotation.checkOut);
    if (!availability.available) {
      res.status(400);
      throw new Error(availability.message);
    }
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

  // Update Lead with Booking reference and sync price
  if (quotation.lead) {
    const leadDoc = await Lead.findById(quotation.lead);
    if (leadDoc) {
      leadDoc.booking = booking._id;
      leadDoc.status = 'Converted';
      leadDoc.totalAmount = quotation.totalAmount;
      // balance is updated in pre-save hook
      await leadDoc.save();
    }
  }

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

  // Filter by createdBy for Sales Agent
  if (req.user.role === 'Sales Agent') {
    query.createdBy = req.user._id;
  }

  const bookings = await Booking.find(query)
    .populate('resort', 'name location starRating images')
    .populate('room', 'roomType roomName price images')
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
    .populate('resort', 'name location starRating images')
    .populate('room', 'roomType roomName price images')
    .populate('quotation')
    .populate('createdBy', 'name email');

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  // Check if Sales Agent is authorized to view this booking
  if (req.user.role === 'Sales Agent') {
    const creatorId = booking.createdBy?._id ? booking.createdBy._id.toString() : booking.createdBy?.toString();
    if (creatorId !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to view this booking');
    }
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
  // Check room availability
  if (req.body.room && req.body.checkIn && req.body.checkOut) {
    const availability = await checkRoomAvailability(req.body.room, req.body.checkIn, req.body.checkOut);
    if (!availability.available) {
      res.status(400);
      throw new Error(availability.message);
    }
  }

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

  // Prepare update data
  const updateData = { ...req.body };

  // Check room availability if room/dates are changed
  const roomId = updateData.room || booking.room;
  const checkIn = updateData.checkIn || booking.checkIn;
  const checkOut = updateData.checkOut || booking.checkOut;

  if (roomId && checkIn && checkOut) {
    const availability = await checkRoomAvailability(roomId, checkIn, checkOut, booking._id);
    if (!availability.available) {
      res.status(400);
      throw new Error(availability.message);
    }
  }
  
  // Calculate balance if payment fields are being updated
  if (updateData.totalAmount !== undefined || updateData.paidAmount !== undefined) {
    const totalAmount = updateData.totalAmount !== undefined ? updateData.totalAmount : booking.totalAmount;
    const paidAmount = updateData.paidAmount !== undefined ? updateData.paidAmount : (booking.paidAmount || 0);
    updateData.balance = totalAmount - paidAmount;
  }

  booking = await Booking.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  )
    .populate('resort', 'name location starRating images')
    .populate('room', 'roomType roomName price images');

  await ActivityLog.create({
    user: req.user._id,
    action: 'update',
    resource: 'booking',
    resourceId: booking._id,
    description: `Updated booking ${booking.bookingNumber}`
  });

  // Sync with Lead if exists
  const leadDoc = await Lead.findOne({ booking: booking._id });
  if (leadDoc) {
    leadDoc.totalAmount = booking.totalAmount;
    leadDoc.paidAmount = booking.paidAmount;
    await leadDoc.save();
  }

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

// @desc    Get all invoices
// @route   GET /api/bookings/invoices
// @access  Private
export const getInvoices = asyncHandler(async (req, res) => {
  const { lead } = req.query;
  const query = {};
  if (lead) query.lead = lead;

  // Filter by createdBy for Sales Agent
  if (req.user.role === 'Sales Agent') {
    query.createdBy = req.user._id;
  }

  const invoices = await Invoice.find(query)
    .populate('createdBy', 'name')
    .populate({
      path: 'lead',
      populate: { path: 'booking', select: 'bookingNumber' }
    })
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: invoices
  });
});

// @desc    Create invoice
// @route   POST /api/bookings/invoice
// @access  Private
export const createInvoice = asyncHandler(async (req, res) => {
  console.log('📄 Creating invoice with data:', req.body);
  
  const {
    customerName,
    email,
    phone,
    amount, // This will be treated as totalNetAmount
    totalNetAmount,
    greenTax = 0,
    tgst = 0,
    discountValue = 0,
    finalAmount,
    dueDate,
    notes,
    lead,
    booking
  } = req.body;

  // Validate required fields
  const missingFields = [];
  if (!customerName) missingFields.push('customerName');
  if (!email) missingFields.push('email');
  if (amount === undefined && totalNetAmount === undefined) missingFields.push('amount');
  if (finalAmount === undefined || finalAmount === null) missingFields.push('finalAmount');

  if (missingFields.length > 0) {
    res.status(400);
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  // Generate invoice number
  const lastInvoice = await Invoice.findOne().sort({ createdAt: -1 });
  const lastNumber = lastInvoice?.invoiceNumber 
    ? parseInt(lastInvoice.invoiceNumber.replace('INV-', '')) 
    : 0;
  const invoiceNumber = `INV-${String(lastNumber + 1).padStart(6, '0')}`;

  const invoice = await Invoice.create({
    invoiceNumber,
    customerName,
    email,
    phone,
    amount: totalNetAmount || amount,
    totalNetAmount: totalNetAmount || amount,
    greenTax,
    tgst,
    discountValue,
    finalAmount,
    dueDate,
    notes,
    lead,
    booking,
    status: 'Draft',
    createdBy: req.user._id
  });

  console.log('✅ Invoice created:', invoice._id);

  await ActivityLog.create({
    user: req.user._id,
    action: 'create',
    resource: 'invoice',
    resourceId: invoice._id,
    description: `Created invoice ${invoiceNumber} for ${customerName}`
  });

  // Update lead status and total amount to match invoice
  if (lead) {
    const leadDoc = await Lead.findById(lead);
    if (leadDoc) {
      leadDoc.status = 'Invoice';
      leadDoc.totalAmount = finalAmount;
      // balance is updated in pre-save hook
      await leadDoc.save();
    }
  }

  const populatedInvoice = await Invoice.findById(invoice._id).populate('lead');

  res.status(201).json({
    success: true,
    data: populatedInvoice
  });
});

// @desc    Get reports (invoice, receipt, quotation)
// @route   GET /api/bookings/reports
// @access  Private
export const getReports = asyncHandler(async (req, res) => {
  const { type, period } = req.query;

  // Calculate date range based on period
  const now = new Date();
  let startDate = new Date();
  const endDate = now;

  if (period === 'daily') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === 'weekly') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    startDate = new Date(now.setDate(diff));
    startDate.setHours(0, 0, 0, 0);
  } else if (period === 'monthly') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === 'annually') {
    startDate = new Date(now.getFullYear(), 0, 1);
  } else {
    // Default to monthly
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  let data = [];
  let model;

  if (type === 'invoice') {
    model = Invoice;
  } else if (type === 'receipt') {
    model = Receipt;
  } else if (type === 'quotation') {
    model = Quotation;
  } else {
    res.status(400);
    throw new Error('Invalid report type');
  }

  // Find documents within range
  const documents = await model.find({
    createdAt: { $gte: startDate, $lte: endDate }
  })
    .sort({ createdAt: -1 });

  const reportTitle = `${type.charAt(0).toUpperCase() + type.slice(1)} Report`;

  const pdfBuffer = await generateReportPDF(reportTitle, documents, { period, type });

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${type}-report-${period}.pdf"`,
    'Content-Length': pdfBuffer.length
  });

  res.send(pdfBuffer);
});

// @desc    Get receipts
// @route   GET /api/bookings/receipts
// @access  Private
export const getReceipts = asyncHandler(async (req, res) => {
  const { lead } = req.query;
  const query = {};
  if (lead) query.lead = lead;

  // Filter by createdBy for Sales Agent
  if (req.user.role === 'Sales Agent') {
    query.createdBy = req.user._id;
  }

  const receipts = await Receipt.find(query)
    .populate('createdBy', 'name')
    .populate({
      path: 'lead',
      populate: { path: 'booking', select: 'bookingNumber' }
    })
    .populate('invoice', 'invoiceNumber finalAmount')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: receipts
  });
});

// @desc    Create receipt
// @route   POST /api/bookings/receipt
// @access  Private
export const createReceipt = asyncHandler(async (req, res) => {
  console.log('🧾 Creating receipt with data:', req.body);
  
  const {
    customerName,
    email,
    phone,
    amount,
    discountValue = 0,
    finalAmount,
    bookingTotal,
    remainingBalance,
    paymentMethod = 'Cash',
    notes,
    lead,
    booking,
    invoice
  } = req.body;

  // Validate required fields
  const missingFields = [];
  if (!customerName) missingFields.push('customerName');
  if (!email) missingFields.push('email');
  if (amount === undefined || amount === null) missingFields.push('amount');
  if (finalAmount === undefined || finalAmount === null) missingFields.push('finalAmount');

  if (missingFields.length > 0) {
    res.status(400);
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  // Generate receipt number safely
  const lastReceipt = await Receipt.findOne().sort({ createdAt: -1 });
  let lastNumber = 0;
  if (lastReceipt && lastReceipt.receiptNumber) {
    const parsed = parseInt(lastReceipt.receiptNumber.replace('REC-', ''));
    if (!isNaN(parsed)) {
      lastNumber = parsed;
    }
  }
  const receiptNumber = `REC-${String(lastNumber + 1).padStart(6, '0')}`;
  console.log('📝 Generated Receipt Number:', receiptNumber);

  let receipt;
  try {
    receipt = await Receipt.create({
      receiptNumber,
      customerName,
      email,
      phone,
      amount,
      discountValue,
      finalAmount,
      bookingTotal: bookingTotal || amount,
      remainingBalance: remainingBalance || 0,
      paymentMethod,
      notes,
      lead,
      booking,
      invoice,
      status: 'Received',
      createdBy: req.user._id
    });
  } catch (error) {
    console.error('❌ Error creating receipt document:', error);
    // Format mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      res.status(400);
      throw new Error(`Receipt Validation Failed: ${messages.join(', ')}`);
    } else if (error.code === 11000) {
      res.status(400); 
      throw new Error(`Duplicate receipt number: ${receiptNumber}`);
    }
    throw error;
  }

  console.log('✅ Receipt created:', receipt._id);

  await ActivityLog.create({
    user: req.user._id,
    action: 'create',
    resource: 'receipt',
    resourceId: receipt._id,
    description: `Created receipt ${receiptNumber} for ${customerName}`
  });

  // Update lead status and balance
  if (lead) {
    const leadDoc = await Lead.findById(lead);
    if (leadDoc) {
      // Update total amount if changed in specific receipt
      if (bookingTotal !== undefined && bookingTotal !== null) {
        leadDoc.totalAmount = bookingTotal;
      }

      // Update paid amount and balance
      leadDoc.paidAmount = (leadDoc.paidAmount || 0) + finalAmount;
      // Balance is updated in pre-save hook
      
      // Update status
      if (leadDoc.paidAmount >= leadDoc.totalAmount) {
        leadDoc.status = 'Confirmed';
      } else {
        leadDoc.status = 'Receipt';
      }
      
      const updatedLead = await leadDoc.save();
      console.log(`✅ Lead ${leadDoc.leadNumber} updated. Status: ${updatedLead.status}, Total: ${leadDoc.totalAmount}, Paid: ${leadDoc.paidAmount}, Balance: ${leadDoc.balance}`);

      // Sync with Booking if exists
      if (updatedLead.booking || booking) {
        const bookingId = updatedLead.booking || booking;
        const bookingDoc = await Booking.findById(bookingId);
        if (bookingDoc) {
          bookingDoc.paidAmount = updatedLead.paidAmount;
          bookingDoc.totalAmount = updatedLead.totalAmount;
          // bookingDoc.balance is updated in pre-save hook
          await bookingDoc.save();
          console.log(`✅ Linked Booking updated: ${bookingDoc.bookingNumber}`);
        }
      }
      
      // Update the receipt's remaining balance snapshot to be accurate
      receipt.remainingBalance = updatedLead.balance;
      receipt.bookingTotal = updatedLead.totalAmount;
      receipt.finalAmount = finalAmount; // Explicitly ensure this is correct
      await receipt.save();
    }
  }

  // Update invoice if linked
  if (invoice) {
    const linkedInvoice = await Invoice.findById(invoice);
    if (linkedInvoice) {
      linkedInvoice.paidAmount = (linkedInvoice.paidAmount || 0) + finalAmount;
      // Balance is updated in pre-validate hook of Invoice model
      if (linkedInvoice.paidAmount >= linkedInvoice.finalAmount) {
        linkedInvoice.status = 'Paid';
      } else if (linkedInvoice.paidAmount > 0) {
        linkedInvoice.status = 'Partial';
      }
      await linkedInvoice.save();
      
      // Update the receipt's remaining balance snapshot again if it was an invoice-specific receipt
      // This is more accurate if the receipt was meant to pay off a specific invoice
      receipt.remainingBalance = linkedInvoice.balance;
      await receipt.save();

      console.log(`✅ Linked Invoice ${linkedInvoice.invoiceNumber} updated. New balance: ${linkedInvoice.balance}`);
      
      // Also update lead status if the invoice is partial
      if (lead && linkedInvoice.status === 'Partial') {
         const lDoc = await Lead.findById(lead);
         if (lDoc) {
           lDoc.status = 'Receipt';
           await lDoc.save();
         }
      }
    }
  }

  const populatedReceipt = await Receipt.findById(receipt._id).populate('lead');

  res.status(201).json({
    success: true,
    data: populatedReceipt
  });
});

// @desc    Send invoice email
// @route   POST /api/bookings/invoice/:id/send-email
// @access  Private
export const sendInvoiceEmail = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id).populate('lead');

  if (!invoice) {
    res.status(404);
    throw new Error('Invoice not found');
  }

  // Generate PDF
  const pdfBuffer = await generateInvoicePDF(invoice);

  const customerName = invoice.customerName || 'Valued Client';
  const invoiceNumber = invoice.invoiceNumber;
  const amount = invoice.finalAmount;
  const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Due on Receipt';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
      <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: #D4AF37; margin: 0; font-size: 28px;">CROWN VOYAGES</h1>
        <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px;">Luxury Travel & Resort Management</p>
      </div>
      
      <div style="background-color: #ffffff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <h2 style="color: #1a1a2e; margin-top: 0;">Dear ${customerName},</h2>
        
        <p style="color: #333; line-height: 1.6;">Please find attached invoice <strong style="color: #D4AF37;">${invoiceNumber}</strong> for your upcoming travel.</p>
        
        <div style="background-color: #f8f9fa; border-left: 4px solid #D4AF37; padding: 15px; margin: 20px 0;">
          <h3 style="color: #1a1a2e; margin-top: 0; font-size: 16px;">Invoice Summary:</h3>
          <ul style="color: #666; line-height: 1.8; margin: 10px 0;">
            <li>Invoice Number: <strong>${invoiceNumber}</strong></li>
            <li>Due Date: <strong>${dueDate}</strong></li>
            <li style="color: #D4AF37; font-size: 18px;">Total Amount: <strong>$${amount.toFixed(2)}</strong></li>
          </ul>
        </div>
        
        <p style="color: #333; line-height: 1.6;">The attached PDF contains complete details of charges and payment instructions.</p>
        
        <p style="color: #333; line-height: 1.6;">If you have any questions regarding this invoice, please do not hesitate to contact us.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="mailto:info@crownvoyages.com" style="display: inline-block; background-color: #D4AF37; color: #1a1a2e; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Contact Finance Team</a>
        </div>
        
        <p style="color: #666; margin-top: 30px;">
          Best regards,<br>
          <strong style="color: #D4AF37;">Crown Voyages Team</strong>
        </p>
      </div>
      
      <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
        <p>Email: info@crownvoyages.com | Phone: +1 (555) 123-4567</p>
        <p>www.crownvoyages.com</p>
      </div>
    </div>
  `;

  try {
    await sendEmail({
      to: invoice.email,
      subject: `Invoice ${invoice.invoiceNumber} - Crown Voyages`,
      html: html,
      attachments: [{
        filename: `Invoice_${invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    });
  } catch (emailError) {
    console.warn(`⚠️ Email sending skipped: ${emailError.message}`);
    // Continue without throwing error for email failures
  }

  invoice.status = 'Sent';
  invoice.sentAt = new Date();
  await invoice.save();

  await ActivityLog.create({
    user: req.user._id,
    action: 'send_email',
    resource: 'invoice',
    resourceId: invoice._id,
    description: `Sent invoice ${invoice.invoiceNumber} to ${invoice.email}`
  });

  res.json({
    success: true,
    message: 'Invoice marked as sent successfully'
  });
});

// @desc    Send receipt email
// @route   POST /api/bookings/receipt/:id/send-email
// @access  Private
export const sendReceiptEmail = asyncHandler(async (req, res) => {
  const receipt = await Receipt.findById(req.params.id)
    .populate({
      path: 'invoice',
      populate: { path: 'booking' }
    })
    .populate('booking')
    .populate('lead');

  if (!receipt) {
    res.status(404);
    throw new Error('Receipt not found');
  }

  // Generate PDF
  const pdfBuffer = await generateReceiptPDF(receipt);

  const customerName = receipt.customerName || 'Valued Client';
  const receiptNumber = receipt.receiptNumber;
  const amount = receipt.finalAmount;
  const paymentDate = new Date(receipt.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
      <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: #D4AF37; margin: 0; font-size: 28px;">CROWN VOYAGES</h1>
        <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px;">Luxury Travel & Resort Management</p>
      </div>
      
      <div style="background-color: #ffffff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <h2 style="color: #1a1a2e; margin-top: 0;">Dear ${customerName},</h2>
        
        <p style="color: #333; line-height: 1.6;">Thank you for your payment. We have successfully received your transaction.</p>
        
        <div style="background-color: #f8f9fa; border-left: 4px solid #D4AF37; padding: 15px; margin: 20px 0;">
          <h3 style="color: #1a1a2e; margin-top: 0; font-size: 16px;">Receipt Summary:</h3>
          <ul style="color: #666; line-height: 1.8; margin: 10px 0;">
            <li>Receipt Number: <strong>${receiptNumber}</strong></li>
            <li>Date: <strong>${paymentDate}</strong></li>
            <li>Method: <strong>${receipt.paymentMethod || 'Cash'}</strong></li>
            <li style="color: #D4AF37; font-size: 18px;">Amount Paid: <strong>$${amount.toFixed(2)}</strong></li>
          </ul>
        </div>
        
        <p style="color: #333; line-height: 1.6;">Please find attached the official receipt for your records.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="mailto:info@crownvoyages.com" style="display: inline-block; background-color: #D4AF37; color: #1a1a2e; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Contact Us</a>
        </div>
        
        <p style="color: #666; margin-top: 30px;">
          Best regards,<br>
          <strong style="color: #D4AF37;">Crown Voyages Team</strong>
        </p>
      </div>
      
      <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
        <p>Email: info@crownvoyages.com | Phone: +1 (555) 123-4567</p>
        <p>www.crownvoyages.com</p>
      </div>
    </div>
  `;

  try {
    await sendEmail({
      to: receipt.email,
      subject: `Receipt ${receipt.receiptNumber} - Crown Voyages`,
      html: html,
      attachments: [{
        filename: `Receipt_${receiptNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    });
  } catch (emailError) {
    console.warn(`⚠️ Email sending skipped: ${emailError.message}`);
    // Continue without throwing error for email failures
  }

  receipt.sentAt = new Date();
  await receipt.save();

  await ActivityLog.create({
    user: req.user._id,
    action: 'send_email',
    resource: 'receipt',
    resourceId: receipt._id,
    description: `Sent receipt ${receipt.receiptNumber} to ${receipt.email}`
  });

  res.json({
    success: true,
    message: 'Receipt sent successfully'
  });
});

// @desc    Export invoice as PDF
// @route   GET /api/bookings/invoice/:id/pdf
// @access  Private
export const exportInvoicePDF = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id)
    .populate({
      path: 'lead',
      populate: [
        { path: 'resort', select: 'name location' },
        { path: 'room', select: 'roomType roomName' },
        { path: 'booking', select: 'bookingNumber' }
      ]
    })
    .populate('booking');

  if (!invoice) {
    res.status(404);
    throw new Error('Invoice not found');
  }

  const pdfBuffer = await generateInvoicePDF(invoice);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`);
  res.send(pdfBuffer);
});

// @desc    Export receipt as PDF
// @route   GET /api/bookings/receipt/:id/pdf
// @access  Private
export const exportReceiptPDF = asyncHandler(async (req, res) => {
  const receipt = await Receipt.findById(req.params.id)
    .populate({
      path: 'invoice',
      populate: { path: 'booking' }
    })
    .populate('booking')
    .populate('lead');

  if (!receipt) {
    res.status(404);
    throw new Error('Receipt not found');
  }

  const pdfBuffer = await generateReceiptPDF(receipt);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=receipt-${receipt.receiptNumber}.pdf`);
  res.send(pdfBuffer);
});

// @desc    Get all vouchers
// @route   GET /api/bookings/vouchers
// @access  Private
export const getVouchers = asyncHandler(async (req, res) => {
  const { leadId, bookingId } = req.query;
  let query = {};
  if (leadId) query.lead = leadId;
  if (bookingId) query.booking = bookingId;

  // Filter by createdBy for Sales Agent
  if (req.user.role === 'Sales Agent') {
    query.createdBy = req.user._id;
  }

  const vouchers = await Voucher.find(query)
    .populate('lead', 'leadNumber guestName')
    .populate('booking', 'bookingNumber guestName')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: vouchers.length,
    data: vouchers
  });
});

// @desc    Create new voucher
// @route   POST /api/bookings/voucher
// @access  Private
export const createVoucher = asyncHandler(async (req, res) => {
  const { lead, booking, customerName, email, phone, resortName, roomName, checkIn, checkOut } = req.body;

  // Basic validation
  if (!customerName || !email) {
    res.status(400);
    throw new Error('Customer name and email are required');
  }

  try {
    const voucherData = {
      customerName,
      email,
      phone: phone || 'N/A',
      resortName: resortName || 'N/A',
      roomName: roomName || 'N/A',
      createdBy: req.user._id
    };

    // Robust ID clean up: only include if they look like a valid MongoDB ObjectId
    const isValidObjectId = (id) => id && id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id);

    if (isValidObjectId(lead)) voucherData.lead = lead;
    if (isValidObjectId(booking)) voucherData.booking = booking;

    // Safely handle dates
    if (checkIn && checkIn !== '') {
      const dIn = new Date(checkIn);
      if (!isNaN(dIn.getTime())) voucherData.checkIn = dIn;
    }
    
    if (checkOut && checkOut !== '') {
      const dOut = new Date(checkOut);
      if (!isNaN(dOut.getTime())) voucherData.checkOut = dOut;
    }

    const voucher = await Voucher.create(voucherData);

    await ActivityLog.create({
      user: req.user._id,
      action: 'create',
      resource: 'voucher',
      resourceId: voucher._id,
      description: `Created voucher ${voucher.voucherNumber} for ${customerName}`
    });

    res.status(201).json({
      success: true,
      data: voucher
    });
  } catch (error) {
    console.error('SERVER ERROR (Voucher Creation):', error);
    
    let message = 'Voucher creation failed';
    if (error.name === 'ValidationError') {
      message = Object.values(error.errors).map(val => val.message).join(', ');
    } else if (error.code === 11000) {
      message = 'Duplicate voucher number generated. Please try again.';
    } else {
      message = error.message;
    }

    res.status(400).json({
      success: false,
      message: message
    });
  }
});

// @desc    Export voucher as PDF
// @route   GET /api/bookings/voucher/:id/pdf
// @access  Private
export const exportVoucherPDF = asyncHandler(async (req, res) => {
  // First try to find as a Voucher directly
  let booking = await Voucher.findById(req.params.id)
    .populate({
      path: 'lead',
      populate: [
        { path: 'resort' },
        { path: 'room' }
      ]
    })
    .populate({
      path: 'booking',
      populate: [
        { path: 'resort' },
        { path: 'room' }
      ]
    });

  // Fallback: Lead
  if (!booking) {
    booking = await Lead.findById(req.params.id)
      .populate('resort', 'name location images description')
      .populate('room', 'roomName roomType images description size bedType')
      .populate('booking', 'bookingNumber');
  }

  // Fallback: Booking
  if (!booking) {
    booking = await Booking.findById(req.params.id)
      .populate('resort', 'name location images description')
      .populate('room', 'roomName roomType images description size bedType');
  }

  if (!booking) {
    res.status(404);
    throw new Error('Voucher, Lead or Booking not found');
  }

  // Normalize for PDF generator
  let pdfData = booking.toObject ? booking.toObject() : booking;

  // If it's a Voucher document or any document from a voucher creation flow
  if (pdfData.customerName) {
    const sourceData = pdfData.lead || pdfData.booking || {};
    pdfData = {
      ...pdfData,
      guestName: pdfData.customerName || sourceData.guestName,
      phone: pdfData.phone || sourceData.phone || 'N/A',
      resort: { 
        name: pdfData.resortName || (sourceData.resort && sourceData.resort.name) || sourceData.resortName || 'N/A',
        location: (sourceData.resort && sourceData.resort.location) || 'N/A'
      },
      room: { 
        roomName: pdfData.roomName || (sourceData.room && sourceData.room.roomName) || sourceData.roomName || 'N/A',
        roomType: (sourceData.room && sourceData.room.roomType) || 'N/A'
      },
      bookingNumber: pdfData.voucherNumber || sourceData.bookingNumber || sourceData.leadNumber || 'N/A',
      checkIn: pdfData.checkIn || sourceData.checkIn,
      checkOut: pdfData.checkOut || sourceData.checkOut,
      adults: sourceData.adults || pdfData.adults || 0,
      children: sourceData.children || pdfData.children || 0,
      rooms: sourceData.rooms || pdfData.rooms || 1,
      mealPlan: sourceData.mealPlan || pdfData.mealPlan || 'N/A',
      passengerDetails: sourceData.passengerDetails || [],
      nationality: sourceData.nationality || 'N/A',
      specialRequests: sourceData.specialRequests || pdfData.specialRequests || 'N/A',
      resortRefNumber: sourceData.resortRefNumber || '',
      ourRefNumber: sourceData.ourRefNumber || sourceData.bookingNumber || sourceData.leadNumber || '',
    };
  }

  const pdfBuffer = await generateVoucherPDF(pdfData);

  res.setHeader('Content-Type', 'application/pdf');
  const filename = pdfData.voucherNumber || pdfData.bookingNumber || pdfData.leadNumber || 'voucher';
  res.setHeader('Content-Disposition', `attachment; filename=voucher-${filename}.pdf`);
  res.send(pdfBuffer);
});

// @desc    Send voucher as email
// @route   POST /api/bookings/voucher/:id/send
// @access  Private
export const sendVoucherEmail = asyncHandler(async (req, res) => {
  // First try to find as a Voucher directly (standard case)
  let booking = await Voucher.findById(req.params.id)
    .populate({
      path: 'lead',
      populate: [
        { path: 'resort' },
        { path: 'room' }
      ]
    })
    .populate({
      path: 'booking',
      populate: [
        { path: 'resort' },
        { path: 'room' }
      ]
    });

  // Fallback: search as Lead
  if (!booking) {
    booking = await Lead.findById(req.params.id)
      .populate('resort', 'name location images description')
      .populate('room', 'roomName roomType images description size bedType')
      .populate('booking', 'bookingNumber');
  }

  // Fallback: search as Booking
  if (!booking) {
    booking = await Booking.findById(req.params.id)
      .populate('resort', 'name location images description')
      .populate('room', 'roomName roomType images description size bedType');
  }

  if (!booking) {
    res.status(404);
    throw new Error('Voucher, Lead or Booking not found');
  }

  // Normalize for PDF generator
  let pdfData = booking.toObject ? booking.toObject() : booking;

  // If we found a Voucher or related document, normalize it for the PDF generator
  if (pdfData.customerName) {
    const sourceData = pdfData.lead || pdfData.booking || {};
    pdfData = {
      ...pdfData,
      guestName: pdfData.customerName || sourceData.guestName,
      phone: pdfData.phone || sourceData.phone || 'N/A',
      resort: { 
        name: pdfData.resortName || (sourceData.resort && sourceData.resort.name) || sourceData.resortName || 'N/A',
        location: (sourceData.resort && sourceData.resort.location) || 'N/A'
      },
      room: { 
        roomName: pdfData.roomName || (sourceData.room && sourceData.room.roomName) || sourceData.roomName || 'N/A',
        roomType: (sourceData.room && sourceData.room.roomType) || 'N/A'
      },
      bookingNumber: pdfData.voucherNumber || sourceData.bookingNumber || sourceData.leadNumber || 'N/A',
      checkIn: pdfData.checkIn || sourceData.checkIn,
      checkOut: pdfData.checkOut || sourceData.checkOut,
      adults: sourceData.adults || pdfData.adults || 0,
      children: sourceData.children || pdfData.children || 0,
      rooms: sourceData.rooms || pdfData.rooms || 1,
      mealPlan: sourceData.mealPlan || pdfData.mealPlan || 'N/A',
      passengerDetails: sourceData.passengerDetails || [],
      savedBookings: sourceData.savedBookings || [],
      nationality: sourceData.nationality || 'N/A',
      specialRequests: sourceData.specialRequests || pdfData.specialRequests || 'N/A',
      resortRefNumber: sourceData.resortRefNumber || '',
      ourRefNumber: sourceData.ourRefNumber || sourceData.bookingNumber || sourceData.leadNumber || '',
    };
  }

  const pdfBuffer = await generateVoucherPDF(pdfData);
  const emailHtml = voucherEmailTemplate(pdfData);
  const identifier = pdfData.voucherNumber || pdfData.bookingNumber || pdfData.leadNumber || 'REF';

  await sendEmail({
    to: pdfData.email,
    subject: `Your Booking Voucher - ${identifier} (Confirmed)`,
    html: emailHtml,
    attachments: [
      {
        filename: `voucher-${identifier}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  });

  await ActivityLog.create({
    user: req.user._id,
    action: 'send_email',
    resource: 'voucher',
    resourceId: booking._id,
    description: `Sent booking voucher email to ${booking.email}`
  });

  res.json({
    success: true,
    message: 'Voucher email sent successfully'
  });
});

// @desc    Delete quotation
// @route   DELETE /api/bookings/quotation/:id
// @access  Private
export const deleteQuotation = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findById(req.params.id);

  if (!quotation) {
    res.status(404);
    throw new Error('Quotation not found');
  }

  await quotation.deleteOne();

  await ActivityLog.create({
    user: req.user._id,
    action: 'delete',
    resource: 'quotation',
    resourceId: quotation._id,
    description: `Deleted quotation: ${quotation.quotationNumber}`
  });

  res.json({
    success: true,
    message: 'Quotation deleted successfully'
  });
});

// @desc    Delete invoice
// @route   DELETE /api/bookings/invoice/:id
// @access  Private
export const deleteInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    res.status(404);
    throw new Error('Invoice not found');
  }

  const { lead } = invoice;

  await invoice.deleteOne();

  // Update lead status if needed
  if (lead) {
    const otherInvoices = await Invoice.find({ lead, _id: { $ne: req.params.id } });
    if (otherInvoices.length === 0) {
      // Revert status to Quotation or Pending if no other invoices exist
      const otherQuotations = await Quotation.find({ lead });
      await Lead.findByIdAndUpdate(lead, { status: otherQuotations.length > 0 ? 'Quotation' : 'Pending' });
    }
  }

  await ActivityLog.create({
    user: req.user._id,
    action: 'delete',
    resource: 'invoice',
    resourceId: invoice._id,
    description: `Deleted invoice: ${invoice.invoiceNumber}`
  });

  res.json({
    success: true,
    message: 'Invoice deleted successfully'
  });
});

// @desc    Delete receipt
// @route   DELETE /api/bookings/receipt/:id
// @access  Private
export const deleteReceipt = asyncHandler(async (req, res) => {
  const receipt = await Receipt.findById(req.params.id);

  if (!receipt) {
    res.status(404);
    throw new Error('Receipt not found');
  }

  const { lead, invoice, finalAmount } = receipt;

  await receipt.deleteOne();

  // Update lead balance
  if (lead) {
    const leadDoc = await Lead.findById(lead);
    if (leadDoc) {
      leadDoc.paidAmount = Math.max(0, (leadDoc.paidAmount || 0) - finalAmount);
      // leadDoc.balance is updated in pre-save hook
      
      // Update status if needed
      if (leadDoc.paidAmount <= 0) {
        // Check if there are invoices left
        const invoices = await Invoice.find({ lead });
        leadDoc.status = invoices.length > 0 ? 'Invoice' : 'Quotation';
      }
      
      const updatedLead = await leadDoc.save();

      // Sync with Booking if exists
      if (updatedLead.booking || booking) {
        const bookingId = updatedLead.booking || booking;
        const bookingDoc = await Booking.findById(bookingId);
        if (bookingDoc) {
          bookingDoc.paidAmount = updatedLead.paidAmount;
          // bookingDoc.balance is updated in pre-save hook
          await bookingDoc.save();
          console.log(`✅ Linked Booking updated after receipt deletion: ${bookingDoc.bookingNumber}`);
        }
      }
    }
  }

  // Update invoice balance if linked
  if (invoice) {
    const invoiceDoc = await Invoice.findById(invoice);
    if (invoiceDoc) {
      invoiceDoc.paidAmount = Math.max(0, (invoiceDoc.paidAmount || 0) - finalAmount);
      // invoiceDoc.balance is updated in pre-validate hook
      
      if (invoiceDoc.paidAmount <= 0) {
        invoiceDoc.status = 'Sent';
      } else if (invoiceDoc.paidAmount < invoiceDoc.finalAmount) {
        invoiceDoc.status = 'Partial';
      }
      
      await invoiceDoc.save();
    }
  }

  await ActivityLog.create({
    user: req.user._id,
    action: 'delete',
    resource: 'receipt',
    resourceId: receipt._id,
    description: `Deleted receipt: ${receipt.receiptNumber}`
  });

  res.json({
    success: true,
    message: 'Receipt deleted successfully'
  });
});
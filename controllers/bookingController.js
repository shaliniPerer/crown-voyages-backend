import asyncHandler from 'express-async-handler';
import Booking from '../models/Booking.js';
import Quotation from '../models/Quotation.js';
import Invoice from '../models/Invoice.js';
import Receipt from '../models/Receipt.js';
import Lead from '../models/Lead.js';
import ActivityLog from '../models/ActivityLog.js';
import { sendEmail } from '../config/email.js';
import { quotationEmailTemplate, bookingConfirmationTemplate } from '../utils/emailTemplates.js';
import { generateQuotationPDF, generateInvoicePDF, generateReceiptPDF, generateReportPDF } from '../utils/pdfGenerator.js';

// ========== LEAD MANAGEMENT ==========

export const getLeads = asyncHandler(async (req, res) => {
  const { status, source } = req.query;
  
  let query = {};
  if (status) query.status = status;
  if (source) query.source = source;

  try {
    const leads = await Lead.find(query)
      .populate('resort', 'name location starRating description amenities mealPlan images')
      .populate('room', 'roomType roomName price description size bedType maxAdults maxChildren amenities images')
      .populate('booking', 'bookingNumber')
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

  const quotations = await Quotation.find(query)
    .populate('resort', 'name location starRating')
    .populate('room', 'roomType price')
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
    sendEmail: shouldSendEmail
  } = req.body;

  // Validate required fields
  if (!customerName || !email || !amount || !finalAmount) {
    res.status(400);
    throw new Error('Missing required fields: customerName, email, amount, finalAmount');
  }

  // Generate quotation number
  const lastQuotation = await Quotation.findOne().sort({ createdAt: -1 });
  const lastNumber = lastQuotation?.quotationNumber 
    ? parseInt(lastQuotation.quotationNumber.replace('QT-', '')) 
    : 0;
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

  // Update lead status to 'Quotation'
  if (leadId) {
    await Lead.findByIdAndUpdate(leadId, { status: 'Quotation' });
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

  // Update Lead with Booking reference
  if (quotation.lead) {
    await Lead.findByIdAndUpdate(quotation.lead, { booking: booking._id, status: 'Converted' });
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

  // Prepare update data
  const updateData = { ...req.body };
  
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

  const invoices = await Invoice.find(query)
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
    amount,
    discountValue = 0,
    finalAmount,
    dueDate,
    notes,
    lead
  } = req.body;

  // Validate required fields
  if (!customerName || !email || !amount || !finalAmount) {
    res.status(400);
    throw new Error('Missing required fields: customerName, email, amount, finalAmount');
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
    amount,
    discountValue,
    finalAmount,
    dueDate,
    notes,
    lead,
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

  // Update lead status to 'Invoice'
  if (lead) {
    await Lead.findByIdAndUpdate(lead, { status: 'Invoice' });
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

  const receipts = await Receipt.find(query)
    .populate({
      path: 'lead',
      populate: { path: 'booking', select: 'bookingNumber' }
    })
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
    paymentMethod = 'Cash',
    notes,
    lead
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
      paymentMethod,
      notes,
      lead,
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

  // Update lead status to 'Receipt'
  if (lead) {
    await Lead.findByIdAndUpdate(lead, { status: 'Receipt' });
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
  const receipt = await Receipt.findById(req.params.id).populate('lead');

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
      populate: { path: 'booking', select: 'bookingNumber' }
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
      path: 'lead',
      populate: { path: 'booking', select: 'bookingNumber' }
    })
    .populate('invoice');

  if (!receipt) {
    res.status(404);
    throw new Error('Receipt not found');
  }

  const pdfBuffer = await generateReceiptPDF(receipt);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=receipt-${receipt.receiptNumber}.pdf`);
  res.send(pdfBuffer);
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

  await invoice.deleteOne();

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

  await receipt.deleteOne();

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
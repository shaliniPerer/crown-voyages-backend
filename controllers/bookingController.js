import asyncHandler from 'express-async-handler';
import Booking from '../models/Booking.js';
import Quotation from '../models/Quotation.js';
import Invoice from '../models/Invoice.js';
import Receipt from '../models/Receipt.js';
import Lead from '../models/Lead.js';
import ActivityLog from '../models/ActivityLog.js';
import { sendEmail } from '../config/email.js';
import { quotationEmailTemplate, bookingConfirmationTemplate } from '../utils/emailTemplates.js';
import { generateQuotationPDF, generateInvoicePDF, generateReceiptPDF } from '../utils/pdfGenerator.js';

// ========== LEAD MANAGEMENT ==========

export const getLeads = asyncHandler(async (req, res) => {
  const { status, source } = req.query;
  
  let query = {};
  if (status) query.status = status;
  if (source) query.source = source;

  try {
    const leads = await Lead.find(query)
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
  const lead = await Lead.create({
    ...req.body,
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
    .populate('resort', 'name location')
    .populate('room', 'roomType price')
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

  console.log('✏️ Updating lead with data:', updateData);
  
  try {
    lead = await Lead.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: false } // Disable validators to allow partial updates
    )
      .populate('resort', 'name location')
      .populate('room', 'roomType price');

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
    lead
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
    lead,
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
  if (lead) {
    await Lead.findByIdAndUpdate(lead, { status: 'Quotation' });
  }

  const populatedQuotation = await Quotation.findById(quotation._id)
    .populate('lead');

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
    .populate('resort', 'name location starRating images')
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

// @desc    Get receipts
// @route   GET /api/bookings/receipts
// @access  Private
export const getReceipts = asyncHandler(async (req, res) => {
  const receipts = await Receipt.find()
    .populate('lead')
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
  if (!customerName || !email || !amount || !finalAmount) {
    res.status(400);
    throw new Error('Missing required fields: customerName, email, amount, finalAmount');
  }

  // Generate receipt number
  const lastReceipt = await Receipt.findOne().sort({ createdAt: -1 });
  const lastNumber = lastReceipt?.receiptNumber 
    ? parseInt(lastReceipt.receiptNumber.replace('REC-', '')) 
    : 0;
  const receiptNumber = `REC-${String(lastNumber + 1).padStart(6, '0')}`;

  const receipt = await Receipt.create({
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

  const emailHtml = `
    <h2>Invoice ${invoice.invoiceNumber}</h2>
    <p>Dear ${invoice.customerName},</p>
    <p>Please find below the details of your invoice:</p>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Invoice Number:</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">${invoice.invoiceNumber}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Base Price:</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">$${(invoice.amount || 0).toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Discount:</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">-$${(invoice.discountValue || 0).toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Final Amount:</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">$${(invoice.finalAmount || 0).toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Due Date:</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Status:</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">${invoice.status}</td>
      </tr>
    </table>
    ${invoice.notes ? `<p><strong>Notes:</strong> ${invoice.notes}</p>` : ''}
    <p>Thank you for your business!</p>
  `;

  try {
    await sendEmail({
      to: invoice.email,
      subject: `Invoice ${invoice.invoiceNumber} - Crown Voyages`,
      html: emailHtml
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

  const emailHtml = `
    <h2>Receipt ${receipt.receiptNumber}</h2>
    <p>Dear ${receipt.customerName},</p>
    <p>Thank you for your payment. Please find below the details of your receipt:</p>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Receipt Number:</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">${receipt.receiptNumber}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Base Price:</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">$${(receipt.amount || 0).toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Discount:</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">-$${(receipt.discountValue || 0).toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Final Amount:</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">$${(receipt.finalAmount || 0).toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Payment Method:</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">${receipt.paymentMethod || 'Cash'}</td>
      </tr>
    </table>
    ${receipt.notes ? `<p><strong>Notes:</strong> ${receipt.notes}</p>` : ''}
    <p>Thank you for choosing Crown Voyages!</p>
  `;

  try {
    await sendEmail({
      to: receipt.email,
      subject: `Receipt ${receipt.receiptNumber} - Crown Voyages`,
      html: emailHtml
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
  const invoice = await Invoice.findById(req.params.id).populate('lead');

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
  const receipt = await Receipt.findById(req.params.id).populate('lead');

  if (!receipt) {
    res.status(404);
    throw new Error('Receipt not found');
  }

  const pdfBuffer = await generateReceiptPDF(receipt);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=receipt-${receipt.receiptNumber}.pdf`);
  res.send(pdfBuffer);
});
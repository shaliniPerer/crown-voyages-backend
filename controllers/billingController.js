import asyncHandler from 'express-async-handler';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Reminder from '../models/Reminder.js';
import Booking from '../models/Booking.js';
import Lead from '../models/Lead.js';
import ActivityLog from '../models/ActivityLog.js';
import { sendEmail } from '../config/email.js';
import { invoiceEmailTemplate, paymentReceiptTemplate } from '../utils/emailTemplates.js';
import { generateInvoicePDF, generateReceiptPDF, generatePaymentReceiptPDF } from '../utils/pdfGenerator.js';

// ========== INVOICE MANAGEMENT ==========

// @desc    Get all invoices
// @route   GET /api/billing/invoices
// @access  Private
export const getInvoices = asyncHandler(async (req, res) => {
  const { status, startDate, endDate } = req.query;
  
  let query = {};
  if (status) {
    query.status = Array.isArray(status) ? { $in: status } : status;
  }
  if (startDate && endDate) {
    query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const invoices = await Invoice.find(query)
    .populate('booking', 'bookingNumber guestName')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: invoices.length,
    data: invoices
  });
});

// @desc    Get single invoice
// @route   GET /api/billing/invoices/:id
// @access  Private
export const getInvoiceById = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id)
    .populate('booking')
    .populate('createdBy', 'name email');

  if (!invoice) {
    res.status(404);
    throw new Error('Invoice not found');
  }

  res.json({
    success: true,
    data: invoice
  });
});

// @desc    Create invoice
// @route   POST /api/billing/invoices
// @access  Private
export const createInvoice = asyncHandler(async (req, res) => {
  const { booking: bookingId, lead: leadId, ...invoiceData } = req.body;

  let booking = null;
  let lead = null;

  // Verify booking or lead exists
  if (bookingId) {
    booking = await Booking.findById(bookingId);
    if (!booking) {
      res.status(404);
      throw new Error('Booking not found');
    }
  } else if (leadId) {
    lead = await Lead.findById(leadId);
    if (!lead) {
      res.status(404);
      throw new Error('Lead not found');
    }
  } else {
    res.status(400);
    throw new Error('Either booking or lead ID is required');
  }

  // Calculate final amount
  const finalAmount = invoiceData.totalAmount + (invoiceData.taxAmount || 0) - (invoiceData.discountAmount || 0);

  const invoice = await Invoice.create({
    ...invoiceData,
    booking: bookingId,
    lead: leadId,
    finalAmount,
    createdBy: req.user._id
  });

  await ActivityLog.create({
    user: req.user._id,
    action: 'create',
    resource: 'invoice',
    resourceId: invoice._id,
    description: `Created invoice ${invoice.invoiceNumber} for ${invoice.customerName}`
  });

  const populatedInvoice = await Invoice.findById(invoice._id)
    .populate('booking', 'bookingNumber');

  res.status(201).json({
    success: true,
    data: populatedInvoice
  });
});

// @desc    Update invoice
// @route   PATCH /api/billing/invoices/:id
// @access  Private
export const updateInvoice = asyncHandler(async (req, res) => {
  let invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    res.status(404);
    throw new Error('Invoice not found');
  }

  // Recalculate final amount if amounts changed
  if (req.body.totalAmount || req.body.taxAmount || req.body.discountAmount) {
    const totalAmount = req.body.totalAmount || invoice.totalAmount;
    const taxAmount = req.body.taxAmount !== undefined ? req.body.taxAmount : invoice.taxAmount;
    const discountAmount = req.body.discountAmount !== undefined ? req.body.discountAmount : invoice.discountAmount;
    req.body.finalAmount = totalAmount + taxAmount - discountAmount;
  }

  invoice = await Invoice.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  await ActivityLog.create({
    user: req.user._id,
    action: 'update',
    resource: 'invoice',
    resourceId: invoice._id,
    description: `Updated invoice ${invoice.invoiceNumber}`
  });

  res.json({
    success: true,
    data: invoice
  });
});

// @desc    Send invoice via email
// @route   POST /api/billing/invoices/:id/send-email
// @access  Private
export const sendInvoiceEmail = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id)
    .populate('booking')
    .populate('lead');

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

  await sendEmail({
    to: invoice.email,
    subject: `Invoice ${invoiceNumber} - Crown Voyages`,
    html: `
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
    `,
    attachments: [{
      filename: `Invoice_${invoiceNumber}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }]
  });

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
    message: 'Invoice sent successfully'
  });
});

// @desc    Send payment receipt via email
// @route   POST /api/billing/payments/:id/send-receipt
// @access  Private
export const sendPaymentReceiptEmail = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id)
    .populate('invoice')
    .populate('lead');

  if (!payment) {
    res.status(404);
    throw new Error('Payment not found');
  }

  const invoice = payment.invoice;
  
  // Generate PDF
  const pdfBuffer = await generatePaymentReceiptPDF(payment, invoice);

  const customerName = invoice.customerName || 'Valued Client';
  const paymentId = payment.paymentId;
  const amount = payment.amount;
  const paymentDate = new Date(payment.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  await sendEmail({
    to: invoice.email,
    subject: `Payment Receipt ${paymentId} - Crown Voyages`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: #D4AF37; margin: 0; font-size: 28px;">CROWN VOYAGES</h1>
          <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px;">Luxury Travel & Resort Management</p>
        </div>
        
        <div style="background-color: #ffffff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #1a1a2e; margin-top: 0;">Dear ${customerName},</h2>
          
          <p style="color: #333; line-height: 1.6;">Thank you for your payment. We have successfully received your transaction.</p>
          
          <div style="background-color: #f8f9fa; border-left: 4px solid #D4AF37; padding: 15px; margin: 20px 0;">
            <h3 style="color: #1a1a2e; margin-top: 0; font-size: 16px;">Payment Details:</h3>
            <ul style="color: #666; line-height: 1.8; margin: 10px 0;">
              <li>Receipt Number: <strong>${paymentId}</strong></li>
              <li>Date: <strong>${paymentDate}</strong></li>
              <li>Method: <strong>${payment.method}</strong></li>
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
    `,
    attachments: [{
      filename: `Receipt_${paymentId}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }]
  });

  await ActivityLog.create({
    user: req.user._id,
    action: 'send_email',
    resource: 'payment',
    resourceId: payment._id,
    description: `Sent payment receipt ${payment.paymentId} to ${invoice.email}`
  });

  res.json({
    success: true,
    message: 'Payment receipt sent successfully'
  });
});
// @route   GET /api/billing/invoices/:id/pdf
// @access  Private
export const exportInvoicePDF = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id)
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

// ========== PAYMENT MANAGEMENT ==========

// @desc    Get all payments
// @route   GET /api/billing/payments
// @access  Private
export const getPayments = asyncHandler(async (req, res) => {
  const { status, method, startDate, endDate } = req.query;
  
  let query = {};
  if (status) query.status = status;
  if (method) query.method = method;
  if (startDate && endDate) {
    query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const payments = await Payment.find(query)
    .populate('invoice', 'invoiceNumber customerName')
    .populate('booking', 'bookingNumber')
    .populate('processedBy', 'name')
    .sort({ date: -1 });

  res.json({
    success: true,
    count: payments.length,
    data: payments
  });
});

// @desc    Get payments by invoice
// @route   GET /api/billing/payments/invoice/:invoiceId
// @access  Private
export const getPaymentsByInvoice = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ invoice: req.params.invoiceId })
    .populate('processedBy', 'name')
    .sort({ date: -1 });

  res.json({
    success: true,
    count: payments.length,
    data: payments
  });
});

// @desc    Record payment
// @route   POST /api/billing/payments
// @access  Private
export const recordPayment = asyncHandler(async (req, res) => {
  const { invoice: invoiceId, booking: bookingId, lead: leadId, amount, method, transactionId, date, notes } = req.body;

  // Verify invoice exists
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    res.status(404);
    throw new Error('Invoice not found');
  }

  // Check if payment amount doesn't exceed balance
  if (amount > invoice.balance) {
    res.status(400);
    throw new Error('Payment amount cannot exceed invoice balance');
  }

  const payment = await Payment.create({
    invoice: invoiceId,
    booking: bookingId || invoice.booking,
    lead: leadId || invoice.lead,
    amount,
    method,
    transactionId,
    date: date || new Date(),
    notes,
    processedBy: req.user._id,
    status: 'Completed'
  });

  // Update invoice
  invoice.paidAmount += amount;
  invoice.balance = invoice.finalAmount - invoice.paidAmount;
  
  if (invoice.balance <= 0) {
    invoice.status = 'Paid';
    invoice.paidAt = new Date();
  } else {
    invoice.status = 'Partial';
  }
  
  await invoice.save();

  // Update booking if linked
  if (bookingId) {
    await Booking.findByIdAndUpdate(bookingId, {
      paidAmount: invoice.paidAmount,
      balance: invoice.balance
    });
  }

  await ActivityLog.create({
    user: req.user._id,
    action: 'record_payment',
    resource: 'payment',
    resourceId: payment._id,
    description: `Recorded payment of $${amount} for invoice ${invoice.invoiceNumber}`
  });

  // Send payment receipt email
  const receiptHtml = paymentReceiptTemplate(payment, invoice);
  await sendEmail({
    to: invoice.email,
    subject: `Payment Receipt - ${payment.paymentId}`,
    html: receiptHtml
  });

  const populatedPayment = await Payment.findById(payment._id)
    .populate('invoice', 'invoiceNumber')
    .populate('processedBy', 'name');

  res.status(201).json({
    success: true,
    data: populatedPayment
  });
});

// ========== REMINDER MANAGEMENT ==========

// @desc    Get all reminders
// @route   GET /api/billing/reminders
// @access  Private
export const getReminders = asyncHandler(async (req, res) => {
  const reminders = await Reminder.find()
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: reminders.length,
    data: reminders
  });
});

// @desc    Create reminder
// @route   POST /api/billing/reminders
// @access  Private
export const createReminder = asyncHandler(async (req, res) => {
  const reminder = await Reminder.create({
    ...req.body,
    createdBy: req.user._id
  });

  await ActivityLog.create({
    user: req.user._id,
    action: 'create',
    resource: 'other',
    resourceId: reminder._id,
    description: `Created payment reminder: ${reminder.subject}`
  });

  res.status(201).json({
    success: true,
    data: reminder
  });
});

// @desc    Update reminder
// @route   PATCH /api/billing/reminders/:id
// @access  Private
export const updateReminder = asyncHandler(async (req, res) => {
  let reminder = await Reminder.findById(req.params.id);

  if (!reminder) {
    res.status(404);
    throw new Error('Reminder not found');
  }

  reminder = await Reminder.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    data: reminder
  });
});

// @desc    Delete reminder
// @route   DELETE /api/billing/reminders/:id
// @access  Private
export const deleteReminder = asyncHandler(async (req, res) => {
  const reminder = await Reminder.findById(req.params.id);

  if (!reminder) {
    res.status(404);
    throw new Error('Reminder not found');
  }

  await reminder.deleteOne();

  res.json({
    success: true,
    message: 'Reminder deleted successfully'
  });
});
import { sendEmail } from '../config/email.js';
import {
  quotationEmailTemplate,
  invoiceEmailTemplate,
  paymentReceiptTemplate,
  paymentReminderTemplate
} from './emailTemplates.js';

// Send quotation email
export const sendQuotationEmail = async (quotation) => {
  const html = quotationEmailTemplate(quotation);
  
  return await sendEmail({
    to: quotation.email,
    subject: `Quotation ${quotation.quotationNumber} - ${quotation.resort?.name || 'Resort Booking'}`,
    html
  });
};

// Send invoice email
export const sendInvoiceEmail = async (invoice) => {
  const html = invoiceEmailTemplate(invoice);
  
  return await sendEmail({
    to: invoice.email,
    subject: `Invoice ${invoice.invoiceNumber} - Payment Due`,
    html
  });
};

// Send payment receipt email
export const sendPaymentReceiptEmail = async (payment, invoice) => {
  const html = paymentReceiptTemplate(payment, invoice);
  
  return await sendEmail({
    to: invoice.email,
    subject: `Payment Receipt - ${payment.paymentId}`,
    html
  });
};

// Send payment reminder email
export const sendPaymentReminderEmail = async (invoice, reminderType, customTemplate, customSubject) => {
  let html;
  let subject = customSubject;

  if (customTemplate) {
    // Replace placeholders in custom template
    html = customTemplate
      .replace(/{customer_name}/g, invoice.customerName || 'Valued Client')
      .replace(/{invoice_number}/g, invoice.invoiceNumber || 'N/A')
      .replace(/{id}/g, invoice.invoiceNumber || 'N/A')
      .replace(/{amount}/g, (invoice.balance || invoice.finalAmount || 0).toFixed(2))
      .replace(/{due_date}/g, invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A');
    
    // Wrap in standard layout if it doesn't look like HTML
    if (!html.includes('<html')) {
        html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <div style="background: #D4AF37; color: #000; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h2 style="margin:0;">Payment Reminder</h2>
            </div>
            <div style="padding: 20px; line-height: 1.6;">
                ${html.replace(/\n/g, '<br>')}
            </div>
            <div style="text-align: center; color: #777; font-size: 12px; margin-top: 20px;">
                © ${new Date().getFullYear()} Crown Voyages
            </div>
        </div>
        `;
    }
  } else {
    html = paymentReminderTemplate(invoice, reminderType);
  }
  
  if (!subject) {
    switch (reminderType) {
      case 'before':
        subject = `Payment Reminder - Invoice ${invoice.invoiceNumber} Due Soon`;
        break;
      case 'on':
        subject = `Payment Due Today - Invoice ${invoice.invoiceNumber}`;
        break;
      case 'after':
        subject = `Overdue Payment Notice - Invoice ${invoice.invoiceNumber}`;
        break;
      default:
        subject = `Payment Reminder - Invoice ${invoice.invoiceNumber}`;
    }
  }
  
  return await sendEmail({
    to: invoice.email,
    subject,
    html
  });
};

// Send booking confirmation email
export const sendBookingConfirmationEmail = async (booking) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #D4AF37 0%, #FFD700 100%); color: #000; padding: 30px; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; }
        .details { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #D4AF37; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Booking Confirmed!</h1>
          <p>Booking #${booking.bookingNumber}</p>
        </div>
        <div class="content">
          <p>Dear ${booking.guestName},</p>
          <p>Your booking has been confirmed! We're excited to host you.</p>
          
          <div class="details">
            <h3>Booking Details</h3>
            <p><strong>Resort:</strong> ${booking.resort?.name}</p>
            <p><strong>Room:</strong> ${booking.room?.roomType}</p>
            <p><strong>Check-in:</strong> ${new Date(booking.checkIn).toLocaleDateString()}</p>
            <p><strong>Check-out:</strong> ${new Date(booking.checkOut).toLocaleDateString()}</p>
            <p><strong>Guests:</strong> ${booking.adults} Adults, ${booking.children} Children</p>
            <p><strong>Total Amount:</strong> $${booking.totalAmount}</p>
          </div>
          
          <p>If you have any questions, please don't hesitate to contact us.</p>
          <p>We look forward to welcoming you!</p>
        </div>
        <div class="footer">
          <p>Resort Luxury Management System</p>
          <p>© ${new Date().getFullYear()} All rights reserved</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return await sendEmail({
    to: booking.email,
    subject: `Booking Confirmation - ${booking.bookingNumber}`,
    html
  });
};

export default {
  sendQuotationEmail,
  sendInvoiceEmail,
  sendPaymentReceiptEmail,
  sendPaymentReminderEmail,
  sendBookingConfirmationEmail
};
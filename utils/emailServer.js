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
export const sendPaymentReminderEmail = async (invoice, reminderType) => {
  const html = paymentReminderTemplate(invoice, reminderType);
  
  let subject;
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
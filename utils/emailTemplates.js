// Quotation Email Template
export const quotationEmailTemplate = (quotation) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #D4AF37 0%, #FFD700 100%); color: #000; padding: 30px; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; }
        .details { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #D4AF37; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .table th { background: #D4AF37; color: #000; }
        .total { font-size: 24px; font-weight: bold; color: #D4AF37; text-align: right; margin-top: 20px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .button { display: inline-block; padding: 12px 30px; background: #D4AF37; color: #000; text-decoration: none; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Your Quotation</h1>
          <p>Quotation #${quotation.quotationNumber}</p>
        </div>
        <div class="content">
          <p>Dear ${quotation.customerName},</p>
          <p>Thank you for your interest! Please find your quotation details below.</p>
          
          <div class="details">
            <h3>Resort Information</h3>
            <p><strong>Resort:</strong> ${quotation.resort?.name}</p>
            <p><strong>Location:</strong> ${quotation.resort?.location}</p>
            ${quotation.room ? `<p><strong>Room Type:</strong> ${quotation.room.roomType}</p>` : ''}
          </div>
          
          <div class="details">
            <h3>Stay Details</h3>
            <p><strong>Check-in:</strong> ${new Date(quotation.checkIn).toLocaleDateString()}</p>
            <p><strong>Check-out:</strong> ${new Date(quotation.checkOut).toLocaleDateString()}</p>
            <p><strong>Duration:</strong> ${Math.ceil((new Date(quotation.checkOut) - new Date(quotation.checkIn)) / (1000 * 60 * 60 * 24))} nights</p>
            <p><strong>Guests:</strong> ${quotation.adults} Adults${quotation.children > 0 ? `, ${quotation.children} Children` : ''}</p>
          </div>
          
          <div class="total">
            Total: $${quotation.totalAmount.toLocaleString()}
          </div>
          
          ${quotation.notes ? `<p><strong>Notes:</strong> ${quotation.notes}</p>` : ''}
          
          <p><strong>Valid Until:</strong> ${new Date(quotation.validUntil).toLocaleDateString()}</p>
          
          <p>To proceed with this booking, please reply to this email or contact us directly.</p>
        </div>
        <div class="footer">
          <p>Resort Luxury Management System</p>
          <p>© ${new Date().getFullYear()} All rights reserved</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Invoice Email Template
export const invoiceEmailTemplate = (invoice) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #D4AF37 0%, #FFD700 100%); color: #000; padding: 30px; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; }
        .invoice-box { background: white; padding: 20px; margin: 20px 0; border: 2px solid #D4AF37; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .table th { background: #D4AF37; color: #000; }
        .totals { margin-top: 20px; text-align: right; }
        .totals div { padding: 8px 0; }
        .final-total { font-size: 24px; font-weight: bold; color: #D4AF37; border-top: 2px solid #D4AF37; padding-top: 10px; margin-top: 10px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Invoice</h1>
          <p>Invoice #${invoice.invoiceNumber}</p>
        </div>
        <div class="content">
          <p>Dear ${invoice.customerName},</p>
          <p>Please find your invoice details below.</p>
          
          <div class="invoice-box">
            <h3>Bill To:</h3>
            <p><strong>${invoice.customerName}</strong></p>
            <p>${invoice.email}</p>
            ${invoice.phone ? `<p>${invoice.phone}</p>` : ''}
            
            <div style="margin-top: 20px;">
              <p><strong>Invoice Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString()}</p>
              <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
              <p><strong>Booking Reference:</strong> ${invoice.booking?.bookingNumber || 'N/A'}</p>
            </div>
          </div>
          
          ${invoice.items && invoice.items.length > 0 ? `
          <table class="table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td>${item.quantity}</td>
                  <td>$${item.unitPrice.toFixed(2)}</td>
                  <td>$${item.amount.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ` : ''}
          
          <div class="totals">
            <div><strong>Subtotal:</strong> $${invoice.totalAmount.toFixed(2)}</div>
            ${invoice.taxAmount > 0 ? `<div><strong>Tax:</strong> $${invoice.taxAmount.toFixed(2)}</div>` : ''}
            ${invoice.discountAmount > 0 ? `<div><strong>Discount:</strong> -$${invoice.discountAmount.toFixed(2)}</div>` : ''}
            <div class="final-total">Total Due: $${invoice.finalAmount.toFixed(2)}</div>
            ${invoice.paidAmount > 0 ? `<div><strong>Paid:</strong> $${invoice.paidAmount.toFixed(2)}</div>` : ''}
            ${invoice.balance > 0 ? `<div style="color: #EF4444;"><strong>Balance:</strong> $${invoice.balance.toFixed(2)}</div>` : ''}
          </div>
          
          ${invoice.notes ? `<p style="margin-top: 20px;"><strong>Notes:</strong> ${invoice.notes}</p>` : ''}
          
          <p style="margin-top: 30px;">Please make payment by the due date to avoid late fees.</p>
          <p>Thank you for your business!</p>
        </div>
        <div class="footer">
          <p>Resort Luxury Management System</p>
          <p>© ${new Date().getFullYear()} All rights reserved</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Payment Receipt Template
export const paymentReceiptTemplate = (payment, invoice) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10B981 0%, #34D399 100%); color: white; padding: 30px; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; }
        .receipt-box { background: white; padding: 20px; margin: 20px 0; border: 2px solid #10B981; }
        .amount { font-size: 36px; font-weight: bold; color: #10B981; text-align: center; margin: 20px 0; }
        .details { margin: 20px 0; }
        .details div { padding: 8px 0; border-bottom: 1px solid #e5e5e5; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✓ Payment Received</h1>
          <p>Receipt #${payment.paymentId}</p>
        </div>
        <div class="content">
          <p>Dear ${invoice.customerName},</p>
          <p>Thank you for your payment! This receipt confirms we have received your payment.</p>
          
          <div class="amount">$${payment.amount.toFixed(2)}</div>
          
          <div class="receipt-box">
            <h3>Payment Details</h3>
            <div class="details">
              <div><strong>Payment Date:</strong> ${new Date(payment.date).toLocaleDateString()}</div>
              <div><strong>Payment Method:</strong> ${payment.method}</div>
              ${payment.transactionId ? `<div><strong>Transaction ID:</strong> ${payment.transactionId}</div>` : ''}
              <div><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</div>
              <div><strong>Amount Paid:</strong> $${payment.amount.toFixed(2)}</div>
            </div>
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #10B981;">
              <div><strong>Invoice Total:</strong> $${invoice.finalAmount.toFixed(2)}</div>
              <div><strong>Total Paid:</strong> $${invoice.paidAmount.toFixed(2)}</div>
              <div style="font-size: 18px; color: ${invoice.balance > 0 ? '#EF4444' : '#10B981'};"><strong>Remaining Balance:</strong> $${invoice.balance.toFixed(2)}</div>
            </div>
          </div>
          
          ${payment.notes ? `<p><strong>Notes:</strong> ${payment.notes}</p>` : ''}
          
          <p>Please keep this receipt for your records.</p>
          <p>Thank you for your business!</p>
        </div>
        <div class="footer">
          <p>Resort Luxury Management System</p>
          <p>© ${new Date().getFullYear()} All rights reserved</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Payment Reminder Template
export const paymentReminderTemplate = (invoice, reminderType) => {
  const messages = {
    before: {
      title: 'Payment Reminder',
      message: 'This is a friendly reminder that your payment is due soon.',
      color: '#F59E0B'
    },
    on: {
      title: 'Payment Due Today',
      message: 'Your payment is due today. Please process your payment as soon as possible.',
      color: '#EF4444'
    },
    after: {
      title: 'Overdue Payment Notice',
      message: 'Your payment is now overdue. Please make payment immediately to avoid additional late fees.',
      color: '#DC2626'
    }
  };

  const reminder = messages[reminderType] || messages.before;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${reminder.color}; color: white; padding: 30px; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; }
        .invoice-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid ${reminder.color}; }
        .amount { font-size: 32px; font-weight: bold; color: ${reminder.color}; text-align: center; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${reminder.title}</h1>
          <p>Invoice #${invoice.invoiceNumber}</p>
        </div>
        <div class="content">
          <p>Dear ${invoice.customerName},</p>
          <p>${reminder.message}</p>
          
          <div class="invoice-box">
            <h3>Invoice Details</h3>
            <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
            <p><strong>Invoice Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString()}</p>
            <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
            
            <div class="amount">$${invoice.balance.toFixed(2)}</div>
            <p style="text-align: center; color: #666;">Amount Due</p>
            
            <div style="margin-top: 20px;">
              <p><strong>Original Amount:</strong> $${invoice.finalAmount.toFixed(2)}</p>
              <p><strong>Amount Paid:</strong> $${invoice.paidAmount.toFixed(2)}</p>
              <p><strong>Balance Due:</strong> $${invoice.balance.toFixed(2)}</p>
            </div>
          </div>
          
          <p>If you have already made this payment, please disregard this notice.</p>
          <p>For any questions regarding this invoice, please contact us.</p>
          <p>Thank you for your prompt attention to this matter.</p>
        </div>
        <div class="footer">
          <p>Resort Luxury Management System</p>
          <p>© ${new Date().getFullYear()} All rights reserved</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Booking Confirmation Template
export const bookingConfirmationTemplate = (booking) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #D4AF37 0%, #FFD700 100%); color: #000; padding: 30px; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; }
        .booking-box { background: white; padding: 20px; margin: 20px 0; border: 2px solid #D4AF37; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✓ Booking Confirmed!</h1>
          <p>Booking #${booking.bookingNumber}</p>
        </div>
        <div class="content">
          <p>Dear ${booking.guestName},</p>
          <p>Your booking has been confirmed! We're excited to welcome you.</p>
          
          <div class="booking-box">
            <h3>Booking Details</h3>
            <p><strong>Resort:</strong> ${booking.resort?.name}</p>
            <p><strong>Location:</strong> ${booking.resort?.location}</p>
            <p><strong>Room:</strong> ${booking.room?.roomType}</p>
            <p><strong>Check-in:</strong> ${new Date(booking.checkIn).toLocaleDateString()}</p>
            <p><strong>Check-out:</strong> ${new Date(booking.checkOut).toLocaleDateString()}</p>
            <p><strong>Guests:</strong> ${booking.adults} Adults${booking.children > 0 ? `, ${booking.children} Children` : ''}</p>
            <p><strong>Total Amount:</strong> $${booking.totalAmount.toLocaleString()}</p>
          </div>
          
          ${booking.specialRequests ? `<p><strong>Special Requests:</strong> ${booking.specialRequests}</p>` : ''}
          
          <p>We look forward to hosting you!</p>
        </div>
        <div class="footer">
          <p>Resort Luxury Management System</p>
          <p>© ${new Date().getFullYear()} All rights reserved</p>
        </div>
      </div>
    </body>
    </html>
  `;
};
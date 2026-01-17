// Booking Voucher Email Template - Professional Design
export const voucherEmailTemplate = (booking) => {
  const resortName = booking.resort?.name || 'Your Resort';
  const roomName = booking.room?.roomName || booking.room?.roomType || 'Your Room';
  const checkIn = new Date(booking.checkIn).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const checkOut = new Date(booking.checkOut).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const bookingNumber = booking.bookingNumber || booking.voucherNumber || booking.leadNumber;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.4; 
          color: #000; 
          margin: 0;
          padding: 0;
        }
        .container { 
          max-width: 800px; 
          margin: 0 auto; 
          padding: 20px;
          background: #fff;
        }
        .header { 
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 20px 0;
          border-bottom: 2px solid #000;
          margin-bottom: 30px;
        }
        .company-info {
          flex: 1;
        }
        .company-logo {
          width: 150px;
          height: auto;
          margin-bottom: 10px;
        }
        .company-info p {
          margin: 2px 0;
          font-size: 11px;
          line-height: 1.4;
        }
        .voucher-title {
          text-align: right;
          flex: 0 0 auto;
        }
        .voucher-title h1 {
          font-size: 32px;
          font-weight: bold;
          margin: 0;
          color: #000;
        }
        .voucher-details {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin: 20px 0 30px 0;
          padding: 15px;
          background: #f9f9f9;
          border: 1px solid #ccc;
        }
        .detail-item {
          display: flex;
          flex-direction: column;
        }
        .detail-label {
          font-size: 10px;
          color: #666;
          margin-bottom: 3px;
        }
        .detail-value {
          font-size: 11px;
          font-weight: bold;
          color: #000;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin: 20px 0;
        }
        .info-section h3 {
          font-size: 12px;
          font-weight: bold;
          margin: 0 0 15px 0;
          padding-bottom: 8px;
          border-bottom: 1px solid #ccc;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          font-size: 11px;
        }
        .info-label {
          color: #666;
        }
        .info-value {
          font-weight: bold;
          text-align: right;
        }
        .guest-list {
          margin: 15px 0;
        }
        .guest-list p {
          margin: 4px 0;
          font-size: 11px;
        }
        .special-section {
          margin-top: 30px;
          padding: 15px;
          background: #fffbeb;
          border-left: 4px solid #f59e0b;
        }
        .special-section h4 {
          margin: 0 0 10px 0;
          font-size: 12px;
          color: #92400e;
        }
        .special-section p {
          margin: 5px 0;
          font-size: 11px;
          color: #78350f;
        }
        .authorization {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ccc;
          text-align: right;
        }
        .authorization p {
          margin: 3px 0;
          font-size: 11px;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #000;
          text-align: center;
        }
        .footer p {
          margin: 3px 0;
          font-size: 10px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header with Logo and Voucher Title -->
        <div class="header">
          <div class="company-info">
            <!-- Replace this image src with your actual logo -->
            <img src="YOUR_LOGO_URL_HERE" alt="Company Logo" class="company-logo">
            <p>Lot 20329 | Nirolhu magu Hulhumale</p>
            <p>Male', Republic of Maldives</p>
            <p>Email: hello@yourdomain.com</p>
            <p>Website: www.yourdomain.com</p>
            <p>Phone: (XXX) XXX-XXXX</p>
            <p>Phone: (XXX) XXX-XXXX</p>
          </div>
          <div class="voucher-title">
            <h1>HOTEL VOUCHER</h1>
          </div>
        </div>

        <!-- Voucher Details Grid -->
        <div class="voucher-details">
          <div class="detail-item">
            <span class="detail-label">Voucher No:</span>
            <span class="detail-value">${bookingNumber}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Booking Date:</span>
            <span class="detail-value">${new Date(booking.bookingDate || booking.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Issuing Date:</span>
            <span class="detail-value">${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>
        </div>

        <!-- Main Information Grid -->
        <div class="info-grid">
          <!-- Left Column -->
          <div class="info-section">
            <h3>HOTEL INFORMATION</h3>
            <div class="info-row">
              <span class="info-label">Name of the Resort/Hotel:</span>
            </div>
            <div class="info-row">
              <span class="info-value" style="font-size: 13px;">${resortName}</span>
            </div>
            ${booking.resortRefNumber ? `
            <div class="info-row" style="margin-top: 10px;">
              <span class="info-label">Resort Ref No:</span>
              <span class="info-value">${booking.resortRefNumber}</span>
            </div>
            ` : ''}
            ${booking.ourRefNumber ? `
            <div class="info-row">
              <span class="info-label">Our Ref No:</span>
              <span class="info-value">${booking.ourRefNumber}</span>
            </div>
            ` : ''}
          </div>

          <!-- Right Column -->
          <div class="info-section">
            <h3>BOOKING DETAILS</h3>
            <div class="info-row">
              <span class="info-label">No of Pax:</span>
              <span class="info-value">${booking.adults} Adults${booking.children ? ` & ${booking.children} Children` : ''}</span>
            </div>
            <div class="info-row">
              <span class="info-label">No of Rooms:</span>
              <span class="info-value">${booking.numberOfRooms || 1}</span>
            </div>
            <div class="info-row">
              <span class="info-label">No of Nights:</span>
              <span class="info-value">${booking.numberOfNights || Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24))}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Meal Plan:</span>
              <span class="info-value">${booking.mealPlan || 'As per booking'}</span>
            </div>
          </div>
        </div>

        <!-- Guest Information -->
        <div class="info-section">
          <h3>GUEST INFORMATION</h3>
          <div class="info-row">
            <span class="info-label">Name of Guest/Group:</span>
            <span class="info-value">${booking.guestName || booking.customerName}</span>
          </div>
          ${booking.guests && booking.guests.length > 0 ? `
          <div class="guest-list">
            ${booking.guests.map(guest => `<p>${guest}</p>`).join('')}
          </div>
          ` : ''}
          ${booking.nationality ? `
          <div class="info-row" style="margin-top: 10px;">
            <span class="info-label">Nationality:</span>
            <span class="info-value">${booking.nationality}</span>
          </div>
          ` : ''}
        </div>

        <!-- Room and Transfer Information -->
        <div class="info-grid" style="margin-top: 30px;">
          <div class="info-section">
            <h3>ACCOMMODATION</h3>
            <div class="info-row">
              <span class="info-label">Room Type:</span>
              <span class="info-value">${roomName}</span>
            </div>
            ${booking.transferDetails ? `
            <div class="info-row" style="margin-top: 10px;">
              <span class="info-label">Transfer:</span>
            </div>
            <div class="info-row">
              <span class="info-value" style="font-size: 10px;">${booking.transferDetails}</span>
            </div>
            ` : ''}
          </div>

          <div class="info-section">
            <h3>TRAVEL DATES</h3>
            <div class="info-row">
              <span class="info-label">Arrival Date:</span>
              <span class="info-value">${checkIn}</span>
            </div>
            ${booking.arrivalFlight ? `
            <div class="info-row">
              <span class="info-label">Flight Details:</span>
              <span class="info-value">${booking.arrivalFlight}</span>
            </div>
            ` : ''}
            <div class="info-row" style="margin-top: 10px;">
              <span class="info-label">Departure Date:</span>
              <span class="info-value">${checkOut}</span>
            </div>
            ${booking.departureFlight ? `
            <div class="info-row">
              <span class="info-label">Flight Details:</span>
              <span class="info-value">${booking.departureFlight}</span>
            </div>
            ` : ''}
          </div>
        </div>

        <!-- Special Requests and Remarks -->
        ${booking.specialRequest || booking.remarks ? `
        <div class="special-section">
          ${booking.specialRequest ? `
          <h4>Special Request:</h4>
          <p>${booking.specialRequest}</p>
          ` : ''}
          ${booking.remarks ? `
          <h4>Remarks:</h4>
          <p>${booking.remarks}</p>
          ` : ''}
        </div>
        ` : ''}

        <!-- Authorization -->
        <div class="authorization">
          <p><strong>Authorized By:</strong> ${booking.authorizedBy || 'Reservations Department'}</p>
          <p style="margin-top: 10px; font-size: 10px; color: #666;">Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</p>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p><strong>Please present this voucher upon arrival at the resort</strong></p>
          <p>This is a computer-generated voucher and requires no signature</p>
          <p style="margin-top: 10px;">© ${new Date().getFullYear()} Resort Luxury Management. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Quotation Email Template
export const quotationEmailTemplate = (quotation) => {
  const resortName = quotation.lead?.resort?.name || 'Your Selected Resort';
  const roomType = quotation.lead?.room?.roomType || 'Premium Room';
  const checkIn = quotation.lead?.checkIn ? new Date(quotation.lead.checkIn).toLocaleDateString() : 'TBD';
  const checkOut = quotation.lead?.checkOut ? new Date(quotation.lead.checkOut).toLocaleDateString() : 'TBD';
  let nights = 0;
  if (quotation.lead?.checkIn && quotation.lead?.checkOut) {
    nights = Math.ceil((new Date(quotation.lead.checkOut) - new Date(quotation.lead.checkIn)) / (1000 * 60 * 60 * 24));
  }
  const adults = quotation.lead?.adults || 0;
  const children = quotation.lead?.children || 0;

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
        .pricing { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #D4AF37; }
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
            <p><strong>Resort:</strong> ${resortName}</p>
            <p><strong>Room Type:</strong> ${roomType}</p>
          </div>
          
          <div class="details">
            <h3>Stay Details</h3>
            <p><strong>Check-in:</strong> ${checkIn}</p>
            <p><strong>Check-out:</strong> ${checkOut}</p>
            ${nights > 0 ? `<p><strong>Duration:</strong> ${nights} nights</p>` : ''}
            <p><strong>Guests:</strong> ${adults} Adults${children > 0 ? `, ${children} Children` : ''}</p>
          </div>
          
          <div class="pricing">
            <h3>Pricing</h3>
            <p><strong>Base Price:</strong> $${(quotation.amount || 0).toFixed(2)}</p>
            <p><strong>Discount:</strong> -$${(quotation.discountValue || 0).toFixed(2)}</p>
            <div class="total">Final Amount: $${(quotation.finalAmount || 0).toFixed(2)}</div>
          </div>
          
          ${quotation.notes ? `<div class="details"><p><strong>Notes:</strong> ${quotation.notes}</p></div>` : ''}
          
          ${quotation.validUntil ? `<p><strong>Valid Until:</strong> ${new Date(quotation.validUntil).toLocaleDateString()}</p>` : ''}
          
          <p>To proceed with this booking, please reply to this email or contact us directly.</p>
        </div>
        <div class="footer">
          <p>Crown Voyages Resort Management</p>
          <p>© ${new Date().getFullYear()} All rights reserved</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Invoice Email Template - Professional Design
export const invoiceEmailTemplate = (invoice) => {
  const reference = invoice.booking ? `Booking #${invoice.booking.bookingNumber}` : 
                   invoice.lead ? `Lead Reference` : 'N/A';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.4; 
          color: #000; 
          margin: 0;
          padding: 0;
        }
        .container { 
          max-width: 800px; 
          margin: 0 auto; 
          padding: 20px;
          background: #fff;
        }
        .header { 
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 20px 0;
          border-bottom: 2px solid #000;
          margin-bottom: 30px;
        }
        .company-info {
          flex: 1;
        }
        .company-logo {
          width: 150px;
          height: auto;
          margin-bottom: 10px;
        }
        .company-info p {
          margin: 2px 0;
          font-size: 11px;
          line-height: 1.4;
        }
        .invoice-title {
          text-align: center;
          flex: 0 0 auto;
        }
        .invoice-title h1 {
          font-size: 32px;
          font-weight: bold;
          margin: 0;
          color: #000;
        }
        .customer-section {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
        }
        .customer-info, .invoice-details {
          flex: 1;
        }
        .customer-info h3, .invoice-details h3 {
          font-size: 12px;
          margin: 0 0 10px 0;
          font-weight: bold;
        }
        .customer-info p, .invoice-details p {
          margin: 3px 0;
          font-size: 11px;
        }
        .guest-list {
          margin: 10px 0;
        }
        .guest-list p {
          margin: 2px 0;
          font-size: 11px;
        }
        .invoice-details {
          text-align: right;
        }
        .table { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 20px 0;
          font-size: 11px;
        }
        .table th { 
          background: #f0f0f0;
          color: #000;
          padding: 10px;
          text-align: left;
          font-weight: bold;
          border: 1px solid #ccc;
        }
        .table td { 
          padding: 10px;
          border: 1px solid #ccc;
        }
        .table th:last-child,
        .table td:last-child {
          text-align: right;
        }
        .totals-section {
          margin-top: 30px;
          display: flex;
          justify-content: space-between;
        }
        .bank-details {
          flex: 1;
          padding-right: 20px;
        }
        .bank-details h3 {
          font-size: 12px;
          font-weight: bold;
          margin: 0 0 10px 0;
        }
        .bank-details p {
          margin: 3px 0;
          font-size: 11px;
        }
        .totals {
          flex: 0 0 300px;
          text-align: right;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 11px;
        }
        .totals-row.final {
          border-top: 2px solid #000;
          margin-top: 10px;
          padding-top: 10px;
          font-weight: bold;
          font-size: 13px;
        }
        .remarks {
          margin-top: 30px;
          padding: 15px;
          background: #f9f9f9;
          border: 1px solid #ddd;
        }
        .remarks h3 {
          font-size: 12px;
          font-weight: bold;
          margin: 0 0 10px 0;
        }
        .remarks p {
          margin: 5px 0;
          font-size: 10px;
          line-height: 1.5;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ccc;
          text-align: right;
        }
        .footer p {
          margin: 3px 0;
          font-size: 10px;
        }
        .footer .date {
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header with Logo and Invoice Title -->
        <div class="header">
          <div class="company-info">
            <!-- Replace this image src with your actual logo -->
            <img src="report_logo.jpeg" alt="Company Logo" class="company-logo">
            <p><strong>Resort Luxury Management</strong></p>
            <p>Your Address Line 1</p>
            <p>Your Address Line 2</p>
            <p>Email: info@yourdomain.com</p>
            <p>Website: www.yourdomain.com</p>
            <p>Phone: (XXX) XXX-XXXX</p>
          </div>
          <div class="invoice-title">
            <h1>INVOICE</h1>
          </div>
        </div>

        <!-- Customer and Invoice Details Section -->
        <div class="customer-section">
          <div class="customer-info">
            <h3>Customer:</h3>
            <p><strong>${invoice.customerName}</strong></p>
            ${invoice.email ? `<p>${invoice.email}</p>` : ''}
            ${invoice.phone ? `<p>${invoice.phone}</p>` : ''}
            ${invoice.tin ? `<p>TIN: ${invoice.tin}</p>` : ''}
            
            ${invoice.guests && invoice.guests.length > 0 ? `
            <div class="guest-list">
              <h3 style="margin-top: 15px;">Guest Name(s):</h3>
              ${invoice.guests.map(guest => `<p>${guest}</p>`).join('')}
            </div>
            ` : ''}
          </div>
          
          <div class="invoice-details">
            <p><strong>Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString()}</p>
            <p><strong>Invoice No:</strong> ${invoice.invoiceNumber}</p>
            ${invoice.confirmationNo ? `<p><strong>Confirmation No:</strong> ${invoice.confirmationNo}</p>` : ''}
            ${reference !== 'N/A' ? `<p><strong>TA REF NO:</strong> ${reference}</p>` : ''}
            <p><strong>Payment Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
          </div>
        </div>

        <!-- Items Table -->
        ${invoice.items && invoice.items.length > 0 ? `
        <table class="table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Arrival</th>
              <th>Departure</th>
              <th>Nights</th>
              <th>Qty</th>
              <th>Meal Plan</th>
              <th>Pax</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items.map(item => `
              <tr>
                <td>${item.description}</td>
                <td>${item.arrival || '-'}</td>
                <td>${item.departure || '-'}</td>
                <td>${item.nights || '-'}</td>
                <td>${item.quantity || '-'}</td>
                <td>${item.mealPlan || '-'}</td>
                <td>${item.pax || '-'}</td>
                <td>$${item.amount.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : ''}

        <!-- Totals and Bank Details Section -->
        <div class="totals-section">
          <div class="bank-details">
            <h3>BANK DETAILS:</h3>
            <p><strong>Account Name:</strong> Your Account Name</p>
            <p><strong>USD Dollar Account No:</strong> XXXX-XXXXXX-XXX</p>
            <p><strong>Name of the Bank:</strong> Your Bank Name</p>
            <p><strong>Address of the Bank:</strong> Bank Address</p>
            <p><strong>SWIFT Code:</strong> XXXXXXXX</p>
          </div>
          
          <div class="totals">
            <div class="totals-row">
              <span>TOTAL NET AMOUNT</span>
              <span>$${(invoice.totalNetAmount || invoice.amount || 0).toFixed(2)}</span>
            </div>
            ${invoice.greenTax && invoice.greenTax > 0 ? `
            <div class="totals-row">
              <span>GREEN TAX</span>
              <span>$${invoice.greenTax.toFixed(2)}</span>
            </div>
            ` : ''}
            ${invoice.tgst && invoice.tgst > 0 ? `
            <div class="totals-row">
              <span>T-GST 17.00%</span>
              <span>$${invoice.tgst.toFixed(2)}</span>
            </div>
            ` : ''}
            ${(invoice.discountValue || invoice.discountAmount) > 0 ? `
            <div class="totals-row">
              <span>DISCOUNT</span>
              <span>-$${(invoice.discountValue || invoice.discountAmount).toFixed(2)}</span>
            </div>
            ` : ''}
            <div class="totals-row final">
              <span>GRAND TOTAL WITH ALL TAXES INCLUDED</span>
              <span>$${invoice.finalAmount.toFixed(2)}</span>
            </div>
            ${invoice.paidAmount && invoice.paidAmount > 0 ? `
            <div class="totals-row">
              <span>PAID</span>
              <span>$${invoice.paidAmount.toFixed(2)}</span>
            </div>
            ` : ''}
            ${invoice.balance && invoice.balance > 0 ? `
            <div class="totals-row" style="color: #EF4444;">
              <span>BALANCE DUE</span>
              <span>$${invoice.balance.toFixed(2)}</span>
            </div>
            ` : ''}
          </div>
        </div>

        <!-- Remarks Section -->
        <div class="remarks">
          <h3>REMARKS:</h3>
          <p>* Any discrepancy found in this invoice should be advised within 24 hours.</p>
          <p>* Inclusive of all taxes and service charges.</p>
          <p>* Payment must be settled as per above deadline to avoid booking cancellation.</p>
          <p>* For Bank Transfers, all bank fees are applicable by the customer.</p>
          <p>* 4% Bank Charge applicable for Credit Card Payments.</p>
          <p>* Bank charges will be deducted in case of refund.</p>
          ${invoice.cancellationPolicy ? `<p>* ${invoice.cancellationPolicy}</p>` : '* Cancellation applied 100% within 30 Days of arrival'}
          ${invoice.notes ? `<p>* ${invoice.notes}</p>` : ''}
        </div>

        <!-- Footer -->
        <div class="footer">
          <p><strong>Prepared by:</strong> ${invoice.preparedBy || 'Accounts Department'}</p>
          <p class="date"><strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}</p>
        </div>
      </div>
    </body>
    </html>
  `;
};
// Payment Receipt Template - Professional Design
export const paymentReceiptTemplate = (payment, invoice) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.4; 
          color: #000; 
          margin: 0;
          padding: 0;
        }
        .container { 
          max-width: 800px; 
          margin: 0 auto; 
          padding: 20px;
          background: #fff;
        }
        .header { 
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 20px 0;
          border-bottom: 2px solid #000;
          margin-bottom: 30px;
        }
        .company-info {
          flex: 1;
        }
        .company-logo {
          width: 150px;
          height: auto;
          margin-bottom: 10px;
        }
        .company-info p {
          margin: 2px 0;
          font-size: 11px;
          line-height: 1.4;
        }
        .receipt-title {
          text-align: right;
          flex: 0 0 auto;
        }
        .receipt-title h1 {
          font-size: 32px;
          font-weight: bold;
          margin: 0;
          color: #000;
        }
        .customer-section {
          margin-bottom: 30px;
        }
        .customer-section h3 {
          font-size: 12px;
          margin: 0 0 10px 0;
          font-weight: bold;
        }
        .customer-section p {
          margin: 3px 0;
          font-size: 11px;
        }
        .receipt-details {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin: 30px 0;
          padding: 20px;
          background: #f9f9f9;
          border: 1px solid #ccc;
        }
        .detail-item {
          display: flex;
          flex-direction: column;
        }
        .detail-label {
          font-size: 10px;
          color: #666;
          margin-bottom: 3px;
        }
        .detail-value {
          font-size: 12px;
          font-weight: bold;
          color: #000;
        }
        .table { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 20px 0;
          font-size: 11px;
        }
        .table th { 
          background: #f0f0f0;
          color: #000;
          padding: 10px;
          text-align: left;
          font-weight: bold;
          border: 1px solid #ccc;
        }
        .table td { 
          padding: 10px;
          border: 1px solid #ccc;
        }
        .table th:last-child,
        .table td:last-child {
          text-align: right;
        }
        .summary-section {
          margin-top: 30px;
          display: flex;
          justify-content: flex-end;
        }
        .summary-box {
          width: 400px;
          border: 2px solid #000;
          padding: 20px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 12px;
        }
        .summary-row.highlight {
          background: #f0f0f0;
          margin: 0 -20px;
          padding: 8px 20px;
        }
        .summary-row.total {
          border-top: 2px solid #000;
          margin-top: 10px;
          padding-top: 10px;
          font-weight: bold;
          font-size: 14px;
        }
        .amount-paid {
          color: #10B981;
          font-weight: bold;
        }
        .balance-due {
          color: #EF4444;
          font-weight: bold;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ccc;
          text-align: center;
        }
        .footer p {
          margin: 3px 0;
          font-size: 10px;
        }
        .watermark {
          text-align: center;
          margin: 30px 0;
          padding: 20px;
          border: 3px solid #10B981;
          background: #f0fdf4;
        }
        .watermark h2 {
          color: #10B981;
          font-size: 24px;
          margin: 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header with Logo and Receipt Title -->
        <div class="header">
          <div class="company-info">
            <!-- Replace this image src with your actual logo -->
            <img src="YOUR_LOGO_URL_HERE" alt="Company Logo" class="company-logo">
            <p>Email: accounts@yourdomain.com</p>
            <p>Website: www.yourdomain.com</p>
            <p>Phone: (XXX) XXX-XXXX</p>
            <p>Phone: (XXX) XXX-XXXX</p>
          </div>
          <div class="receipt-title">
            <h1>PAYMENT RECEIPT</h1>
          </div>
        </div>

        <!-- Customer Section -->
        <div class="customer-section">
          <h3>Payment Received From:</h3>
          <p><strong>${invoice.customerName}</strong></p>
          <p>Invoice Reference: ${invoice.invoiceNumber}</p>
        </div>

        <!-- Receipt Details Grid -->
        <div class="receipt-details">
          <div class="detail-item">
            <span class="detail-label">Ref No:</span>
            <span class="detail-value">${payment.paymentId || payment.referenceNumber || 'N/A'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Payment Date:</span>
            <span class="detail-value">${new Date(payment.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Currency:</span>
            <span class="detail-value">${payment.currency || 'USD'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Payment Type:</span>
            <span class="detail-value">${payment.method || 'Bank Transfer'}</span>
          </div>
          ${payment.transactionId ? `
          <div class="detail-item">
            <span class="detail-label">Transaction ID:</span>
            <span class="detail-value">${payment.transactionId}</span>
          </div>
          ` : ''}
        </div>

        <!-- Payment Confirmation Watermark -->
        <div class="watermark">
          <h2>✓ PAYMENT RECEIVED</h2>
        </div>

        <!-- Payment Summary Table -->
        <table class="table">
          <thead>
            <tr>
              <th>Invoice Date</th>
              <th>Invoice No</th>
              <th>Payment Reference</th>
              <th>Invoice Total</th>
              <th>Amount Paid</th>
              <th>Still Owing</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${new Date(invoice.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
              <td>${invoice.invoiceNumber}</td>
              <td>${payment.paymentId || payment.referenceNumber || '-'}</td>
              <td>${payment.currency || 'USD'} ${invoice.finalAmount.toFixed(2)}</td>
              <td class="amount-paid">${payment.currency || 'USD'} ${payment.amount.toFixed(2)}</td>
              <td class="${invoice.balance > 0 ? 'balance-due' : 'amount-paid'}">${payment.currency || 'USD'} ${invoice.balance.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <!-- Summary Box -->
        <div class="summary-section">
          <div class="summary-box">
            <div class="summary-row">
              <span>Invoice Total:</span>
              <span>${payment.currency || 'USD'} ${invoice.finalAmount.toFixed(2)}</span>
            </div>
            <div class="summary-row highlight">
              <span>Previous Payments:</span>
              <span>${payment.currency || 'USD'} ${((invoice.paidAmount || 0) - payment.amount).toFixed(2)}</span>
            </div>
            <div class="summary-row">
              <span>Current Payment:</span>
              <span class="amount-paid">${payment.currency || 'USD'} ${payment.amount.toFixed(2)}</span>
            </div>
            <div class="summary-row total">
              <span>Balance Due:</span>
              <span class="${invoice.balance > 0 ? 'balance-due' : 'amount-paid'}">${payment.currency || 'USD'} ${invoice.balance.toFixed(2)}</span>
            </div>
          </div>
        </div>

        ${payment.notes ? `
        <div style="margin-top: 30px; padding: 15px; background: #f9f9f9; border-left: 4px solid #10B981;">
          <p style="margin: 0; font-size: 11px;"><strong>Notes:</strong> ${payment.notes}</p>
        </div>
        ` : ''}

        <!-- Footer -->
        <div class="footer">
          <p><strong>Thank you for your payment!</strong></p>
          <p>Please keep this receipt for your records.</p>
          <p style="margin-top: 10px;">© ${new Date().getFullYear()} Resort Luxury Management System. All rights reserved.</p>
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
            <p><strong>Invoice Date:</strong> ${invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : 'N/A'}</p>
            <p><strong>Due Date:</strong> ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}</p>
            
            <div class="amount">$${(invoice.balance || 0).toFixed(2)}</div>
            <p style="text-align: center; color: #666;">Amount Due</p>
            
            <div style="margin-top: 20px;">
              <p><strong>Original Amount:</strong> $${(invoice.finalAmount || 0).toFixed(2)}</p>
              <p><strong>Amount Paid:</strong> $${(invoice.paidAmount || 0).toFixed(2)}</p>
              <p><strong>Balance Due:</strong> $${(invoice.balance || 0).toFixed(2)}</p>
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
import PDFDocument from 'pdfkit';

// Generate Quotation PDF
export const generateQuotationPDF = async (quotation) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Header
      doc.fontSize(25).fillColor('#D4AF37').text('QUOTATION', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#000').text(`Quotation #${quotation.quotationNumber}`, { align: 'center' });
      doc.moveDown(2);

      // Customer Info
      doc.fontSize(14).fillColor('#D4AF37').text('Bill To:');
      doc.fontSize(10).fillColor('#000');
      doc.text(quotation.customerName);
      doc.text(quotation.email);
      if (quotation.phone) doc.text(quotation.phone);
      doc.moveDown();

      // Quotation Details
      doc.fontSize(14).fillColor('#D4AF37').text('Quotation Details:');
      doc.fontSize(10).fillColor('#000');
      doc.text(`Date: ${new Date(quotation.createdAt).toLocaleDateString()}`);
      if (quotation.validUntil) {
        doc.text(`Valid Until: ${new Date(quotation.validUntil).toLocaleDateString()}`);
      }
      doc.moveDown();

      // Resort & Room Info (from lead if available)
      if (quotation.lead) {
        doc.fontSize(14).fillColor('#D4AF37').text('Reservation Details:');
        doc.fontSize(10).fillColor('#000');
        if (quotation.lead.resort?.name) {
          doc.text(`Resort: ${quotation.lead.resort.name}`);
        }
        if (quotation.lead.room?.roomType) {
          doc.text(`Room Type: ${quotation.lead.room.roomType}`);
        }
        if (quotation.lead.checkIn) {
          doc.text(`Check-in: ${new Date(quotation.lead.checkIn).toLocaleDateString()}`);
        }
        if (quotation.lead.checkOut) {
          doc.text(`Check-out: ${new Date(quotation.lead.checkOut).toLocaleDateString()}`);
        }
        if (quotation.lead.adults || quotation.lead.children) {
          doc.text(`Guests: ${quotation.lead.adults || 0} Adults${quotation.lead.children ? `, ${quotation.lead.children} Children` : ''}`);
        }
        doc.moveDown();
      }

      // Pricing Details
      const totalsX = 350;
      let totalsY = doc.y + 20;

      doc.fontSize(10).fillColor('#000');
      doc.text('Base Price:', totalsX, totalsY);
      doc.text(`$${(quotation.amount || 0).toFixed(2)}`, 500, totalsY, { align: 'right' });
      totalsY += 20;

      if (quotation.discountValue > 0) {
        doc.text('Discount:', totalsX, totalsY);
        doc.text(`-$${(quotation.discountValue || 0).toFixed(2)}`, 500, totalsY, { align: 'right' });
        totalsY += 20;
      }

      doc.strokeColor('#D4AF37').lineWidth(1);
      doc.moveTo(totalsX, totalsY).lineTo(550, totalsY).stroke();
      totalsY += 10;

      doc.fontSize(16).fillColor('#D4AF37');
      doc.text('Final Amount:', totalsX, totalsY);
      doc.text(`$${(quotation.finalAmount || 0).toFixed(2)}`, 500, totalsY, { align: 'right' });

      doc.moveDown(2);

      // Notes
      if (quotation.notes) {
        doc.fontSize(12).fillColor('#D4AF37').text('Notes:');
        doc.fontSize(10).fillColor('#000').text(quotation.notes);
        doc.moveDown();
      }

      // Terms
      if (quotation.terms) {
        doc.fontSize(12).fillColor('#D4AF37').text('Terms & Conditions:');
        doc.fontSize(10).fillColor('#000').text(quotation.terms);
        doc.moveDown();
      }

      // Footer
      doc.fontSize(8).fillColor('#666').text('Thank you for your interest!', 50, doc.page.height - 50, {
        align: 'center'
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// Generate Invoice PDF
export const generateInvoicePDF = async (invoice) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Header
      doc.fontSize(25).fillColor('#D4AF37').text('INVOICE', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#000').text(`Invoice #${invoice.invoiceNumber}`, { align: 'center' });
      doc.moveDown(2);

      // Two columns: Bill To and Invoice Info
      const leftColumn = 50;
      const rightColumn = 300;

      // Bill To
      doc.fontSize(14).fillColor('#D4AF37').text('Bill To:', leftColumn);
      doc.fontSize(10).fillColor('#000');
      doc.text(invoice.customerName, leftColumn);
      doc.text(invoice.email, leftColumn);
      if (invoice.phone) doc.text(invoice.phone, leftColumn);

      // Invoice Info
      doc.fontSize(14).fillColor('#D4AF37').text('Invoice Info:', rightColumn, 150);
      doc.fontSize(10).fillColor('#000');
      doc.text(`Invoice Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, rightColumn);
      doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, rightColumn);
      if (invoice.booking?.bookingNumber) {
        doc.text(`Booking: ${invoice.booking.bookingNumber}`, rightColumn);
      }

      doc.moveDown(3);

      // Items table if present
      if (invoice.items && invoice.items.length > 0) {
        const tableTop = doc.y;
        
        // Table headers
        doc.fontSize(10).fillColor('#D4AF37');
        doc.text('Description', leftColumn, tableTop);
        doc.text('Qty', 300, tableTop);
        doc.text('Price', 370, tableTop);
        doc.text('Amount', 460, tableTop);
        
        doc.strokeColor('#D4AF37').lineWidth(1);
        doc.moveTo(leftColumn, tableTop + 15).lineTo(550, tableTop + 15).stroke();

        // Table rows
        doc.fillColor('#000');
        let itemY = tableTop + 25;
        
        invoice.items.forEach(item => {
          doc.text(item.description, leftColumn, itemY, { width: 240 });
          doc.text(item.quantity.toString(), 300, itemY);
          doc.text(`$${item.unitPrice.toFixed(2)}`, 370, itemY);
          doc.text(`$${item.amount.toFixed(2)}`, 460, itemY);
          itemY += 25;
        });

        doc.moveDown(2);
      }

      // Totals
      const totalsX = 400;
      let totalsY = doc.y + 20;

      doc.fontSize(10).fillColor('#000');
      doc.text('Base Price:', totalsX, totalsY);
      doc.text(`$${(invoice.amount || 0).toFixed(2)}`, 500, totalsY, { align: 'right' });
      totalsY += 20;

      if (invoice.discountValue > 0) {
        doc.text('Discount:', totalsX, totalsY);
        doc.text(`-$${(invoice.discountValue || 0).toFixed(2)}`, 500, totalsY, { align: 'right' });
        totalsY += 20;
      }

      doc.strokeColor('#D4AF37').lineWidth(1);
      doc.moveTo(totalsX, totalsY).lineTo(550, totalsY).stroke();
      totalsY += 10;

      doc.fontSize(14).fillColor('#D4AF37');
      doc.text('Final Amount:', totalsX, totalsY);
      doc.text(`$${(invoice.finalAmount || 0).toFixed(2)}`, 500, totalsY, { align: 'right' });
      totalsY += 25;

      // Status
      doc.fontSize(10).fillColor(invoice.status === 'Paid' ? '#10B981' : '#EF4444');
      doc.text(`Status: ${invoice.status}`, totalsX, totalsY);

      // Notes
      if (invoice.notes) {
        doc.moveDown(2);
        doc.fontSize(12).fillColor('#D4AF37').text('Notes:', leftColumn);
        doc.fontSize(10).fillColor('#000').text(invoice.notes, leftColumn);
      }

      // Footer
      doc.fontSize(8).fillColor('#666').text('Thank you for your business!', 50, doc.page.height - 50, {
        align: 'center'
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// Generate Payment Receipt PDF (for Payment model)
export const generatePaymentReceiptPDF = async (payment, invoice) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Header
      doc.fontSize(25).fillColor('#10B981').text('PAYMENT RECEIPT', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#000').text(`Receipt #${payment.paymentId}`, { align: 'center' });
      doc.moveDown(2);

      // Payment Amount (large)
      doc.fontSize(36).fillColor('#10B981').text(`$${payment.amount.toFixed(2)}`, { align: 'center' });
      doc.fontSize(12).fillColor('#666').text('Amount Paid', { align: 'center' });
      doc.moveDown(2);

      // Payment Details
      doc.fontSize(14).fillColor('#000').text('Payment Details:');
      doc.fontSize(10);
      doc.text(`Date: ${new Date(payment.date).toLocaleDateString()}`);
      doc.text(`Method: ${payment.method}`);
      if (payment.transactionId) {
        doc.text(`Transaction ID: ${payment.transactionId}`);
      }
      doc.text(`Invoice: ${invoice.invoiceNumber}`);
      doc.moveDown();

      // Customer Info
      doc.fontSize(14).text('Paid By:');
      doc.fontSize(10);
      doc.text(invoice.customerName);
      doc.text(invoice.email);
      doc.moveDown();

      // Invoice Summary
      doc.fontSize(14).text('Invoice Summary:');
      doc.fontSize(10);
      doc.text(`Invoice Total: $${invoice.finalAmount.toFixed(2)}`);
      doc.text(`Total Paid: $${invoice.paidAmount.toFixed(2)}`);
      doc.fillColor(invoice.balance > 0 ? '#EF4444' : '#10B981');
      doc.text(`Remaining Balance: $${invoice.balance.toFixed(2)}`);
      doc.moveDown();

      // Notes
      if (payment.notes) {
        doc.fillColor('#000');
        doc.fontSize(14).text('Notes:');
        doc.fontSize(10).text(payment.notes);
        doc.moveDown();
      }

      // Footer
      doc.fontSize(8).fillColor('#666').text('This is an official payment receipt.', 50, doc.page.height - 50, {
        align: 'center'
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// Generate Receipt PDF (for Receipt model)
export const generateReceiptPDF = async (receipt) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Header
      doc.fontSize(25).fillColor('#10B981').text('RECEIPT', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#000').text(`Receipt #${receipt.receiptNumber}`, { align: 'center' });
      doc.moveDown(2);

      // Two columns
      const leftColumn = 50;
      const rightColumn = 300;

      // Customer Info
      doc.fontSize(14).fillColor('#10B981').text('Received From:', leftColumn);
      doc.fontSize(10).fillColor('#000');
      doc.text(receipt.customerName, leftColumn);
      doc.text(receipt.email, leftColumn);
      if (receipt.phone) doc.text(receipt.phone, leftColumn);

      // Receipt Info
      doc.fontSize(14).fillColor('#10B981').text('Receipt Info:', rightColumn, 150);
      doc.fontSize(10).fillColor('#000');
      doc.text(`Receipt Date: ${new Date(receipt.createdAt).toLocaleDateString()}`, rightColumn);
      doc.text(`Payment Method: ${receipt.paymentMethod}`, rightColumn);
      doc.text(`Status: ${receipt.status}`, rightColumn);

      doc.moveDown(3);

      // Payment Amount (large and centered)
      doc.fontSize(36).fillColor('#10B981').text(`$${(receipt.finalAmount || 0).toFixed(2)}`, { align: 'center' });
      doc.fontSize(12).fillColor('#666').text('Amount Received', { align: 'center' });
      doc.moveDown(2);

      // Pricing Details
      const totalsX = 350;
      let totalsY = doc.y + 20;

      doc.fontSize(10).fillColor('#000');
      doc.text('Base Amount:', totalsX, totalsY);
      doc.text(`$${(receipt.amount || 0).toFixed(2)}`, 500, totalsY, { align: 'right' });
      totalsY += 20;

      if (receipt.discountValue > 0) {
        doc.text('Discount:', totalsX, totalsY);
        doc.text(`-$${(receipt.discountValue || 0).toFixed(2)}`, 500, totalsY, { align: 'right' });
        totalsY += 20;
      }

      doc.strokeColor('#10B981').lineWidth(1);
      doc.moveTo(totalsX, totalsY).lineTo(550, totalsY).stroke();
      totalsY += 10;

      doc.fontSize(14).fillColor('#10B981');
      doc.text('Total Received:', totalsX, totalsY);
      doc.text(`$${(receipt.finalAmount || 0).toFixed(2)}`, 500, totalsY, { align: 'right' });

      // Notes
      if (receipt.notes) {
        doc.moveDown(2);
        doc.fontSize(12).fillColor('#10B981').text('Notes:', leftColumn);
        doc.fontSize(10).fillColor('#000').text(receipt.notes, leftColumn);
      }

      // Footer
      doc.fontSize(8).fillColor('#666').text('This is an official receipt for payment received.', 50, doc.page.height - 50, {
        align: 'center'
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// Generate Report PDF
export const generateReportPDF = async (title, data, options = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Header
      doc.fontSize(20).fillColor('#D4AF37').text(title.toUpperCase(), { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#666').text(`Generated on ${new Date().toLocaleDateString()}`, { align: 'center' });
      
      if (options.period) {
        doc.text(`Period: ${options.period}`, { align: 'center' });
      }
      
      doc.moveDown(2);

      // Report content (simplified - would be expanded based on report type)
      doc.fontSize(12).fillColor('#000');
      doc.text(JSON.stringify(data, null, 2));

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
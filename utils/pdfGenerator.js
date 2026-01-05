import PDFDocument from 'pdfkit';
import axios from 'axios';

// Generate Quotation PDF with comprehensive booking details
export const generateQuotationPDF = async (quotation) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 40,
        size: 'A4',
        bufferPages: true
      });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Helper function to download and add image
      const addImage = async (imageUrl, x, y, options = {}) => {
        try {
          const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
          const imageBuffer = Buffer.from(response.data);
          doc.image(imageBuffer, x, y, options);
        } catch (error) {
          console.log('Error loading image:', error.message);
        }
      };

      // ========== HEADER ==========
      // Company Logo Area (placeholder - you can add logo)
      doc.rect(40, 30, 515, 80).fillAndStroke('#1a1a2e', '#D4AF37');
      
      // Company Name
      doc.fontSize(28).fillColor('#D4AF37').font('Helvetica-Bold')
        .text('CROWN VOYAGES', 50, 50, { align: 'center' });
      
      doc.fontSize(10).fillColor('#ffffff').font('Helvetica')
        .text('Luxury Travel & Resort Management', 50, 85, { align: 'center' });

      doc.moveDown(3);

      // ========== QUOTATION TITLE ==========
      doc.rect(40, doc.y, 515, 50).fill('#f8f9fa');
      const titleY = doc.y + 10;
      doc.fontSize(22).fillColor('#1a1a2e').font('Helvetica-Bold')
        .text('TRAVEL QUOTATION', 40, titleY, { align: 'center' });
      doc.fontSize(11).fillColor('#666').font('Helvetica')
        .text(`Quotation #${quotation.quotationNumber}`, 40, titleY + 28, { align: 'center' });

      doc.y += 60;
      doc.moveDown(1);

      // ========== CUSTOMER & QUOTATION INFO ==========
      const sectionY = doc.y;
      
      // Left: Customer Details
      doc.fontSize(12).fillColor('#D4AF37').font('Helvetica-Bold')
        .text('PREPARED FOR:', 40, sectionY);
      doc.fontSize(10).fillColor('#000').font('Helvetica')
        .text(quotation.customerName, 40, sectionY + 18)
        .text(quotation.email, 40, sectionY + 33)
        .text(quotation.phone || 'N/A', 40, sectionY + 48);

      // Right: Quotation Details
      doc.fontSize(12).fillColor('#D4AF37').font('Helvetica-Bold')
        .text('QUOTATION DETAILS:', 320, sectionY);
      doc.fontSize(10).fillColor('#000').font('Helvetica')
        .text(`Date: ${new Date(quotation.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 320, sectionY + 18)
        .text(`Valid Until: ${quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}`, 320, sectionY + 33)
        .text(`Status: ${quotation.status || 'Draft'}`, 320, sectionY + 48);

      doc.y = sectionY + 80;
      doc.moveDown(1);

      // ========== ALL BOOKINGS DETAILS ==========
      if (quotation.lead?.savedBookings && quotation.lead.savedBookings.length > 0) {
        doc.fontSize(14).fillColor('#D4AF37').font('Helvetica-Bold')
          .text('YOUR SELECTED PROPERTIES & ROOMS', 40, doc.y);
        doc.moveDown(0.5);
        
        doc.strokeColor('#D4AF37').lineWidth(2)
          .moveTo(40, doc.y).lineTo(555, doc.y).stroke();
        doc.moveDown(1);

        for (let i = 0; i < quotation.lead.savedBookings.length; i++) {
          const booking = quotation.lead.savedBookings[i];
          
          // Check if we need a new page
          if (doc.y > 650) {
            doc.addPage();
            doc.y = 40;
          }

          // Booking Header
          doc.rect(40, doc.y, 515, 25).fill('#1a1a2e');
          doc.fontSize(11).fillColor('#D4AF37').font('Helvetica-Bold')
            .text(`BOOKING ${i + 1} OF ${quotation.lead.savedBookings.length}`, 50, doc.y - 18, { continued: true })
            .fillColor('#fff')
            .text(` • ${booking.totalRooms || 1} Room(s)`, { align: 'left' });
          
          doc.y += 30;

          // Resort Details Section
          doc.rect(40, doc.y, 515, 25).fill('#e8f5e9');
          doc.fontSize(10).fillColor('#2e7d32').font('Helvetica-Bold')
            .text('🏨 RESORT DETAILS', 50, doc.y + 8);
          doc.y += 30;

          doc.fontSize(9).fillColor('#000').font('Helvetica-Bold')
            .text(`${booking.resortName}`, 50, doc.y);
          doc.fontSize(8).fillColor('#666').font('Helvetica')
            .text(`${booking.resortLocation || 'Location not specified'}`, 50, doc.y + 12);
          
          // Star Rating
          if (booking.resortStarRating) {
            const stars = '★'.repeat(booking.resortStarRating) + '☆'.repeat(5 - booking.resortStarRating);
            doc.fontSize(10).fillColor('#FFD700').text(stars, 50, doc.y + 24);
          }
          
          doc.y += 40;

          // Resort Images (up to 3 in a row)
          if (booking.resortImages && booking.resortImages.length > 0) {
            const imageY = doc.y;
            const imageWidth = 90;
            const imageHeight = 60;
            const imagesToShow = Math.min(booking.resortImages.length, 3);
            
            for (let j = 0; j < imagesToShow; j++) {
              try {
                await addImage(booking.resortImages[j], 50 + (j * 100), imageY, { 
                  width: imageWidth, 
                  height: imageHeight,
                  fit: [imageWidth, imageHeight]
                });
              } catch (error) {
                console.log('Error adding resort image:', error.message);
              }
            }
            
            doc.y = imageY + imageHeight + 10;
          }

          // Resort Description & Amenities
          if (booking.resortDescription) {
            doc.fontSize(8).fillColor('#333').font('Helvetica')
              .text(booking.resortDescription.substring(0, 200) + (booking.resortDescription.length > 200 ? '...' : ''), 50, doc.y, { width: 500 });
            doc.moveDown(0.5);
          }

          if (booking.resortAmenities && booking.resortAmenities.length > 0) {
            doc.fontSize(8).fillColor('#666').font('Helvetica')
              .text(`Amenities: ${booking.resortAmenities.slice(0, 6).join(' • ')}`, 50, doc.y);
            doc.moveDown(1);
          }

          // Room Details Section
          doc.rect(40, doc.y, 515, 25).fill('#e3f2fd');
          doc.fontSize(10).fillColor('#1565c0').font('Helvetica-Bold')
            .text('🛏️ ROOM DETAILS', 50, doc.y + 8);
          doc.y += 30;

          doc.fontSize(9).fillColor('#000').font('Helvetica-Bold')
            .text(`${booking.roomName}`, 50, doc.y);
          doc.fontSize(8).fillColor('#666').font('Helvetica')
            .text(`${booking.roomType || ''} • ${booking.roomSize || 'N/A'} sq m • ${booking.roomBedType || 'N/A'}`, 50, doc.y + 12)
            .text(`Capacity: ${booking.roomMaxAdults || 'N/A'} Adults, ${booking.roomMaxChildren || 'N/A'} Children`, 50, doc.y + 24);
          
          doc.y += 40;

          // Room Images (up to 3 in a row)
          if (booking.roomImages && booking.roomImages.length > 0) {
            const imageY = doc.y;
            const imageWidth = 90;
            const imageHeight = 60;
            const imagesToShow = Math.min(booking.roomImages.length, 3);
            
            for (let j = 0; j < imagesToShow; j++) {
              try {
                await addImage(booking.roomImages[j], 50 + (j * 100), imageY, { 
                  width: imageWidth, 
                  height: imageHeight,
                  fit: [imageWidth, imageHeight]
                });
              } catch (error) {
                console.log('Error adding room image:', error.message);
              }
            }
            
            doc.y = imageY + imageHeight + 10;
          }

          // Room Amenities
          if (booking.roomAmenities && booking.roomAmenities.length > 0) {
            doc.fontSize(8).fillColor('#666').font('Helvetica')
              .text(`Room Amenities: ${booking.roomAmenities.slice(0, 6).join(' • ')}`, 50, doc.y);
            doc.moveDown(0.5);
          }

          // Stay Details
          doc.rect(40, doc.y, 515, 60).fill('#fff9e6');
          const stayY = doc.y + 10;
          doc.fontSize(9).fillColor('#000').font('Helvetica-Bold')
            .text('CHECK-IN:', 50, stayY)
            .fillColor('#666').font('Helvetica')
            .text(new Date(booking.checkIn).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 50, stayY + 14);
          
          doc.fontSize(9).fillColor('#000').font('Helvetica-Bold')
            .text('CHECK-OUT:', 200, stayY)
            .fillColor('#666').font('Helvetica')
            .text(new Date(booking.checkOut).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 200, stayY + 14);

          const nights = Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24));
          doc.fontSize(9).fillColor('#000').font('Helvetica-Bold')
            .text('DURATION:', 350, stayY)
            .fillColor('#666').font('Helvetica')
            .text(`${nights} Night(s)`, 350, stayY + 14);
          
          doc.fontSize(9).fillColor('#000').font('Helvetica-Bold')
            .text('MEAL PLAN:', 50, stayY + 32)
            .fillColor('#666').font('Helvetica')
            .text(booking.mealPlan || 'Not specified', 50, stayY + 46);

          doc.fontSize(9).fillColor('#000').font('Helvetica-Bold')
            .text('GUESTS:', 200, stayY + 32)
            .fillColor('#666').font('Helvetica')
            .text(`${booking.totalAdults} Adult(s), ${booking.totalChildren} Child(ren)`, 200, stayY + 46);
          
          doc.y += 70;
          doc.moveDown(1);

          // Separator between bookings
          if (i < quotation.lead.savedBookings.length - 1) {
            doc.strokeColor('#D4AF37').lineWidth(1).dash(5, { space: 3 })
              .moveTo(40, doc.y).lineTo(555, doc.y).stroke().undash();
            doc.moveDown(1);
          }
        }
      }

      // ========== PASSENGER DETAILS ==========
      if (quotation.lead?.passengerDetails && quotation.lead.passengerDetails.length > 0) {
        if (doc.y > 600) {
          doc.addPage();
          doc.y = 40;
        }

        doc.moveDown(1);
        doc.fontSize(14).fillColor('#D4AF37').font('Helvetica-Bold')
          .text('PASSENGER INFORMATION', 40, doc.y);
        doc.moveDown(0.5);
        
        doc.strokeColor('#D4AF37').lineWidth(2)
          .moveTo(40, doc.y).lineTo(555, doc.y).stroke();
        doc.moveDown(1);

        for (const room of quotation.lead.passengerDetails) {
          if (doc.y > 680) {
            doc.addPage();
            doc.y = 40;
          }

          doc.rect(40, doc.y, 515, 20).fill('#f3e5f5');
          doc.fontSize(10).fillColor('#6a1b9a').font('Helvetica-Bold')
            .text(`Room ${room.roomNumber} Passengers`, 50, doc.y + 6);
          doc.y += 25;

          // Adults
          if (room.adults && room.adults.length > 0) {
            doc.fontSize(9).fillColor('#000').font('Helvetica-Bold')
              .text('Adults:', 50, doc.y);
            doc.moveDown(0.3);

            room.adults.forEach((adult, idx) => {
              doc.fontSize(8).fillColor('#333').font('Helvetica')
                .text(`${idx + 1}. ${adult.name || 'N/A'}`, 60, doc.y)
                .text(`Passport: ${adult.passport || 'N/A'} | Country: ${adult.country || 'N/A'}`, 70, doc.y + 10, { width: 470 });
              if (adult.flightNumber) {
                doc.text(`Flight: ${adult.flightNumber}`, 70, doc.y + 20);
              }
              doc.y += 35;
            });
          }

          // Children
          if (room.children && room.children.length > 0) {
            doc.fontSize(9).fillColor('#000').font('Helvetica-Bold')
              .text('Children:', 50, doc.y);
            doc.moveDown(0.3);

            room.children.forEach((child, idx) => {
              doc.fontSize(8).fillColor('#333').font('Helvetica')
                .text(`${idx + 1}. ${child.name || 'N/A'} (Age: ${child.age || 'N/A'})`, 60, doc.y)
                .text(`Passport: ${child.passport || 'N/A'} | Country: ${child.country || 'N/A'}`, 70, doc.y + 10);
              doc.y += 30;
            });
          }

          doc.moveDown(0.5);
        }
      }

      // ========== PRICING BREAKDOWN ==========
      if (doc.y > 620) {
        doc.addPage();
        doc.y = 40;
      }

      doc.moveDown(2);
      doc.fontSize(14).fillColor('#D4AF37').font('Helvetica-Bold')
        .text('PRICING SUMMARY', 40, doc.y);
      doc.moveDown(0.5);
      
      doc.strokeColor('#D4AF37').lineWidth(2)
        .moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(1);

      // Pricing box
      const pricingBoxY = doc.y;
      doc.rect(40, pricingBoxY, 515, 100).fill('#f8f9fa');

      const priceY = pricingBoxY + 15;
      doc.fontSize(10).fillColor('#000').font('Helvetica')
        .text('Original Price:', 60, priceY)
        .font('Helvetica-Bold')
        .text(`$${(quotation.amount || 0).toFixed(2)}`, 450, priceY, { align: 'right' });

      if (quotation.discountValue && quotation.discountValue > 0) {
        doc.fontSize(10).fillColor('#2e7d32').font('Helvetica')
          .text('Discount:', 60, priceY + 25)
          .font('Helvetica-Bold')
          .text(`-$${(quotation.discountValue || 0).toFixed(2)}`, 450, priceY + 25, { align: 'right' });
      }

      doc.strokeColor('#D4AF37').lineWidth(1)
        .moveTo(60, priceY + 50).lineTo(535, priceY + 50).stroke();

      doc.fontSize(14).fillColor('#D4AF37').font('Helvetica-Bold')
        .text('FINAL AMOUNT:', 60, priceY + 60)
        .fontSize(16)
        .text(`$${(quotation.finalAmount || 0).toFixed(2)}`, 450, priceY + 58, { align: 'right' });

      doc.y = pricingBoxY + 110;
      doc.moveDown(2);

      // ========== NOTES ==========
      if (quotation.notes) {
        doc.fontSize(12).fillColor('#D4AF37').font('Helvetica-Bold')
          .text('ADDITIONAL NOTES:', 40, doc.y);
        doc.moveDown(0.5);
        doc.fontSize(9).fillColor('#333').font('Helvetica')
          .text(quotation.notes, 40, doc.y, { width: 515, align: 'justify' });
        doc.moveDown(1.5);
      }

      // ========== TERMS & CONDITIONS ==========
      if (doc.y > 650) {
        doc.addPage();
        doc.y = 40;
      }

      doc.fontSize(12).fillColor('#D4AF37').font('Helvetica-Bold')
        .text('TERMS & CONDITIONS:', 40, doc.y);
      doc.moveDown(0.5);
      
      const defaultTerms = `1. This quotation is valid until ${quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : 'the specified date'}.\n2. All prices are quoted in USD and subject to availability at the time of booking.\n3. A deposit of 30% is required to confirm the reservation.\n4. Full payment must be received 30 days prior to check-in date.\n5. Cancellation policy applies as per the resort's standard terms.\n6. Prices may vary based on season, availability, and special events.\n7. Additional charges may apply for extra services, meals, or activities not included in the package.\n8. Travel insurance is highly recommended for all guests.`;
      
      doc.fontSize(8).fillColor('#333').font('Helvetica')
        .text(quotation.terms || defaultTerms, 40, doc.y, { width: 515, align: 'justify' });

      // ========== FOOTER ==========
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        
        // Footer background
        doc.rect(0, doc.page.height - 60, doc.page.width, 60).fill('#1a1a2e');
        
        // Footer content
        doc.fontSize(9).fillColor('#D4AF37').font('Helvetica-Bold')
          .text('CROWN VOYAGES', 40, doc.page.height - 45, { align: 'center' });
        doc.fontSize(7).fillColor('#ffffff').font('Helvetica')
          .text('Email: info@crownvoyages.com | Phone: +1 (555) 123-4567 | www.crownvoyages.com', 40, doc.page.height - 30, { align: 'center' });
        
        // Page numbers
        doc.fontSize(7).fillColor('#999')
          .text(`Page ${i + 1} of ${pageCount}`, 40, doc.page.height - 15, { align: 'center' });
      }

      doc.end();
    } catch (error) {
      console.error('Error generating quotation PDF:', error);
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
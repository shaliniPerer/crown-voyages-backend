import PDFDocument from 'pdfkit';
import axios from 'axios';
import path from 'path';
import fs from 'fs';

// Generate Quotation PDF with comprehensive booking details
export const generateQuotationPDF = async (quotation) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 40, 
        size: 'A4',
        bufferPages: true,
        autoFirstPage: true
      });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Helper function to download and add image
      const addImage = async (imageUrl, x, y, options = {}) => {
        try {
          if (!imageUrl || !imageUrl.startsWith('http')) return;
          const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
          doc.image(Buffer.from(response.data), x, y, options);
        } catch (error) {
          console.log('Error loading image:', error.message);
        }
      };

      // Tailwind-matched Palette
      const tw = {
        primary: '#D4AF37', // Gold
        text: '#1F2937', // Gray-800
        textLight: '#4B5563', // Gray-600
        textDark: '#111827', // Gray-900
        white: '#FFFFFF',
        border: '#E5E7EB', // Gray-200
        
        // Green Theme (Booking Cards)
        green50: '#F0FDF4',
        green100: '#DCFCE7',
        green200: '#BBF7D0', 
        green300: '#86EFAC',
        green500: '#22C55E',
        green600: '#16A34A',
        green700: '#15803D',
        green800: '#166534',

        // Blue Theme (Summary)
        blue50: '#EFF6FF',
        blue100: '#DBEAFE', 
        blue200: '#BFDBFE',
        blue300: '#93C5FD',
        blue600: '#2563EB',
        blue700: '#1D4ED8',
        blue900: '#1E3A8A',

        // Purple Theme (Passengers)
        purple50: '#FAF5FF',
        purple100: '#F3E8FF',
        purple200: '#E9D5FF',
        purple600: '#9333EA',
        purple700: '#7E22CE',
        
        // Orange/Yellow (Stars/Warn)
        yellow400: '#FACC15',
        orange600: '#EA580C',
        purple50: '#FAF5FF',
        purple600: '#9333EA',
      };

      const checkPageBreak = (heightNeeded) => {
        if (doc.y + heightNeeded > doc.page.height - 50) {
          doc.addPage();
          doc.y = 40;
          return true;
        }
        return false;
      };

      // --- HEADER ---
      try {
        const logoPaths = [
          path.join(process.cwd(), 'client', 'src', 'assets', 'report_logo.png'),
          path.join(process.cwd(), '..', 'client', 'src', 'assets', 'report_logo.png'),
          path.join(process.cwd(), 'server', 'uploads', 'logo.png'),
          path.join(process.cwd(), 'uploads', 'logo.png')
        ];
        let logoPath = null;
        for (const p of logoPaths) {
          if (fs.existsSync(p)) { logoPath = p; break; }
        }
        if (logoPath) {
          doc.image(logoPath, 40, 30, { width: 140 });
        } else {
          doc.fontSize(24).font('Helvetica-Bold').fillColor(tw.primary).text('CROWN VOYAGES', 40, 40);
        }
      } catch (e) {
        doc.fontSize(24).font('Helvetica-Bold').fillColor(tw.primary).text('CROWN VOYAGES', 40, 40);
      }
      doc.fontSize(10).font('Helvetica').fillColor(tw.textLight).text('Luxury Travel Management', 40, 65);

      const headerRightX = 350;
      doc.fontSize(10).font('Helvetica').fillColor(tw.text)
         .text('123 Luxury Ave, Suite 100', headerRightX, 40, { align: 'right', width: 200 });
      doc.text('New York, NY 10001', headerRightX, 55, { align: 'right', width: 200 });
      doc.text('+1 (555) 123-4567', headerRightX, 70, { align: 'right', width: 200 });
      doc.text('concierge@crownvoyages.com', headerRightX, 85, { align: 'right', width: 200 });

      doc.moveTo(40, 105).lineTo(555, 105).strokeColor(tw.border).lineWidth(1).stroke();
      doc.y = 130;

      // --- CLIENT & QUOTE INFO ---
      doc.fontSize(10).font('Helvetica-Bold').fillColor(tw.primary).text('PREPARED FOR', 40, doc.y);
      
      const bookingRef = quotation.lead?.booking?.bookingNumber;
      if (bookingRef) {
          doc.fontSize(10).font('Helvetica-Bold').fillColor(tw.textLight).text(`Booking Ref: ${bookingRef}`, 40, doc.y);
      }
      
      doc.moveDown(0.5);
      doc.fontSize(16).font('Helvetica-Bold').fillColor(tw.textDark).text(quotation.customerName);
      doc.fontSize(12).font('Helvetica').fillColor(tw.textLight).text(quotation.email);
      if (quotation.phone) doc.text(quotation.phone);

      const detailsY = 130;
      doc.fontSize(10).font('Helvetica-Bold').fillColor(tw.primary).text('QUOTATION DETAILS', 350, detailsY, { align: 'right', width: 200 });
      doc.fontSize(10).font('Helvetica').fillColor(tw.textDark)
         .text(`Quoatation Number: ${quotation.quotationNumber}`, 350, detailsY + 20, { align: 'right', width: 200 });
      doc.text(`Date: ${new Date(quotation.createdAt).toLocaleDateString()}`, 350, detailsY + 35, { align: 'right', width: 200 });
      
      doc.y = 220;

      // --- BOOKING REQUESTS REVIEW ---
      // Moved header inside loop to ensure it sticks with content

      if (quotation.lead?.savedBookings && quotation.lead.savedBookings.length > 0) {
        
        for (let i = 0; i < quotation.lead.savedBookings.length; i++) {
          const booking = quotation.lead.savedBookings[i];
          
          // Compact Layout Calculations
          let cardH = 30; // Base padding reduced
          
          // Resort Section
          cardH += 35; // Header
          if (booking.resortImages && booking.resortImages.length > 0) cardH += 75; // Images (60 + 15)
          cardH += 35; // Name + Location
          
          const descText = booking.resortDescription ? (booking.resortDescription.length > 300 ? booking.resortDescription.substring(0, 300) + '...' : booking.resortDescription) : '';
          if (descText) cardH += doc.heightOfString(descText, { width: 475 }) + 10;
          else cardH += 15;

          // Room Section
          cardH += 25; // Divider + Header
          if (booking.roomImages && booking.roomImages.length > 0) cardH += 75; // Images
          cardH += 45; // Name + Specs
          if (booking.roomAmenities && booking.roomAmenities.length > 0) cardH += 35; // Amenities
          
          // Stay Details
          cardH += 130; // Grid + Footer reduced
          
          // Header Height (only for first item)
          const headerHeight = (i === 0) ? 40 : 0;

          // Check Page Break including header
          checkPageBreak(cardH + headerHeight); 
          
          // Print Header AFTER potential page break
          if (i === 0) {
             doc.fontSize(16).font('Helvetica-Bold').fillColor(tw.textDark).text('Review All Booking Requests', 40, doc.y);
             doc.y += 10; 
          }

          const cardX = 40;
          const cardWidth = 515;
          const cardStartY = doc.y;

          // Green Card Container
          doc.roundedRect(cardX, cardStartY, cardWidth, cardH, 12).fillAndStroke(tw.green50, tw.green300);

          // Header
          doc.fillColor(tw.textDark).fontSize(12).font('Helvetica-Bold')
             .text(`Booking ${i + 1}`, cardX + 20, cardStartY + 15);
          
          // Badge
          const badgeW = 70;
          doc.roundedRect(cardX + cardWidth - badgeW - 20, cardStartY + 12, badgeW, 18, 9).fill(tw.green500);
          doc.fillColor(tw.white).fontSize(8).font('Helvetica-Bold')
             .text('Confirmed', cardX + cardWidth - badgeW - 20, cardStartY + 17, { width: badgeW, align: 'center' });

          // --- RESORT SECTION ---
          let currentY = cardStartY + 35;
          
          doc.fillColor(tw.textDark).fontSize(10).font('Helvetica-Bold')
             .text('Resort Information', cardX + 20, currentY);
          currentY += 15;
          
          // Resort Images
          const imgW = 90; 
          const imgH = 60; // Compact
          const gap = 12;
          
          if (booking.resortImages && booking.resortImages.length > 0) {
             let imgX = cardX + 20;
             const maxImages = 4;
             for (let idx = 0; idx < Math.min(booking.resortImages.length, maxImages); idx++) {
                await addImage(booking.resortImages[idx], imgX, currentY, { width: imgW, height: imgH, fit: [imgW, imgH] });
                doc.rect(imgX, currentY, imgW, imgH).strokeColor(tw.green300).lineWidth(1).stroke();
                imgX += imgW + gap;
             }
             currentY += imgH + 12;
          } else {
             doc.fillColor(tw.textLight).fontSize(9).text('No Images Available', cardX + 20, currentY);
             currentY += 15;
          }

          // Resort Details
          const rTextX = cardX + 20;
          doc.fillColor(tw.textDark).fontSize(13).font('Helvetica-Bold')
             .text(booking.resortName, rTextX, currentY);
          
          doc.fillColor(tw.textLight).fontSize(9).font('Helvetica')
             .text(` ${booking.resortLocation || 'Location'}`, rTextX, currentY + 16);
             
          // Stars
          if(booking.resortStarRating) {
             const rating = Math.min(5, Math.max(1, parseInt(booking.resortStarRating) || 0));
             doc.save();
             doc.font('ZapfDingbats').fillColor(tw.yellow400).fontSize(10);
             let starX = rTextX + 350;
             const starY = currentY; 
             for(let s = 0; s < rating; s++) {
                doc.text('H', starX, starY, { lineBreak: false });
                starX += 12;
             }
             doc.restore();
          }

          // Desc
          if(descText) {
             doc.fillColor(tw.textLight).fontSize(8).font('Helvetica')
                .text(descText, rTextX, currentY + 30, { width: 475, align: 'justify' });
             currentY += 30 + doc.heightOfString(descText, { width: 475 });
          } else {
             currentY += 25;
          }
          currentY += 8;

          // --- ROOM SECTION ---
          doc.moveTo(cardX + 20, currentY).lineTo(cardX + cardWidth - 20, currentY).strokeColor(tw.green300).stroke();
          currentY += 8;

          doc.fillColor(tw.textDark).fontSize(10).font('Helvetica-Bold')
             .text('Room Details', cardX + 20, currentY);
          currentY += 15;

          // Room Images
          if (booking.roomImages && booking.roomImages.length > 0) {
             let imgX = cardX + 20;
             const maxImages = 4;
             for (let idx = 0; idx < Math.min(booking.roomImages.length, maxImages); idx++) {
                await addImage(booking.roomImages[idx], imgX, currentY, { width: imgW, height: imgH, fit: [imgW, imgH] });
                doc.rect(imgX, currentY, imgW, imgH).strokeColor(tw.green300).lineWidth(1).stroke();
                imgX += imgW + gap;
             }
             currentY += imgH + 12;
          } else {
             doc.fillColor(tw.textLight).fontSize(9).text('No Room Images', cardX + 20, currentY);
             currentY += 15;
          }

          // Room Text
          doc.fillColor(tw.textDark).fontSize(12).font('Helvetica-Bold')
             .text(booking.roomName, cardX + 20, currentY);
          
          const roomSpecsY = currentY + 16;
          doc.fillColor(tw.textLight).fontSize(9).font('Helvetica')
             .text(`Type: ${booking.roomType || 'Standard'}  •  Bed: ${booking.roomBedType || 'Standard'}  •  Size: ${booking.roomSize ? booking.roomSize + ' m²' : 'N/A'}`, cardX + 20, roomSpecsY);

          // Amenities
          if (booking.roomAmenities && booking.roomAmenities.length > 0) {
             doc.fillColor(tw.green700).fontSize(9).font('Helvetica-Bold').text('Amenities:', cardX + 20, roomSpecsY + 15);
             doc.fillColor(tw.textLight).font('Helvetica')
                .text(booking.roomAmenities.slice(0, 12).join(', '), cardX + 75, roomSpecsY + 15, { width: 420 });
             currentY = roomSpecsY + 28;
          } else {
             currentY = roomSpecsY + 15;
          }
          currentY += 8;

          // --- STAY & GUEST GRID ---
          const gridY = currentY;
          doc.fillColor(tw.textDark).fontSize(10).font('Helvetica-Bold')
             .text('Stay Details', cardX + 20, gridY);
          doc.moveTo(cardX + 20, gridY + 12).lineTo(cardX + 240, gridY + 12).strokeColor(tw.green300).stroke();
          
          let rowY = gridY + 20;
          const stayRows = [
            ['Check-in:', new Date(booking.checkIn).toLocaleDateString()],
            ['Check-out:', new Date(booking.checkOut).toLocaleDateString()],
            ['Duration:', `${Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (86400000))} nights`],
            ['Meal Plan:', booking.mealPlan || 'Not selected']
          ];

          stayRows.forEach(([label, value]) => {
             doc.fillColor(tw.textLight).fontSize(9).font('Helvetica').text(label, cardX + 20, rowY);
             doc.fillColor(tw.textDark).font('Helvetica-Bold').text(value, cardX + 100, rowY);
             rowY += 14;
          });

          // RIGHT: Guest Configuration
          const guestColX = cardX + 260;
          doc.fillColor(tw.textDark).fontSize(10).font('Helvetica-Bold')
             .text('Guest Configuration', guestColX, gridY);
          doc.moveTo(guestColX, gridY + 12).lineTo(guestColX + 220, gridY + 12).strokeColor(tw.green300).stroke();

          // Room Config Cards
          let roomCardX = guestColX;
          let roomCardY = gridY + 20;
          
          if (booking.roomConfigs) {
             booking.roomConfigs.forEach((config, idx) => {
               doc.fillColor(tw.green700).fontSize(9).font('Helvetica-Bold')
                  .text(`Room ${idx + 1}: `, roomCardX, roomCardY);
               doc.fillColor(tw.textDark).font('Helvetica')
                  .text(`${config.adults} Adults, ${config.children} Children`, roomCardX + 50, roomCardY);
               
               roomCardY += 14;
               if (config.childrenAges && config.childrenAges.length > 0) {
                 doc.fillColor(tw.textLight).fontSize(8)
                    .text(`(Ages: ${config.childrenAges.join(', ')})`, roomCardX + 50, roomCardY - 2);
                 roomCardY += 10;
               }
             });
          }

          // Total Footer
          const totalY = Math.max(rowY, roomCardY) + 5;
          doc.roundedRect(cardX + 20, totalY, cardWidth - 40, 20, 6).fill(tw.green200);
          doc.fillColor(tw.green800).fontSize(9).font('Helvetica-Bold')
             .text(`Total Guests: ${booking.totalAdults} Adults, ${booking.totalChildren} Children`, cardX + 30, totalY + 6);

          doc.y = totalY + 30; 
        }
      }

      // --- GRAND TOTAL SUMMARY ---
      checkPageBreak(120);
      doc.y += 10;
      doc.roundedRect(40, doc.y, 515, 100, 12).fillAndStroke(tw.blue50, tw.blue300);
      
      const sumStartY = doc.y;
      doc.fillColor(tw.blue900).fontSize(12).font('Helvetica-Bold')
         .text('Grand Total Summary', 60, sumStartY + 15);

      if (quotation.lead?.savedBookings) {
        const stats = {
          bookings: quotation.lead.savedBookings.length,
          rooms: quotation.lead.savedBookings.reduce((s,b)=>s+b.totalRooms,0),
          adults: quotation.lead.savedBookings.reduce((s,b)=>s+b.totalAdults,0),
          children: quotation.lead.savedBookings.reduce((s,b)=>s+b.totalChildren,0),
        };

        let statX = 60;
        const statW = 100;
        const statGap = 15;

        Object.entries(stats).forEach(([key, val]) => {
           // White box
           doc.roundedRect(statX, sumStartY + 40, statW, 45, 8).fillAndStroke(tw.white, tw.blue200);
           
           doc.fillColor(tw.blue600).fontSize(16).font('Helvetica-Bold')
              .text(val.toString(), statX, sumStartY + 50, { width: statW, align: 'center' });
           doc.fillColor(tw.textLight).fontSize(8).font('Helvetica')
              .text(`Total ${key.charAt(0).toUpperCase() + key.slice(1)}`, statX, sumStartY + 70, { width: statW, align: 'center' });
           
           statX += statW + statGap;
        });
      }
      doc.y = sumStartY + 120;


      // --- PRIMARY GUEST INFO (Similar to ReviewStep Hotel Info) ---
      // We'll just show the User info summary here as "Primary Guest Information"
      checkPageBreak(100);
      doc.roundedRect(40, doc.y, 515, 90, 10).fill(tw.white).stroke(tw.border);
      const guestBoxY = doc.y;
      
      doc.fillColor(tw.textDark).fontSize(12).font('Helvetica-Bold')
         .text('Primary Guest Information', 60, guestBoxY + 15);
      
      doc.fontSize(10).font('Helvetica').fillColor(tw.textLight)
         .text('Name:', 60, guestBoxY + 40)
         .text('Email:', 60, guestBoxY + 55)
         .text('Phone:', 60, guestBoxY + 70);
      
      doc.font('Helvetica-Bold').fillColor(tw.textDark)
         .text(quotation.customerName, 120, guestBoxY + 40)
         .text(quotation.email, 120, guestBoxY + 55)
         .text(quotation.phone || '-', 120, guestBoxY + 70);

      doc.y += 110;


      // --- INVESTMENT SUMMARY (Bottom) ---
      checkPageBreak(180);
      doc.y += 10;
      doc.font('Helvetica-Bold').fontSize(16).fillColor(tw.textDark).text('Total Amount', 40, doc.y);
      
      const priceY = doc.y + 25;
      doc.moveTo(40, priceY - 5).lineTo(555, priceY - 5).strokeColor(tw.border).stroke();

      doc.fontSize(12).font('Helvetica').fillColor(tw.text).text('Subtotal', 40, priceY);
      doc.text(`$${(quotation.amount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`, 450, priceY, { align: 'right' });

      if (quotation.discountValue > 0) {
         doc.fillColor(tw.green600).text('Discount', 40, priceY + 20);
         doc.text(`-$${(quotation.discountValue || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`, 450, priceY + 20, { align: 'right' });
      }

      doc.roundedRect(350, priceY + 45, 200, 40, 8).fill(tw.primary);
      doc.font('Helvetica-Bold').fontSize(18).fillColor(tw.white)
         .text(`$${(quotation.finalAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`, 370, priceY + 57, { align: 'center', width: 160 });

      doc.y = priceY + 90;

      // --- TERMS & CONDITIONS ---
      checkPageBreak(300); 
      doc.y += 20;

      doc.font('Helvetica-Bold').fontSize(14).fillColor(tw.textDark).text('Terms & Conditions', 40, doc.y);
      doc.y += 15;

      const termsList = [
        'A booking is considered confirmed only after full or partial payment is received and a confirmation email or message is issued.',
        'Payments must be made according to the agreed schedule. Failure to complete payment on time may result in automatic cancellation without prior notice.',
        'All prices are subject to availability and may change due to taxes, fuel charges, exchange rates, or supplier price updates before confirmation.',
        'Cancellation requests must be submitted in writing. Cancellation charges will apply based on the time of cancellation and supplier policies.',
        'Refunds, if applicable, will be processed after deducting cancellation fees, service charges, and non-refundable costs. Processing time may vary.',
        'Failure to arrive on time for flights, tours, or accommodation without prior notice will be treated as a no-show and no refund will be provided.',
        'Any changes to booking details are subject to availability and may incur additional charges.'
      ];

      doc.font('Helvetica').fontSize(9).fillColor(tw.textLight);
      
      termsList.forEach(term => {
         const textHeight = doc.heightOfString(term, { width: 495 });

         if (doc.y + textHeight + 10 > doc.page.height - 50) {
            doc.addPage();
            doc.y = 40;
         }
         
         const startY = doc.y;
         doc.text('•', 45, startY);
         doc.text(term, 60, startY, { width: 495, align: 'justify' });
         doc.y += 5;
      });
      
      // Use quotation notes as additional if exist
      if (quotation.terms) {
         const notesHeight = doc.heightOfString(quotation.terms, { width: 515 });
         if (doc.y + notesHeight + 40 > doc.page.height - 50) {
             doc.addPage();
             doc.y = 40;
         }
         doc.y += 15;
         doc.font('Helvetica-Bold').fontSize(10).fillColor(tw.textDark).text('Additional Notes', 40, doc.y);
         doc.font('Helvetica').fontSize(9).fillColor(tw.textLight).text(quotation.terms, 40, doc.y + 15, { width: 515, align: 'justify' });
         doc.y += notesHeight + 20;
      }

      // --- FOOTER SECTION ---
      // Ensure footer fits
      if (doc.y + 80 > doc.page.height - 50) {
        doc.addPage();
        doc.y = 40;
      } else {
        doc.moveDown(1);
      }
      
      const footerStartY = doc.y;
      
      // Divider
      doc.moveTo(40, footerStartY).lineTo(555, footerStartY).strokeColor(tw.border).lineWidth(1).stroke();
      
      // Crown Voyages Footer Details
      doc.fontSize(10).font('Helvetica-Bold').fillColor(tw.primary).text('Crown Voyages', 40, footerStartY + 10, { align: 'center', width: 515 });
      doc.fontSize(8).font('Helvetica').fillColor(tw.textLight)
         .text('123 Luxury Ave, Suite 100, New York, NY 10001', 40, footerStartY + 25, { align: 'center', width: 515 });
      doc.text('www.crownvoyages.com | concierge@crownvoyages.com', 40, footerStartY + 35, { align: 'center', width: 515 });
      doc.text('Thank you for choosing us for your luxury travel needs.', 40, footerStartY + 48, { align: 'center', width: 515 });

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
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const tw = {
        primary: '#D4AF37', // Gold
        text: '#1F2937', 
        textLight: '#4B5563', 
        textDark: '#111827', 
        white: '#FFFFFF',
        border: '#E5E7EB',
        bg: '#F9FAFB'
      };

      // --- HEADER ---
      // Adding Logo on the left
      try {
        const logoPaths = [
          path.join(process.cwd(), 'client', 'src', 'assets', 'report_logo.png'),
          path.join(process.cwd(), '..', 'client', 'src', 'assets', 'report_logo.png'),
          path.join(process.cwd(), 'server', 'uploads', 'logo.png'),
          path.join(process.cwd(), 'uploads', 'logo.png'),
          path.join(process.cwd(), 'src/assets/report_logo.png')
        ];
        
        let logoPath = null;
        for (const p of logoPaths) {
          if (fs.existsSync(p)) {
            logoPath = p;
            break;
          }
        }

        if (logoPath) {
          doc.image(logoPath, 40, 30, { width: 100 });
        } else {
          console.log('Invoice Logo not found in possible paths');
        }
      } catch (e) {
        console.error('Error loading invoice logo:', e);
      }

      // Company info on the right
      const headerRightX = 350;
      doc.fontSize(8).font('Helvetica').fillColor(tw.textLight)
         .text('Crown Voyages', headerRightX, 30, { align: 'right', width: 200 })
         .text('Lot 20329 Nirolhu Magu Hulhumale', headerRightX, 30, { align: 'right', width: 200 })
         .text("Male', Republic of Maldives", headerRightX, 40, { align: 'right', width: 200 })
         .text('hello@crownvoyages.com', headerRightX, 50, { align: 'right', width: 200 })
         .text('www.crownvoyages.com', headerRightX, 60, { align: 'right', width: 200 })
         .text('(960) 400 1100', headerRightX, 70, { align: 'right', width: 200 })
         .text('(960) 940 1100', headerRightX, 80, { align: 'right', width: 200 });

      doc.y = 130;

      // Invoice Title
      doc.fontSize(14).font('Helvetica-Bold').fillColor(tw.textDark).text('INVOICE', 0, doc.y, { align: 'center', width: 595 });
      doc.y += 30;

      const infoStartY = doc.y;
      
      // Left Column: Customer and Guest Names
      doc.fontSize(10).font('Helvetica-Bold').fillColor(tw.textDark).text('Customer:', 40, infoStartY);
      doc.font('Helvetica-Bold').text(invoice.customerName || 'N/A', 110, infoStartY);
      
      // Add Email and Phone below name
      let customerDetailsY = infoStartY + 15;
      doc.fontSize(9).font('Helvetica').fillColor(tw.textLight);
      if (invoice.email) {
          doc.text(invoice.email, 110, customerDetailsY);
          customerDetailsY += 12;
      }
      if (invoice.phone) {
          doc.text(invoice.phone, 110, customerDetailsY);
          customerDetailsY += 12;
      }
      
      doc.y = Math.max(infoStartY + 55, customerDetailsY + 10);
      let guestY = doc.y;

      // Right Column: Invoice Details
      doc.y = infoStartY;
      const detailsX = 380;
      
      const drawDetailRow = (label, value, color = tw.textDark) => {
        const currentY = doc.y;
        doc.fontSize(9).font('Helvetica-Bold').fillColor(tw.textDark).text(label, detailsX, currentY, { continued: true });
        doc.font('Helvetica-Bold').fillColor(color).text(value, { align: 'right', width: 555 - detailsX });
        doc.y = currentY + 12;
      };

      drawDetailRow('Date:', new Date(invoice.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }));
      drawDetailRow('TIN:', '1168170GST001');
      doc.y += 10;
      const displayInvoiceNo = invoice.booking?.bookingNumber || invoice.invoiceNumber;
      drawDetailRow('Invoice No:', displayInvoiceNo, tw.textDark);
      const taRef = invoice.booking?.bookingNumber || invoice.lead?.booking?.bookingNumber || invoice.lead?.leadNumber || 'N/A';
      drawDetailRow('TA REF NO:', taRef, tw.textDark);
      if (invoice.dueDate) {
        drawDetailRow('Payment Due Date:', new Date(invoice.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }), '#B91C1C');
      }

      doc.y = Math.max(guestY + 20, doc.y + 20);

      // Items table
      const tableTop = doc.y;
      const cols = {
          resort: { x: 40, w: 100 },
          arrival: { x: 140, w: 50 },
          departure: { x: 190, w: 50 },
          nights: { x: 240, w: 25 },
          room: { x: 265, w: 80 },
          qty: { x: 345, w: 30 },
          meal: { x: 375, w: 40 },
          pax: { x: 415, w: 30 },
          amount: { x: 445, w: 110 }
      };

      // Table Header
      doc.fontSize(7).font('Helvetica-Bold').fillColor(tw.textDark);
      doc.text('Name of Resorts / Hotel', cols.resort.x, tableTop, { width: cols.resort.w, align: 'center' });
      doc.text('Arrival', cols.arrival.x, tableTop, { width: cols.arrival.w, align: 'center' });
      doc.text('Departure', cols.departure.x, tableTop, { width: cols.departure.w, align: 'center' });
      doc.text('No of NTS', cols.nights.x, tableTop, { width: cols.nights.w, align: 'center' });
      doc.text('Room Type', cols.room.x, tableTop, { width: cols.room.w, align: 'center' });
      doc.text('No of Rooms', cols.qty.x, tableTop, { width: cols.qty.w, align: 'center' });
      doc.text('Meal Plan', cols.meal.x, tableTop, { width: cols.meal.w, align: 'center' });
      doc.text('No of Pax', cols.pax.x, tableTop, { width: cols.pax.w, align: 'center' });
      doc.text('GRAND TOTAL WITH ALL TAXES INCLUDED', cols.amount.x, tableTop, { width: cols.amount.w, align: 'center' });

      doc.y += 20;
      doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor(tw.border).lineWidth(0.5).stroke();
      doc.y += 10;

      // Table Rows
      const items = (invoice.items && invoice.items.length > 0) ? invoice.items : [{
          resortName: invoice.lead?.resort?.name || 'Luxury Resort',
          arrival: invoice.lead?.checkIn ? new Date(invoice.lead.checkIn).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '-',
          departure: invoice.lead?.checkOut ? new Date(invoice.lead.checkOut).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '-',
          nights: invoice.lead?.checkIn && invoice.lead?.checkOut ? Math.ceil((new Date(invoice.lead.checkOut) - new Date(invoice.lead.checkIn)) / (86400000)) : '-',
          roomType: invoice.lead?.room?.roomType || invoice.lead?.room?.roomName || 'Premium Room',
          quantity: invoice.lead?.savedBookings?.[0]?.totalRooms || 1,
          mealPlan: invoice.lead?.mealPlan || '-',
          pax: (invoice.lead?.adults || 0) + (invoice.lead?.children || 0),
          amount: invoice.finalAmount || 0
      }];

      doc.font('Helvetica-Bold').fontSize(8);
      items.forEach(item => {
          const rowY = doc.y;
          doc.text(item.resortName || '-', cols.resort.x, rowY, { width: cols.resort.w, align: 'center' });
          doc.text(item.arrival || '-', cols.arrival.x, rowY, { width: cols.arrival.w, align: 'center' });
          doc.text(item.departure || '-', cols.departure.x, rowY, { width: cols.departure.w, align: 'center' });
          doc.text(String(item.nights || '-'), cols.nights.x, rowY, { width: cols.nights.w, align: 'center' });
          doc.text(item.roomType || '-', cols.room.x, rowY, { width: cols.room.w, align: 'center' });
          doc.text(String(item.quantity || 1), cols.qty.x, rowY, { width: cols.qty.w, align: 'center' });
          doc.text(item.mealPlan || '-', cols.meal.x, rowY, { width: cols.meal.w, align: 'center' });
          doc.text(String(item.pax || '-'), cols.pax.x, rowY, { width: cols.pax.w, align: 'center' });
          doc.text(`$${(item.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, cols.amount.x, rowY, { align: 'right', width: cols.amount.w });
          doc.y += 30;
      });

      const tableBottom = doc.y;
      
      // Draw table borders
      doc.lineWidth(0.5).strokeColor(tw.border);
      // Outer border
      doc.rect(40, tableTop - 5, 515, tableBottom - tableTop + 5).stroke();
      
      // Column dividers
      Object.values(cols).slice(0, -1).forEach(col => {
         doc.moveTo(col.x + col.w + 2, tableTop - 5).lineTo(col.x + col.w + 2, tableBottom).stroke();
      });

      // Airport Transfer Row
      if (invoice.lead?.transferType) {
        doc.y += 10;
        doc.fontSize(9).font('Helvetica-Bold').text('Airport Transfer', 40, doc.y);
        doc.font('Helvetica').fontSize(8).text(invoice.lead.transferType, 160, doc.y, { width: 300 });
        doc.y += 20;
      }

      // Totals (Right)
      const totalsWidth = 200;
      const totalsX = 555 - totalsWidth;
      doc.y += 20;
      let ty = doc.y;

      const drawTotalLine = (label, value) => {
          doc.fontSize(9).font('Helvetica-Bold').fillColor(tw.textDark);
          doc.text(label, 300, ty, { align: 'right', width: 140 });
          doc.text(`USD ${(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, totalsX, ty, { align: 'right', width: totalsWidth });
          ty += 15;
      };

      const bookingFinalAmount = invoice.booking?.totalAmount || invoice.finalAmount || 0;
      const bookingNetAmount = invoice.totalNetAmount || invoice.amount || 0;
      const bookingGreenTax = invoice.greenTax || 0;
      const bookingTgst = invoice.tgst || 0;

      drawTotalLine('TOTAL NET AMOUNT', bookingNetAmount);
      drawTotalLine('GREEN TAX', bookingGreenTax);
      drawTotalLine('T-GST 17.00%', bookingTgst);
      
      ty += 5;
      doc.fontSize(10).font('Helvetica-Bold').fillColor(tw.textDark);
      doc.text('GRAND TOTAL WITH ALL TAXES INCLUDED', 300, ty, { align: 'right', width: 140 });
      doc.text(`USD ${bookingFinalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, totalsX, ty, { align: 'right', width: totalsWidth });

      doc.y = ty + 40;
      const bottomY = doc.y;

      // Bank Details
      doc.fontSize(10).font('Helvetica-Bold').text('BANK DETAILS:', 40, bottomY);
      doc.fontSize(9).font('Helvetica').fillColor(tw.textLight);
      doc.text('Account Name: Crown Voyages Pvt Ltd', 60, bottomY + 15);
      doc.text('USD Dollar Account No. 7730-000184-076', 60, bottomY + 30);
      doc.text('Name of the Bank: Bank of Maldives', 60, bottomY + 45);
      doc.text("Address of the Bank: Boduthakurufaanu Magu, Henveiru, Male'", 60, bottomY + 60);
      doc.text('SWIFT Code: MALBMVMV', 60, bottomY + 75);

      // Remarks
      doc.y = bottomY + 110;
      doc.fontSize(10).font('Helvetica-Bold').fillColor(tw.textDark).text('REMARKS:');
      doc.fontSize(8).font('Helvetica').fillColor(tw.textLight);
      const remarks = [
        '* Any discrepancy found in this invoice should be advised to Crown Voyages within 24 hours.',
        '* Inclusive of all taxes and service charges.',
        '* Payment must be settled as per above deadline to avoid booking cancellation.',
        '* For Bank Transfers, all bank fees are applicable by the customer.',
        '* 4% Bank Charge applicable for Credit Card Payments.',
        '* Bank charges will be deducted incase of refund.',
        '* Cancellation applied 100% within 30 Days of arrival'
      ];
      remarks.forEach(r => {
        doc.text(r);
        doc.y += 2;
      });

      // Signature Section (Right)
      const sigX = 400;
      const sigY = Math.min(doc.page.height - 150, doc.y + 40);
      
      try {
        const possiblePaths = [
          path.join(process.cwd(), 'client/src/assets/report_logo.png'),
          path.join(process.cwd(), '../client/src/assets/report_logo.png')
        ];
        let logoPath = null;
        for (const p of possiblePaths) {
          if (fs.existsSync(p)) {
            logoPath = p;
            break;
          }
        }
        if (logoPath) {
          doc.save();
          doc.rect(sigX + 50, sigY, 60, 40).clip();
          doc.image(logoPath, sigX + 50, sigY, { width: 60 });
          doc.restore();
        }
      } catch (e) {
        try { doc.restore(); } catch (e2) {}
      }
      
      doc.fontSize(9).font('Helvetica').fillColor(tw.textLight);
      doc.text('Prepared by: Ryan', sigX, sigY + 50);
      doc.text('Accounts Department', sigX, sigY + 65);
      doc.text(`Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`, sigX, sigY + 80);

      doc.end();
    } catch (error) {
      console.error('Error in invoice PDF:', error);
      reject(error);
    }
  });
};

// Generate Payment Receipt PDF (for Payment model)
export const generatePaymentReceiptPDF = async (payment, invoice) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const tw = {
        primary: '#D4AF37', // Gold
        text: '#1F2937', 
        textLight: '#4B5563', 
        textDark: '#111827', 
        white: '#FFFFFF',
        border: '#000000',
        borderLight: '#E5E7EB'
      };

      // --- HEADER ---
      // Logo on the left
      try {
        const possiblePaths = [
          path.join(process.cwd(), 'client/src/assets/report_logo.png'),
          path.join(process.cwd(), '../client/src/assets/report_logo.png'),
          path.join(process.cwd(), 'src/assets/report_logo.jpeg'),
          path.join(process.cwd(), '../client/src/assets/report_logo.jpeg'),
          path.join(process.cwd(), 'src/assets/report_logo.png')
        ];
        let logoPath = null;
        for (const p of possiblePaths) {
          if (fs.existsSync(p)) { logoPath = p; break; }
        }
        if (logoPath) {
          doc.image(logoPath, 40, 30, { width: 120 });
        }
      } catch (e) {}

      // Company info on the right
      const headerRightX = 350;
      doc.fontSize(10).font('Helvetica-Bold').fillColor(tw.textDark)
         .text('CROWN VOYAGES', headerRightX, 30, { align: 'right', width: 200 });
      doc.fontSize(8).font('Helvetica').fillColor(tw.textLight)
         .text('accounts@crownvoyages.com', headerRightX, 42, { align: 'right', width: 200 })
         .text('www.crownvoyages.com', headerRightX, 52, { align: 'right', width: 200 })
         .text('(960) 400 1100', headerRightX, 62, { align: 'right', width: 200 })
         .text('(960) 940 1100', headerRightX, 72, { align: 'right', width: 200 });

      // Receipt Title
      const title = 'PAYMENT RECEIPT';
      doc.fontSize(16).font('Helvetica-Bold').fillColor(tw.textDark);
      const titleWidth = doc.widthOfString(title);
      const titleX = (595 - titleWidth) / 2;
      doc.text(title, 0, 110, { align: 'center', width: 595 });
      doc.moveTo(titleX, 128).lineTo(titleX + titleWidth, 128).lineWidth(1.5).strokeColor(tw.textDark).stroke();

      doc.y = 160;
      const infoStartY = doc.y;

      // Left Column: Received From
      doc.fontSize(10).font('Helvetica-Bold').text('Payment Received From:', 40, infoStartY);
      doc.fontSize(9).font('Helvetica').text(invoice.customerName || 'N/A', 40, infoStartY + 25);

      // Right Column: Details
      const detailsX = 350;
      const drawDetailRow = (label, value, y) => {
        doc.fontSize(9).font('Helvetica-Bold').text(label, detailsX, y);
        doc.font('Helvetica').text(value, detailsX + 80, y, { align: 'right', width: 555 - (detailsX + 80) });
      };

      const displayInvoiceNo = invoice.booking?.bookingNumber || invoice.invoiceNumber;
      drawDetailRow('Ref No:', displayInvoiceNo, infoStartY);
      drawDetailRow('Payment Date:', new Date(payment.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), infoStartY + 14);
      drawDetailRow('Currency:', 'USD', infoStartY + 28);
      drawDetailRow('Payment Type:', payment.method || 'Bank transfer', infoStartY + 42);

      doc.y = infoStartY + 80;

      // Table
      const tableTop = doc.y;
      const cols = {
        date: { x: 40, w: 70, label: 'Date' },
        rectNo: { x: 110, w: 70, label: 'Receipt No' },
        invTotal: { x: 180, w: 75, label: 'Invoice Total' },
        paidSoFar: { x: 255, w: 75, label: 'Paid So Far' },
        remBal: { x: 330, w: 75, label: 'Rem Balance' },
        amtPaid: { x: 405, w: 75, label: 'Amount Paid' },
        balance: { x: 480, w: 75, label: 'Balance' }
      };

      // Table Header Row
      doc.fontSize(8).font('Helvetica-Bold');
      Object.values(cols).forEach(col => {
        doc.text(col.label, col.x + 2, tableTop + 2, { width: col.w - 4, align: 'left' });
      });

      doc.y = tableTop + 20;
      doc.moveTo(40, doc.y).lineTo(555, doc.y).lineWidth(1).strokeColor(tw.textDark).stroke();
      
      // Data Row
      const rowY = doc.y + 8;
      doc.fontSize(7.5).font('Helvetica');
      doc.text(new Date(invoice.createdAt || payment.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), cols.date.x + 2, rowY);
      doc.text(payment.transactionId || payment.paymentId || '-', cols.rectNo.x + 2, rowY);

      // Sourcing data: prefer invoice.finalAmount as the "created invoice price"
      // prefer booking.bookingNumber as the "relevant booking id"
      const bookingNumber = invoice.booking?.bookingNumber || payment.booking?.bookingNumber || '';
      const bookingTotalAmount = invoice.finalAmount || invoice.booking?.totalAmount || 0;
      const currentBookingBalance = invoice.booking?.balance || invoice.balance || 0;
      const currentPayment = payment.amount || 0;
      
      const remBalPre = currentBookingBalance + currentPayment;
      const paidSoFarPre = bookingTotalAmount - remBalPre;

      if (bookingNumber && bookingNumber !== 'N/A') {
        doc.fontSize(7).text(`${bookingNumber}`, cols.invTotal.x + 2, rowY - 2);
        doc.fontSize(7.5).text(`USD ${bookingTotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, cols.invTotal.x + 2, rowY + 8);
      } else {
        doc.fontSize(7.5).text(`USD ${bookingTotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, cols.invTotal.x + 2, rowY + 3);
      }
      
      doc.fontSize(7.5).text(`USD ${paidSoFarPre.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, cols.paidSoFar.x + 2, rowY + 3);
      doc.text(`USD ${remBalPre.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, cols.remBal.x + 2, rowY + 3);
      doc.text(`USD ${currentPayment.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, cols.amtPaid.x + 2, rowY + 3);
      doc.text(`USD ${currentBookingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, cols.balance.x + 2, rowY + 3);

      const bottomLineY = rowY + 20;
      doc.moveTo(40, bottomLineY).lineTo(555, bottomLineY).lineWidth(0.5).stroke();
      
      const summaryLineY = bottomLineY + 20;
      doc.fontSize(8).font('Helvetica-Bold');
      doc.text(`USD ${currentBookingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, cols.balance.x + 2, summaryLineY - 12, { width: cols.balance.w - 4, align: 'left' });
      
      doc.moveTo(40, summaryLineY).lineTo(555, summaryLineY).lineWidth(1).stroke();

      // Border (No vertical dividers)
      const tableHeight = summaryLineY - tableTop;
      doc.rect(40, tableTop, 515, tableHeight).lineWidth(1).strokeColor(tw.textDark).stroke();
      
      // No Vertical Dividers as requested
      // doc.moveTo(col.x + col.w, tableTop).lineTo(col.x + col.w, summaryLineY).stroke();

      doc.end();
    } catch (error) {
      console.error('Error in payment receipt PDF:', error);
      reject(error);
    }
  });
};

// Generate Receipt PDF (for Receipt model)
export const generateReceiptPDF = async (receipt) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const tw = {
        primary: '#D4AF37', // Gold
        text: '#1F2937', 
        textLight: '#4B5563', 
        textDark: '#111827', 
        white: '#FFFFFF',
        border: '#000000',
        borderLight: '#E5E7EB'
      };

      // --- HEADER ---
      // Logo on the left
      try {
        const logoPaths = [
          path.join(process.cwd(), 'client', 'src', 'assets', 'report_logo.png'),
          path.join(process.cwd(), '..', 'client', 'src', 'assets', 'report_logo.png'),
          path.join(process.cwd(), 'server', 'uploads', 'logo.png'),
          path.join(process.cwd(), 'uploads', 'logo.png')
        ];
        let logoPath = null;
        for (const p of logoPaths) {
          if (fs.existsSync(p)) { logoPath = p; break; }
        }
        if (logoPath) {
          doc.image(logoPath, 40, 30, { width: 120 });
        }
      } catch (e) {}

      // Company info on the right
      const headerRightX = 350;
      doc.fontSize(10).font('Helvetica-Bold').fillColor(tw.textDark)
         .text('CROWN VOYAGES', headerRightX, 30, { align: 'right', width: 200 });
      doc.fontSize(8).font('Helvetica').fillColor(tw.textLight)
         .text('accounts@crownvoyages.com', headerRightX, 42, { align: 'right', width: 200 })
         .text('www.crownvoyages.com', headerRightX, 52, { align: 'right', width: 200 })
         .text('(960) 400 1100', headerRightX, 62, { align: 'right', width: 200 })
         .text('(960) 940 1100', headerRightX, 72, { align: 'right', width: 200 });

      // Receipt Title
      const title = 'PAYMENT RECEIPT';
      doc.fontSize(16).font('Helvetica-Bold').fillColor(tw.textDark);
      const titleWidth = doc.widthOfString(title);
      const titleX = (595 - titleWidth) / 2;
      doc.text(title, 0, 110, { align: 'center', width: 595 });
      doc.moveTo(titleX, 128).lineTo(titleX + titleWidth, 128).lineWidth(1.5).strokeColor(tw.textDark).stroke();

      doc.y = 160;
      const infoStartY = doc.y;

      // Left Column: Received From
      doc.fontSize(10).font('Helvetica-Bold').text('Payment Received From:', 40, infoStartY);
      doc.fontSize(9).font('Helvetica').text(receipt.customerName || 'N/A', 40, infoStartY + 25);
      if (receipt.email) doc.fontSize(8).text(receipt.email, 40, infoStartY + 38);
      if (receipt.phone) doc.fontSize(8).text(receipt.phone, 40, infoStartY + 48);

      // Right Column: Details
      const detailsX = 350;
      const drawDetailRow = (label, value, y) => {
        doc.fontSize(9).font('Helvetica-Bold').text(label, detailsX, y);
        doc.font('Helvetica').text(value, detailsX + 80, y, { align: 'right', width: 555 - (detailsX + 80) });
      };

      const refNo = receipt.invoice?.booking?.bookingNumber || receipt.invoice?.invoiceNumber || receipt.receiptNumber;
      drawDetailRow('Ref No:', refNo, infoStartY);
      drawDetailRow('Date:', new Date(receipt.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), infoStartY + 14);
      drawDetailRow('Currency:', 'USD', infoStartY + 28);
      drawDetailRow('Payment Type:', receipt.paymentMethod || 'Bank transfer', infoStartY + 42);

      doc.y = infoStartY + 80;

      // Table
      const tableTop = doc.y;
      const cols = {
        date: { x: 40, w: 70, label: 'Date' },
        rectNo: { x: 110, w: 70, label: 'Receipt No' },
        invTotal: { x: 180, w: 75, label: 'Invoice Total' },
        paidSoFar: { x: 255, w: 75, label: 'Paid So Far' },
        remBal: { x: 330, w: 75, label: 'Rem Balance' },
        amtPaid: { x: 405, w: 75, label: 'Amount Paid' },
        balance: { x: 480, w: 75, label: 'Balance' }
      };

      // Table Header Row
      doc.fontSize(8).font('Helvetica-Bold');
      Object.values(cols).forEach(col => {
        doc.text(col.label, col.x + 2, tableTop + 2, { width: col.w - 4, align: 'left' });
      });

      doc.y = tableTop + 20;
      doc.moveTo(40, doc.y).lineTo(555, doc.y).lineWidth(1).strokeColor(tw.textDark).stroke();
      
      // Data Row
      const rowY = doc.y + 8;
      doc.fontSize(7.5).font('Helvetica');
      doc.text(new Date(receipt.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), cols.date.x + 2, rowY);
      doc.text(receipt.receiptNumber, cols.rectNo.x + 2, rowY);

      // Sourcing data: prefer lead values but fallback to snapshots
      const bookingNumber = receipt.invoice?.booking?.bookingNumber || receipt.booking?.bookingNumber || receipt.lead?.booking?.bookingNumber || receipt.lead?.leadNumber || '';
      const bookingTotalAmount = receipt.lead?.totalAmount || receipt.invoice?.finalAmount || receipt.bookingTotal || 0;
      const currentBookingBalance = receipt.lead?.balance !== undefined ? receipt.lead.balance : (receipt.invoice?.booking?.balance || receipt.remainingBalance || 0);
      const currentPayment = receipt.finalAmount || 0;
      
      const remBalPre = currentBookingBalance + currentPayment;
      const paidSoFarPre = bookingTotalAmount - remBalPre;

      if (bookingNumber && bookingNumber !== 'N/A') {
        doc.fontSize(7).text(`${bookingNumber}`, cols.invTotal.x + 2, rowY - 2);
        doc.fontSize(7.5).text(`USD ${bookingTotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, cols.invTotal.x + 2, rowY + 8);
      } else {
        doc.fontSize(7.5).text(`USD ${bookingTotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, cols.invTotal.x + 2, rowY + 3);
      }
      
      doc.fontSize(7.5).text(`USD ${paidSoFarPre.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, cols.paidSoFar.x + 2, rowY + 3);
      doc.text(`USD ${remBalPre.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, cols.remBal.x + 2, rowY + 3);
      doc.text(`USD ${currentPayment.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, cols.amtPaid.x + 2, rowY + 3);
      doc.text(`USD ${currentBookingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, cols.balance.x + 2, rowY + 3);

      const bottomLineY = rowY + 20;
      doc.moveTo(40, bottomLineY).lineTo(555, bottomLineY).lineWidth(0.5).stroke();
      
      const summaryLineY = bottomLineY + 20;
      doc.fontSize(8).font('Helvetica-Bold');
      doc.text(`USD ${currentBookingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, cols.balance.x + 2, summaryLineY - 12, { width: cols.balance.w - 4, align: 'left' });
      
      doc.moveTo(40, summaryLineY).lineTo(555, summaryLineY).lineWidth(1).stroke();

      // Border (No vertical dividers)
      const tableHeight = summaryLineY - tableTop;
      doc.rect(40, tableTop, 515, tableHeight).lineWidth(1).strokeColor(tw.textDark).stroke();
      
      // No Vertical Dividers as requested
      // doc.moveTo(col.x + col.w, tableTop).lineTo(col.x + col.w, summaryLineY).stroke();

      doc.end();
    } catch (error) {
      console.error('Error in receipt PDF:', error);
      reject(error);
    }
  });
};

// Generate Voucher PDF
export const generateVoucherPDF = async (booking) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 40, 
        size: 'A4',
        bufferPages: true,
        autoFirstPage: true
      });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Main Page Border
      doc.rect(20, 20, 555, 802).strokeColor('#000000').lineWidth(0.5).stroke();

      // Helper function to format dates like in the image
      const formatLongDate = (date) => {
        if (!date) return 'N/A';
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'N/A';
        return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      };

      const formatShortDate = (date) => {
        if (!date) return 'N/A';
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'N/A';
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      };

      // --- HEADER ---
      // Left Logo
      const logoPaths = [
        path.join(process.cwd(), 'client', 'src', 'assets', 'report_logo.png'),
        path.join(process.cwd(), '..', 'client', 'src', 'assets', 'report_logo.png'),
        path.join(process.cwd(), 'server', 'uploads', 'logo.png'),
        path.join(process.cwd(), 'uploads', 'logo.png')
      ];
      
      let finalLogoPath = null;
      for (const p of logoPaths) {
        if (fs.existsSync(p)) {
          finalLogoPath = p;
          break;
        }
      }

      if (finalLogoPath) {
        doc.image(finalLogoPath, 40, 30, { width: 140 });
      }

      // Right Header Info
      const headerRightX = 350;
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000').text('CROWN VOYAGES', headerRightX, 30, { align: 'right', width: 200 });
      doc.font('Helvetica').fontSize(8).fillColor('#4B5563');
      doc.text('Lot 20329 | Nirolhu magu Hulhumale', headerRightX, 45, { align: 'right', width: 200 });
      doc.text("Male', Republic of Maldives", headerRightX, 57, { align: 'right', width: 200 });
      doc.text('hello@crownvoyages.com', headerRightX, 69, { align: 'right', width: 200 });
      doc.text('www.crownvoyages.com', headerRightX, 81, { align: 'right', width: 200 });
      doc.text('(960) 400 1100', headerRightX, 93, { align: 'right', width: 200 });
      doc.text('(960) 940 1100', headerRightX, 105, { align: 'right', width: 200 });

      // Title
      doc.font('Helvetica-Bold').fontSize(18).fillColor('#000000').text('HOTEL VOUCHER', 40, 145, { align: 'center' });

      // Info Bar
      const barY = 175;
      doc.moveTo(40, barY - 5).lineTo(555, barY - 5).strokeColor('#E5E7EB').lineWidth(0.5).stroke();
      
      doc.fontSize(10).font('Helvetica-Bold').text('Voucher No:', 40, barY);
      doc.font('Helvetica').text(booking.voucherNumber || booking.bookingNumber || 'N/A', 110, barY);

      doc.font('Helvetica-Bold').text('Booking Date:', 210, barY);
      doc.font('Helvetica').text(formatShortDate(booking.createdAt || new Date()), 280, barY);

      doc.font('Helvetica-Bold').text('Issuing Date:', 400, barY);
      doc.font('Helvetica').text(formatShortDate(new Date()), 470, barY);

      doc.moveTo(40, barY + 15).lineTo(555, barY + 15).strokeColor('#E5E7EB').stroke();

      // Main Content
      let currentY = 210;
      const leftColX = 40;
      const leftValX = 160;
      const rightColX = 380;
      const rightValX = 480;

      // Primary Guest Information
      doc.font('Helvetica-Bold').fontSize(10).text('Confirmation for:', leftColX, currentY);
      doc.font('Helvetica').text(booking.guestName || booking.customerName || 'N/A', leftValX, currentY);
      
      doc.font('Helvetica-Bold').text('Booking Ref:', rightColX, currentY);
      doc.font('Helvetica').text(booking.bookingNumber || 'N/A', rightValX, currentY);
      currentY += 20;

      doc.font('Helvetica-Bold').text('Total Pax:', leftColX, currentY);
      const paxTextSummary = `${booking.adults || 0} Adults${booking.children ? ` & ${booking.children} Children` : ''}`;
      doc.font('Helvetica').text(paxTextSummary, leftValX, currentY);

      doc.font('Helvetica-Bold').text('Voucher Status:', rightColX, currentY);
      doc.font('Helvetica').text('CONFIRMED', rightValX, currentY);
      currentY += 20;

      doc.moveTo(40, currentY).lineTo(555, currentY).strokeColor('#E5E7EB').lineWidth(0.5).stroke();
      currentY += 20;

      // 2. ACCOMMODATION & GUEST DETAILS (Grouped by Room)
      doc.rect(40, currentY, 515, 20).fill('#F3F4F6');
      doc.fillColor('#000000').font('Helvetica-Bold').text('ACCOMMODATION & GUEST ASSIGNMENT', 45, currentY + 5);
      currentY += 30;

      const roomData = booking.passengerDetails && booking.passengerDetails.length > 0 
        ? booking.passengerDetails 
        : [{ 
            roomName: booking.roomName || 'Accommodation',
            roomNumber: 1,
            adults: [{ name: booking.guestName || booking.customerName }],
            children: []
          }];

      roomData.forEach((room, idx) => {
        if (currentY > 700) {
          doc.addPage();
          doc.rect(20, 20, 555, 802).strokeColor('#000000').lineWidth(0.5).stroke();
          currentY = 40;
        }

        // Room Header
        doc.rect(40, currentY, 515, 18).fill('#EFF6FF');
        doc.fillColor('#1E40AF').font('Helvetica-Bold').fontSize(10)
           .text(`ROOM ${room.roomNumber || idx + 1}: ${room.roomName || 'Accommodation'}`, 45, currentY + 4);
        currentY += 25;

        // Find matching resort info if available
        const segment = booking.savedBookings?.find(sb => sb.roomName === room.roomName) || {};
        const resortName = segment.resortName || booking.resortName || 'N/A';
        const checkIn = segment.checkIn || booking.checkIn;
        const checkOut = segment.checkOut || booking.checkOut;
        const mealPlan = segment.mealPlan || booking.mealPlan;

        doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9).text('Resort:', 50, currentY);
        doc.font('Helvetica').text(resortName, 100, currentY);
        
        doc.font('Helvetica-Bold').text('Dates:', 300, currentY);
        doc.font('Helvetica').text(`${formatShortDate(checkIn)} - ${formatShortDate(checkOut)}`, 340, currentY);
        currentY += 15;

        doc.font('Helvetica-Bold').text('Meal Plan:', 50, currentY);
        doc.font('Helvetica').text(mealPlan || 'N/A', 100, currentY);
        currentY += 20;

        // Adults
        if (room.adults && room.adults.length > 0) {
          doc.font('Helvetica-Bold').fontSize(8).fillColor('#6B7280').text('ADULT GUESTS', 50, currentY);
          currentY += 12;
          
          room.adults.forEach(adult => {
            doc.font('Helvetica-Bold').fontSize(9).fillColor('#1F2937').text(adult.name || 'N/A', 60, currentY);
            
            let extra = [];
            if (adult.passport) extra.push(`PP: ${adult.passport}`);
            if (adult.country) extra.push(adult.country);
            if (adult.arrivalFlightNumber) extra.push(`Arr: ${adult.arrivalFlightNumber}`);
            
            if (extra.length > 0) {
              doc.font('Helvetica').fontSize(8).fillColor('#4B5563').text(extra.join(' | '), 220, currentY);
            }
            currentY += 14;
          });
        }

        // Children
        if (room.children && room.children.length > 0) {
          currentY += 5;
          doc.font('Helvetica-Bold').fontSize(8).fillColor('#6B7280').text('CHILD GUESTS', 50, currentY);
          currentY += 12;
          
          room.children.forEach(child => {
            doc.font('Helvetica-Bold').fontSize(9).fillColor('#1F2937').text(child.name || 'N/A', 60, currentY);
            doc.font('Helvetica').fontSize(8).fillColor('#4B5563').text(`Age: ${child.age || 'N/A'}${child.passport ? ` | PP: ${child.passport}` : ''}`, 220, currentY);
            currentY += 14;
          });
        }

        currentY += 15;
      });

      // 3. Special Request & Remarks
      if (currentY > 700) {
        doc.addPage();
        doc.rect(20, 20, 555, 802).strokeColor('#000000').lineWidth(0.5).stroke();
        currentY = 40;
      }

      doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000').text('Special Request:', leftColX, currentY);
      doc.font('Helvetica').text(booking.specialRequests || '-', leftValX, currentY, { width: 400 });
      currentY += 25;

      doc.font('Helvetica-Bold').text('Remarks:', leftColX, currentY);
      doc.font('Helvetica').text(booking.remarks || '-', leftValX, currentY, { width: 400 });

      // Footer
      const footerY = 740;
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000').text('Authorized By:', 380, footerY);
      doc.font('Helvetica').text('Aslam', 460, footerY);

      // Logo Stamp
      // if (finalLogoPath) {
      //   doc.image(finalLogoPath, 460, footerY + 20, { width: 60 });
      //   doc.fontSize(8).font('Helvetica-Bold').text('CROWN VOYAGES', 460, footerY + 50);
      //   doc.fontSize(6).font('Helvetica').text('PVT LOT | 02290234', 460, footerY + 60);
      // }

      doc.end();
    } catch (error) {
      console.error('Error generating voucher PDF:', error);
      reject(error);
    }
  });
};

// Generate Report PDF
export const generateReportPDF = async (title, data, options = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Colors
      const tw = {
        primary: '#D4AF37',
        text: '#1F2937',
        textLight: '#6B7280',
        border: '#E5E7EB',
        bg: '#F9FAFB'
      };

      // Header with Logo
      let startY = 40;
      try {
        const logoPaths = [
          path.join(process.cwd(), 'client', 'src', 'assets', 'report_logo.png'),
          path.join(process.cwd(), '..', 'client', 'src', 'assets', 'report_logo.png'),
          path.join(process.cwd(), 'server', 'uploads', 'logo.png'),
          path.join(process.cwd(), 'uploads', 'logo.png')
        ];
        let logoPath = null;
        for (const p of logoPaths) {
          if (fs.existsSync(p)) { logoPath = p; break; }
        }
        if (logoPath) {
          doc.image(logoPath, 40, 30, { width: 120 });
          startY = 90; // Move content down after logo
        }
      } catch (e) {
        console.log('Logo not found, skipping');
      }
    

      // Report Title
      doc.y = startY;
      doc.moveDown(1);
      doc.fontSize(18).font('Helvetica-Bold').fillColor(tw.text).text(title.toUpperCase(), 40, doc.y, { align: 'center' });
      doc.fontSize(10).font('Helvetica').fillColor(tw.textLight).text(`Generated: ${new Date().toLocaleDateString()} | Period: ${options.period || 'All Time'}`, { align: 'center' });
      
      doc.moveDown(2);

      // Define columns based on report type
      let headers = options.headers || ['ID', 'Customer', 'Date', 'Amount', 'Status'];
      let colWidths = [100, 150, 100, 100, 80]; 

      const isDetailedReport = title.toLowerCase().includes('resort') || title.toLowerCase().includes('room') || title.toLowerCase().includes('user');
      const isOperationalReport = title.toLowerCase().includes('operational') || title.toLowerCase().includes('booking distribution');
      const isBookingStatusReport = title.toLowerCase().includes('booking status');

      if (isBookingStatusReport) {
        headers = ['Booking ID', 'Name', 'Check-In', 'Check-Out', 'Resort'];
        colWidths = [110, 150, 90, 90, 130]; // Total 570
      } else if (isDetailedReport) {
        let firstCol = 'Name';
        if (title.toLowerCase().includes('room')) firstCol = 'Room (Resort)';
        else if (title.toLowerCase().includes('resort')) firstCol = 'Resort';
        else if (title.toLowerCase().includes('user')) firstCol = 'Booking #';

        headers = [firstCol, 'Date', 'Customer', 'Full Amt', 'Paid', 'Balance'];
        colWidths = [100, 60, 115, 80, 80, 80]; // Total 515
      } else if (isOperationalReport) {
        headers = ['Booking #', 'Customer', 'Check-In', 'Check-Out', 'Resort'];
        colWidths = [100, 140, 80, 80, 115]; // Total 515
      }
      
      const startX = 40;
      const tableTop = doc.y;
      let y = tableTop;
      
      // Calculate total table width
      const tableWidth = colWidths.reduce((sum, width) => sum + width, 0);

      const drawRow = (row, y, isHeader = false) => {
        const bg = isHeader ? tw.primary : (isHeader ? tw.primary : (Math.floor(y / 25) % 2 === 0 ? tw.bg : '#FFF')); // Simple zebra striping
        if (isHeader) {
          doc.rect(startX, y - 5, tableWidth, 20).fill(tw.primary);
          doc.fillColor('#FFF').font('Helvetica-Bold').fontSize(10);
        } else {
          doc.fillColor(tw.text).font('Helvetica').fontSize(9);
          // Just a light border for rows
          doc.lineWidth(0.5).strokeColor(tw.border).rect(startX, y - 5, tableWidth, 20).stroke();
        }

        let x = startX + 5;
        row.forEach((text, i) => {
          const displayValue = text !== null && text !== undefined ? String(text) : '-';
          doc.text(displayValue, x, y, { width: colWidths[i], align: 'left', lineBreak: false, ellipsis: true });
          x += colWidths[i];
        });
      };

      const mapItemToRow = (item) => {
        if (isBookingStatusReport) {
           return [
             item.bookingId || '-',
             item.customerName || 'Unknown',
             item.checkIn ? new Date(item.checkIn).toLocaleDateString() : '-',
             item.checkOut ? new Date(item.checkOut).toLocaleDateString() : '-',
             item.resortName || '-'
           ];
        } else if (title.toLowerCase().includes('quotation')) {
           return [
             item.quotationNumber || item.id || '-',
             item.customerName || item.customer || 'Unknown',
             item.createdAt ? new Date(item.createdAt).toLocaleDateString() : (item.date ? new Date(item.date).toLocaleDateString() : '-'),
             `$${(item.finalAmount || item.amount || 0).toLocaleString()}`,
             item.status || 'Draft'
           ];
        } else if (title.toLowerCase().includes('invoice')) {
           return [
             item.invoiceNumber || item.id || '-',
             item.customerName || item.customer || 'Unknown',
             item.createdAt ? new Date(item.createdAt).toLocaleDateString() : (item.date ? new Date(item.date).toLocaleDateString() : '-'),
             `$${(item.finalAmount || item.amount || 0).toLocaleString()}`,
             item.status || 'Draft'
           ];
        } else if (title.toLowerCase().includes('receipt')) {
           return [
             item.receiptNumber || item.id || '-',
             item.customerName || item.customer || 'Unknown',
             item.createdAt ? new Date(item.createdAt).toLocaleDateString() : (item.date ? new Date(item.date).toLocaleDateString() : '-'),
             `$${(item.amount || 0).toLocaleString()}`,
             item.paymentMethod || item.status || 'Cash'
           ];
        } else if (isDetailedReport) {
           return [
             item.resortName || item.roomName || item.userName || item.bookingNumber || 'Unknown',
             item.date ? new Date(item.date).toLocaleDateString() : '-',
             item.customerName || 'Unknown',
             `$${(item.fullAmount || 0).toLocaleString()}`,
             `$${(item.paidAmount || 0).toLocaleString()}`,
             `$${(item.balance || 0).toLocaleString()}`
           ];
        } else if (isOperationalReport) {
           return [
             item.bookingNumber || item.id || 'N/A',
             item.customerName || item.customer || 'Unknown',
             item.checkIn ? new Date(item.checkIn).toLocaleDateString() : '-',
             item.checkOut ? new Date(item.checkOut).toLocaleDateString() : '-',
             item.resortName || '-'
           ];
        } else {
             return Object.values(item).slice(0, 5).map(v => String(v));
        }
      };

      const processDataArray = (arr, showHeaders = true) => {
        if (showHeaders) {
          drawRow(headers, y, true);
          y += 25;
        }

        arr.forEach((item) => {
          if (y > doc.page.height - 50) {
            doc.addPage();
            y = 50;
            drawRow(headers, y, true);
            y += 25;
          }

          const rowData = mapItemToRow(item);
          drawRow(rowData, y);
          y += 25;
        });
      };

      if (!Array.isArray(data)) {
        // Grouped format: { "Group Name": [items] } or { "User Name": { receipts: [], confirmed: [] } }
        for (const [groupName, groupItems] of Object.entries(data)) {
          if (!groupItems) continue;
          
          // Check if it's user performance format (has receipts/confirmed sub-groups)
          if (groupItems.receipts !== undefined || groupItems.confirmed !== undefined) {
            // User Performance Report Format
            if (y > doc.page.height - 100) {
              doc.addPage();
              y = 50;
            } else if (y > tableTop) {
              y += 20;
            }

            doc.fontSize(12).font('Helvetica-Bold').fillColor(tw.primary).text(groupName.toUpperCase(), startX, y);
            y += 15;
            
            // Receipts Section
            if (groupItems.receipts && groupItems.receipts.length > 0) {
              doc.fontSize(10).font('Helvetica-Bold').fillColor(tw.text).text('  RECEIPTS:', startX, y);
              y += 15;
              processDataArray(groupItems.receipts, true);
              y += 10;
            }
            
            // Confirmed Section
            if (groupItems.confirmed && groupItems.confirmed.length > 0) {
              doc.fontSize(10).font('Helvetica-Bold').fillColor(tw.text).text('  CONFIRMED:', startX, y);
              y += 15;
              processDataArray(groupItems.confirmed, true);
              y += 10;
            }
            
            // Calculate totals for this user
            const allItems = [...(groupItems.receipts || []), ...(groupItems.confirmed || [])];
            const totalFull = allItems.reduce((sum, item) => sum + (item.fullAmount || 0), 0);
            const totalPaid = allItems.reduce((sum, item) => sum + (item.paidAmount || 0), 0);
            const totalBalance = allItems.reduce((sum, item) => sum + (item.balance || 0), 0);
            
            doc.fontSize(9).font('Helvetica-Bold').fillColor(tw.textLight)
              .text(`  Subtotal - Full: $${totalFull.toLocaleString()} | Paid: $${totalPaid.toLocaleString()} | Balance: $${totalBalance.toLocaleString()}`, startX, y);
            y += 20;
          } else if (Array.isArray(groupItems)) {
            // Standard grouped format (for operational/booking distribution reports)
            if (groupItems.length === 0) continue;

            if (y > doc.page.height - 100) {
              doc.addPage();
              y = 50;
            } else if (y > tableTop) {
              y += 20;
            }

            doc.fontSize(11).font('Helvetica-Bold').fillColor(tw.primary).text(groupName.toUpperCase(), startX, y);
            y += 15;
            processDataArray(groupItems, true);
            y += 15;
            
            // Skip subtotal for booking status reports
            if (!isBookingStatusReport) {
              const totalFull = groupItems.reduce((sum, item) => sum + (item.fullAmount || 0), 0);
              const totalPaid = groupItems.reduce((sum, item) => sum + (item.paidAmount || 0), 0);
              const totalBalance = groupItems.reduce((sum, item) => sum + (item.balance || 0), 0);
              
              doc.fontSize(9).font('Helvetica-Bold').fillColor(tw.textLight)
                .text(`  Subtotal - Full: $${totalFull.toLocaleString()} | Paid: $${totalPaid.toLocaleString()} | Balance: $${totalBalance.toLocaleString()}`, startX, y);
              y += 20;
            }
          }
        }
      } else {
        processDataArray(data, true);
      }

      // Summary section removed as per user request

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
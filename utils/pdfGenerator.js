import PDFDocument from 'pdfkit';
import axios from 'axios';

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
        orange600: '#EA580C'
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
      doc.fontSize(24).font('Helvetica-Bold').fillColor(tw.primary).text('CROWN VOYAGES', 40, 40);
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
         .text(`Ref #: ${quotation.quotationNumber}`, 350, detailsY + 20, { align: 'right', width: 200 });
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


      // --- ALL PASSENGERS DETAILS ---
      if (quotation.lead?.passengerDetails && quotation.lead.passengerDetails.length > 0) {
         checkPageBreak(50);
         doc.font('Helvetica-Bold').fontSize(14).fillColor(tw.textDark).text('All Passengers Details', 40, doc.y);
         doc.y += 15;

         for (let pIdx = 0; pIdx < quotation.lead.passengerDetails.length; pIdx++) {
            const passengerRoom = quotation.lead.passengerDetails[pIdx];
            
            // Check space for header + at least one adult card
            checkPageBreak(250);

            const pBoxX = 40;
            const pBoxStartY = doc.y;
            const pBoxWidth = 515;

            // Container
            doc.roundedRect(pBoxX, pBoxStartY, pBoxWidth, 20, 10).stroke(tw.purple200); // We'll stroke the whole thing later or grow it.
            // Actually, simpler to just draw contents and frame it conceptually or strictly
            
            // Header Line
            doc.fillColor(tw.purple700).fontSize(12).font('Helvetica-Bold')
               .text(`${passengerRoom.bookingName || 'Booking'} - ${passengerRoom.roomName || 'Room'}`, pBoxX + 15, pBoxStartY + 15);
            
            // Badge Room #
            doc.roundedRect(pBoxX + pBoxWidth - 80, pBoxStartY + 12, 60, 20, 10).fill(tw.purple100);
            doc.fillColor(tw.purple700).fontSize(9).font('Helvetica-Bold')
               .text(`Room ${passengerRoom.roomNumber || pIdx+1}`, pBoxX + pBoxWidth - 80, pBoxStartY + 17, { width: 60, align: 'center' });

            doc.moveTo(pBoxX + 10, pBoxStartY + 40).lineTo(pBoxX + pBoxWidth - 10, pBoxStartY + 40).strokeColor(tw.purple200).stroke();

            let currentY = pBoxStartY + 55;

            // Adults
            if (passengerRoom.adults && passengerRoom.adults.length > 0) {
               doc.fillColor(tw.textLight).fontSize(10).font('Helvetica-Bold')
                  .text(`Adult Passengers (${passengerRoom.adults.length})`, pBoxX + 15, currentY);
               currentY += 20;

               // Grid for Adults
               // 2 columns
               for (let a = 0; a < passengerRoom.adults.length; a++) {
                  // checkPageBreak(120); // Basic check inside loop
                  const adult = passengerRoom.adults[a];
                  const col = a % 2;
                  const row = Math.floor(a / 2);
                  const cardW = (pBoxWidth - 45) / 2;
                  const cardH = 110;
                  const cardX = pBoxX + 15 + (col * (cardW + 15));
                  const cardY = currentY + (row * (cardH + 15));

                  // Purple Card
                  doc.roundedRect(cardX, cardY, cardW, cardH, 8).fillAndStroke(tw.purple50, tw.purple200);
                  
                  doc.fillColor(tw.purple600).fontSize(9).font('Helvetica-Bold').text(`Adult ${a + 1}`, cardX + 10, cardY + 10);
                  
                  let txtY = cardY + 28;
                  const fields = [
                     ['Name:', adult.name],
                     ['Passport:', adult.passport],
                     ['Country:', adult.country]
                  ];
                  
                  fields.forEach(([l, v]) => {
                     doc.fillColor(tw.textLight).fontSize(8).font('Helvetica').text(l, cardX + 10, txtY);
                     doc.fillColor(tw.textDark).text(v || '-', cardX + 60, txtY);
                     txtY += 12;
                  });

                  if (adult.arrivalFlightNumber) {
                     txtY += 5;
                     doc.fillColor(tw.green600).font('Helvetica-Bold').text('Arrival', cardX + 10, txtY);
                     doc.fillColor(tw.textDark).font('Helvetica').text(`${adult.arrivalFlightNumber} @ ${adult.arrivalTime}`, cardX + 50, txtY);
                  }

                  // Update Y cursor
                  if (col === 1 || a === passengerRoom.adults.length - 1) {
                     // Next row
                  }
               }
               const rows = Math.ceil(passengerRoom.adults.length / 2);
               currentY += (rows * 125) + 10;
            }

            // Children
            if (passengerRoom.children && passengerRoom.children.length > 0) {
               doc.fillColor(tw.textLight).fontSize(10).font('Helvetica-Bold')
                  .text(`Children Passengers (${passengerRoom.children.length})`, pBoxX + 15, currentY);
               currentY += 20;

               for (let c = 0; c < passengerRoom.children.length; c++) {
                  const child = passengerRoom.children[c];
                  const col = c % 2;
                  const row = Math.floor(c / 2);
                  const cardW = (pBoxWidth - 45) / 2;
                  const cardH = 110;
                  const cardX = pBoxX + 15 + (col * (cardW + 15));
                  const cardY = currentY + (row * (cardH + 15));

                  // Blue Card
                  doc.roundedRect(cardX, cardY, cardW, cardH, 8).fillAndStroke(tw.blue50, tw.blue200);
                  
                  doc.fillColor(tw.blue600).fontSize(9).font('Helvetica-Bold').text(`Child ${c + 1}`, cardX + 10, cardY + 10);
                  
                  let txtY = cardY + 28;
                  const fields = [
                     ['Name:', child.name],
                     ['Age:', child.age],
                     ['Passport:', child.passport]
                  ];
                  
                  fields.forEach(([l, v]) => {
                     doc.fillColor(tw.textLight).fontSize(8).font('Helvetica').text(l, cardX + 10, txtY);
                     doc.fillColor(tw.textDark).text(v || '-', cardX + 60, txtY);
                     txtY += 12;
                  });

                  if (child.arrivalFlightNumber) {
                     txtY += 5;
                     doc.fillColor(tw.green600).font('Helvetica-Bold').text('Arrival', cardX + 10, txtY);
                     doc.fillColor(tw.textDark).font('Helvetica').text(`${child.arrivalFlightNumber}`, cardX + 50, txtY);
                  }
               }
               const rows = Math.ceil(passengerRoom.children.length / 2);
               currentY += (rows * 125) + 10;
            }

            // Draw border box for the whole passenger section
            doc.roundedRect(pBoxX, pBoxStartY, pBoxWidth, currentY - pBoxStartY, 12).stroke(tw.purple200);
            
            doc.y = currentY + 20;
         }
      }


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
        border: '#E5E7EB'
      };

      // --- HEADER ---
      doc.fontSize(24).font('Helvetica-Bold').fillColor(tw.primary).text('CROWN VOYAGES', 40, 40);
      doc.fontSize(10).font('Helvetica').fillColor(tw.textLight).text('Luxury Travel Management', 40, 65);

      const headerRightX = 350;
      doc.fontSize(10).font('Helvetica').fillColor(tw.text)
         .text('123 Luxury Ave, Suite 100', headerRightX, 40, { align: 'right', width: 200 });
      doc.text('New York, NY 10001', headerRightX, 55, { align: 'right', width: 200 });
      doc.text('+1 (555) 123-4567', headerRightX, 70, { align: 'right', width: 200 });
      doc.text('concierge@crownvoyages.com', headerRightX, 85, { align: 'right', width: 200 });

      doc.moveTo(40, 105).lineTo(555, 105).strokeColor(tw.border).lineWidth(1).stroke();
      doc.y = 130;

      // Invoice Title
      doc.fontSize(18).font('Helvetica-Bold').fillColor(tw.textDark).text('INVOICE', 40, 130, { align: 'center' });
      doc.fontSize(12).font('Helvetica').fillColor(tw.textLight).text(invoice.invoiceNumber, 40, 155, { align: 'center' });
      doc.moveDown(2);

      // Two columns: Bill To and Invoice Info
      const leftColumn = 40;
      const rightColumn = 350;

      // Bill To
      doc.fontSize(12).font('Helvetica-Bold').fillColor(tw.primary).text('Bill To:', leftColumn);
      
      const bookingRef = invoice.lead?.booking?.bookingNumber || invoice.booking?.bookingNumber;
      if (bookingRef) {
         doc.fontSize(10).font('Helvetica-Bold').fillColor(tw.textLight).text(`Booking Ref: ${bookingRef}`, leftColumn);
         doc.moveDown(0.2);
      }

      doc.fontSize(10).font('Helvetica').fillColor(tw.textDark);
      doc.text(invoice.customerName, leftColumn);
      doc.text(invoice.email, leftColumn);
      if (invoice.phone) doc.text(invoice.phone, leftColumn);

      // Invoice Info
      const infoY = doc.y - 45; // Align top with Bill To
      doc.fontSize(12).font('Helvetica-Bold').fillColor(tw.primary).text('Invoice Details:', rightColumn, 190); // Hardcoded Y match
      doc.fontSize(10).font('Helvetica').fillColor(tw.textDark);
      doc.text(`Invoice Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, rightColumn);
      doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, rightColumn);
      if (invoice.booking?.bookingNumber) {
        doc.text(`Booking Ref: ${invoice.booking.bookingNumber}`, rightColumn);
      }

      doc.moveDown(4);
      doc.y = 260;

      // Items table if present
      if (invoice.items && invoice.items.length > 0) {
        const tableTop = doc.y;
        
        // Table headers
        doc.fontSize(10).font('Helvetica-Bold').fillColor(tw.primary);
        doc.text('Description', leftColumn, tableTop);
        doc.text('Qty', 320, tableTop);
        doc.text('Price', 390, tableTop);
        doc.text('Amount', 480, tableTop);
        
        doc.strokeColor(tw.primary).lineWidth(1);
        doc.moveTo(leftColumn, tableTop + 15).lineTo(555, tableTop + 15).stroke();

        // Table rows
        doc.font('Helvetica').fillColor(tw.textDark);
        let itemY = tableTop + 25;
        
        invoice.items.forEach(item => {
          doc.text(item.description, leftColumn, itemY, { width: 260 });
          doc.text(item.quantity.toString(), 320, itemY);
          doc.text(`$${item.unitPrice.toFixed(2)}`, 390, itemY);
          doc.text(`$${item.amount.toFixed(2)}`, 480, itemY);
          itemY += 25;
        });

        doc.y = itemY + 20;
      }

      // Totals
      const totalsWidth = 300;
      const totalsX = (595 - totalsWidth) / 2;
      let totalsY = doc.y + 20;

      doc.fontSize(10).font('Helvetica').fillColor(tw.textDark);
      doc.text('Base Price:', totalsX, totalsY);
      doc.text(`$${(invoice.amount || 0).toFixed(2)}`, totalsX, totalsY, { align: 'right', width: totalsWidth });
      totalsY += 20;

      if (invoice.discountValue > 0) {
        doc.text('Discount:', totalsX, totalsY);
        doc.text(`-$${(invoice.discountValue || 0).toFixed(2)}`, totalsX, totalsY, { align: 'right', width: totalsWidth });
        totalsY += 20;
      }

      doc.strokeColor(tw.border).lineWidth(1);
      doc.moveTo(totalsX, totalsY).lineTo(totalsX + totalsWidth, totalsY).stroke();
      totalsY += 10;

      doc.fontSize(14).font('Helvetica-Bold').fillColor(tw.primary);
      doc.text('Total:', totalsX, totalsY);
      doc.text(`$${(invoice.finalAmount || 0).toFixed(2)}`, totalsX, totalsY, { align: 'right', width: totalsWidth });
      totalsY += 30;

      // Status Badge removed

      // Notes
      if (invoice.notes) {
        doc.y = totalsY + 20;
        doc.fontSize(12).font('Helvetica-Bold').fillColor(tw.primary).text('Notes:', leftColumn);
        doc.fontSize(10).font('Helvetica').fillColor(tw.textLight).text(invoice.notes, leftColumn);
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
        border: '#E5E7EB',
        green: '#10B981',
        red: '#EF4444'
      };

      // --- HEADER ---
      doc.fontSize(24).font('Helvetica-Bold').fillColor(tw.primary).text('CROWN VOYAGES', 40, 40);
      doc.fontSize(10).font('Helvetica').fillColor(tw.textLight).text('Luxury Travel Management', 40, 65);

      const headerRightX = 350;
      doc.fontSize(10).font('Helvetica').fillColor(tw.text)
         .text('123 Luxury Ave, Suite 100', headerRightX, 40, { align: 'right', width: 200 });
      doc.text('New York, NY 10001', headerRightX, 55, { align: 'right', width: 200 });
      doc.text('+1 (555) 123-4567', headerRightX, 70, { align: 'right', width: 200 });
      doc.text('concierge@crownvoyages.com', headerRightX, 85, { align: 'right', width: 200 });

      doc.moveTo(40, 105).lineTo(555, 105).strokeColor(tw.border).lineWidth(1).stroke();
      doc.y = 130;

      // Receipt Title
      doc.fontSize(18).font('Helvetica-Bold').fillColor(tw.textDark).text('PAYMENT RECEIPT', 40, 130, { align: 'center' });
      doc.fontSize(12).font('Helvetica').fillColor(tw.textLight).text(`#${payment.paymentId}`, 40, 155, { align: 'center' });
      doc.moveDown(2);

      // Amount Confirmation
      doc.roundedRect(150, doc.y, 295, 80, 10).fill(tw.primary);
      doc.fillColor(tw.white);
      doc.fontSize(36).font('Helvetica-Bold').text(`$${payment.amount.toFixed(2)}`, 150, doc.y + 20, { width: 295, align: 'center' });
      doc.fontSize(12).font('Helvetica').text('Amount Received', 150, doc.y + 60, { width: 295, align: 'center' });
      doc.moveDown(5);
      doc.y += 40;

      const leftColumn = 40;
      const rightColumn = 300;

      // Payment Details
      doc.fontSize(14).font('Helvetica-Bold').fillColor(tw.primary).text('Payment Details', leftColumn, doc.y);
      const detailY = doc.y + 20;
      
      doc.fontSize(10).font('Helvetica').fillColor(tw.textDark);
      doc.text('Date:', leftColumn, detailY);
      doc.text(new Date(payment.date).toLocaleDateString(), leftColumn + 100, detailY);
      
      doc.text('Method:', leftColumn, detailY + 15);
      doc.text(payment.method, leftColumn + 100, detailY + 15);
      
      if (payment.transactionId) {
        doc.text('Transaction ID:', leftColumn, detailY + 30);
        doc.text(payment.transactionId, leftColumn + 100, detailY + 30);
      }

      // Paid By
      doc.fontSize(14).font('Helvetica-Bold').fillColor(tw.primary).text('Paid By', rightColumn, doc.y - 45); // Align top
      doc.fontSize(10).font('Helvetica').fillColor(tw.textDark);
      doc.text(invoice.customerName, rightColumn, detailY);
      doc.text(invoice.email, rightColumn, detailY + 15);
      doc.text(`Inv Ref: ${invoice.invoiceNumber}`, rightColumn, detailY + 30);

      doc.moveDown(4);
      doc.y = detailY + 60;

      // Invoice Summary (Mini Table)
      doc.fontSize(14).font('Helvetica-Bold').fillColor(tw.primary).text('Account Summary', leftColumn, doc.y);
      doc.y += 10;
      
      doc.strokeColor(tw.border).lineWidth(1).moveTo(leftColumn, doc.y).lineTo(555, doc.y).stroke();
      doc.y += 10;

      const summaryRows = [
        ['Invoice Total', `$${invoice.finalAmount.toFixed(2)}`, tw.textDark],
        ['Total Paid To Date', `$${invoice.paidAmount.toFixed(2)}`, tw.textDark],
        ['Remaining Balance', `$${invoice.balance.toFixed(2)}`, invoice.balance > 0 ? tw.red : tw.green]
      ];

      summaryRows.forEach(([label, value, color]) => {
         doc.fontSize(10).font('Helvetica-Bold').fillColor(tw.textLight).text(label, leftColumn, doc.y);
         doc.fillColor(color).text(value, 450, doc.y, { align: 'right' });
         doc.y += 20;
      });

      doc.strokeColor(tw.border).lineWidth(1).moveTo(leftColumn, doc.y).lineTo(555, doc.y).stroke();

      // Notes
      if (payment.notes) {
        doc.y += 30;
        doc.fontSize(12).font('Helvetica-Bold').fillColor(tw.primary).text('Notes:', leftColumn);
        doc.fontSize(10).font('Helvetica').fillColor(tw.textLight).text(payment.notes, leftColumn);
      }

      // --- FOOTER SECTION ---
      // Standard footer at bottom
      let footerY = doc.page.height - 80;
      
      // Divider
      doc.moveTo(40, footerY).lineTo(555, footerY).strokeColor(tw.border).lineWidth(1).stroke();
      
      // Crown Voyages Footer Details
      doc.fontSize(10).font('Helvetica-Bold').fillColor(tw.primary).text('Crown Voyages', 40, footerY + 10, { align: 'center', width: 515 });
      doc.fontSize(8).font('Helvetica').fillColor(tw.textLight)
         .text('123 Luxury Ave, Suite 100, New York, NY 10001', 40, footerY + 25, { align: 'center', width: 515 });
      doc.text('www.crownvoyages.com | concierge@crownvoyages.com', 40, footerY + 35, { align: 'center', width: 515 });
      doc.text('Thank you for choosing us for your luxury travel needs.', 40, footerY + 48, { align: 'center', width: 515 });

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
        border: '#E5E7EB'
      };

      // --- HEADER ---
      doc.fontSize(24).font('Helvetica-Bold').fillColor(tw.primary).text('CROWN VOYAGES', 40, 40);
      doc.fontSize(10).font('Helvetica').fillColor(tw.textLight).text('Luxury Travel Management', 40, 65);

      const headerRightX = 350;
      doc.fontSize(10).font('Helvetica').fillColor(tw.text)
         .text('123 Luxury Ave, Suite 100', headerRightX, 40, { align: 'right', width: 200 });
      doc.text('New York, NY 10001', headerRightX, 55, { align: 'right', width: 200 });
      doc.text('+1 (555) 123-4567', headerRightX, 70, { align: 'right', width: 200 });
      doc.text('concierge@crownvoyages.com', headerRightX, 85, { align: 'right', width: 200 });

      doc.moveTo(40, 105).lineTo(555, 105).strokeColor(tw.border).lineWidth(1).stroke();
      doc.y = 130;

      // Receipt Title
      doc.fontSize(18).font('Helvetica-Bold').fillColor(tw.textDark).text('OFFICIAL RECEIPT', 40, 130, { align: 'center' });
      doc.fontSize(12).font('Helvetica').fillColor(tw.textLight).text(receipt.receiptNumber, 40, 155, { align: 'center' });
      doc.moveDown(2);

      // Two columns: Received From and Receipt Info
      const leftColumn = 40;
      const rightColumn = 350;

      // Received From
      doc.fontSize(12).font('Helvetica-Bold').fillColor(tw.primary).text('Received From:', leftColumn);
      
      const bookingRef = receipt.lead?.booking?.bookingNumber;
      if (bookingRef) {
         doc.fontSize(10).font('Helvetica-Bold').fillColor(tw.textLight).text(`Booking Ref: ${bookingRef}`, leftColumn);
         doc.moveDown(0.2);
      }
      
      doc.fontSize(10).font('Helvetica').fillColor(tw.textDark);
      doc.text(receipt.customerName, leftColumn);
      doc.text(receipt.email, leftColumn);
      if (receipt.phone) doc.text(receipt.phone, leftColumn);

      // Receipt Info
      // Align top with Received From section title which is at Y ~175 (130+25+2linegaps)
      // Actually Invoice uses hardcoded 190.
      doc.fontSize(12).font('Helvetica-Bold').fillColor(tw.primary).text('Receipt Details:', rightColumn, 190); 
      doc.fontSize(10).font('Helvetica').fillColor(tw.textDark);
      doc.text(`Date: ${new Date(receipt.createdAt).toLocaleDateString()}`, rightColumn);
      doc.text(`Method: ${receipt.paymentMethod}`, rightColumn);

      doc.moveDown(4);
      doc.y = 260;

      // Pricing Details
      // Center the totals
      const totalsWidth = 300;
      const totalsX = (595 - totalsWidth) / 2;
      let totalsY = doc.y;

      doc.fontSize(10).font('Helvetica').fillColor(tw.textDark);
      doc.text('Base Amount:', totalsX, totalsY);
      doc.text(`$${(receipt.amount || 0).toFixed(2)}`, totalsX, totalsY, { align: 'right', width: totalsWidth });
      totalsY += 20;

      if (receipt.discountValue > 0) {
        doc.text('Discount:', totalsX, totalsY);
        doc.text(`-$${(receipt.discountValue || 0).toFixed(2)}`, totalsX, totalsY, { align: 'right', width: totalsWidth });
        totalsY += 20;
      }

      doc.strokeColor(tw.border).lineWidth(1);
      doc.moveTo(totalsX, totalsY).lineTo(totalsX + totalsWidth, totalsY).stroke();
      totalsY += 10;

      doc.fontSize(14).font('Helvetica-Bold').fillColor(tw.primary);
      doc.text('Total Received:', totalsX, totalsY);
      doc.text(`$${(receipt.finalAmount || 0).toFixed(2)}`, totalsX, totalsY, { align: 'right', width: totalsWidth });

      // Notes
      if (receipt.notes) {
        doc.y = totalsY + 30;
        doc.fontSize(12).font('Helvetica-Bold').fillColor(tw.primary).text('Notes:', leftColumn);
        doc.fontSize(10).font('Helvetica').fillColor(tw.textLight).text(receipt.notes, leftColumn);
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

      // Header
      doc.fontSize(24).font('Helvetica-Bold').fillColor(tw.primary).text('CROWN VOYAGES', 40, 40);
      doc.fontSize(10).font('Helvetica').fillColor(tw.textLight).text('Luxury Travel Management', 40, 65);

      // Report Title
      doc.moveDown(2);
      doc.fontSize(18).font('Helvetica-Bold').fillColor(tw.text).text(title.toUpperCase(), 40, doc.y, { align: 'center' });
      doc.fontSize(10).font('Helvetica').fillColor(tw.textLight).text(`Generated: ${new Date().toLocaleDateString()} | Period: ${options.period || 'All Time'}`, { align: 'center' });
      
      doc.moveDown(2);

      // Table Header logic
      const tableTop = doc.y;
      const colWidths = [100, 150, 100, 100, 80]; // Adjust based on columns
      const startX = 40;
      let y = tableTop;

      const drawRow = (row, y, isHeader = false) => {
        const bg = isHeader ? tw.primary : (y % 2 === 0 ? tw.bg : '#FFF');
        if (isHeader) {
          doc.rect(startX, y - 5, 515, 20).fill(bg);
          doc.fillColor('#FFF').font('Helvetica-Bold').fontSize(10);
        } else {
          doc.fillColor(tw.text).font('Helvetica').fontSize(9);
          doc.rect(startX, y - 5, 515, 20).strokeColor(tw.border).stroke();
        }

        let x = startX + 5;
        row.forEach((text, i) => {
          doc.text(text, x, y, { width: colWidths[i], align: 'left', lineBreak: false, ellipsis: true });
          x += colWidths[i];
        });
      };

      // Define columns based on report type (inferred from first data item or passed options)
      const headers = options.headers || ['ID', 'Customer', 'Date', 'Amount', 'Status'];
      
      drawRow(headers, y, true);
      y += 25;

      data.forEach((item, index) => {
        if (y > doc.page.height - 50) {
          doc.addPage();
          y = 50;
          drawRow(headers, y, true);
          y += 25;
        }

        // Map data to columns (This assumes data is already formatted or we map it here)
        // We'll expect 'data' to be an array of objects, and we map based on headers.
        // For simplicity, let's assume the controller formatted the data as arrays of strings:
        // OR we handle it here if it's raw objects. 
        // Let's assume passed data is raw objects and we map them.
        
        let rowData = [];
        if (title.toLowerCase().includes('quotation')) {
           rowData = [
             item.quotationNumber,
             item.customerName,
             new Date(item.createdAt).toLocaleDateString(),
             `$${(item.finalAmount || 0).toLocaleString()}`,
             item.status || 'Draft'
           ];
        } else if (title.toLowerCase().includes('invoice')) {
           rowData = [
             item.invoiceNumber,
             item.customerName,
             new Date(item.createdAt).toLocaleDateString(),
             `$${(item.finalAmount || 0).toLocaleString()}`,
             item.status || 'Draft'
           ];
        } else if (title.toLowerCase().includes('receipt')) {
           rowData = [
             item.receiptNumber,
             item.customerName,
             new Date(item.createdAt).toLocaleDateString(),
             `$${(item.finalAmount || 0).toLocaleString()}`,
             item.paymentMethod || 'Cash'
           ];
        } else {
             // Fallback for generic data
             rowData = Object.values(item).slice(0, 5).map(v => String(v));
        }

        drawRow(rowData, y);
        y += 25;
      });

      // Summary
      doc.moveDown(2);
      const totalAmount = data.reduce((sum, item) => sum + (item.finalAmount || item.amount || 0), 0);
      doc.fontSize(12).font('Helvetica-Bold').fillColor(tw.text).text(`Total Records: ${data.length}`, 40);
      doc.text(`Total Value: $${totalAmount.toLocaleString()}`, 40);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
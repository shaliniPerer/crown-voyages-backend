import express from 'express';
import {
  getLeads,
  createLead,
  getLead,
  updateLead,
  getQuotations,
  createQuotation,
  createQuotationVersion,
  updateQuotationStatus,
  sendQuotationEmail,
  exportQuotationPDF,
  convertToBooking,
  getBookings,
  getBookingById,
  createBooking,
  updateBooking,
  deleteBooking,
  createInvoice,
  sendInvoiceEmail,
  exportInvoicePDF,
  createReceipt,
  sendReceiptEmail,
  exportReceiptPDF,
  getReceipts
} from '../controllers/bookingController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize, isAdmin } from '../middleware/roleMiddleware.js';

const router = express.Router();

// All booking routes require authentication
router.use(protect);

console.log('📋 Booking routes loaded with the following paths:');
console.log('  - GET /bookings/leads');
console.log('  - POST /bookings/lead');
console.log('  - GET /bookings/lead/:id');
console.log('  - PATCH /bookings/lead/:id');

// Lead routes (must come before generic /:id routes)
router.get('/leads', getLeads);
router.post('/lead', createLead);
router.get('/lead/:id', getLead);
router.patch('/lead/:id', updateLead);

// Quotation routes (must come before generic /:id routes)
router.get('/quotations', getQuotations);
router.post('/quotation', createQuotation);
router.post('/quotation/:id/version', createQuotationVersion);
router.patch('/quotation/:id/status', updateQuotationStatus);
router.post('/quotation/:id/send-email', sendQuotationEmail);
router.get('/quotation/:id/pdf', exportQuotationPDF);
router.post('/quotation/:id/convert', convertToBooking);

// Invoice and Receipt routes
router.post('/invoice', createInvoice);
router.get('/invoice/:id/pdf', exportInvoicePDF);
router.post('/invoice/:id/send-email', sendInvoiceEmail);
router.get('/receipts', getReceipts);
router.post('/receipt', createReceipt);
router.get('/receipt/:id/pdf', exportReceiptPDF);
router.post('/receipt/:id/send-email', sendReceiptEmail);

// Booking routes (generic routes go last)
router.post('/', createBooking);
router.get('/', getBookings);
router.get('/:id', getBookingById);
router.patch('/:id', updateBooking);
router.delete('/:id', isAdmin, deleteBooking);

export default router;
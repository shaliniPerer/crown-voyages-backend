import express from 'express';
import {
  getLeads,
  createLead,
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
  deleteBooking
} from '../controllers/bookingController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize, isAdmin } from '../middleware/roleMiddleware.js';

const router = express.Router();

// All booking routes require authentication
router.use(protect);

// Lead routes
router.get('/leads', getLeads);
router.post('/lead', createLead);

// Quotation routes
router.get('/quotations', getQuotations);
router.post('/quotation', createQuotation);
router.post('/quotation/:id/version', createQuotationVersion);
router.patch('/quotation/:id/status', updateQuotationStatus);
router.post('/quotation/:id/send-email', sendQuotationEmail);
router.get('/quotation/:id/pdf', exportQuotationPDF);
router.post('/quotation/:id/convert', convertToBooking);

// Booking routes
router.get('/', getBookings);
router.get('/:id', getBookingById);
router.post('/', createBooking);
router.patch('/:id', updateBooking);
router.delete('/:id', isAdmin, deleteBooking);

export default router;
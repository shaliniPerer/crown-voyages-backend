import express from 'express';
import {
  getBookingReports,
  getRevenueReports,
  getPaymentReports,
  getCustomerAnalytics,
  exportToPDF,
  exportToExcel
} from '../controllers/analyticsController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All analytics routes require authentication
router.use(protect);

router.get('/booking-reports', getBookingReports);
router.get('/revenue-reports', getRevenueReports);
router.get('/payment-reports', getPaymentReports);
router.get('/customer-analytics', getCustomerAnalytics);
router.get('/export-pdf/:type', exportToPDF);
router.get('/export-excel/:type', exportToExcel);

export default router;
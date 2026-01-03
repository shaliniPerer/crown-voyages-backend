import express from 'express';
import {
  getMetrics,
  getUpcomingBookings,
  getOutstandingPayments,
  getRevenueChart,
  getLeadFunnel,
  getLeadStatusDistribution
} from '../controllers/dashboardController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All dashboard routes require authentication
router.use(protect);

router.get('/metrics', getMetrics);
router.get('/upcoming-bookings', getUpcomingBookings);
router.get('/outstanding-payments', getOutstandingPayments);
router.get('/revenue-chart', getRevenueChart);
router.get('/lead-funnel', getLeadFunnel);
router.get('/lead-status', getLeadStatusDistribution);

export default router;
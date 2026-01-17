import express from 'express';
import {
  getMetrics,
  getUpcomingBookings,
  getOutstandingPayments,
  getRevenueChart,
  getLeadFunnel,
  getLeadStatusDistribution,
  getVoucherTrends,
  getResortAnalysis,
  getRoomAnalysis,
  getUserAnalysis,
  getOperationalTrends
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
router.get('/voucher-trends', getVoucherTrends);
router.get('/resort-analysis', getResortAnalysis);
router.get('/room-analysis', getRoomAnalysis);
router.get('/user-analysis', getUserAnalysis);
router.get('/operational-trends', getOperationalTrends);

export default router;
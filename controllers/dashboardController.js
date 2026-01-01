import asyncHandler from 'express-async-handler';
import Booking from '../models/Booking.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Lead from '../models/Lead.js';
import Quotation from '../models/Quotation.js';
import User from '../models/User.js';

// @desc    Get dashboard metrics
// @route   GET /api/dashboard/metrics
// @access  Private
export const getMetrics = asyncHandler(async (req, res) => {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfYear = new Date(today.getFullYear(), 0, 1);

  // Total bookings
  const totalBookings = await Booking.countDocuments({ status: { $ne: 'Cancelled' } });

  // Total revenue (paid invoices)
  const revenueResult = await Invoice.aggregate([
    { $match: { status: 'Paid' } },
    { $group: { _id: null, total: { $sum: '$finalAmount' } } }
  ]);
  const totalRevenue = revenueResult[0]?.total || 0;

  // Outstanding payments
  const outstandingResult = await Invoice.aggregate([
    { $match: { status: { $in: ['Pending', 'Partial', 'Overdue'] } } },
    { $group: { _id: null, total: { $sum: '$balance' } } }
  ]);
  const outstandingPayments = outstandingResult[0]?.total || 0;

  // Active guests (checked-in)
  const activeGuests = await Booking.countDocuments({ status: 'Checked-in' });

  // This month stats
  const monthlyBookings = await Booking.countDocuments({
    createdAt: { $gte: startOfMonth },
    status: { $ne: 'Cancelled' }
  });

  const monthlyRevenueResult = await Invoice.aggregate([
    { $match: { createdAt: { $gte: startOfMonth }, status: 'Paid' } },
    { $group: { _id: null, total: { $sum: '$finalAmount' } } }
  ]);
  const monthlyRevenue = monthlyRevenueResult[0]?.total || 0;

  res.json({
    success: true,
    data: {
      totalBookings,
      totalRevenue,
      outstandingPayments,
      activeGuests,
      monthly: {
        bookings: monthlyBookings,
        revenue: monthlyRevenue
      }
    }
  });
});

// @desc    Get upcoming bookings
// @route   GET /api/dashboard/upcoming-bookings
// @access  Private
export const getUpcomingBookings = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  const today = new Date();

  const bookings = await Booking.find({
    checkIn: { $gte: today },
    status: { $in: ['Confirmed', 'Pending'] }
  })
    .populate('resort', 'name location')
    .populate('room', 'roomType')
    .sort({ checkIn: 1 })
    .limit(parseInt(limit));

  res.json({
    success: true,
    count: bookings.length,
    data: bookings
  });
});

// @desc    Get outstanding payments
// @route   GET /api/dashboard/outstanding-payments
// @access  Private
export const getOutstandingPayments = asyncHandler(async (req, res) => {
  const invoices = await Invoice.find({
    status: { $in: ['Pending', 'Partial', 'Overdue'] },
    balance: { $gt: 0 }
  })
    .populate('booking', 'bookingNumber guestName')
    .sort({ dueDate: 1 })
    .limit(10);

  res.json({
    success: true,
    count: invoices.length,
    data: invoices
  });
});

// @desc    Get revenue chart data
// @route   GET /api/dashboard/revenue-chart
// @access  Private
export const getRevenueChart = asyncHandler(async (req, res) => {
  const { period = 'monthly' } = req.query;
  let groupBy, dateFormat, limit;

  switch (period) {
    case 'daily':
      groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
      limit = 30;
      break;
    case 'weekly':
      groupBy = { $week: '$createdAt' };
      limit = 12;
      break;
    case 'monthly':
      groupBy = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
      limit = 12;
      break;
    default:
      groupBy = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
      limit = 12;
  }

  const revenueData = await Payment.aggregate([
    {
      $match: {
        status: 'Completed',
        createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
      }
    },
    {
      $group: {
        _id: groupBy,
        revenue: { $sum: '$amount' }
      }
    },
    { $sort: { _id: 1 } },
    { $limit: limit }
  ]);

  const formattedData = revenueData.map(item => ({
    name: item._id,
    revenue: item.revenue
  }));

  res.json({
    success: true,
    data: formattedData
  });
});

// @desc    Get lead conversion funnel
// @route   GET /api/dashboard/lead-funnel
// @access  Private
export const getLeadFunnel = asyncHandler(async (req, res) => {
  const totalLeads = await Lead.countDocuments();
  const qualifiedLeads = await Lead.countDocuments({ status: { $in: ['Contacted', 'Qualified'] } });
  const quotationsSent = await Quotation.countDocuments({ status: { $in: ['Sent', 'Accepted'] } });
  const convertedBookings = await Booking.countDocuments({ status: { $ne: 'Cancelled' } });

  res.json({
    success: true,
    data: {
      totalLeads,
      qualifiedLeads,
      quotationsSent,
      convertedBookings,
      conversionRate: totalLeads > 0 ? ((convertedBookings / totalLeads) * 100).toFixed(2) : 0
    }
  });
});
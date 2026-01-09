import asyncHandler from 'express-async-handler';
import Booking from '../models/Booking.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Lead from '../models/Lead.js';
import Quotation from '../models/Quotation.js';
import Receipt from '../models/Receipt.js';
import User from '../models/User.js';

// @desc    Get dashboard metrics
// @route   GET /api/dashboard/metrics
// @access  Private
export const getMetrics = asyncHandler(async (req, res) => {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // Total bookings
  const totalBookings = await Booking.countDocuments({ status: { $ne: 'Cancelled' } });

  // Total Guests (sum of adults + children from Confirmed bookings)
  const guestsResult = await Booking.aggregate([
    { $match: { status: { $ne: 'Cancelled' } } },
    { $group: { _id: null, total: { $sum: { $add: ["$adults", "$children"] } } } }
  ]);
  const totalGuests = guestsResult[0]?.total || 0;

  // Total Quotation Value
  const quoteResult = await Quotation.aggregate([
    { $group: { _id: null, total: { $sum: '$finalAmount' }, count: { $sum: 1 } } }
  ]);
  const totalQuotationValue = quoteResult[0]?.total || 0;
  const totalQuotationCount = quoteResult[0]?.count || 0;

  // Total Invoice Value
  const invoiceResult = await Invoice.aggregate([
    { $group: { _id: null, total: { $sum: '$finalAmount' }, count: { $sum: 1 } } }
  ]);
  const totalInvoiceValue = invoiceResult[0]?.total || 0;
  const totalInvoiceCount = invoiceResult[0]?.count || 0;

  // Total Receipt Value (Real Revenue)
  const receiptResult = await Receipt.aggregate([
    { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
  ]);
  const totalReceiptValue = receiptResult[0]?.total || 0;
  const totalReceiptCount = receiptResult[0]?.count || 0;

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

  const monthlyRevenueResult = await Receipt.aggregate([
    { $match: { createdAt: { $gte: startOfMonth } } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const monthlyRevenue = monthlyRevenueResult[0]?.total || 0;

  res.json({
    success: true,
    data: {
      totalBookings,
      totalGuests,
      totalRevenue: totalReceiptValue, // Revenue is cash in hand (receipts)
      totalQuotationValue,
      totalQuotationCount,
      totalInvoiceValue,
      totalInvoiceCount,
      totalReceiptValue,
      totalReceiptCount,
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
  let groupBy, limit, startDate;

  // Set time range based on period
  const now = new Date();
  
  switch (period) {
    case 'daily': // Last 30 days
      groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
      limit = 30;
      startDate = new Date(now.setDate(now.getDate() - 30));
      break;
    case 'weekly': // Last 12 weeks
      groupBy = { 
        year: { $year: "$createdAt" }, 
        week: { $week: "$createdAt" } 
      };
      // Format later as "Week X, YYYY"
      limit = 12;
      startDate = new Date(now.setDate(now.getDate() - (12 * 7)));
      break;
    case 'monthly': // Last 12 months
      groupBy = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
      limit = 12;
      startDate = new Date(now.setMonth(now.getMonth() - 12));
      break;
    case 'annually': // Last 5 years
      groupBy = { $dateToString: { format: '%Y', date: '$createdAt' } };
      limit = 5;
      startDate = new Date(now.setFullYear(now.getFullYear() - 5));
      break;
    default:
      groupBy = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
      limit = 12;
      startDate = new Date(now.setMonth(now.getMonth() - 12));
  }

  const matchStage = {
    $match: {
      createdAt: { $gte: startDate }
    }
  };

  const groupStage = (amountField) => ({
    $group: {
      _id: groupBy,
      total: { $sum: `$${amountField}` },
      count: { $sum: 1 }
    }
  });

  const [receipts, quotations, invoices, bookings] = await Promise.all([
    Receipt.aggregate([matchStage, groupStage('amount'), { $sort: { _id: 1 } }]),
    Quotation.aggregate([matchStage, groupStage('finalAmount'), { $sort: { _id: 1 } }]),
    Invoice.aggregate([matchStage, groupStage('finalAmount'), { $sort: { _id: 1 } }]),
    Booking.aggregate([matchStage, groupStage('totalAmount'), { $sort: { _id: 1 } }])
  ]);

  // Merge data
  const dataMap = new Map();
  const formatKey = (key) => {
    if (typeof key === 'object' && key.week) return `W${key.week}-${key.year}`;
    return key; 
  };

  const processData = (dataset, type) => {
    dataset.forEach(item => {
      const key = formatKey(item._id);
      if (!dataMap.has(key)) {
        dataMap.set(key, { name: key, revenue: 0, quotation: 0, invoice: 0, booking: 0, bookingCount: 0 });
      }
      dataMap.get(key)[type] = item.total;
      if (type === 'booking') {
          dataMap.get(key)['bookingCount'] = item.count;
      }
    });
  };

  processData(receipts, 'revenue');
  processData(quotations, 'quotation');
  processData(invoices, 'invoice');
  processData(bookings, 'booking');

  // Convert map to array and sort
  let formattedData = Array.from(dataMap.values());
  
  // Sort based on period logic (simple string sort works for ISO dates, special handling for weeks)
  formattedData.sort((a, b) => a.name.localeCompare(b.name));

  // Limit results
  if (formattedData.length > limit) {
      formattedData = formattedData.slice(formattedData.length - limit);
  }

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

// @desc    Get lead status distribution
// @route   GET /api/dashboard/lead-status
// @access  Private
export const getLeadStatusDistribution = asyncHandler(async (req, res) => {
  const statusCounts = await Lead.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const statusData = statusCounts.map(item => ({
    name: item._id,
    value: item.count,
    color: getStatusColor(item._id)
  }));

  res.json({
    success: true,
    data: statusData
  });
});

// Helper function to get color for status
const getStatusColor = (status) => {
  const colors = {
    'New': '#3B82F6',
    'Pending': '#F59E0B',
    'Quotation': '#8B5CF6',
    'Invoice': '#EC4899',
    'Receipt': '#10B981',
    'Confirmed': '#10B981',
    'Cancelled': '#EF4444',
    'Converted': '#D4AF37'
  };
  return colors[status] || '#6B7280';
};
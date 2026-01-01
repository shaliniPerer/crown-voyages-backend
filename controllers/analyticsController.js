import asyncHandler from 'express-async-handler';
import Booking from '../models/Booking.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import { generateReportPDF } from '../utils/pdfGenerator.js';

// @desc    Get booking reports
// @route   GET /api/analytics/booking-reports
// @access  Private
export const getBookingReports = asyncHandler(async (req, res) => {
  const { period = 'monthly', startDate, endDate } = req.query;

  let dateFilter = {};
  if (startDate && endDate) {
    dateFilter = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
  }

  // Booking trends
  const bookingTrends = await Booking.aggregate([
    { $match: { ...dateFilter, status: { $ne: 'Cancelled' } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        bookings: { $sum: 1 },
        revenue: { $sum: '$totalAmount' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Status breakdown
  const statusBreakdown = await Booking.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Resort performance
  const resortPerformance = await Booking.aggregate([
    { $match: { ...dateFilter, status: { $ne: 'Cancelled' } } },
    {
      $group: {
        _id: '$resort',
        bookings: { $sum: 1 },
        revenue: { $sum: '$totalAmount' }
      }
    },
    {
      $lookup: {
        from: 'resorts',
        localField: '_id',
        foreignField: '_id',
        as: 'resortInfo'
      }
    },
    { $unwind: '$resortInfo' },
    { $sort: { bookings: -1 } },
    { $limit: 10 }
  ]);

  res.json({
    success: true,
    data: {
      bookingTrends,
      statusBreakdown,
      resortPerformance
    }
  });
});

// @desc    Get revenue reports
// @route   GET /api/analytics/revenue-reports
// @access  Private
export const getRevenueReports = asyncHandler(async (req, res) => {
  const { period = 'monthly', startDate, endDate } = req.query;

  let dateFilter = {};
  if (startDate && endDate) {
    dateFilter = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
  }

  // Revenue trends
  const revenueTrends = await Payment.aggregate([
    { $match: { ...dateFilter, status: 'Completed' } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
        revenue: { $sum: '$amount' },
        transactions: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Payment method breakdown
  const paymentMethods = await Payment.aggregate([
    { $match: { ...dateFilter, status: 'Completed' } },
    {
      $group: {
        _id: '$method',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);

  // Total stats
  const totalStats = await Payment.aggregate([
    { $match: { ...dateFilter, status: 'Completed' } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        totalTransactions: { $sum: 1 },
        avgTransaction: { $avg: '$amount' }
      }
    }
  ]);

  res.json({
    success: true,
    data: {
      revenueTrends,
      paymentMethods,
      totalStats: totalStats[0] || { totalRevenue: 0, totalTransactions: 0, avgTransaction: 0 }
    }
  });
});

// @desc    Get payment reports
// @route   GET /api/analytics/payment-reports
// @access  Private
export const getPaymentReports = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  let dateFilter = {};
  if (startDate && endDate) {
    dateFilter = {
      dueDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
  }

  // Invoice status breakdown
  const invoiceStatus = await Invoice.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$finalAmount' },
        paidAmount: { $sum: '$paidAmount' },
        balance: { $sum: '$balance' }
      }
    }
  ]);

  // Overdue invoices
  const overdueInvoices = await Invoice.countDocuments({
    dueDate: { $lt: new Date() },
    status: { $in: ['Pending', 'Partial', 'Overdue'] }
  });

  // Payment collection rate
  const collectionRate = await Invoice.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: null,
        totalInvoiced: { $sum: '$finalAmount' },
        totalCollected: { $sum: '$paidAmount' }
      }
    }
  ]);

  const rate = collectionRate[0] ? 
    ((collectionRate[0].totalCollected / collectionRate[0].totalInvoiced) * 100).toFixed(2) : 0;

  res.json({
    success: true,
    data: {
      invoiceStatus,
      overdueInvoices,
      collectionRate: rate,
      totals: collectionRate[0] || { totalInvoiced: 0, totalCollected: 0 }
    }
  });
});

// @desc    Get customer analytics
// @route   GET /api/analytics/customer-analytics
// @access  Private
export const getCustomerAnalytics = asyncHandler(async (req, res) => {
  // Top customers by revenue
  const topCustomers = await Booking.aggregate([
    { $match: { status: { $ne: 'Cancelled' } } },
    {
      $group: {
        _id: '$email',
        name: { $first: '$guestName' },
        totalBookings: { $sum: 1 },
        totalSpent: { $sum: '$totalAmount' }
      }
    },
    { $sort: { totalSpent: -1 } },
    { $limit: 10 }
  ]);

  // Customer acquisition by month
  const customerAcquisition = await Booking.aggregate([
    {
      $group: {
        _id: {
          email: '$email',
          month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }
        }
      }
    },
    {
      $group: {
        _id: '$_id.month',
        newCustomers: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } },
    { $limit: 12 }
  ]);

  // Repeat customer rate
  const repeatCustomers = await Booking.aggregate([
    { $match: { status: { $ne: 'Cancelled' } } },
    {
      $group: {
        _id: '$email',
        bookingCount: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: null,
        totalCustomers: { $sum: 1 },
        repeatCustomers: {
          $sum: { $cond: [{ $gt: ['$bookingCount', 1] }, 1, 0] }
        }
      }
    }
  ]);

  const repeatRate = repeatCustomers[0] ?
    ((repeatCustomers[0].repeatCustomers / repeatCustomers[0].totalCustomers) * 100).toFixed(2) : 0;

  res.json({
    success: true,
    data: {
      topCustomers,
      customerAcquisition,
      repeatRate,
      stats: repeatCustomers[0] || { totalCustomers: 0, repeatCustomers: 0 }
    }
  });
});

// @desc    Export report as PDF
// @route   GET /api/analytics/export-pdf/:type
// @access  Private
export const exportToPDF = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const { period, startDate, endDate } = req.query;

  let reportData;
  let reportTitle;

  switch (type) {
    case 'booking':
      const bookingReport = await getBookingReports(req, { json: () => {} });
      reportData = bookingReport;
      reportTitle = 'Booking Report';
      break;
    case 'revenue':
      const revenueReport = await getRevenueReports(req, { json: () => {} });
      reportData = revenueReport;
      reportTitle = 'Revenue Report';
      break;
    case 'payment':
      const paymentReport = await getPaymentReports(req, { json: () => {} });
      reportData = paymentReport;
      reportTitle = 'Payment Report';
      break;
    default:
      res.status(400);
      throw new Error('Invalid report type');
  }

  const pdfBuffer = await generateReportPDF(reportTitle, reportData, { period, startDate, endDate });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${type}-report.pdf`);
  res.send(pdfBuffer);
});

// @desc    Export report as Excel
// @route   GET /api/analytics/export-excel/:type
// @access  Private
export const exportToExcel = asyncHandler(async (req, res) => {
  // Excel export functionality can be implemented using libraries like 'exceljs'
  res.json({
    success: true,
    message: 'Excel export feature - To be implemented with exceljs library'
  });
});
import asyncHandler from 'express-async-handler';
import Booking from '../models/Booking.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Lead from '../models/Lead.js';
import Quotation from '../models/Quotation.js';
import Receipt from '../models/Receipt.js';
import User from '../models/User.js';
import Resort from '../models/Resort.js';

// @desc    Get dashboard metrics
// @route   GET /api/dashboard/metrics
// @access  Private
export const getMetrics = asyncHandler(async (req, res) => {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // Use simple queries where possible, aggregations only for sums
  const [
    totalBookings,
    totalGuestsRes,
    totalQuotationRes,
    totalInvoiceRes,
    totalReceiptRes,
    outstandingRes,
    paidInvoicesRes,
    monthlyLeads,
    monthlyQuotes,
    monthlyInvoices,
    monthlyBookings,
    monthlyRevenueRes,
    activeGuests
  ] = await Promise.all([
    Booking.countDocuments({ status: { $ne: 'Cancelled' } }),
    Booking.aggregate([{ $match: { status: { $ne: 'Cancelled' } } }, { $group: { _id: null, total: { $sum: { $add: [{ $ifNull: ["$adults", 0] }, { $ifNull: ["$children", 0] }] } } } }]),
    Quotation.aggregate([{ $group: { _id: null, total: { $sum: { $ifNull: ['$finalAmount', 0] } }, count: { $sum: 1 } } }]),
    Invoice.aggregate([{ $match: { status: { $ne: 'Cancelled' } } }, { $group: { _id: null, total: { $sum: { $ifNull: ['$finalAmount', 0] } }, count: { $sum: 1 } } }]),
    Receipt.aggregate([{ $group: { _id: null, total: { $sum: { $ifNull: ['$finalAmount', 0] } }, count: { $sum: 1 } } }]),
    Invoice.aggregate([{ $match: { status: { $in: ['Pending', 'Partial', 'Overdue'] } } }, { $group: { _id: null, total: { $sum: { $ifNull: ['$balance', 0] } } } }]),
    Invoice.aggregate([{ $match: { status: 'Paid' } }, { $group: { _id: null, total: { $sum: { $ifNull: ['$finalAmount', 0] } }, count: { $sum: 1 } } }]),
    Lead.countDocuments({ createdAt: { $gte: startOfMonth }, status: { $nin: ['Converted', 'Cancelled'] } }),
    Quotation.countDocuments({ createdAt: { $gte: startOfMonth }, status: { $nin: ['Accepted', 'Cancelled'] } }),
    Invoice.countDocuments({ createdAt: { $gte: startOfMonth }, status: { $nin: ['Paid', 'Cancelled'] } }),
    Booking.countDocuments({ createdAt: { $gte: startOfMonth }, status: { $ne: 'Cancelled' } }),
    Receipt.aggregate([{ $match: { createdAt: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: { $ifNull: ['$finalAmount', 0] } } } }]),
    Booking.countDocuments({ status: 'Checked-in' })
  ]);

  res.json({
    success: true,
    data: {
      totalBookings,
      totalGuests: totalGuestsRes[0]?.total || 0,
      totalRevenue: totalReceiptRes[0]?.total || 0,
      totalQuotationValue: totalQuotationRes[0]?.total || 0,
      totalQuotationCount: totalQuotationRes[0]?.count || 0,
      totalInvoiceValue: totalInvoiceRes[0]?.total || 0,
      totalInvoiceCount: totalInvoiceRes[0]?.count || 0,
      totalReceiptValue: totalReceiptRes[0]?.total || 0,
      totalReceiptCount: totalReceiptRes[0]?.count || 0,
      outstandingPayments: outstandingRes[0]?.total || 0,
      activeGuests,
      paidInvoicesCount: paidInvoicesRes[0]?.count || 0,
      paidInvoicesValue: paidInvoicesRes[0]?.total || 0,
      monthly: {
        bookings: monthlyBookings,
        leads: monthlyLeads,
        quotations: monthlyQuotes,
        invoices: monthlyInvoices,
        revenue: monthlyRevenueRes[0]?.total || 0
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
  today.setHours(0, 0, 0, 0);

  // 1. Fetch from Booking model (only upcoming)
  const bookingsData = await Booking.aggregate([
    {
      $match: {
        checkIn: { $gte: today },
        status: { $nin: ['Cancelled', 'Checked-out'] }
      }
    },
    { $lookup: { from: 'resorts', localField: 'resort', foreignField: '_id', as: 'resortInfo' } },
    { $unwind: { path: '$resortInfo', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'rooms', localField: 'room', foreignField: '_id', as: 'roomInfo' } },
    { $unwind: { path: '$roomInfo', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'quotations', localField: '_id', foreignField: 'booking', as: 'quotation' } },
    { $lookup: { from: 'invoices', localField: '_id', foreignField: 'booking', as: 'invoice' } },
    {
      $project: {
        type: { $literal: 'Booking' },
        bookingId: '$_id',
        bookingNumber: 1,
        guestName: 1,
        checkIn: 1,
        status: 1,
        totalAmount: 1,
        paidAmount: 1,
        balance: 1,
        resort: '$resortInfo.name',
        room: '$roomInfo.roomName',
        quotation: { $arrayElemAt: [{ $filter: { input: '$quotation', as: 'q', cond: { $ne: ['$$q.status', 'Cancelled'] } } }, 0] },
        invoice: { $arrayElemAt: [{ $filter: { input: '$invoice', as: 'i', cond: { $ne: ['$$i.status', 'Cancelled'] } } }, 0] }
      }
    }
  ]);

  // 2. Fetch from Lead model (active leads with upcoming arrivals)
  const leadsData = await Lead.aggregate([
    {
      $match: {
        checkIn: { $gte: today },
        status: { $nin: ['Cancelled', 'Converted'] }
      }
    },
    { $lookup: { from: 'resorts', localField: 'resort', foreignField: '_id', as: 'resortInfo' } },
    { $unwind: { path: '$resortInfo', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'rooms', localField: 'room', foreignField: '_id', as: 'roomInfo' } },
    { $unwind: { path: '$roomInfo', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'quotations', localField: '_id', foreignField: 'lead', as: 'quotation' } },
    { $lookup: { from: 'invoices', localField: '_id', foreignField: 'lead', as: 'invoice' } },
    {
      $project: {
        type: { $literal: 'Lead' },
        bookingId: '$_id',
        bookingNumber: '$leadNumber',
        guestName: 1,
        checkIn: 1,
        status: 1,
        totalAmount: 1,
        paidAmount: 1,
        balance: 1,
        resort: '$resortInfo.name',
        room: '$roomInfo.roomName',
        quotation: { $arrayElemAt: [{ $filter: { input: '$quotation', as: 'q', cond: { $ne: ['$$q.status', 'Cancelled'] } } }, 0] },
        invoice: { $arrayElemAt: [{ $filter: { input: '$invoice', as: 'i', cond: { $ne: ['$$i.status', 'Cancelled'] } } }, 0] }
      }
    }
  ]);

  // Combined and sorted: Prioritize arrivals, then by newest created
  const combined = [...bookingsData, ...leadsData]
    .sort((a, b) => {
      // Future check-ins first
      if (a.checkIn && b.checkIn) return new Date(a.checkIn) - new Date(b.checkIn);
      if (a.checkIn) return -1;
      if (b.checkIn) return 1;
      return 0;
    })
    .slice(0, parseInt(limit));

  res.json({
    success: true,
    data: combined
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

// @desc    Get revenue chart data (Upcoming Operational Trends by Date)
// @route   GET /api/dashboard/revenue-chart
// @access  Private
export const getRevenueChart = asyncHandler(async (req, res) => {
  // Looking FORWARD for upcoming arrivals
  const now = new Date();
  const today = new Date(now.setHours(0, 0, 0, 0));
  
  // Group by exact check-in date
  const groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$checkIn' } };
  const limit = 20; // Show next 20 unique check-in dates with activity
  const endDate = new Date(new Date().setFullYear(new Date().getFullYear() + 2)); 

  const groupStage = (amountField) => ([
    {
      $group: {
        _id: groupBy,
        total: { $sum: `$${amountField}` },
        count: { $sum: 1 }
      }
    }
  ]);

  const lookupCheckIn = [
    { $lookup: { from: 'leads', localField: 'lead', foreignField: '_id', as: 'leadInfo' } },
    { $lookup: { from: 'bookings', localField: 'booking', foreignField: '_id', as: 'bookingInfo' } },
    {
      $addFields: {
        checkIn: {
          $ifNull: [
            { $arrayElemAt: ['$leadInfo.checkIn', 0] },
            { $arrayElemAt: ['$bookingInfo.checkIn', 0] }
          ]
        }
      }
    }
  ];

  const [quotations, invoices, leads] = await Promise.all([
    Quotation.aggregate([
      ...lookupCheckIn,
      { $match: { checkIn: { $gte: today, $lte: endDate }, status: { $nin: ['Accepted', 'Cancelled'] } } },
      ...groupStage('finalAmount'),
      { $sort: { _id: 1 } }
    ]),
    Invoice.aggregate([
      ...lookupCheckIn,
      { $match: { checkIn: { $gte: today, $lte: endDate }, status: { $nin: ['Paid', 'Cancelled'] } } },
      ...groupStage('finalAmount'),
      { $sort: { _id: 1 } }
    ]),
    Lead.aggregate([
      { $match: { checkIn: { $gte: today, $lte: endDate }, status: { $nin: ['Converted', 'Cancelled'] } } },
      { $group: { _id: groupBy, count: { $sum: 1 } } }, 
      { $sort: { _id: 1 } }
    ])
  ]);

  // Merge data
  const dataMap = new Map();
  const processData = (dataset, type) => {
    dataset.forEach(item => {
      const key = item._id;
      if (!key) return; 
      if (!dataMap.has(key)) {
        dataMap.set(key, { 
          name: key, 
          revenue: 0, 
          quotation: 0, 
          invoice: 0, 
          booking: 0, 
          lead: 0,
          revenueCount: 0,
          quotationCount: 0,
          invoiceCount: 0,
          bookingCount: 0,
          leadCount: 0
        });
      }
      const data = dataMap.get(key);
      if (type === 'lead') {
        data.leadCount = item.count;
        return;
      }
      data[type] = item.total;
      data[`${type}Count`] = item.count;
    });
  };

  processData(quotations, 'quotation');
  processData(invoices, 'invoice');
  processData(leads, 'lead');

  // Convert map to array and sort chronologically
  let formattedData = Array.from(dataMap.values());
  formattedData.sort((a, b) => a.name.localeCompare(b.name));

  if (formattedData.length > limit) {
      formattedData = formattedData.slice(0, limit);
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

// @desc    Get voucher (confirmed bookings) trends
// @route   GET /api/dashboard/voucher-trends
// @access  Private
export const getVoucherTrends = asyncHandler(async (req, res) => {
  const { period = 'monthly' } = req.query;
  const now = new Date();
  let startDate;
  let format;

  switch (period) {
    case 'daily': 
      startDate = new Date(new Date().setDate(now.getDate() - 30)); 
      format = '%Y-%m-%d';
      break;
    case 'weekly': 
      startDate = new Date(new Date().setDate(now.getDate() - 90));
      format = '%Y-W%V';
      break;
    case 'monthly': 
      startDate = new Date(new Date().setFullYear(now.getFullYear() - 1));
      format = '%Y-%m';
      break;
    case 'annually': 
      startDate = new Date(0);
      format = '%Y';
      break;
    default: 
      startDate = new Date(new Date().setMonth(now.getMonth() - 6));
      format = '%Y-%m';
  }

  const trends = await Booking.aggregate([
    { 
      $match: { 
        status: 'Confirmed',
        createdAt: { $gte: startDate }
      } 
    },
    {
      $group: {
        _id: { $dateToString: { format: format, date: '$createdAt' } },
        count: { $sum: 1 },
        value: { $sum: '$totalAmount' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const formattedData = trends.map(item => ({
    name: item._id,
    vouchers: item.count,
    amount: item.value
  }));

  res.json({
    success: true,
    data: formattedData
  });
});

// @desc    Get resort-wise performance analysis (Unique Paid Bookings)
// @route   GET /api/dashboard/resort-analysis
// @access  Private
export const getResortAnalysis = asyncHandler(async (req, res) => {
  const { period = 'monthly' } = req.query;
  const now = new Date();
  let startDate;

  switch (period) {
    case 'daily': startDate = new Date(now.setHours(0,0,0,0)); break;
    case 'weekly': startDate = new Date(now.setDate(now.getDate() - 7)); break;
    case 'monthly': startDate = new Date(now.setMonth(now.getMonth() - 1)); break;
    case 'annually': startDate = new Date(now.setFullYear(now.getFullYear() - 1)); break;
    case 'all': startDate = new Date(0); break;
    default: startDate = new Date(now.setMonth(now.getMonth() - 1));
  }

  // 1. Unique Bookings that received a Payment (Receipt) in this period
  const receiptBookings = await Receipt.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $project: {
        // Coalesce all potential target links
        refId: { $ifNull: ['$lead', '$booking', '$invoice'] }
      }
    },
    { $match: { refId: { $ne: null } } },
    { $group: { _id: '$refId' } },
    // First hop lookups
    { $lookup: { from: 'leads', localField: '_id', foreignField: '_id', as: 'l' } },
    { $lookup: { from: 'bookings', localField: '_id', foreignField: '_id', as: 'b' } },
    { $lookup: { from: 'invoices', localField: '_id', foreignField: '_id', as: 'i' } },
    {
      $project: {
        info: { $ifNull: [{ $arrayElemAt: ['$l', 0] }, { $arrayElemAt: ['$b', 0] }, { $arrayElemAt: ['$i', 0] }] }
      }
    },
    { $match: { info: { $ne: null } } },
    // If it was an invoice, hop to its lead/booking
    { $lookup: { from: 'leads', localField: 'info.lead', foreignField: '_id', as: 'il' } },
    { $lookup: { from: 'bookings', localField: 'info.booking', foreignField: '_id', as: 'ib' } },
    {
      $project: {
        resortId: {
          $ifNull: [
            '$info.resort',
            { $arrayElemAt: ['$il.resort', 0] },
            { $arrayElemAt: ['$ib.resort', 0] }
          ]
        },
        financials: {
          $ifNull: [
            '$info',
            { $arrayElemAt: ['$il', 0] },
            { $arrayElemAt: ['$ib', 0] }
          ]
        }
      }
    },
    { $match: { resortId: { $ne: null } } },
    { 
      $group: { 
        _id: '$resortId', 
        count: { $sum: 1 },
        totalValue: { $sum: { $ifNull: ['$financials.totalAmount', 0] } },
        paidAmount: { $sum: { $ifNull: ['$financials.paidAmount', 0] } },
        balance: { $sum: { $ifNull: ['$financials.balance', 0] } }
      } 
    },
    { $lookup: { from: 'resorts', localField: '_id', foreignField: '_id', as: 'resort' } },
    { $unwind: '$resort' },
    {
      $project: {
        name: '$resort.name',
        receipts: '$count',
        totalValue: '$totalValue',
        paid: '$paidAmount',
        balance: '$balance'
      }
    },
    { $sort: { receipts: -1 } }
  ]);

  res.json({
    success: true,
    data: receiptBookings
  });
});

// @desc    Get room-wise performance analysis
// @route   GET /api/dashboard/room-analysis
// @access  Private
export const getRoomAnalysis = asyncHandler(async (req, res) => {
  const { period = 'monthly' } = req.query;
  const now = new Date();
  let startDate;

  switch (period) {
    case 'daily': startDate = new Date(now.setHours(0,0,0,0)); break;
    case 'weekly': startDate = new Date(now.setDate(now.getDate() - 7)); break;
    case 'monthly': startDate = new Date(now.setMonth(now.getMonth() - 1)); break;
    case 'annually': startDate = new Date(now.setFullYear(now.getFullYear() - 1)); break;
    case 'all': startDate = new Date(0); break;
    default: startDate = new Date(now.setMonth(now.getMonth() - 1));
  }

  // Use a more robust aggregation that handles both Leads and Bookings and Invoices
  const roomAnalysis = await Receipt.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $project: {
        refId: { $ifNull: ['$lead', '$booking', '$invoice'] }
      }
    },
    { $match: { refId: { $ne: null } } },
    { $group: { _id: '$refId' } },
    { $lookup: { from: 'leads', localField: '_id', foreignField: '_id', as: 'l' } },
    { $lookup: { from: 'bookings', localField: '_id', foreignField: '_id', as: 'b' } },
    { $lookup: { from: 'invoices', localField: '_id', foreignField: '_id', as: 'i' } },
    {
      $project: {
        info: { $ifNull: [{ $arrayElemAt: ['$l', 0] }, { $arrayElemAt: ['$b', 0] }, { $arrayElemAt: ['$i', 0] }] }
      }
    },
    { $match: { info: { $ne: null } } },
    { $lookup: { from: 'leads', localField: 'info.lead', foreignField: '_id', as: 'il' } },
    { $lookup: { from: 'bookings', localField: 'info.booking', foreignField: '_id', as: 'ib' } },
    {
      $project: {
        roomRef: {
          $ifNull: [
            '$info.room',
            { $arrayElemAt: ['$il.room', 0] },
            { $arrayElemAt: ['$ib.room', 0] }
          ]
        },
        financials: {
          $ifNull: [
            '$info',
            { $arrayElemAt: ['$il', 0] },
            { $arrayElemAt: ['$ib', 0] }
          ]
        }
      }
    },
    { $match: { roomRef: { $ne: null } } },
    {
      $group: {
        _id: '$roomRef',
        count: { $sum: 1 },
        totalValue: { $sum: { $ifNull: ['$financials.totalAmount', 0] } },
        paidAmount: { $sum: { $ifNull: ['$financials.paidAmount', 0] } },
        balance: { $sum: { $ifNull: ['$financials.balance', 0] } }
      }
    },
    { $lookup: { from: 'rooms', localField: '_id', foreignField: '_id', as: 'room' } },
    { $unwind: '$room' },
    { $lookup: { from: 'resorts', localField: 'room.resort', foreignField: '_id', as: 'resort' } },
    { $unwind: { path: '$resort', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        name: '$room.roomName',
        resort: { $ifNull: ['$resort.name', 'Unknown'] },
        receipts: '$count',
        totalValue: '$totalValue',
        paid: '$paidAmount',
        balance: '$balance'
      }
    },
    { $sort: { receipts: -1 } },
    { $limit: 10 }
  ]);

  res.json({
    success: true,
    data: roomAnalysis
  });
});

// @desc    Get user-wise (Admin/Sales Agent) performance analysis
// @route   GET /api/dashboard/user-analysis
// @access  Private
export const getUserAnalysis = asyncHandler(async (req, res) => {
  const { period = 'monthly' } = req.query;
  const now = new Date();
  let startDate;

  switch (period) {
    case 'daily': startDate = new Date(now.setHours(0,0,0,0)); break;
    case 'weekly': startDate = new Date(now.setDate(now.getDate() - 7)); break;
    case 'monthly': startDate = new Date(now.setMonth(now.getMonth() - 1)); break;
    case 'annually': startDate = new Date(now.setFullYear(now.getFullYear() - 1)); break;
    case 'all': startDate = new Date(0); break;
    default: startDate = new Date(now.setMonth(now.getMonth() - 1));
  }

  // Aggregate unique bookings that received payments, grouped by the user who created the lead/booking
  const userStats = await Receipt.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $project: {
        refId: { $ifNull: ['$lead', '$booking', '$invoice'] }
      }
    },
    { $match: { refId: { $ne: null } } },
    { $group: { _id: '$refId' } },
    { $lookup: { from: 'leads', localField: '_id', foreignField: '_id', as: 'l' } },
    { $lookup: { from: 'bookings', localField: '_id', foreignField: '_id', as: 'b' } },
    {
      $project: {
        info: { $ifNull: [{ $arrayElemAt: ['$l', 0] }, { $arrayElemAt: ['$b', 0] }] }
      }
    },
    { $match: { info: { $ne: null } } },
    {
      $group: {
        _id: '$info.createdBy',
        conversions: { $sum: 1 },
        totalValue: { $sum: { $ifNull: ['$info.totalAmount', 0] } },
        totalPaid: { $sum: { $ifNull: ['$info.paidAmount', 0] } },
        fullyPaidCount: { 
          $sum: { 
            $cond: [
              { $lte: [{ $ifNull: ['$info.balance', 999999] }, 0] }, 
              1, 
              0 
            ] 
          } 
        }
      }
    },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    {
      $project: {
        name: '$user.name',
        role: '$user.role',
        conversions: 1,
        fullyPaid: '$fullyPaidCount',
        totalValue: 1,
        totalPaid: 1
      }
    },
    { $sort: { conversions: -1 } }
  ]);

  res.json({
    success: true,
    data: userStats
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
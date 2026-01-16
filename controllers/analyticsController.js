import asyncHandler from 'express-async-handler';
import Booking from '../models/Booking.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Receipt from '../models/Receipt.js';
import Quotation from '../models/Quotation.js';
import Resort from '../models/Resort.js';
import Lead from '../models/Lead.js';
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
  } else if (period) {
    const now = new Date();
    let start;
    switch (period) {
      case 'daily': start = new Date(new Date().setHours(0,0,0,0)); break;
      case 'weekly': {
          const d = new Date();
          d.setDate(d.getDate() - 7);
          start = d;
          break;
      }
      case 'monthly': {
          const d = new Date();
          d.setMonth(d.getMonth() - 1);
          start = d;
          break;
      }
      case 'annually': {
          const d = new Date();
          d.setFullYear(d.getFullYear() - 1);
          start = d;
          break;
      }
      case 'all': start = new Date(0); break;
      default: {
          const d = new Date();
          d.setMonth(d.getMonth() - 1);
          start = d;
      }
    }
    dateFilter = { createdAt: { $gte: start } };
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
  } else if (period) {
    const now = new Date();
    let start;
    switch (period) {
      case 'daily': start = new Date(new Date().setHours(0,0,0,0)); break;
      case 'weekly': {
          const d = new Date();
          d.setDate(d.getDate() - 7);
          start = d;
          break;
      }
      case 'monthly': {
          const d = new Date();
          d.setMonth(d.getMonth() - 1);
          start = d;
          break;
      }
      case 'annually': {
          const d = new Date();
          d.setFullYear(d.getFullYear() - 1);
          start = d;
          break;
      }
      case 'all': start = new Date(0); break;
      default: {
          const d = new Date();
          d.setMonth(d.getMonth() - 1);
          start = d;
      }
    }
    dateFilter = { createdAt: { $gte: start } };
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
  const { period = 'monthly', startDate, endDate } = req.query;

  let dateFilter = {};
  if (startDate && endDate) {
    dateFilter = {
      dueDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
  } else if (period) {
    const now = new Date();
    let start;
    switch (period) {
      case 'daily': start = new Date(new Date().setHours(0,0,0,0)); break;
      case 'weekly': {
          const d = new Date();
          d.setDate(d.getDate() - 7);
          start = d;
          break;
      }
      case 'monthly': {
          const d = new Date();
          d.setMonth(d.getMonth() - 1);
          start = d;
          break;
      }
      case 'annually': {
          const d = new Date();
          d.setFullYear(d.getFullYear() - 1);
          start = d;
          break;
      }
      case 'all': start = new Date(0); break;
      default: {
          const d = new Date();
          d.setMonth(d.getMonth() - 1);
          start = d;
      }
    }
    dateFilter = { createdAt: { $gte: start } };
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
    case 'resort-analysis':
      // Calculate detailed resort performance report
      const now = new Date();
      let start;
      switch (period) {
        case 'daily': start = new Date(now.setHours(0,0,0,0)); break;
        case 'weekly': start = new Date(now.setDate(now.getDate() - 7)); break;
        case 'monthly': start = new Date(now.setMonth(now.getMonth() - 1)); break;
        case 'annually': start = new Date(now.setFullYear(now.getFullYear() - 1)); break;
        case 'all': start = new Date(0); break;
        default: start = new Date(now.setMonth(now.getMonth() - 1));
      }
      const filter = { createdAt: { $gte: start } };

      const detailedData = await Receipt.aggregate([
        { $match: filter },
        { 
          $project: { 
            refId: { $ifNull: ['$lead', '$booking', '$invoice'] } 
          } 
        },
        { $group: { _id: '$refId' } }, // Get unique bookings/leads/invoices
        { $lookup: { from: 'leads', localField: '_id', foreignField: '_id', as: 'leadInfo' } },
        { $lookup: { from: 'bookings', localField: '_id', foreignField: '_id', as: 'bookingInfo' } },
        { $lookup: { from: 'invoices', localField: '_id', foreignField: '_id', as: 'invoiceInfo' } },
        {
          $project: {
            baseInfo: { 
              $ifNull: [
                { $arrayElemAt: ['$leadInfo', 0] }, 
                { $arrayElemAt: ['$bookingInfo', 0] },
                { $arrayElemAt: ['$invoiceInfo', 0] }
              ] 
            }
          }
        },
        { $match: { baseInfo: { $ne: null } } },
        { $lookup: { from: 'leads', localField: 'baseInfo.lead', foreignField: '_id', as: 'invoiceLeadInfo' } },
        { $lookup: { from: 'bookings', localField: 'baseInfo.booking', foreignField: '_id', as: 'invoiceBookingInfo' } },
        {
           $project: {
             resortRef: {
               $ifNull: [
                 '$baseInfo.resort',
                 { $arrayElemAt: ['$invoiceLeadInfo.resort', 0] },
                 { $arrayElemAt: ['$invoiceBookingInfo.resort', 0] }
               ]
             },
             docInfo: {
               $ifNull: [
                 '$baseInfo',
                 { $arrayElemAt: ['$invoiceLeadInfo', 0] },
                 { $arrayElemAt: ['$invoiceBookingInfo', 0] }
               ]
             }
           }
        },
        { $match: { resortRef: { $ne: null } } },
        { $lookup: { from: 'resorts', localField: 'resortRef', foreignField: '_id', as: 'resort' } },
        { $unwind: '$resort' },
        { 
          $project: {
            resortName: '$resort.name',
            customerName: '$docInfo.guestName',
            date: '$docInfo.createdAt',
            fullAmount: '$docInfo.totalAmount',
            paidAmount: '$docInfo.paidAmount',
            balance: '$docInfo.balance'
          }
        },
        { $sort: { resortName: 1, date: -1 } }
      ]);

      reportData = detailedData;
      reportTitle = 'Resort Performance Detail Report';
      break;
    
    case 'room-analysis':
      // Calculate detailed room performance report
      const roomNow = new Date();
      let roomStart;
      switch (period) {
        case 'daily': roomStart = new Date(roomNow.setHours(0,0,0,0)); break;
        case 'weekly': roomStart = new Date(roomNow.setDate(roomNow.getDate() - 7)); break;
        case 'monthly': roomStart = new Date(roomNow.setMonth(roomNow.getMonth() - 1)); break;
        case 'annually': roomStart = new Date(roomNow.setFullYear(roomNow.getFullYear() - 1)); break;
        case 'all': roomStart = new Date(0); break;
        default: roomStart = new Date(roomNow.setMonth(roomNow.getMonth() - 1));
      }
      const roomFilter = { createdAt: { $gte: roomStart } };

      const roomDetailedData = await Receipt.aggregate([
        { $match: roomFilter },
        { 
          $project: { 
            refId: { $ifNull: ['$lead', '$booking', '$invoice'] } 
          } 
        },
        { $group: { _id: '$refId' } }, 
        { $lookup: { from: 'leads', localField: '_id', foreignField: '_id', as: 'leadInfo' } },
        { $lookup: { from: 'bookings', localField: '_id', foreignField: '_id', as: 'bookingInfo' } },
        { $lookup: { from: 'invoices', localField: '_id', foreignField: '_id', as: 'invoiceInfo' } },
        {
          $project: {
            baseInfo: { 
              $ifNull: [
                { $arrayElemAt: ['$leadInfo', 0] }, 
                { $arrayElemAt: ['$bookingInfo', 0] },
                { $arrayElemAt: ['$invoiceInfo', 0] }
              ] 
            }
          }
        },
        { $match: { baseInfo: { $ne: null } } },
        { $lookup: { from: 'leads', localField: 'baseInfo.lead', foreignField: '_id', as: 'invoiceLeadInfo' } },
        { $lookup: { from: 'bookings', localField: 'baseInfo.booking', foreignField: '_id', as: 'invoiceBookingInfo' } },
        {
           $project: {
             roomRef: {
               $ifNull: [
                 '$baseInfo.room',
                 { $arrayElemAt: ['$invoiceLeadInfo.room', 0] },
                 { $arrayElemAt: ['$invoiceBookingInfo.room', 0] }
               ]
             },
             docInfo: {
               $ifNull: [
                 '$baseInfo',
                 { $arrayElemAt: ['$invoiceLeadInfo', 0] },
                 { $arrayElemAt: ['$invoiceBookingInfo', 0] }
               ]
             }
           }
        },
        { $match: { roomRef: { $ne: null } } },
        { $lookup: { from: 'rooms', localField: 'roomRef', foreignField: '_id', as: 'room' } },
        { $unwind: '$room' },
        { $lookup: { from: 'resorts', localField: 'room.resort', foreignField: '_id', as: 'resort' } },
        { $unwind: '$resort' },
        { 
          $project: {
            roomName: { $concat: ['$room.roomName', ' (', '$resort.name', ')'] },
            customerName: '$docInfo.guestName',
            date: '$docInfo.createdAt',
            fullAmount: '$docInfo.totalAmount',
            paidAmount: '$docInfo.paidAmount',
            balance: '$docInfo.balance'
          }
        },
        { $sort: { roomName: 1, date: -1 } }
      ]);

      reportData = roomDetailedData.map(item => ({
        ...item,
        // Hack to reuse pdf generator table structure which expects 'resortName'
        resortName: item.roomName 
      }));
      reportTitle = 'Room Performance Detail Report';
      break;

    case 'user-performance':
      // Calculate detailed user performance report
      const userNow = new Date();
      let userStart;
      switch (period) {
        case 'daily': userStart = new Date(userNow.setHours(0,0,0,0)); break;
        case 'weekly': userStart = new Date(userNow.setDate(userNow.getDate() - 7)); break;
        case 'monthly': userStart = new Date(userNow.setMonth(userNow.getMonth() - 1)); break;
        case 'annually': userStart = new Date(userNow.setFullYear(userNow.getFullYear() - 1)); break;
        case 'all': userStart = new Date(0); break;
        default: userStart = new Date(userNow.setMonth(userNow.getMonth() - 1));
      }
      const userFilter = { createdAt: { $gte: userStart } };

      const userDetailedData = await Receipt.aggregate([
        { $match: userFilter },
        { 
          $project: { 
            refId: { $ifNull: ['$lead', '$booking', '$invoice'] } 
          } 
        },
        { $group: { _id: '$refId' } }, 
        { $lookup: { from: 'leads', localField: '_id', foreignField: '_id', as: 'leadInfo' } },
        { $lookup: { from: 'bookings', localField: '_id', foreignField: '_id', as: 'bookingInfo' } },
        { $lookup: { from: 'invoices', localField: '_id', foreignField: '_id', as: 'invoiceInfo' } },
        {
          $project: {
            baseInfo: { 
              $ifNull: [
                { $arrayElemAt: ['$leadInfo', 0] }, 
                { $arrayElemAt: ['$bookingInfo', 0] },
                { $arrayElemAt: ['$invoiceInfo', 0] }
              ] 
            }
          }
        },
        { $match: { baseInfo: { $ne: null } } },
        { $lookup: { from: 'users', localField: 'baseInfo.createdBy', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { 
          $project: {
            userName: '$user.name',
            customerName: '$baseInfo.guestName',
            date: '$baseInfo.createdAt',
            fullAmount: '$baseInfo.totalAmount',
            paidAmount: '$baseInfo.paidAmount',
            balance: '$baseInfo.balance'
          }
        },
        { $sort: { userName: 1, date: -1 } }
      ]);

      reportData = userDetailedData;
      reportTitle = 'User Performance Detail Report';
      break;

    case 'operational-trends':
      const opNow = new Date();
      let opStart;
      switch (period) {
        case 'daily': opStart = new Date(opNow.setHours(0,0,0,0)); break;
        case 'weekly': opStart = new Date(opNow.setDate(opNow.getDate() - 7)); break;
        case 'monthly': opStart = new Date(opNow.setMonth(now.getMonth() - 1)); break;
        case 'annually': opStart = new Date(opNow.setFullYear(opNow.getFullYear() - 1)); break;
        case 'all': opStart = new Date(0); break;
        default: opStart = new Date(opNow.setHours(0,0,0,0));
      }
      
      const opFilter = period === 'all' ? {} : { checkIn: { $gte: opStart } };
      const creationFilter = period === 'all' ? {} : { createdAt: { $gte: opStart } };

      const [leads_op, quotes_op, invs_op, receipts_op, bookings_op] = await Promise.all([
        Lead.find({ ...opFilter, status: { $nin: ['Converted', 'Cancelled'] } }).select('leadNumber guestName checkIn status').lean(),
        Quotation.find({ status: { $nin: ['Accepted', 'Cancelled'] } })
          .populate('lead', 'checkIn')
          .populate('booking', 'checkIn')
          .select('quotationNumber guestName status finalAmount createdAt')
          .lean(),
        Invoice.find({ status: { $nin: ['Paid', 'Cancelled'] } })
          .populate('lead', 'checkIn')
          .populate('booking', 'checkIn')
          .select('invoiceNumber guestName status finalAmount createdAt')
          .lean(),
        Receipt.find({ ...creationFilter })
          .select('receiptNumber customerName createdAt amount paymentMethod')
          .lean(),
        Booking.find({ ...opFilter, status: 'Confirmed' })
          .select('bookingNumber guestName checkIn status totalAmount')
          .lean()
      ]);

      const formatCheckIn = (doc) => {
          const ci = doc.checkIn || doc.lead?.checkIn || doc.booking?.checkIn;
          return ci ? new Date(ci) : null;
      };

      const sortByDate = (a, b) => new Date(a.date) - new Date(b.date);

      // Group data by type for the grouped PDF layout
      reportData = {
        'New Leads': leads_op.filter(l => l.status === 'New').map(l => ({ 
          type: 'Lead', id: l.leadNumber, customer: l.guestName, date: l.checkIn, amount: 0, status: l.status 
        })).sort(sortByDate),
        'Quotations': quotes_op.map(q => ({ 
          type: 'Quote', id: q.quotationNumber, customer: q.guestName, date: formatCheckIn(q) || q.createdAt, amount: q.finalAmount, status: q.status 
        })).sort(sortByDate),
        'Invoices': invs_op.map(i => ({ 
          type: 'Invoice', id: i.invoiceNumber, customer: i.guestName, date: formatCheckIn(i) || i.createdAt, amount: i.finalAmount, status: i.status 
        })).sort(sortByDate),
        'Receipts': receipts_op.map(r => ({ 
          type: 'Receipt', id: r.receiptNumber, customer: r.customerName, date: r.createdAt, amount: r.amount, status: r.paymentMethod 
        })).sort((a, b) => new Date(a.date) - new Date(b.date)),
        'Confirmed Bookings': bookings_op.map(b => ({ 
          type: 'Booking', id: b.bookingNumber, customer: b.guestName, date: b.checkIn, amount: b.totalAmount, status: b.status 
        })).sort(sortByDate)
      };

      reportTitle = `Operational Pipeline Report (${period || 'daily'})`;
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
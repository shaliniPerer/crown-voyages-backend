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
      // Calculate booking report with date range support
      const bookingNow = new Date();
      let bookingStart, bookingEnd;
      
      // Handle custom date ranges
      if (req.query.startDate && req.query.endDate) {
        bookingStart = new Date(req.query.startDate);
        bookingEnd = new Date(req.query.endDate);
        bookingEnd.setHours(23, 59, 59, 999);
      } else if (req.query.week) {
        const [year, week] = req.query.week.split('-W');
        bookingStart = new Date(year, 0, 1 + (week - 1) * 7);
        bookingEnd = new Date(bookingStart);
        bookingEnd.setDate(bookingEnd.getDate() + 6);
        bookingEnd.setHours(23, 59, 59, 999);
      } else if (req.query.month) {
        const [year, month] = req.query.month.split('-');
        bookingStart = new Date(year, month - 1, 1);
        bookingEnd = new Date(year, month, 0, 23, 59, 59, 999);
      } else if (req.query.year) {
        bookingStart = new Date(req.query.year, 0, 1);
        bookingEnd = new Date(req.query.year, 11, 31, 23, 59, 59, 999);
      } else {
        switch (period) {
          case 'daily': bookingStart = new Date(bookingNow.setHours(0,0,0,0)); break;
          case 'weekly': bookingStart = new Date(bookingNow.setDate(bookingNow.getDate() - 7)); break;
          case 'monthly': bookingStart = new Date(bookingNow.setMonth(bookingNow.getMonth() - 1)); break;
          case 'annually': bookingStart = new Date(bookingNow.setFullYear(bookingNow.getFullYear() - 1)); break;
          case 'all': bookingStart = new Date(0); break;
          default: bookingStart = new Date(bookingNow.setMonth(bookingNow.getMonth() - 1));
        }
        bookingEnd = new Date();
      }

      const bookingFilter = { createdAt: { $gte: bookingStart, $lte: bookingEnd } };

      // Get leads with different statuses and populate necessary fields
      const [newLeads, quotationLeads, invoiceLeads, receiptLeads, confirmedLeads] = await Promise.all([
        Lead.find({ ...bookingFilter, status: 'New' })
          .populate('booking', 'bookingNumber checkIn checkOut')
          .populate('resort', 'name')
          .populate('room', 'name')
          .lean(),
        Lead.find({ ...bookingFilter, status: 'Quotation' })
          .populate('booking', 'bookingNumber checkIn checkOut')
          .populate('resort', 'name')
          .populate('room', 'name')
          .lean(),
        Lead.find({ ...bookingFilter, status: 'Invoice' })
          .populate('booking', 'bookingNumber checkIn checkOut')
          .populate('resort', 'name')
          .populate('room', 'name')
          .lean(),
        Lead.find({ ...bookingFilter, status: 'Receipt' })
          .populate('booking', 'bookingNumber checkIn checkOut')
          .populate('resort', 'name')
          .populate('room', 'name')
          .lean(),
        Lead.find({ ...bookingFilter, status: 'Confirmed' })
          .populate('booking', 'bookingNumber checkIn checkOut')
          .populate('resort', 'name')
          .populate('room', 'name')
          .lean()
      ]);

      // Get quotations and invoices for relevant leads
      const allLeadIds = [...quotationLeads.map(l => l._id), ...invoiceLeads.map(l => l._id)];
      const [quotations, invoices] = await Promise.all([
        Quotation.find({ lead: { $in: quotationLeads.map(l => l._id) } }).select('lead quotationNumber').lean(),
        Invoice.find({ lead: { $in: invoiceLeads.map(l => l._id) } }).select('lead invoiceNumber').lean()
      ]);

      // Create maps for quick lookup
      const quotationMap = new Map(quotations.map(q => [q.lead.toString(), q.quotationNumber]));
      const invoiceMap = new Map(invoices.map(i => [i.lead.toString(), i.invoiceNumber]));

      // Format data by status
      const formatLeadData = (lead, statusType) => {
        let relevantId = lead.leadNumber;
        if (statusType === 'Quotation') {
          relevantId = quotationMap.get(lead._id.toString()) || lead.leadNumber;
        } else if (statusType === 'Invoice') {
          relevantId = invoiceMap.get(lead._id.toString()) || lead.leadNumber;
        } else if (statusType === 'Receipt') {
          relevantId = lead.leadNumber;
        } else if (statusType === 'Confirmed' && lead.booking) {
          relevantId = lead.booking.bookingNumber;
        }

        return {
          bookingId: lead.booking?.bookingNumber || lead.leadNumber,
          relevantId: relevantId,
          customerName: lead.guestName,
          checkIn: lead.checkIn || lead.booking?.checkIn,
          checkOut: lead.checkOut || lead.booking?.checkOut,
          resortName: lead.resort?.name || '-',
          roomName: lead.room?.name || '-',
          fullAmount: statusType !== 'New' ? (lead.totalAmount || 0) : 0,
          paidAmount: statusType !== 'New' ? (lead.paidAmount || 0) : 0,
          balance: statusType !== 'New' ? (lead.balance || 0) : 0
        };
      };

      reportData = {
        'New': newLeads.map(lead => formatLeadData(lead, 'New')),
        'Quotation': quotationLeads.map(lead => formatLeadData(lead, 'Quotation')),
        'Invoice': invoiceLeads.map(lead => formatLeadData(lead, 'Invoice')),
        'Receipts': receiptLeads.map(lead => formatLeadData(lead, 'Receipt')),
        'Confirmed': confirmedLeads.map(lead => formatLeadData(lead, 'Confirmed'))
      };

      reportTitle = 'Booking Status Report';
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
      // Calculate detailed user performance report (Receipt and Confirmed Leads)
      const userNow = new Date();
      let userStart, userEnd;
      
      // Handle custom date ranges
      if (req.query.startDate && req.query.endDate) {
        userStart = new Date(req.query.startDate);
        userEnd = new Date(req.query.endDate);
        userEnd.setHours(23, 59, 59, 999);
      } else if (req.query.week) {
        // Week format: "2026-W03"
        const [year, week] = req.query.week.split('-W');
        userStart = new Date(year, 0, 1 + (week - 1) * 7);
        userEnd = new Date(userStart);
        userEnd.setDate(userEnd.getDate() + 6);
        userEnd.setHours(23, 59, 59, 999);
      } else if (req.query.month) {
        // Month format: "2026-01"
        const [year, month] = req.query.month.split('-');
        userStart = new Date(year, month - 1, 1);
        userEnd = new Date(year, month, 0, 23, 59, 59, 999);
      } else if (req.query.year) {
        userStart = new Date(req.query.year, 0, 1);
        userEnd = new Date(req.query.year, 11, 31, 23, 59, 59, 999);
      } else {
        // Default period handling
        switch (period) {
          case 'daily': userStart = new Date(userNow.setHours(0,0,0,0)); break;
          case 'weekly': userStart = new Date(userNow.setDate(userNow.getDate() - 7)); break;
          case 'monthly': userStart = new Date(userNow.setMonth(userNow.getMonth() - 1)); break;
          case 'annually': userStart = new Date(userNow.setFullYear(userNow.getFullYear() - 1)); break;
          case 'all': userStart = new Date(0); break;
          default: userStart = new Date(userNow.setMonth(userNow.getMonth() - 1));
        }
        userEnd = new Date();
      }

      // Get Leads with Receipt or Confirmed status
      const userLeads = await Lead.find({
        status: { $in: ['Receipt', 'Confirmed'] },
        createdAt: { $gte: userStart, $lte: userEnd }
      }).populate('createdBy', 'name role').lean();

      // Group by user, then separate by status
      const userGroups = {};
      userLeads.forEach(lead => {
        const userName = lead.createdBy?.name || 'Unknown';
        const userRole = lead.createdBy?.role || 'N/A';
        const userKey = `${userName} (${userRole})`;
        
        if (!userGroups[userKey]) {
          userGroups[userKey] = { receipts: [], confirmed: [] };
        }
        
        const leadData = {
          customerName: lead.guestName,
          bookingNumber: lead.leadNumber,
          date: lead.createdAt,
          fullAmount: lead.totalAmount || 0,
          paidAmount: lead.paidAmount || 0,
          balance: lead.balance || 0
        };
        
        if (lead.status === 'Receipt') {
          userGroups[userKey].receipts.push(leadData);
        } else if (lead.status === 'Confirmed') {
          userGroups[userKey].confirmed.push(leadData);
        }
      });

      // Format for PDF generation
      reportData = userGroups;
      reportTitle = 'User Performance Detail Report';
      break;

    case 'operational-trends':
      const opNow = new Date();
      let opStart, opEnd;
      
      // Handle custom date ranges
      if (req.query.startDate && req.query.endDate) {
        opStart = new Date(req.query.startDate);
        opEnd = new Date(req.query.endDate);
        opEnd.setHours(23, 59, 59, 999);
      } else if (req.query.week) {
        const [year, week] = req.query.week.split('-W');
        opStart = new Date(year, 0, 1 + (week - 1) * 7);
        opEnd = new Date(opStart);
        opEnd.setDate(opEnd.getDate() + 6);
        opEnd.setHours(23, 59, 59, 999);
      } else if (req.query.month) {
        const [year, month] = req.query.month.split('-');
        opStart = new Date(year, month - 1, 1);
        opEnd = new Date(year, month, 0, 23, 59, 59, 999);
      } else if (req.query.year) {
        opStart = new Date(req.query.year, 0, 1);
        opEnd = new Date(req.query.year, 11, 31, 23, 59, 59, 999);
      } else {
        switch (period) {
          case 'daily': opStart = new Date(opNow.setHours(0,0,0,0)); break;
          case 'weekly': opStart = new Date(opNow.setDate(opNow.getDate() - 7)); break;
          case 'monthly': opStart = new Date(opNow.setMonth(opNow.getMonth() - 1)); break;
          case 'annually': opStart = new Date(opNow.setFullYear(opNow.getFullYear() - 1)); break;
          case 'all': opStart = new Date(0); break;
          default: opStart = new Date(opNow.setHours(0,0,0,0));
        }
        opEnd = new Date();
      }
      
      const opFilter = { createdAt: { $gte: opStart, $lte: opEnd } };

      // Get data from Leads (booking page) with resort info
      const [leads_new, leads_quotation, leads_invoice_status] = await Promise.all([
        Lead.find({ ...opFilter, status: 'New' })
          .select('leadNumber guestName checkIn checkOut')
          .populate('resort', 'name')
          .lean(),
        Lead.find({ ...opFilter, status: 'Quotation' })
          .select('leadNumber guestName checkIn checkOut')
          .populate('resort', 'name')
          .lean(),
        Lead.find({ ...opFilter, status: 'Invoice' })
          .select('leadNumber guestName checkIn checkOut _id')
          .populate('resort', 'name')
          .lean()
      ]);

      // Get ALL invoices from billing page (regardless of lead status or date)
      const allInvoiceLeadIds = leads_invoice_status.map(l => l._id);
      const invoicesFromBilling = await Invoice.find({ 
        lead: { $in: allInvoiceLeadIds }
      })
        .select('lead invoiceNumber createdAt customerName')
        .populate('lead', 'checkIn checkOut resort')
        .populate({ path: 'lead', populate: { path: 'resort', select: 'name' } })
        .lean();

      // Create a map of lead ID to lead data for invoice lookups
      const leadMap = new Map(leads_invoice_status.map(l => [l._id.toString(), l]));

      // Format data by status groups
      reportData = {
        'New': leads_new.map(l => ({ 
          bookingNumber: l.leadNumber,
          customerName: l.guestName,
          checkIn: l.checkIn,
          checkOut: l.checkOut,
          resortName: l.resort?.name || '-'
        })),
        'Quotations': leads_quotation.map(l => ({ 
          bookingNumber: l.leadNumber,
          customerName: l.guestName,
          checkIn: l.checkIn,
          checkOut: l.checkOut,
          resortName: l.resort?.name || '-'
        })),
        'Invoices': invoicesFromBilling.map(invoice => {
          const lead = leadMap.get(invoice.lead?._id?.toString()) || invoice.lead;
          return {
            bookingNumber: invoice.invoiceNumber,
            customerName: invoice.customerName || lead?.guestName || 'Unknown',
            checkIn: lead?.checkIn,
            checkOut: lead?.checkOut,
            resortName: lead?.resort?.name || '-'
          };
        })
      };

      reportTitle = 'Booking Distribution Report';
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
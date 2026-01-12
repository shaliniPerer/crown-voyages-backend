import express from 'express';
import {
  getBillingStats,
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  sendInvoiceEmail,
  sendManualReminder,
  exportInvoicePDF,
  getPayments,
  getPaymentsByInvoice,
  recordPayment,
  sendPaymentReceiptEmail,
  getReminders,
  createReminder,
  updateReminder,
  deleteReminder,
  getBillingHistory
} from '../controllers/billingController.js';
import { protect } from '../middleware/authMiddleware.js';
import { isFinanceOrAdmin } from '../middleware/roleMiddleware.js';

const router = express.Router();

// All billing routes require authentication
router.use(protect);

// Stats routes
router.get('/stats', getBillingStats);

// Invoice routes
router.get('/invoices', getInvoices);
router.get('/invoices/:id', getInvoiceById);
router.post('/invoices', isFinanceOrAdmin, createInvoice);
router.patch('/invoices/:id', isFinanceOrAdmin, updateInvoice);
router.post('/invoices/:id/send-email', sendInvoiceEmail);
router.post('/invoices/:id/remind', sendManualReminder);
router.get('/invoices/:id/pdf', exportInvoicePDF);

// Payment routes
router.get('/payments', getPayments);
router.get('/payments/invoice/:invoiceId', getPaymentsByInvoice);
router.post('/payments', isFinanceOrAdmin, recordPayment);
router.post('/payments/:id/send-receipt', sendPaymentReceiptEmail);

// Reminder routes
router.get('/reminders', getReminders);
router.post('/reminders', isFinanceOrAdmin, createReminder);
router.patch('/reminders/:id', isFinanceOrAdmin, updateReminder);
router.delete('/reminders/:id', isFinanceOrAdmin, deleteReminder);

export default router;
import express from 'express';
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  sendInvoiceEmail,
  exportInvoicePDF,
  getPayments,
  getPaymentsByInvoice,
  recordPayment,
  getReminders,
  createReminder,
  updateReminder,
  deleteReminder
} from '../controllers/billingController.js';
import { protect } from '../middleware/authMiddleware.js';
import { isFinanceOrAdmin } from '../middleware/roleMiddleware.js';

const router = express.Router();

// All billing routes require authentication
router.use(protect);

// Invoice routes
router.get('/invoices', getInvoices);
router.get('/invoices/:id', getInvoiceById);
router.post('/invoices', isFinanceOrAdmin, createInvoice);
router.patch('/invoices/:id', isFinanceOrAdmin, updateInvoice);
router.post('/invoices/:id/send-email', sendInvoiceEmail);
router.get('/invoices/:id/pdf', exportInvoicePDF);

// Payment routes
router.get('/payments', getPayments);
router.get('/payments/invoice/:invoiceId', getPaymentsByInvoice);
router.post('/payments', isFinanceOrAdmin, recordPayment);

// Reminder routes
router.get('/reminders', getReminders);
router.post('/reminders', isFinanceOrAdmin, createReminder);
router.patch('/reminders/:id', isFinanceOrAdmin, updateReminder);
router.delete('/reminders/:id', isFinanceOrAdmin, deleteReminder);

export default router;
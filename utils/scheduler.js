import cron from 'node-cron';
import Invoice from '../models/Invoice.js';
import Reminder from '../models/Reminder.js';
import Quotation from '../models/Quotation.js';
import { sendPaymentReminderEmail } from './emailServer.js';

// Check for overdue invoices and send reminders
const checkOverdueInvoices = async () => {
  try {
    console.log('🔔 Running overdue invoice check...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find invoices that are overdue
    const overdueInvoices = await Invoice.find({
      dueDate: { $lt: today },
      status: { $in: ['Pending', 'Partial', 'Sent'] },
      balance: { $gt: 0 }
    });

    console.log(`Found ${overdueInvoices.length} overdue invoices`);

    for (const invoice of overdueInvoices) {
      // Update status to Overdue
      if (invoice.status !== 'Overdue') {
        invoice.status = 'Overdue';
        await invoice.save();
      }

      // Send reminder email - find if there is an 'after' reminder configured
      const afterReminder = await Reminder.findOne({ reminderType: 'after', enabled: true });
      
      try {
        if (afterReminder) {
            await sendPaymentReminderEmail(invoice, 'after', afterReminder.template, afterReminder.subject);
        } else {
            await sendPaymentReminderEmail(invoice, 'after');
        }
        console.log(`✉️  Sent overdue reminder for invoice ${invoice.invoiceNumber}`);
      } catch (error) {
        console.error(`Failed to send reminder for ${invoice.invoiceNumber}:`, error.message);
      }
    }
  } catch (error) {
    console.error('Error checking overdue invoices:', error.message);
  }
};

// Check for upcoming due dates and send reminders
const checkUpcomingDueDates = async () => {
  try {
    console.log('🔔 Running upcoming due date check...');
    
    const reminders = await Reminder.find({ enabled: true });

    for (const reminder of reminders) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let targetDate = new Date(today);

      // Calculate target date based on reminder type
      if (reminder.reminderType === 'before') {
        targetDate.setDate(targetDate.getDate() + reminder.days);
      } else if (reminder.reminderType === 'on') {
        // targetDate is today
      } else if (reminder.reminderType === 'after') {
        targetDate.setDate(targetDate.getDate() - reminder.days);
      }

      // Find invoices matching the target date
      const invoices = await Invoice.find({
        dueDate: {
          $gte: targetDate,
          $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
        },
        status: { $in: ['Pending', 'Partial', 'Sent', 'Overdue'] },
        balance: { $gt: 0 }
      });

      console.log(`Found ${invoices.length} invoices for ${reminder.reminderType} reminder (${reminder.days} days)`);

      for (const invoice of invoices) {
        try {
          await sendPaymentReminderEmail(invoice, reminder.reminderType, reminder.template, reminder.subject);
          console.log(`✉️  Sent ${reminder.reminderType} reminder for invoice ${invoice.invoiceNumber}`);
        } catch (error) {
          console.error(`Failed to send reminder for ${invoice.invoiceNumber}:`, error.message);
        }
      }

      // Update last run
      reminder.lastRun = new Date();
      await reminder.save();
    }
  } catch (error) {
    console.error('Error checking upcoming due dates:', error.message);
  }
};

// Check for expired quotations
const checkExpiredQuotations = async () => {
  try {
    console.log('🔔 Running expired quotation check...');
    
    const today = new Date();

    const expiredQuotations = await Quotation.find({
      validUntil: { $lt: today },
      status: { $nin: ['Accepted', 'Rejected', 'Expired'] },
      convertedToBooking: false
    });

    console.log(`Found ${expiredQuotations.length} expired quotations`);

    for (const quotation of expiredQuotations) {
      quotation.status = 'Expired';
      await quotation.save();
      console.log(`Marked quotation ${quotation.quotationNumber} as expired`);
    }
  } catch (error) {
    console.error('Error checking expired quotations:', error.message);
  }
};

// Initialize all scheduled tasks
export const initializeScheduler = () => {
  console.log('⏰ Initializing scheduler...');

  // Run overdue invoice check daily at 9:00 AM
  cron.schedule('0 9 * * *', () => {
    console.log('Running daily overdue invoice check...');
    checkOverdueInvoices();
  });

  // Run upcoming due date check daily at 10:00 AM
  cron.schedule('0 10 * * *', () => {
    console.log('Running daily upcoming due date check...');
    checkUpcomingDueDates();
  });

  // Run expired quotation check daily at 11:00 AM
  cron.schedule('0 11 * * *', () => {
    console.log('Running daily expired quotation check...');
    checkExpiredQuotations();
  });

  // Run immediate check on startup (optional)
  setTimeout(() => {
    console.log('Running initial checks...');
    checkOverdueInvoices();
    checkUpcomingDueDates();
    checkExpiredQuotations();
  }, 5000); // Wait 5 seconds after startup

  console.log('✅ Scheduler initialized successfully');
};

// Manual trigger functions (for testing or admin use)
export const manualTriggers = {
  checkOverdueInvoices,
  checkUpcomingDueDates,
  checkExpiredQuotations
};

export default {
  initializeScheduler,
  manualTriggers
};
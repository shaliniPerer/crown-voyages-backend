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

    // Find invoices that are overdue and have reminders enabled
    const overdueInvoices = await Invoice.find({
      dueDate: { $lt: today },
      status: { $in: ['Pending', 'Partial', 'Sent'] },
      balance: { $gt: 0 },
      remindersEnabled: { $ne: false }
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
    
    // Get globally enabled reminders from DB
    const globalReminders = await Reminder.find({ enabled: true });
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Fetch all invoices that could potentially need a reminder
    const activeInvoices = await Invoice.find({
      status: { $in: ['Pending', 'Partial', 'Sent', 'Overdue'] },
      balance: { $gt: 0 },
      remindersEnabled: { $ne: false },
      dueDate: { $exists: true }
    });

    console.log(`Analyzing ${activeInvoices.length} active invoices...`);

    for (const invoice of activeInvoices) {
      if (!invoice.email) continue;

      // Skip if already sent a reminder TODAY
      if (invoice.lastReminderSentAt && invoice.lastReminderSentAt.toISOString().split('T')[0] === todayStr) {
        continue;
      }

      let sentToday = false;
      const dueDate = new Date(invoice.dueDate);

      // Iterate over each reminder type (before, on, after)
      for (const globalRem of globalReminders) {
        const type = globalRem.reminderType;
        
        // Get config: check per-invoice Map first, then global rule
        const invConfig = invoice.reminderConfigs?.get(type);
        
        // If invoice specifically disabled this type, skip
        if (invConfig && invConfig.enabled === false) continue;
        
        // Final values to use
        const days = invConfig ? parseInt(invConfig.days) : globalRem.days;
        const frequency = invConfig?.frequency || globalRem.frequency || 'once';

        const sendOn = new Date(dueDate);
        if (type === 'before') sendOn.setDate(dueDate.getDate() - days);
        else if (type === 'after') sendOn.setDate(dueDate.getDate() + days);
        // 'on' uses dueDate as is

        const sendOnStr = sendOn.toISOString().split('T')[0];
        let shouldSend = false;

        // FREQUENCY LOGIC
        if (frequency === 'once') {
          if (todayStr === sendOnStr) shouldSend = true;
        } 
        else if (frequency === 'daily') {
          if (today >= sendOn) shouldSend = true;
        }
        else if (frequency === 'weekly') {
          const diffDays = Math.floor((today - sendOn) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays % 7 === 0) shouldSend = true;
        }
        else if (frequency === 'twice') {
          const secondSend = new Date(sendOn);
          secondSend.setDate(secondSend.getDate() + 3);
          const secondSendStr = secondSend.toISOString().split('T')[0];
          if (todayStr === sendOnStr || todayStr === secondSendStr) shouldSend = true;
        }

        if (shouldSend) {
          try {
            await sendPaymentReminderEmail(invoice, type, globalRem.template, globalRem.subject);
            
            // Log activity
            await ActivityLog.create({
              action: 'REMINDER_SENT_AUTO',
              entityType: 'Invoice',
              entityId: invoice._id,
              description: `Automated ${type} reminder sent (${frequency})`,
            });

            console.log(`✉️ Automated ${type} reminder (${frequency}) sent for ${invoice.invoiceNumber}`);
            sentToday = true;
            break; // Send max one reminder per day per invoice
          } catch (error) {
            console.error(`Failed to send reminder for ${invoice.invoiceNumber}:`, error.message);
          }
        }
      }

      // Update state if sent
      if (sentToday) {
        invoice.lastReminderSentAt = new Date();
        await invoice.save();
      }

      // Handle customReminderDate (One-off)
      if (invoice.customReminderDate && !sentToday) {
        const customDateStr = new Date(invoice.customReminderDate).toISOString().split('T')[0];
        if (todayStr === customDateStr) {
          try {
            await sendPaymentReminderEmail(invoice, 'on');
            invoice.customReminderDate = null;
            invoice.lastReminderSentAt = new Date();
            await invoice.save();
            console.log(`✉️ Custom reminder sent for ${invoice.invoiceNumber}`);
          } catch (error) {
            console.error(`Failed to send custom reminder for ${invoice.invoiceNumber}:`, error.message);
          }
        }
      }
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

// Check for custom scheduled reminders
const checkCustomReminders = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const invoices = await Invoice.find({
      customReminderDate: { $gte: today, $lt: tomorrow },
      status: { $nin: ['Paid', 'Cancelled'] },
      balance: { $gt: 0 }
    });

    for (const invoice of invoices) {
      try {
        await sendPaymentReminderEmail(invoice, 'manual');
        // Clear the custom date after sending
        invoice.customReminderDate = null;
        await invoice.save();
        console.log(`✉️  Sent custom scheduled reminder for invoice ${invoice.invoiceNumber}`);
      } catch (error) {
        console.error(`Failed to send custom reminder for ${invoice.invoiceNumber}:`, error.message);
      }
    }
  } catch (error) {
    console.error('Error checking custom reminders:', error.message);
  }
};

// Initialize all scheduled tasks
export const initializeScheduler = () => {
  console.log('⏰ Initializing scheduler...');

  // Run overdue invoice check daily at 9:00 AM
  cron.schedule('0 9 * * *', () => {
    console.log('Running daily overdue invoice check...');
    checkOverdueInvoices();
    checkCustomReminders();
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
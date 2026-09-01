const Order = require('../models/Order');
const sendEmail = require('./sendEmail');

/**
 * Background worker to check pending installment deadlines daily
 */
const runInstallmentCheck = async () => {
  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // Find orders with active installment plans containing pending due installments
    const orders = await Order.find({
      'installmentPlan.enabled': true,
      'installmentPlan.installments': {
        $elemMatch: {
          status: 'pending',
          dueDate: { $lte: today },
        },
      },
    }).populate('customer', 'name email').lean();

    if (orders.length === 0) {
      return;
    }

    console.log(`[Installment Cron] Found ${orders.length} order(s) with due installments.`);

    for (const order of orders) {
      if (!order.customer || !order.customer.email) continue;

      const dueInstallments = (order.installmentPlan.installments || [])
        .map((inst, index) => ({ ...inst, index }))
        .filter(inst => inst.status === 'pending' && new Date(inst.dueDate) <= today);

      for (const inst of dueInstallments) {
        const dueDateFormatted = new Date(inst.dueDate).toLocaleDateString('en-PK', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });

        // Send non-blocking notification email
        sendEmail({
          email: order.customer.email,
          subject: `Installment Payment Due Reminder — Order #AS-${order._id.toString().slice(-6).toUpperCase()}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a2e; padding: 20px; border: 1px solid #e5e5e5;">
              <h2 style="color: #11131c; border-bottom: 2px solid #11131c; padding-bottom: 10px;">Installment Payment Reminder</h2>
              <p>Dear <strong>${order.customer.name || 'Customer'}</strong>,</p>
              <p>This is a friendly reminder that Installment #${inst.index + 1} for your order is scheduled for payment.</p>
              <div style="background: #f8fafc; padding: 15px; border: 1px solid #e2e8f0; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Order Reference:</strong> #AS-${order._id.toString().slice(-6).toUpperCase()}</p>
                <p style="margin: 5px 0;"><strong>Installment Amount:</strong> PKR ${inst.amount?.toLocaleString()}</p>
                <p style="margin: 5px 0;"><strong>Due Date:</strong> ${dueDateFormatted}</p>
              </div>
              <p>Please log in to your account and visit your orders dashboard to complete this payment.</p>
              <p style="font-size: 0.85rem; color: #888; margin-top: 30px;">Thank you for shopping with Auto Stitch.</p>
            </div>
          `,
        }).catch(err => console.error('[Installment Cron Email Error]:', err.message));
      }
    }
  } catch (error) {
    console.error('[Installment Cron Error]:', error.message);
  }
};

const initInstallmentScheduler = () => {
  // Run once shortly after server start (after 10s)
  const initialTimer = setTimeout(runInstallmentCheck, 10000);
  if (initialTimer.unref) initialTimer.unref();

  // Run once every 24 hours (86,400,000 ms)
  const dailyInterval = setInterval(runInstallmentCheck, 24 * 60 * 60 * 1000);
  if (dailyInterval.unref) dailyInterval.unref();

  console.log('⏰ Auto Stitch Installment Scheduler initialized.');
};

module.exports = { initInstallmentScheduler, runInstallmentCheck };

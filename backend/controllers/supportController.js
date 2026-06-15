const sendEmail = require('../utils/sendEmail');
const { getContactReplyTemplate } = require('../utils/emailTemplates');

// @desc    Handle Contact Form Submission
// @route   POST /api/support/contact
// @access  Public
const handleContactInquiry = async (req, res) => {
  try {
    const { firstName, lastName, email, topic, message, orderNumber } = req.body;

    if (!firstName || !email || !topic || !message) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    // 1. Send Auto-Reply to the user
    try {
      await sendEmail({
        email: email,
        subject: `We've received your inquiry: ${topic}`,
        html: getContactReplyTemplate(`${firstName} ${lastName}`, topic)
      });
    } catch (emailErr) {
      console.error('[SUPPORT] Auto-reply failed:', emailErr.message);
      // We still continue even if auto-reply fails to ensure the inquiry is recorded
    }

    // 2. Log the inquiry (In a real app, you'd save this to a 'SupportInquiry' collection)
    console.log(`[SUPPORT] New Inquiry from ${firstName} ${lastName} (${email}) regarding ${topic}`);
    if (orderNumber) console.log(`[SUPPORT] Associated Order: ${orderNumber}`);
    console.log(`[SUPPORT] Message: ${message}`);

    res.status(200).json({ 
      success: true, 
      message: 'Inquiry submitted successfully. Please check your email for a confirmation.' 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = { handleContactInquiry };

const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  if (process.env.NODE_ENV === 'test' || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`[SMTP Mock] Email dispatched to ${options.email} | Subject: "${options.subject}"`);
    return { messageId: 'mock-local-message-id' };
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  console.log(`[SMTP] Attempting to send email to: ${options.email}...`);

  const mailOptions = {
    from: `"Auto Stitch Support" <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`[SMTP] Email sent successfully! MessageId: ${info.messageId}`);
  return info;
};

module.exports = sendEmail;

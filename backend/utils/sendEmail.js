const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
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
};

module.exports = sendEmail;

const nodemailer = require('nodemailer');

// @desc    Subscribe to newsletter and send confirmation email
// @route   POST /api/subscribe
// @access  Public
const subscribeNewsletter = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  try {
    // 1. Setup Nodemailer Transporter (Official SMTP Settings)
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // Use STARTTLS
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 2. Define Email Content
    const mailOptions = {
      from: `"Auto Stitch" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to Auto Stitch Newsletter!',
      html: `
        <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
          <div style="background-color: #001f3f; padding: 20px; text-align: center;">
            <h1 style="color: #c5a059; margin: 0; font-size: 28px; letter-spacing: 2px;">AUTO STITCH.</h1>
          </div>
          <div style="padding: 30px; background-color: #ffffff;">
            <h2 style="color: #333; margin-top: 0;">Subscription Confirmed! ✨</h2>
            <p style="color: #555; line-height: 1.6; font-size: 16px;">
              Thank you for subscribing to the Auto Stitch newsletter. You are now part of our premium fashion community!
            </p>
            <p style="color: #555; line-height: 1.6; font-size: 16px;">
              Get ready to receive exclusive updates on our latest collections, Virtual Try-On features, and personalized fashion tips once per week.
            </p>
            <div style="margin-top: 30px; text-align: center;">
              <a href="${process.env.CLIENT_URL}" style="background-color: #c5a059; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Explore Catalogue</a>
            </div>
          </div>
          <div style="background-color: #f9f9f9; padding: 15px; text-align: center; border-top: 1px solid #eeeeee;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              FAST-NU, FAST Square, Faisalabad, Pakistan.<br>
              © ${new Date().getFullYear()} Auto Stitch Designs. All rights reserved.
            </p>
          </div>
        </div>
      `,
    };

    // 3. Send Email
    await transporter.sendMail(mailOptions);

    res.status(200).json({ success: true, message: 'Subscribed successfully! Please check your email.' });
  } catch (error) {
    console.error('Subscription Error:', error);
    res.status(500).json({ success: false, message: 'Error sending confirmation email. Please check server logs.' });
  }
};

module.exports = { subscribeNewsletter };

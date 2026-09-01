const nodemailer = require('nodemailer');
const Subscriber = require('../models/Subscriber');

// @desc    Subscribe to newsletter and send confirmation email
// @route   POST /api/subscribe
// @access  Public
const subscribeNewsletter = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
  }

  try {
    // 1. Check & Persist to Subscriber Database
    let subscriber = await Subscriber.findOne({ email: email.toLowerCase().trim() });
    if (subscriber) {
      if (subscriber.isActive) {
        return res.status(400).json({ success: false, message: 'This email is already subscribed to our newsletter' });
      } else {
        subscriber.isActive = true;
        subscriber.subscribedAt = new Date();
        subscriber.unsubscribedAt = undefined;
        await subscriber.save();
      }
    } else {
      subscriber = await Subscriber.create({ email: email.toLowerCase().trim() });
    }

    // 2. Setup Nodemailer Transporter
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // Use STARTTLS
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

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
                Get ready to receive exclusive updates on our latest collections, bespoke tailoring bids, and style guides.
              </p>
              <div style="margin-top: 30px; text-align: center;">
                <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}" style="background-color: #c5a059; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Explore Catalogue</a>
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

      await transporter.sendMail(mailOptions);
    }

    res.status(200).json({ success: true, message: 'Subscribed successfully! Please check your email.' });
  } catch (error) {
    console.error('Subscription Error:', error);
    res.status(500).json({ success: false, message: 'Error processing subscription. Please try again later.' });
  }
};

// @desc    Unsubscribe from newsletter
// @route   POST /api/unsubscribe
// @access  Public
const unsubscribeNewsletter = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  try {
    const subscriber = await Subscriber.findOne({ email: email.toLowerCase().trim() });
    if (!subscriber || !subscriber.isActive) {
      return res.status(404).json({ success: false, message: 'Subscription not found or already cancelled' });
    }

    subscriber.isActive = false;
    subscriber.unsubscribedAt = new Date();
    await subscriber.save();

    res.json({ success: true, message: 'You have been successfully unsubscribed from Auto Stitch updates.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get all subscribers (Admin)
// @route   GET /api/subscribers
// @access  Private (Admin)
const getSubscribers = async (req, res) => {
  try {
    const subscribers = await Subscriber.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, count: subscribers.length, data: subscribers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { subscribeNewsletter, unsubscribeNewsletter, getSubscribers };

const getOrderConfirmationTemplate = (order, customerName) => {
  const itemsHtml = order.items.map(item => `
    <div style="padding: 10px; border-bottom: 1px solid #eee; display: flex; align-items: center;">
      <div style="flex: 1;">
        <h4 style="margin: 0; color: #1a1a2e;">${item.name}</h4>
        <p style="margin: 5px 0; font-size: 14px; color: #666;">Size: ${item.size || 'STD'} | Qty: ${item.quantity}</p>
      </div>
      <div style="font-weight: bold; color: #c5a059;">PKR ${item.price.toLocaleString()}</div>
    </div>
  `).join('');

  return `
    <div style="font-family: 'Poppins', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e1e4e8; border-radius: 12px; overflow: hidden;">
      <div style="background: #1a1a2e; padding: 30px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 24px; letter-spacing: 2px;">AUTO STITCH</h1>
        <p style="margin-top: 10px; opacity: 0.8;">Order Confirmation</p>
      </div>
      <div style="padding: 30px;">
        <h2 style="color: #1a1a2e;">Thank you for your order, ${customerName}!</h2>
        <p style="color: #4a4a6a; line-height: 1.6;">Your procurement request has been received and is being processed by our artisans. Below is your order summary.</p>
        
        <div style="background: #f8f9fb; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <span style="font-size: 12px; color: #8a8a9a; text-transform: uppercase; letter-spacing: 1px;">Reference ID</span><br/>
          <strong style="font-size: 20px; color: #c5a059;">#AS-${order._id.toString().slice(-6).toUpperCase()}</strong>
        </div>

        <div style="margin-top: 30px;">
          <h3 style="border-bottom: 2px solid #c5a059; padding-bottom: 10px; color: #1a1a2e;">Order Items</h3>
          ${itemsHtml}
        </div>

        <div style="margin-top: 20px; text-align: right;">
          <p style="margin: 5px 0;">Subtotal: <strong>PKR ${order.itemsTotal.toLocaleString()}</strong></p>
          <p style="margin: 5px 0;">Shipping: <strong>PKR ${order.shippingCost.toLocaleString()}</strong></p>
          <h3 style="margin: 10px 0; color: #1a1a2e;">Total: <span style="color: #c5a059;">PKR ${order.total.toLocaleString()}</span></h3>
        </div>

        <div style="margin-top: 40px; padding: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; text-align: center;">
          <p>You can track your order status on our website using your Reference ID.</p>
          <p style="margin-top: 20px;">&copy; 2026 Auto Stitch Premium Boutique Marketplace</p>
        </div>
      </div>
    </div>
  `;
};

const getOrderStatusTemplate = (order, customerName) => {
  const currentStatus = order.status.toUpperCase();
  const statusColors = {
    'PLACED': '#3B82F6',
    'ACCEPTED': '#10B981',
    'IN_PRODUCTION': '#F59E0B',
    'READY_TO_SHIP': '#8B5CF6',
    'SHIPPED': '#6366F1',
    'DELIVERED': '#059669',
    'CANCELLED': '#EF4444',
    'DISPUTE': '#F43F5E',
    'REFUND_REQUESTED': '#FB923C'
  };

  return `
    <div style="font-family: 'Poppins', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e1e4e8; border-radius: 12px; overflow: hidden;">
      <div style="background: #1a1a2e; padding: 30px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 24px; letter-spacing: 2px;">AUTO STITCH</h1>
        <p style="margin-top: 10px; opacity: 0.8;">Order Status Update</p>
      </div>
      <div style="padding: 30px;">
        <h2 style="color: #1a1a2e;">Hello ${customerName},</h2>
        <p style="color: #4a4a6a; line-height: 1.6;">You recently requested a status update for your order. Here is the current information for your reference.</p>
        
        <div style="background: #f8f9fb; padding: 25px; border-radius: 12px; margin: 30px 0; text-align: center; border: 1px solid #eee;">
          <span style="font-size: 12px; color: #8a8a9a; text-transform: uppercase; letter-spacing: 1px;">Order Status</span><br/>
          <strong style="font-size: 28px; color: ${statusColors[currentStatus] || '#1a1a2e'};">${currentStatus}</strong>
          <p style="margin-top: 10px; font-size: 14px; color: #666;">Reference ID: #AS-${order._id.toString().slice(-6).toUpperCase()}</p>
        </div>

        <div style="margin-top: 30px;">
          <h3 style="color: #1a1a2e; font-size: 16px;">Product Details</h3>
          <div style="padding: 15px; border: 1px solid #eee; border-radius: 8px;">
            <p style="margin: 0; font-weight: 600;">${order.items.map(i => i.name).join(', ')}</p>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">Placed on: ${new Date(order.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        <div style="margin-top: 40px; text-align: center;">
          <a href="${process.env.CLIENT_URL}/orders/${order._id}" style="background: #1a1a2e; color: white; padding: 12px 25px; text-decoration: none; border-radius: 30px; font-weight: 600; display: inline-block;">View Order Dashboard</a>
        </div>

        <div style="margin-top: 40px; padding: 20px; border-top: 1px solid #eee; font-size: 12px; color: #8a8a9a; text-align: center;">
          <p>If you didn't request this update, please secure your account.</p>
          <p>&copy; 2026 Auto Stitch Premium Boutique Marketplace</p>
        </div>
      </div>
    </div>
  `;
};

const getContactReplyTemplate = (customerName, topic) => {
  const topicResponses = {
    'General Inquiry': 'Thank you for reaching out to Auto Stitch. We have received your general inquiry and one of our client service representatives will get back to you within 24-48 hours.',
    'Order Status': 'Regarding your order status, please note that bespoke pieces can take 2-4 weeks for production. You can also use our "Track Order" feature on the website for real-time logistics updates.',
    'Returns & Exchanges': 'We have received your request regarding a return or exchange. Please ensure the garment is unworn and has all original tags attached. Our team will review your eligibility shortly.',
    'Virtual Try-On Help': 'Need assistance with our AI Try-On? Ensure your photo has good lighting and you are standing straight. Our technical team is reviewing your report and will assist you if there is a system error.',
    'Custom Stitching': 'For custom stitching inquiries, our premier boutiques usually respond to bids within 72 hours. If you have specific technical questions about a current bid, please use the direct chat feature.'
  };

  const response = topicResponses[topic] || 'Thank you for contacting us. We have received your message and will assist you shortly.';

  return `
    <div style="font-family: 'Poppins', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e1e4e8; border-radius: 12px; overflow: hidden;">
      <div style="background: #1a1a2e; padding: 30px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 24px; letter-spacing: 2px;">AUTO STITCH</h1>
        <p style="margin-top: 10px; opacity: 0.8;">Inquiry Received</p>
      </div>
      <div style="padding: 30px;">
        <h2 style="color: #1a1a2e;">Dear ${customerName},</h2>
        <p style="color: #4a4a6a; line-height: 1.6; font-size: 16px;">
          ${response}
        </p>
        
        <div style="background: #f8f9fb; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #c5a059;">
          <p style="margin: 0; font-size: 14px; color: #8a8a9a;">Selected Topic</p>
          <p style="margin: 5px 0 0 0; font-weight: 600; color: #1a1a2e;">${topic}</p>
        </div>

        <p style="color: #4a4a6a; line-height: 1.6;">Our team is dedicated to providing you with the best bespoke experience. While we review your message, feel free to explore our latest editorial collections.</p>

        <div style="margin-top: 40px; padding: 20px; border-top: 1px solid #eee; font-size: 12px; color: #8a8a9a; text-align: center;">
          <p>This is an automated response to confirm receipt of your inquiry.</p>
          <p>&copy; 2026 Auto Stitch Premium Boutique Marketplace</p>
        </div>
      </div>
    </div>
  `;
};

const getWelcomeTemplate = (name, role) => {
  const roleMessage = role === 'boutique_owner' 
    ? 'We are thrilled to welcome you to the Auto Stitch partner network. Your boutique profile is currently under review by our admin team. You will be notified once it is approved so you can start bidding on requests.'
    : 'Welcome to the premium destination for bespoke fashion and premium ready-to-wear collections. Start exploring or submit a customization request to our partner boutiques today.';

  return `
    <div style="font-family: 'Poppins', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e1e4e8; border-radius: 12px; overflow: hidden;">
      <div style="background: #1a1a2e; padding: 30px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 24px; letter-spacing: 2px;">AUTO STITCH</h1>
        <p style="margin-top: 10px; opacity: 0.8;">Welcome to the Future of Fashion</p>
      </div>
      <div style="padding: 30px;">
        <h2 style="color: #1a1a2e;">Welcome, ${name}!</h2>
        <p style="color: #4a4a6a; line-height: 1.6; font-size: 16px;">
          ${roleMessage}
        </p>
        
        <div style="margin-top: 40px; text-align: center;">
          <a href="${process.env.CLIENT_URL}" style="background: #c5a059; color: white; padding: 12px 25px; text-decoration: none; border-radius: 30px; font-weight: 600; display: inline-block;">Go to Auto Stitch</a>
        </div>

        <div style="margin-top: 40px; padding: 20px; border-top: 1px solid #eee; font-size: 12px; color: #8a8a9a; text-align: center;">
          <p>&copy; ${new Date().getFullYear()} Auto Stitch Premium Boutique Marketplace</p>
        </div>
      </div>
    </div>
  `;
};

const getBoutiqueStatusTemplate = (name, status, reason = '') => {
  const isApproved = status === 'approved';
  const statusMessage = isApproved
    ? 'Congratulations! Your boutique profile has been successfully verified and approved by our admin team. You can now start listing products and bidding on customer requests.'
    : `We regret to inform you that your boutique profile verification was rejected. Reason: <strong>${reason}</strong>.<br/><br/>Please contact support for further assistance or to appeal this decision.`;

  return `
    <div style="font-family: 'Poppins', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e1e4e8; border-radius: 12px; overflow: hidden;">
      <div style="background: #1a1a2e; padding: 30px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 24px; letter-spacing: 2px;">AUTO STITCH</h1>
        <p style="margin-top: 10px; opacity: 0.8;">Boutique Verification Update</p>
      </div>
      <div style="padding: 30px;">
        <h2 style="color: #1a1a2e;">Hello ${name},</h2>
        <p style="color: #4a4a6a; line-height: 1.6; font-size: 16px;">
          ${statusMessage}
        </p>
        
        <div style="margin-top: 40px; text-align: center;">
          <a href="${process.env.CLIENT_URL}/boutique/dashboard" style="background: ${isApproved ? '#c5a059' : '#1a1a2e'}; color: white; padding: 12px 25px; text-decoration: none; border-radius: 30px; font-weight: 600; display: inline-block;">Go to Boutique Portal</a>
        </div>

        <div style="margin-top: 40px; padding: 20px; border-top: 1px solid #eee; font-size: 12px; color: #8a8a9a; text-align: center;">
          <p>&copy; ${new Date().getFullYear()} Auto Stitch Premium Boutique Marketplace</p>
        </div>
      </div>
    </div>
  `;
};

module.exports = { getOrderConfirmationTemplate, getOrderStatusTemplate, getContactReplyTemplate, getWelcomeTemplate, getBoutiqueStatusTemplate };

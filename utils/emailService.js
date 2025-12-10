const nodemailer = require('nodemailer');

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD?.replace(/\s+/g, '')
  }
});

// Send payment success email
async function sendPaymentSuccessEmail(transaction) {
  const gameUrl = `${process.env.APP_URL}/games/${transaction.game_slug}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: transaction.user_email,
    subject: `Payment Successful - ${transaction.game_title}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #00D9FF; color: white; 
                    padding: 15px 30px; text-decoration: none; border-radius: 5px; 
                    margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Payment Successful!</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${transaction.username}</strong>,</p>
            
            <p>Thank you for your purchase! Your payment has been successfully processed.</p>
            
            <h3>Order Details:</h3>
            <ul>
              <li><strong>Game:</strong> ${transaction.game_title}</li>
              <li><strong>Amount:</strong> Rp ${transaction.amount.toLocaleString('id-ID')}</li>
              <li><strong>Order ID:</strong> ${transaction.order_id}</li>
              <li><strong>Payment Method:</strong> ${transaction.payment_method}</li>
            </ul>
            
            <p>You can now play your game!</p>
            
            <center>
              <a href="${gameUrl}" class="button">Play Game Now</a>
            </center>
            
            <p>If you have any questions, please contact our support team.</p>
            
            <p>Happy gaming! 🎮</p>
            
            <p>Best regards,<br><strong>FUFUFAFAGAMES Team</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
            <p>&copy; 2025 FUFUFAFAGAMES. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };
  
  try {
    await transporter.sendMail(mailOptions);
    console.log('Payment success email sent to:', transaction.user_email);
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}

module.exports = {
  sendPaymentSuccessEmail
};

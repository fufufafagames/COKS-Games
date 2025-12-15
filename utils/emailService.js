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
            
            <p>Best regards,<br><strong>COK'S Team</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
            <p>&copy; 2025 COK'S. All rights reserved.</p>
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

// Send password reset email
async function sendPasswordResetEmail(user, token) {
  const resetUrl = `${process.env.APP_URL}/reset-password?token=${token}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: `Reset Password Request - COK'S`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
          .header { background-color: #0b0c10; padding: 30px; text-align: center; border-bottom: 4px solid #00D9FF; }
          .logo { font-size: 28px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 2px; }
          .logo span { color: #00D9FF; }
          .content { padding: 40px 30px; text-align: center; }
          .icon-lock { font-size: 48px; color: #00D9FF; margin-bottom: 20px; }
          .message { margin-bottom: 30px; font-size: 16px; color: #555; }
          .button-container { text-align: center; margin: 30px 0; }
          .button { 
            background-color: #00D9FF; 
            color: #ffffff !important; 
            padding: 15px 40px; 
            text-decoration: none; 
            border-radius: 50px; 
            font-weight: bold; 
            font-size: 16px;
            display: inline-block; 
            box-shadow: 0 4px 15px rgba(0, 217, 255, 0.4);
            transition: background-color 0.3s;
          }
          .button:hover { background-color: #00b8d4; }
          .footer { background-color: #1f2833; padding: 20px; text-align: center; color: #aaa; font-size: 13px; }
          .link-text { color: #00D9FF; word-break: break-all; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">COK'S <span>GAMES</span></div>
          </div>
          
          <div class="content">
            <div class="icon-lock">🔐</div>
            <h2 style="color: #0b0c10; margin-top: 0;">Trouble logging in?</h2>
            
            <p class="message">
              Hi <strong>${user.name}</strong>, we received a request to reset your password. <br>
              Click the button below to get back into the game!
            </p>
            
            <div class="button-container">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            
            <p style="font-size: 14px; text-align: center; color: #999;">
              This link will expire in 1 hour.
            </p>
            
            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999; margin-bottom: 5px;">Or copy and paste this link:</p>
            <a href="${resetUrl}" class="link-text">${resetUrl}</a>
          </div>
          
          <div class="footer">
            <p>If you didn't request this, you can safely ignore this email.</p>
            <p>&copy; 2025 COK'S Games. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };
  
  try {
    await transporter.sendMail(mailOptions);
    console.log('Reset password email sent to:', user.email);
    return true;
  } catch (error) {
    console.error('Failed to send reset email:', error);
    return false;
  }
}

module.exports = {
  sendPaymentSuccessEmail,
  sendPasswordResetEmail
};

const Game = require('../models/Game');
const Transaction = require('../models/Transaction');
const { createPayment, checkPaymentStatus } = require('../config/doku');
const { sendPaymentSuccessEmail } = require('../utils/emailService');

module.exports = {
  // Show checkout page
  checkout: async (req, res) => {
    try {
      const game = await Game.findBySlug(req.params.slug);
      
      if (!game) {
        req.session.error = 'Game not found';
        return res.redirect('/games');
      }
      
      // Check if game is free
      if (game.price_type === 'free' || !game.price || game.price === 0) {
        req.session.error = 'This game is free to play';
        return res.redirect(`/games/${game.slug}`);
      }
      
      // Check if already purchased
      if (req.session.user) {
        const alreadyPurchased = await Transaction.hasPurchased(
          req.session.user.id, 
          game.id
        );
        
        if (alreadyPurchased) {
          req.session.info = 'You already own this game!';
          return res.redirect(`/games/${game.slug}`);
        }
      }
      
      res.render('payment/checkout', {
        title: `Buy ${game.title}`,
        game,
        user: req.session.user
      });
    } catch (error) {
      console.error('Checkout error:', error);
      req.session.error = 'Failed to load checkout page';
      res.redirect('/games');
    }
  },
  
  // Process payment
  processPayment: async (req, res) => {
    try {
      const { game_slug, payment_method } = req.body;
      const game = await Game.findBySlug(game_slug);
      
      if (!game) {
        return res.status(404).json({ error: 'Game not found' });
      }
      
      const orderId = `ORDER-${Date.now()}-${req.session.user.id}`;
      const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      // MAP Generic Payment Method to DOKU Payment Method Types
      // Based on DOKU official documentation
      let paymentMethodTypes = [];
      
      switch (payment_method) {
        case 'QRIS':
             paymentMethodTypes = ["QRIS"];
             break;
        case 'VIRTUAL_ACCOUNT':
             // Include all popular banks with correct DOKU naming
             paymentMethodTypes = [
                 "VIRTUAL_ACCOUNT_BCA", 
                 "VIRTUAL_ACCOUNT_BANK_MANDIRI", 
                 "VIRTUAL_ACCOUNT_BANK_SYARIAH_MANDIRI",
                 "VIRTUAL_ACCOUNT_BRI", 
                 "VIRTUAL_ACCOUNT_BNI", 
                 "VIRTUAL_ACCOUNT_BANK_DANAMON", 
                 "VIRTUAL_ACCOUNT_BANK_PERMATA", 
                 "VIRTUAL_ACCOUNT_BANK_CIMB",
                 "VIRTUAL_ACCOUNT_DOKU"
             ];
             break;
        case 'EWALLET':
             // Use correct EMONEY_ prefix from DOKU docs
             paymentMethodTypes = [
               "EMONEY_OVO", 
               "EMONEY_DANA", 
               "EMONEY_LINKAJA", 
               "EMONEY_SHOPEE_PAY"
             ];
             break;
        case 'RETAIL':
             paymentMethodTypes = [
               "ONLINE_TO_OFFLINE_ALFA", 
               "ONLINE_TO_OFFLINE_INDOMARET"
             ];
             break;
        default:
             // Empty array = show all methods
             paymentMethodTypes = [];
      }
      
      // Create payment request to DOKU - FIXED STRUCTURE
      const paymentData = {
        order: {
          invoice_number: orderId,
          amount: parseInt(game.price), // Ensure integer
          currency: 'IDR'
        },
        payment: {
          payment_due_date: 1440, // 24 hours in minutes
          payment_method_types: paymentMethodTypes.length > 0 ? paymentMethodTypes : []
        },
        customer: {
          id: req.session.user.id.toString(),
          name: req.session.user.name, 
          email: req.session.user.email,
          phone: '628000000000', // Dummy phone number - replace with real data if available
          country: 'ID'
        }
      };
      
      console.log('Sending DOKU Payment Request:', JSON.stringify(paymentData, null, 2));

      const dokuResponse = await createPayment(paymentData);
      
      console.log('DOKU Response:', JSON.stringify(dokuResponse, null, 2));
      
      // Extract payment info safely based on response structure
      let paymentUrl = null;
      let paymentCode = null;
      let qrCodeUrl = null;
      
      // Handle different response structures
      // DOKU V2 Response is nested inside "response" object
      const dokuData = dokuResponse.response || dokuResponse;

      if (dokuData.payment) {
        paymentUrl = dokuData.payment.url || null;
        
        // For QRIS
        if (dokuData.payment.qr_checkout_string) {
          qrCodeUrl = dokuData.payment.qr_checkout_string;
        }
        
        // For Virtual Account
        if (dokuData.payment.virtual_account_info) {
          paymentCode = dokuData.payment.virtual_account_info.virtual_account_number;
        }
        
        // For E-Wallet
        if (dokuData.payment.payment_code) {
          paymentCode = dokuData.payment.payment_code;
        }
      }
      
      // Fallback to top-level properties if they exist
      paymentUrl = paymentUrl || dokuResponse.url || null;
      
      // Log extracted payment info
      console.log('DEBUG PAYMENT INFO:', { 
        paymentUrl, 
        qrCodeUrl, 
        dokuResponsePayment: dokuResponse.payment,
        dokuResponseUrl: dokuResponse.url 
      });
      
      // Save transaction to database
      await Transaction.create({
        user_id: req.session.user.id,
        game_id: game.id,
        order_id: orderId,
        invoice_number: dokuResponse.order?.invoice_number || orderId, 
        amount: parseInt(game.price),
        payment_method: payment_method,
        payment_channel: payment_method, // Simplified
        status: 'waiting',
        payment_url: paymentUrl, 
        payment_code: paymentCode, 
        qr_code_url: qrCodeUrl, 
        expired_at: expiredAt
      });
      
      res.json({
        success: true,
        order_id: orderId,
        redirect_url: `/payment/${orderId}/invoice`
      });
      
    } catch (error) {
      console.error('Process payment error:', error.response?.data || error.message);
      res.status(500).json({ 
        error: 'Failed to process payment',
        message: error.response?.data?.message || error.message || 'Check Server Logs for Details',
        details: error.response?.data
      });
    }
  },
  
  // Show invoice/receipt page
  invoice: async (req, res) => {
    try {
      const transaction = await Transaction.findByOrderId(req.params.order_id);
      
      if (!transaction) {
        req.session.error = 'Transaction not found';
        return res.redirect('/games');
      }
      
      // Check ownership
      console.log('DEBUG CHECK OWNERSHIP:', {
        transactionUserId: transaction.user_id,
        transactionUserIdType: typeof transaction.user_id,
        sessionUserId: req.session.user.id,
        sessionUserIdType: typeof req.session.user.id,
        isMatchLoose: transaction.user_id != req.session.user.id
      });

      if (transaction.user_id != req.session.user.id) {
        req.session.error = 'Unauthorized access';
        return res.redirect('/games');
      }
      
      res.render('payment/invoice', {
        title: 'Payment Invoice',
        transaction,
        user: req.session.user
      });
    } catch (error) {
      console.error('Invoice error:', error);
      req.session.error = 'Failed to load invoice';
      res.redirect('/games');
    }
  },
  
  // Show payment status page
  status: async (req, res) => {
    try {
      const transaction = await Transaction.findByOrderId(req.params.order_id);
      
      if (!transaction) {
        req.session.error = 'Transaction not found';
        return res.redirect('/games');
      }
      
      // Check ownership
      if (transaction.user_id != req.session.user.id) {
        req.session.error = 'Unauthorized access';
        return res.redirect('/games');
      }
      
      res.render('payment/status', {
        title: 'Payment Status',
        transaction,
        user: req.session.user
      });
    } catch (error) {
      console.error('Status page error:', error);
      req.session.error = 'Failed to load status page';
      res.redirect('/games');
    }
  },
  
  // Check payment status (AJAX)
  checkStatus: async (req, res) => {
    try {
      const transaction = await Transaction.findByOrderId(req.params.order_id);
      
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      
      // Check status from DOKU
      // ONLY check if not already success/failed to save API calls
      let status = transaction.status;
      if (status === 'waiting' || status === 'pending') {
          try {
            const dokuStatus = await checkPaymentStatus(transaction.invoice_number);
            
            // Safely extract status from response
            if (dokuStatus && dokuStatus.transaction && dokuStatus.transaction.status) {
              status = dokuStatus.transaction.status.toLowerCase();
              
              // Map DOKU status to our status
              if (status === 'success' && status !== transaction.status) {
                await Transaction.updateStatus(
                  transaction.order_id,
                  'success',
                  new Date()
                );
                await sendPaymentSuccessEmail(transaction);
              }
            }
          } catch (e) {
              console.log("Error checking DOKU status:", e.message);
          }
      }
      
      res.json({
        status: status,
        message: status === 'success' ? 'Payment successful!' : 'Waiting for payment...'
      });
      
    } catch (error) {
      console.error('Check status error:', error);
      res.status(500).json({ error: 'Failed to check payment status' });
    }
  },
  
  // Handle payment callback from DOKU
  callback: async (req, res) => {
    try {
      console.log('Payment callback received:', req.body);
      
      const { order, transaction } = req.body;
      
      if (!order || !transaction) {
          return res.status(400).json({ error: 'Invalid callback data' });
      }

      const invoice_number = order.invoice_number;
      const status = transaction.status.toLowerCase(); // success, failed
      
      const dbTransaction = await Transaction.findByInvoiceNumber(invoice_number);
      
      if (!dbTransaction) {
        console.error('Transaction not found:', invoice_number);
        return res.status(404).json({ error: 'Transaction not found' });
      }
      
      // Update transaction status
      await Transaction.updateStatus(
        dbTransaction.order_id,
        status,
        status === 'success' ? new Date() : null
      );
      
      // Send email notification if success
      if (status === 'success') {
        await sendPaymentSuccessEmail(dbTransaction);
      }
      
      res.json({ success: true });
      
    } catch (error) {
      console.error('Callback error:', error);
      res.status(500).json({ error: 'Callback processing failed' });
    }
  }
};
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
      let paymentMethodTypes = [];
      
      switch (payment_method) {
        case 'QRIS':
             paymentMethodTypes = ["QRIS"];
             break;
        case 'VIRTUAL_ACCOUNT':
             // Include all popular banks
             paymentMethodTypes = [
                 "VIRTUAL_ACCOUNT_BCA", 
                 "VIRTUAL_ACCOUNT_MANDIRI", 
                 "VIRTUAL_ACCOUNT_BRI", 
                 "VIRTUAL_ACCOUNT_BNI", 
                 "VIRTUAL_ACCOUNT_DANAMON", 
                 "VIRTUAL_ACCOUNT_PERMATA", 
                 "VIRTUAL_ACCOUNT_CIMB", 
                 "VIRTUAL_ACCOUNT_BSI"
             ];
             break;
        case 'EWALLET':
             paymentMethodTypes = ["E_WALLET_OVO", "E_WALLET_DANA", "E_WALLET_LINKAJA", "E_WALLET_SHOPEEPAY"];
             break;
        case 'RETAIL':
             paymentMethodTypes = ["ONLINE_TO_OFFLINE_ALFAMART", "ONLINE_TO_OFFLINE_INDOMARET"];
             break;
        default:
             paymentMethodTypes = []; // Empty array means SHOW ALL in DOKU
      }
      
      // Create payment request to DOKU
      const paymentData = {
        order: {
          invoice_number: orderId,
          amount: parseInt(game.price), // Ensure integer
          currency: 'IDR'
        },
        // payment: {
        //   payment_method_types: paymentMethodTypes
        // },
        customer: {
          id: req.session.user.id.toString(),
          name: req.session.user.name, 
          email: req.session.user.email
        },
        expired_at: expiredAt.toISOString()
      };
      
      console.log('Sending DOKU Payment Request:', JSON.stringify(paymentData, null, 2));

      const dokuResponse = await createPayment(paymentData);
      
      console.log('DOKU Response:', JSON.stringify(dokuResponse, null, 2));
      
      // Save transaction to database
      await Transaction.create({
        user_id: req.session.user.id,
        game_id: game.id,
        order_id: orderId,
        invoice_number: dokuResponse.order.invoice_number || orderId, 
        amount: game.price,
        payment_method: payment_method,
        payment_channel: payment_method, // Simplified
        status: 'waiting',
        payment_url: dokuResponse.payment.url, 
        payment_code: dokuResponse.virtual_account_info?.virtual_account_number || dokuResponse.payment_code, 
        qr_code_url: dokuResponse.qr_code_urls?.[0], 
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
        message: error.response?.data?.message || 'Check Server Logs for Details',
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
      if (transaction.user_id !== req.session.user.id) {
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
      if (transaction.user_id !== req.session.user.id) {
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
            status = dokuStatus.transaction.status.toLowerCase(); 
            
            // Map DOKU status to our status
            if (status === 'success') {
                // Update local status if changed
                if (status !== transaction.status) {
                    await Transaction.updateStatus(
                    transaction.order_id,
                    'success',
                    new Date()
                    );
                    await sendPaymentSuccessEmail(transaction);
                }
            }
          } catch (e) {
              console.log("Error checking DOKU status (might be sandbox limitation):", e.message);
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

const Game = require('../models/Game');
const Event = require('../models/Event');
const Transaction = require('../models/Transaction');
const { createPayment, checkPaymentStatus } = require('../config/doku');
const { sendPaymentSuccessEmail } = require('../utils/emailService');
const DiscountManager = require('../utils/DiscountManager');
const db = require('../config/database');

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
      
      // Check for discounts
      const hasClaimed = await Transaction.hasClaimedDiscountToday(req.session.user.id);
      let discount = { finalPrice: game.price, discountType: 'none', discountPercent: 0 };
      
      // Determine discount
      if (!hasClaimed) {
         // Identify Daily Deal
         const totalGamesCount = await Game.count();
         const dailyIndex = DiscountManager.getDailyDealIndex(totalGamesCount);
         const dailyDealGame = await Game.findByOffset(dailyIndex);
         const isDaily = (dailyDealGame && dailyDealGame.id === game.id);

         // [NEW] Get active event for consistency
         const activeEvent = await Event.getActive();

         // We pass 'true' for isFlashSaleAvailable for DISPLAY purposes.
         // The real race-condition check happens in processPayment.
         discount = DiscountManager.calculateDiscount(
             {...game, isDailyDeal: isDaily}, 
             true,
             activeEvent
         ); 
      }

      res.render('payment/checkout', {
        title: `Buy ${game.title}`,
        game,
        user: req.session.user,
        discount
      });
    } catch (error) {
      console.error('Checkout error:', error);
      req.session.error = 'Failed to load checkout page';
      res.redirect('/games');
    }
  },
  
  // Process payment
  processPayment: async (req, res) => {
    let client = null;
    try {
      // Connect to pool for transaction
      client = await db.pool.connect();
      
      const { game_slug, payment_method } = req.body;
      const game = await Game.findBySlug(game_slug);
      
      if (!game) {
        if(client) client.release();
        return res.status(404).json({ error: 'Game not found' });
      }
      
      // Start Database Transaction
      await client.query('BEGIN');

      const orderId = `ORDER-${Date.now()}-${req.session.user.id}`;
      let expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Default 24 hours
      let originalPrice = parseInt(game.price);
      let finalAmount = originalPrice;
      let discountType = 'none';

      // --- DISCOUNT LOGIC ---
      // 1. Check if user already claimed a discount today
      const hasClaimed = await Transaction.hasClaimedDiscountToday(req.session.user.id);
      
      if (!hasClaimed) {
          // Identify Daily Deal
          const totalGamesCount = await Game.count();
          const dailyIndex = DiscountManager.getDailyDealIndex(totalGamesCount);
          const dailyDealGame = await Game.findByOffset(dailyIndex);
          const isDaily = (dailyDealGame && dailyDealGame.id === game.id);

          // [NEW] Fetch Active for discount calculation
          const activeEvent = await Event.getActive();

          // 2. Calculate potential discount
          let potentialDiscount = DiscountManager.calculateDiscount(
              {...game, isDailyDeal: isDaily}, 
              true,
              activeEvent
          );

          // 3. Special handling for Flash Sale (Race Condition Check)
          if (potentialDiscount.discountType === 'flash_sale') {
              // Lock: Check if anyone has won TODAY
              const winnerCount = await client.query(
                `SELECT count(*) as count FROM transactions 
                 WHERE discount_type = 'flash_sale' 
                 AND status IN ('success', 'waiting', 'pending')
                 AND DATE(created_at) = CURRENT_DATE`
              );
              
              if (parseInt(winnerCount.rows[0].count) > 0) {
                  // SORRY! Someone beat you to it. Downgrade to Event Discount (25%)
                  potentialDiscount = DiscountManager.calculateDiscount(
                      {...game, isDailyDeal: isDaily}, 
                      false, 
                      activeEvent
                  );
              } else {
                  // WINNER! 
                  // Set strict expiration (15 mins) to prevent blocking the deal forever
                  expiredAt = new Date(Date.now() + 15 * 60 * 1000);
              }
          }

          finalAmount = potentialDiscount.finalPrice;
          discountType = potentialDiscount.discountType;
      }

      // --- END DISCOUNT LOGIC ---

      
      // MAP Generic Payment Method
      let paymentMethodTypes = [];
      switch (payment_method) {
        case 'QRIS': paymentMethodTypes = ["QRIS"]; break;
        case 'VIRTUAL_ACCOUNT':
             paymentMethodTypes = ["VIRTUAL_ACCOUNT_BCA", "VIRTUAL_ACCOUNT_BANK_MANDIRI", "VIRTUAL_ACCOUNT_BRI", "VIRTUAL_ACCOUNT_BNI", "VIRTUAL_ACCOUNT_BANK_PERMATA", "VIRTUAL_ACCOUNT_BANK_CIMB", "VIRTUAL_ACCOUNT_DOKU"];
             break;
        case 'EWALLET':
             paymentMethodTypes = ["EMONEY_OVO", "EMONEY_DANA", "EMONEY_SHOPEE_PAY"];
             break;
        case 'RETAIL':
             paymentMethodTypes = ["ONLINE_TO_OFFLINE_ALFA", "ONLINE_TO_OFFLINE_INDOMARET"];
             break;
      }
      
      const paymentData = {
        order: {
          invoice_number: orderId,
          amount: parseInt(finalAmount), // Use Discounted Price
          currency: 'IDR'
        },
        payment: {
          payment_due_date: 1440,
          payment_method_types: paymentMethodTypes
        },
        customer: {
          id: req.session.user.id.toString(),
          name: req.session.user.name, 
          email: req.session.user.email,
          country: 'ID'
        }
      };
      
      // Call DOKU API
      const dokuResponse = await createPayment(paymentData);
      
      // Extract payment info
      const dokuData = dokuResponse.response || dokuResponse;
      let paymentUrl = dokuData.payment?.url || dokuResponse.url || null;
      let paymentCode = dokuData.payment?.payment_code || dokuData.payment?.virtual_account_info?.virtual_account_number || null;
      let qrCodeUrl = dokuData.payment?.qr_checkout_string || null;

      // Save transaction to database (Using the Client from transaction)
      const query = `
        INSERT INTO transactions 
        (user_id, game_id, order_id, invoice_number, amount, payment_method, 
         payment_channel, status, payment_url, payment_code, qr_code_url, expired_at,
         discount_type, original_price)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id
      `;

      await client.query(query, [
        req.session.user.id,
        game.id,
        orderId,
        dokuResponse.order?.invoice_number || orderId,
        parseInt(finalAmount),
        payment_method,
        payment_method,
        'waiting',
        paymentUrl,
        paymentCode,
        qrCodeUrl,
        expiredAt,
        discountType,
        originalPrice
      ]);
      
      await client.query('COMMIT');
      
      res.json({
        success: true,
        order_id: orderId,
        redirect_url: `/payment/${orderId}/invoice`
      });
      
    } catch (error) {
      if (client) await client.query('ROLLBACK');
      console.error('Process payment error:', error);
      res.status(500).json({ 
        error: 'Failed to process payment',
        message: error.message
      });
    } finally {
      if (client) client.release();
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
            return res.json({ status: dokuStatus.transaction.status });
          } catch (error) {
            console.error('Error checking DOKU status:', error.message);
            // Fallback to local DB status
            return res.json({ status: transaction.status });
          }
      }
      
      res.json({ status: transaction.status });
      
    } catch (error) {
      console.error('Check status error:', error);
      res.status(500).json({ error: 'Failed to check payment status' });
    }
  },

  // Payment History
  history: async (req, res) => {
    try {
      const transactions = await Transaction.getByUserId(req.session.user.id);
      
      res.render('payment/history', {
        title: 'My Orders',
        transactions,
        user: req.session.user
      });
    } catch (error) {
      console.error('History error:', error);
      req.session.error = 'Failed to load order history';
      res.redirect('/games');
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
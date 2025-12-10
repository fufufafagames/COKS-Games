const db = require('../config/database');

class Transaction {
  // Create new transaction
  static async create(data) {
    const query = `
      INSERT INTO transactions 
      (user_id, game_id, order_id, invoice_number, amount, payment_method, 
       payment_channel, status, payment_url, payment_code, qr_code_url, expired_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `;
    
    // Convert undefined to null for optional database fields
    const params = [
      data.user_id,
      data.game_id,
      data.order_id,
      data.invoice_number,
      data.amount,
      data.payment_method,
      data.payment_channel,
      data.status || 'pending',
      data.payment_url || null,
      data.payment_code || null,
      data.qr_code_url || null,
      data.expired_at
    ];

    const result = await db.query(query, params);
    return result.rows[0].id;
  }
  
  // Find by order ID
  static async findByOrderId(orderId) {
    const query = `
      SELECT t.*, g.title as game_title, g.slug as game_slug, 
             u.name as username, u.email as user_email
      FROM transactions t
      JOIN games g ON t.game_id = g.id
      JOIN users u ON t.user_id = u.id
      WHERE t.order_id = $1
    `;
    
    const result = await db.query(query, [orderId]);
    return result.rows[0];
  }
  
  // Find by invoice number
  static async findByInvoiceNumber(invoiceNumber) {
    const query = `
      SELECT t.*, g.title as game_title, g.slug as game_slug,
             u.name as username, u.email as user_email
      FROM transactions t
      JOIN games g ON t.game_id = g.id
      JOIN users u ON t.user_id = u.id
      WHERE t.invoice_number = $1
    `;
    
    const result = await db.query(query, [invoiceNumber]);
    return result.rows[0];
  }
  
  // Update transaction status
  static async updateStatus(orderId, status, paidAt = null) {
    const query = `
      UPDATE transactions 
      SET status = $1, paid_at = $2, updated_at = NOW()
      WHERE order_id = $3
    `;
    
    await db.query(query, [status, paidAt, orderId]);
  }
  
  // Check if user has purchased game
  static async hasPurchased(userId, gameId) {
    const query = `
      SELECT count(*) as count 
      FROM transactions 
      WHERE user_id = $1 AND game_id = $2 AND status = 'success'
    `;
    
    const result = await db.query(query, [userId, gameId]);
    return parseInt(result.rows[0].count) > 0;
  }
  
  // Get user transactions
  static async getByUserId(userId) {
    const query = `
      SELECT t.*, g.title as game_title, g.slug as game_slug, g.thumbnail_url
      FROM transactions t
      JOIN games g ON t.game_id = g.id
      WHERE t.user_id = $1
      ORDER BY t.created_at DESC
    `;
    
    const result = await db.query(query, [userId]);
    return result.rows;
  }
  
  // Check expired transactions and update status
  static async updateExpiredTransactions() {
    const query = `
      UPDATE transactions 
      SET status = 'expired', updated_at = NOW()
      WHERE status IN ('pending', 'waiting') 
      AND expired_at < NOW()
    `;
    
    await db.query(query);
  }
}

module.exports = Transaction;

const db = require('../config/database');

class Message {
    // Create new message
    static async create(data) {
        const query = `
            INSERT INTO messages (name, email, subject, message, is_read, created_at)
            VALUES ($1, $2, $3, $4, false, NOW())
            RETURNING *
        `;
        const values = [data.name, data.email, data.subject, data.message];
        
        try {
            const result = await db.query(query, values);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    }

    // Get all messages (ordered by newest)
    static async getAll() {
        const query = `SELECT * FROM messages ORDER BY created_at DESC`;
        try {
            const result = await db.query(query);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    // Get unread count
    static async getUnreadCount() {
        const query = `SELECT COUNT(*) FROM messages WHERE is_read = false`;
        try {
            const result = await db.query(query);
            return parseInt(result.rows[0].count);
        } catch (error) {
            throw error;
        }
    }

    // Mark as read
    static async markAsRead(id) {
        const query = `UPDATE messages SET is_read = true WHERE id = $1 RETURNING *`;
        try {
            const result = await db.query(query, [id]);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    }

    // Delete message
    static async delete(id) {
        const query = `DELETE FROM messages WHERE id = $1`;
        try {
            await db.query(query, [id]);
        } catch (error) {
            throw error;
        }
    }
}

module.exports = Message;

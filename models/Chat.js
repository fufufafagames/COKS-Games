const db = require("../config/database");

module.exports = {
  create: async (userId, message) => {
    const result = await db.query(
      `INSERT INTO chats (user_id, message) 
       VALUES ($1, $2) 
       RETURNING id, message, created_at`,
      [userId, message]
    );
    return result.rows[0];
  },

  getRecent: async (limit = 50) => {
    const result = await db.query(
      `SELECT c.id, c.message, c.created_at, u.name as user_name, u.avatar as user_avatar 
       FROM chats c
       JOIN users u ON c.user_id = u.id
       ORDER BY c.created_at ASC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }
};

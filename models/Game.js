/**
 * Game Model
 * Handle semua operasi database untuk games
 */

const db = require("../config/database");

module.exports = {
  /**
   * Get all games dengan optional search & filter
   * @param {string} search - Search query (optional)
   * @param {string} category - Category filter (optional)
   * @returns {Promise<array>} Array of games
   */
  getAll: async (search = "", category = "", sortBy = "newest", page = 1, limit = 12) => {
    let query = `
            SELECT games.*, users.name as author_name, users.avatar as author_avatar,
            COUNT(*) OVER() as total_count
            FROM games 
            JOIN users ON games.user_id = users.id 
            WHERE 1=1
        `;
    const params = [];
    let paramCount = 1;

    // Add search filter
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (games.title ILIKE $${paramCount} OR games.description ILIKE $${paramCount})`;
      paramCount++;
    }

    // Add category filter
    if (category) {
      params.push(`%${category}%`);
      query += ` AND games.category ILIKE $${paramCount}`;
      paramCount++;
    }

    // Sorting
    switch (sortBy) {
        case "oldest":
            query += " ORDER BY games.created_at ASC";
            break;
        case "popular":
            query += " ORDER BY games.play_count DESC";
            break;
        case "rating":
            query += " ORDER BY games.avg_rating DESC NULLS LAST";
            break;
        case "az":
            query += " ORDER BY games.title ASC";
            break;
        case "za":
            query += " ORDER BY games.title DESC";
            break;
        case "newest":
        default:
            query += " ORDER BY games.created_at DESC";
            break;
    }
    
    // Pagination
    const offset = (page - 1) * limit;
    params.push(limit);
    params.push(offset);
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;

    const result = await db.query(query, params);
    return {
        games: result.rows,
        total: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0
    };
  },

  /**
   * Get all distinct categories
   * @returns {Promise<array>} Array of category strings
   */
  getAllCategories: async () => {
    const result = await db.query(
      "SELECT DISTINCT category FROM games WHERE category IS NOT NULL"
    );
    // Split comma-separated categories and get unique values
    const allCategories = result.rows
      .map(row => row.category)
      .join(',')
      .split(',')
      .map(cat => cat.trim())
      .filter(cat => cat.length > 0);
      
    // Return unique sorted categories
    return [...new Set(allCategories)].sort();
  },

  /**
   * Get featured games untuk landing page
   * Diurutkan berdasarkan play_count dan avg_rating
   * @param {number} limit - Jumlah games yang ingin diambil (default: 6)
   * @returns {Promise<array>} Array of featured games
   */
  getFeatured: async (limit = 6) => {
    try {
      // Query untuk ambil games terpopuler
      // Prioritas: play_count tinggi DAN rating bagus
      const query = `
        SELECT games.*, users.name as author_name, users.avatar as author_avatar
        FROM games 
        JOIN users ON games.user_id = users.id 
        ORDER BY 
          games.play_count DESC, 
          games.avg_rating DESC, 
          games.created_at DESC
        LIMIT $1
      `;

      const result = await db.query(query, [limit]);
      return result.rows;
    } catch (error) {
      console.error("Error fetching featured games:", error);
      // Return empty array jika error, biar landing page tetap bisa render
      return [];
    }
  },

  /**
   * Find game by slug
   * @param {string} slug - Game slug
   * @returns {Promise<object|null>} Game object atau null
   */
  findBySlug: async (slug) => {
    const result = await db.query(
      `SELECT games.*, users.name as author_name, users.id as author_id, users.avatar as author_avatar
             FROM games 
             JOIN users ON games.user_id = users.id 
             WHERE games.slug = $1`,
      [slug]
    );
    return result.rows[0] || null;
  },

  /**
   * Find game by ID
   * @param {number} id - Game ID
   * @returns {Promise<object|null>} Game object atau null
   */
  findById: async (id) => {
    const result = await db.query("SELECT * FROM games WHERE id = $1", [id]);
    return result.rows[0] || null;
  },

  /**
   * Create new game
   * @param {object} gameData - Game data
   * @returns {Promise<object>} Created game
   */
  create: async (gameData) => {
    const {
      user_id,
      title,
      slug,
      description,
      github_url,
      thumbnail_url,
      video_url,
      game_type,
      category,
      tags,
      price_type,
      price,
    } = gameData;

    const result = await db.query(
      `INSERT INTO games 
             (user_id, title, slug, description, github_url, thumbnail_url, video_url, game_type, category, tags, price_type, price, created_at, updated_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()) 
             RETURNING *`,
      [
        user_id,
        title,
        slug,
        description,
        github_url,
        thumbnail_url,
        video_url,
        game_type,
        category,
        tags,
        price_type,
        price,
      ]
    );

    return result.rows[0];
  },

  /**
   * Update game
   * @param {string} slug - Game slug
   * @param {object} updateData - Data yang akan diupdate
   * @returns {Promise<object>} Updated game
   */
  update: async (slug, updateData) => {
    const {
      title,
      description,
      github_url,
      thumbnail_url,
      video_url,
      category,
      tags,
      game_type,
      price_type,
      price,
    } = updateData;

    const result = await db.query(
      `UPDATE games 
             SET title = $1, description = $2, github_url = $3, thumbnail_url = $4, video_url = $5,
                 category = $6, tags = $7, game_type = $8, price_type = $9, price = $10, updated_at = NOW() 
             WHERE slug = $11
             RETURNING *`,
      [
        title,
        description,
        github_url,
        thumbnail_url,
        video_url,
        category,
        tags,
        game_type,
        price_type,
        price,
        slug,
      ]
    );

    return result.rows[0];
  },

  /**
   * Delete game
   * @param {string} slug - Game slug
   * @returns {Promise<boolean>} True jika berhasil
   */
  delete: async (slug) => {
    const result = await db.query("DELETE FROM games WHERE slug = $1", [slug]);
    return result.rowCount > 0;
  },

  /**
   * Increment play count
   * @param {number} id - Game ID
   */
  incrementPlayCount: async (id) => {
    await db.query(
      "UPDATE games SET play_count = play_count + 1 WHERE id = $1",
      [id]
    );
  },

  /**
   * Get games by user ID
   * @param {number} userId - User ID
   * @returns {Promise<array>} Array of games
   */
  getByUserId: async (userId) => {
    const result = await db.query(
      `SELECT * FROM games 
             WHERE user_id = $1 
             ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  /**
   * Update average rating
   * @param {number} gameId - Game ID
   */
  updateAverageRating: async (gameId) => {
    await db.query(
      `UPDATE games 
             SET avg_rating = (
                 SELECT COALESCE(AVG(rating), 0) 
                 FROM ratings 
                 WHERE game_id = $1
             )
             WHERE id = $1`,
      [gameId]
    );
  },

  /**
   * Check if slug exists
   * @param {string} slug - Game slug
   * @returns {Promise<boolean>} True jika slug sudah ada
   */
  slugExists: async (slug) => {
    const result = await db.query("SELECT id FROM games WHERE slug = $1", [
      slug,
    ]);
    return result.rows.length > 0;
  },

  /**
   * Search games by title prefix (Live Search)
   * Case insensitive search matching the start of the title
   * @param {string} query - Search prefix
   * @returns {Promise<array>} Array of games
   */
  searchByTitlePrefix: async (query) => {
    if (!query) return [];
    
    // Use ILIKE with % only at the end for prefix matching
    // e.g., 'ab' -> 'ab%' matches 'Absurd', 'Abacus' but not 'Crab'
    const result = await db.query(
      `SELECT id, title, slug, thumbnail_url, category, avg_rating 
       FROM games 
       WHERE title ILIKE $1 
       ORDER BY title ASC 
       LIMIT 10`,
      [query + '%']
    );
    return result.rows;
  }
};

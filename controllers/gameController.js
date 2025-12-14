/**
 * Game Controller
 * Handle game CRUD operations
 */

const Game = require("../models/Game");
const Event = require("../models/Event"); // [NEW]
const Rating = require("../models/Rating");
const Transaction = require("../models/Transaction");
const slugify = require("slugify");
const fs = require('fs');
const path = require('path');

// Helper to get merged categories
const getCategories = async () => {
  const defaultCategories = [
    "Action",
    "Puzzle",
    "RPG",
    "Adventure",
    "Strategy",
    "Casual",
    "Sports",
    "Racing",
  ];
  const dbCategories = await Game.getAllCategories();
  // Merge and remove duplicates
  return [...new Set([...defaultCategories, ...dbCategories])].sort();
};

module.exports = {
  /**
   * Landing page - Homepage dengan featured games
   * Menampilkan 6 games terpopuler
   */
  landing: async (req, res) => {
    try {
      // Ambil 6 featured games (games dengan play_count & rating tertinggi)
      // Ambil 6 featured games (games dengan play_count & rating tertinggi)
      // Ambil 7 featured games (sesuai request user)
      const featuredGames = await Game.getFeatured(4); 
      
      // [NEW] Ambil Recommended Games (Random)
      const recommendedGames = await Game.getRandom(6);

      // [NEW] Ambil PC Games (Download Type)
      const pcGames = await Game.getType('download', 8);

      // [NEW] Ambil Active Event
      const activeEvent = await Event.getActive();

      // [NEW] Ambil Latest Updated Games
      const latestGames = await Game.getLatest(15); 

      // [NEW] Ambil Popular Category Data
      const popularCategoryName = await Game.getMostPopularCategory();
      let popularCategoryGames = [];
      if (popularCategoryName) {
        popularCategoryGames = await Game.getByCategory(popularCategoryName, 12); // Fetch 12 items for 2 pages
      }

      const categories = await getCategories();

      res.render("index", {
        title: "FUFUFAFAGAMES - Discover Amazing Games",
        featuredGames,
        recommendedGames, // [NEW]
        pcGames, // [NEW]
        activeEvent, // [NEW]
        latestGames, // [NEW]
        popularCategoryName, // [NEW]
        popularCategoryGames, // [NEW]
        categories,
      });
    } catch (error) {
      console.error("Landing page error:", error); // Jika error, tetap render landing page tapi tanpa featured games
      res.render("index", {
        title: "FUFUFAFAGAMES - Discover Amazing Games",
        featuredGames: [],
        recommendedGames: [],
        pcGames: [],
        activeEvent: null,
        latestGames: [],
        popularCategoryName: null,
        popularCategoryGames: [],
        categories: [],
      });
    }
  },
  /**
 * Display all games dengan search & filter
 * UPDATED: Handle empty games dengan proper message
 * UPSATED: Added Pagination (Limit 5 per page)
 */
index: async (req, res) => {
  try {
    const { search, category, page = 1 } = req.query;
    const limit = 5; // User requested 5 games per column/page
    const currentPage = parseInt(page) || 1;

    // Call getAll with pagination params
    const { games, total } = await Game.getAll(search, category, "newest", currentPage, limit);
    const categories = await getCategories();
    
    // Calculate total pages
    const totalPages = Math.ceil(total / limit);

    res.render("games/index", {
      title: "All Games",
      games,
      search: search || "",
      category: category || "",
      categories,
      // Pagination Data
      currentPage,
      totalPages,
      totalGames: total,
      // Pass message jika games kosong
      emptyMessage:
        games.length === 0
          ? search || category
            ? "No games found matching your criteria. Try different filters!"
            : "No games available yet. Be the first to upload a game! 🎮"
          : null,
    });
  } catch (error) {
    console.error("Index error:", error);
    req.session.error = "Failed to load games. Please try again.";
    res.redirect("/");
  }
},
  /**
   * Display game detail
   */ show: async (req, res) => {
    try {
      const game = await Game.findBySlug(req.params.slug);
      if (!game) {
        req.session.error = "Game not found";
        return res.redirect("/games");
      }

      // START: KOREKSI FIX UNTUK JSON PARSING TAGS
      game.parsedTags = [];

      if (
        game.tags &&
        typeof game.tags === "string" &&
        game.tags.trim().length > 0
      ) {
        let tagsArray = [];
        try {
          // 1. Coba parse JSON. Ini berhasil jika formatnya ['tag1', 'tag2']
          const parsed = JSON.parse(game.tags);

          if (Array.isArray(parsed)) {
            // Jika hasil parse adalah array (format JSON valid), gunakan itu
            tagsArray = parsed;
          } else if (typeof parsed === "string") {
            // Kasus aneh: JSON.parse menghasilkan string (misal, jika inputnya hanya '"tag1, tag2"' )
            tagsArray = parsed
              .split(",")
              .map((t) => t.trim())
              .filter((t) => t.length > 0);
          }
        } catch (e) {
          // 2. Jika JSON.parse gagal (kemungkinan data tersimpan sebagai string biasa "tag1, tag2")
          // Jalankan FALLBACK KUAT: Pisahkan string secara manual
          console.error(
            "Tags data is not valid JSON, applying fallback parsing:",
            e.message
          );
          tagsArray = game.tags
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t.length > 0);
        }

        // Assign hasil array ke game.parsedTags
        game.parsedTags = tagsArray;
      }
      // END: KOREKSI FIX UNTUK JSON PARSING TAGS

      // Parse Download Config
    game.parsedDownloadConfig = null;
    if (game.download_config) {
        try {
            game.parsedDownloadConfig = JSON.parse(game.download_config);
        } catch (e) {
            console.error("Error parsing download_config for show:", e);
        }
    }

    // Get ratings
    const ratings = await Rating.getByGameId(game.id);
      const ratingStats = await Rating.getStats(game.id); // Check if current user has rated

      let isPurchased = false;
      let userRating = null;
      if (req.session.user) {
        userRating = await Rating.getUserRating(req.session.user.id, game.id);
        
        // Check purchase status
        // Free games are always "purchased". Author always owns their game.
        if (game.price_type === 'free' || !game.price_type) {
            isPurchased = true;
        } else if (req.session.user.id === game.user_id) {
            isPurchased = true;
        } else {
            isPurchased = await Transaction.hasPurchased(req.session.user.id, game.id);
        }
      } else {
          // Guest
          if (game.price_type === 'free' || !game.price_type) {
              isPurchased = true;
          }
      }

      res.render("games/show", {
        title: game.title,
        game,
        ratings,
        ratingStats,
        userRating,
        isPurchased,
      });
    } catch (error) {
      console.error("Show error:", error);
      req.session.error = "Failed to load game details";
      res.redirect("/games");
    }
  },
  /**
   * Show upload game form
   */ create: async (req, res) => {
    const categories = await getCategories();
    res.render("games/create", {
      title: "Upload Game",
      categories,
    });
  },
  /**
   * Store new game
   */ store: async (req, res) => {
    try {
      const { 
        title, description, github_url, thumbnail_url, video_url, category, new_category, tags, price_type, price,
        game_mode, version, os, install_type, file_size, provider_name, provider_url 
      } = req.body; // Generate unique slug

      // Handle file uploads
      let finalThumbnailUrl = thumbnail_url;
      if (req.files && req.files['thumbnail']) {
        finalThumbnailUrl = '/uploads/thumbnails/' + req.files['thumbnail'][0].filename;
      } else if (!finalThumbnailUrl) {
          finalThumbnailUrl = "https://via.placeholder.com/400x300/1a1a2e/00D9FF?text=Game";
      }

      // [NEW] Handle Icon Upload
      let finalIconUrl = null;
      if (req.files && req.files['icon']) {
          finalIconUrl = '/uploads/icons/' + req.files['icon'][0].filename;
      }

      let finalVideoUrl = video_url;
      if (req.files && req.files['video']) {
        finalVideoUrl = '/uploads/videos/' + req.files['video'][0].filename;
      }

      // Handle dynamic category
      let finalCategory = category;
      if (new_category && new_category.trim() !== "") {
          finalCategory = new_category.trim();
      }

      let slug = slugify(title, { lower: true, strict: true });
      let slugExists = await Game.slugExists(slug);
      let counter = 1;

      while (slugExists) {
        slug = `${slugify(title, { lower: true, strict: true })}-${counter}`;
        slugExists = await Game.slugExists(slug);
        counter++;
      } 
      
      // Auto-detect game type BASED ON USER SELECTION (game_mode)
      let game_type = "playable";
      if (game_mode === 'download') {
          game_type = "download";
      } else if (game_mode === 'play') {
          game_type = "playable";
      } else {
        // Fallback to legacy detection if not specified
        if (
            github_url.includes("/releases/") ||
            github_url.includes(".zip") ||
            github_url.includes(".rar")
        ) {
            game_type = "download";
        }
      }

      // Construct Download Config
      let download_config = null;
      if (game_type === 'download' || (provider_name && provider_name.length > 0)) {
          const links = [];
          if (Array.isArray(provider_name)) {
              for (let i = 0; i < provider_name.length; i++) {
                  if (provider_name[i] && provider_url[i]) {
                      links.push({ name: provider_name[i], url: provider_url[i] });
                  }
              }
          } else if (provider_name && provider_url) {
              // Single entry case
              links.push({ name: provider_name, url: provider_url });
          }

          download_config = JSON.stringify({
              version: version || '',
              os: os || '',
              install_type: install_type || '',
              file_size: file_size || '',
              links: links
          });
      }

      // Create game
      await Game.create({
        user_id: req.session.user.id,
        title,
        slug,
        description,
        github_url, // Optional now
        thumbnail_url: finalThumbnailUrl,
        video_url: finalVideoUrl,
        icon_url: finalIconUrl, 
        game_type,
        category: finalCategory,
        tags: JSON.stringify(tags ? tags.split(",").map((t) => t.trim()) : []),
        price_type: price_type || 'free',
        price: price_type === 'free' ? 0 : (parseInt(price) || 0),
        download_config, // [NEW]
      });

      req.session.success = "Game uploaded successfully! 🎮";
      res.redirect("/games");
    } catch (error) {
      console.error("Store error:", error);
      req.session.error = "Failed to upload game. Please try again.";
      res.redirect("/games/create/new");
    }
  },
  /**
   * Show edit game form
   */ edit: async (req, res) => {
    try {
      const game = await Game.findBySlug(req.params.slug);
      if (!game) {
        req.session.error = "Game not found";
        return res.redirect("/games");
      } // Check ownership

      if (game.user_id !== req.session.user.id) {
        req.session.error = "You are not authorized to edit this game";
        return res.redirect("/games");
      }

      // ------------------------------------------------------------------
      // START: KOREKSI FIX UNTUK JSON PARSING TAGS
      game.parsedTags = [];
      if (game.tags && typeof game.tags === "string" && game.tags.trim().length > 0) {
        try {
          const parsed = JSON.parse(game.tags);
          if (Array.isArray(parsed)) {
            game.parsedTags = parsed;
          } else if (typeof parsed === "string") {
            game.parsedTags = parsed.split(",").map((t) => t.trim()).filter((t) => t.length > 0);
          }
        } catch (e) {
            game.parsedTags = game.tags.split(",").map((t) => t.trim()).filter((t) => t.length > 0);
        }
      }
      
      // Parse Download Config if exists
      game.parsedDownloadConfig = null;
      if (game.download_config) {
          try {
              game.parsedDownloadConfig = JSON.parse(game.download_config);
          } catch (e) {
              console.error("Error parsing download config:", e);
          }
      }
      
      // END: KOREKSI FIX UNTUK JSON PARSING TAGS
      // ------------------------------------------------------------------

      const categories = await getCategories();

      res.render("games/edit", {
        title: "Edit Game",
        game,
        categories,
      });
    } catch (error) {
      console.error("Edit error:", error);
      req.session.error = "Failed to load game";
      res.redirect("/games");
    }
  },
  /**
   * Update game
   */
   update: async (req, res) => {
    const game = await Game.findBySlug(req.params.slug); // Needed for old file deletion
    try {
      if (!game) {
        req.session.error = "Game not found";
        return res.redirect("/games");
      }
      
      if (game.user_id !== req.session.user.id) {
        req.session.error = "You are not authorized to edit this game";
        return res.redirect("/games");
      }

      const { 
          title, description, github_url, thumbnail_url, video_url, category, new_category, tags, price_type, price,
          game_mode, version, os, install_type, file_size, provider_name, provider_url 
      } = req.body;

      // Handle file uploads
      let finalThumbnailUrl = game.thumbnail_url;
      if (req.files && req.files['thumbnail']) {
        if (game.thumbnail_url && game.thumbnail_url.startsWith('/uploads/')) {
          const oldPath = path.join(__dirname, '../public', game.thumbnail_url);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        finalThumbnailUrl = '/uploads/thumbnails/' + req.files['thumbnail'][0].filename;
      } else if (thumbnail_url) {
        finalThumbnailUrl = thumbnail_url;
      }

      // [NEW] Handle Icon Update
      let finalIconUrl = game.icon_url || null;
      if (req.files && req.files['icon']) {
          // Delete old icon
          if (game.icon_url && game.icon_url.startsWith('/uploads/')) {
              const oldPath = path.join(__dirname, '../public', game.icon_url);
              if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
          }
          finalIconUrl = '/uploads/icons/' + req.files['icon'][0].filename;
      }

      let finalVideoUrl = game.video_url || null;
      if (req.files && req.files['video']) {
        if (game.video_url && game.video_url.startsWith('/uploads/')) {
          const oldPath = path.join(__dirname, '../public', game.video_url);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        finalVideoUrl = '/uploads/videos/' + req.files['video'][0].filename;
      } else if (video_url !== undefined) {
        finalVideoUrl = video_url;
      }

      let finalCategory = category;
      if (new_category && new_category.trim() !== "") {
        finalCategory = new_category.trim();
      }

      // Determine game type and download config
      let game_type = "playable";
      if (game_mode === 'download') {
          game_type = "download";
      } else if (game_mode === 'play') {
          game_type = "playable";
      } else {
        // Fallback preservation or legacy detection
        if (github_url && (github_url.includes("/releases/") || github_url.includes(".zip"))) {
            game_type = "download";
        }
      }

      // Construct Download Config
      let download_config = null;
      // If download mode or if user entered provider details
      if ((game_mode === 'download') || (provider_name && provider_name.length > 0)) {
          const links = [];
          if (Array.isArray(provider_name)) {
              for (let i = 0; i < provider_name.length; i++) {
                  if (provider_name[i] && provider_url[i]) {
                      links.push({ name: provider_name[i], url: provider_url[i] });
                  }
              }
          } else if (provider_name && provider_url) {
              links.push({ name: provider_name, url: provider_url });
          }

          download_config = JSON.stringify({
              version: version || '',
              os: os || '',
              install_type: install_type || '',
              file_size: file_size || '',
              links: links
          });
      }

      // 🔧 EXPLICIT PRICE HANDLING
      let finalPriceType = 'free';
      let finalPrice = 0;

      if (price_type && String(price_type).trim() === 'paid') {
        finalPriceType = 'paid';
        finalPrice = parseInt(price) || 0;
        
        if (finalPrice < 1000) {
          req.session.error = "Paid games must have price ≥ Rp 1,000";
          return res.redirect(`/games/${req.params.slug}/edit`);
        }
      }

      await Game.update(req.params.slug, {
        title,
        description,
        github_url: github_url || null,
        thumbnail_url: finalThumbnailUrl || null,
        video_url: finalVideoUrl,
        icon_url: finalIconUrl, // [NEW]
        category: finalCategory,
        tags: JSON.stringify(tags ? tags.split(",").map((t) => t.trim()) : []),
        game_type,
        price_type: finalPriceType,
        price: finalPrice,
        download_config, // [NEW]
      });

      console.log('✅ Update completed\n');

      req.session.success = "Game updated successfully!";
      res.redirect(`/games/${req.params.slug}`);
    } catch (error) {
      console.error("Update error:", error);
      req.session.error = "Failed to update: " + error.message;
      res.redirect(`/games/${req.params.slug}/edit`);
    }
  },
  /**
   * Delete game
   */ destroy: async (req, res) => {
    try {
      const game = await Game.findBySlug(req.params.slug);
      if (!game) {
        req.session.error = "Game not found";
        return res.redirect("/games");
      } // Check ownership

      if (game.user_id !== req.session.user.id) {
        req.session.error = "You are not authorized to delete this game";
        return res.redirect("/games");
      }

      await Game.delete(req.params.slug);

      // Delete files
      if (game.thumbnail_url && game.thumbnail_url.startsWith('/uploads/')) {
          const oldPath = path.join(__dirname, '../public', game.thumbnail_url);
          if (fs.existsSync(oldPath)) {
              fs.unlinkSync(oldPath);
          }
      }
      if (game.video_url && game.video_url.startsWith('/uploads/')) {
          const oldPath = path.join(__dirname, '../public', game.video_url);
          if (fs.existsSync(oldPath)) {
              fs.unlinkSync(oldPath);
          }
      }

      req.session.success = "Game deleted successfully";
      res.redirect("/games");
    } catch (error) {
      console.error("Delete error:", error);
      req.session.error = "Failed to delete game";
      res.redirect("/games");
    }
  },
  /**
   /**
    * Play game (iframe embed)
    */ play: async (req, res) => {
    try {
      const game = await Game.findBySlug(req.params.slug);
      if (!game) {
        req.session.error = "Game not found";
        return res.redirect("/games");
      } // Increment play count

      await Game.incrementPlayCount(game.id); // Process GitHub URL untuk playable games

      // Check access rights
      let isPurchased = false;
      if (game.price_type === 'free' || !game.price_type) {
          isPurchased = true;
      } else if (req.session.user && req.session.user.id === game.user_id) {
          isPurchased = true;
      } else if (req.session.user) {
          isPurchased = await Transaction.hasPurchased(req.session.user.id, game.id);
      }

      if (!isPurchased) {
          req.session.error = "You must purchase this game to play it.";
          return res.redirect(`/games/${game.slug}`);
      }

      let gameUrl = game.github_url;
      if (game.game_type === "playable") {
        // START: KOREKSI UNTUK MENGGUNAKAN GITHUB PAGES URL
        if (gameUrl.includes("github.com")) {
          // Membersihkan URL dari potensi /tree/main atau /blob/main
          const cleanUrl = gameUrl
            .replace(/\/$/, "")
            .replace(/\/tree\/main/, "")
            .replace(/\/blob\/main/, "");
          const parts = cleanUrl.split("/");
          const repo = parts.pop(); // Ambil nama repo (contoh: "game_absurd")
          const user = parts.pop(); // Ambil username (contoh: "sabungoren")

          if (user && repo) {
            // Konversi ke format GitHub Pages: https://[user].github.io/[repo]/
            gameUrl = `https://${user}.github.io/${repo}/`;
          }
        } // END: KOREKSI UNTUK MENGGUNAKAN GITHUB PAGES URL
      }

      res.render("games/play", {
        title: `Play ${game.title}`,
        game,
        gameUrl,
      });
    } catch (error) {
      console.error("Play error:", error);
      req.session.error = "Failed to load game";
      res.redirect("/games");
    }
  },
  /**
   * Render Search Page
   */
  searchPage: async (req, res) => {
    const categories = await getCategories();
    res.render('games/search', {
      title: 'Search Games',
      categories
    });
  },

  /**
   * API for Live Search
   */
  searchApi: async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || q.length < 1) {
        return res.json([]);
      }
      const games = await Game.searchByTitlePrefix(q);
      res.json(games);
    } catch (error) {
      console.error('Search API error:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  }
};

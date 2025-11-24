/**
 * Game Controller
 * Handle game CRUD operations
 */

const Game = require("../models/Game");
const Rating = require("../models/Rating");
const slugify = require("slugify");

module.exports = {
  /**
   * Landing page - Homepage dengan featured games
   * Menampilkan 6 games terpopuler
   */
  landing: async (req, res) => {
    try {
      // Ambil 6 featured games (games dengan play_count & rating tertinggi)
      const featuredGames = await Game.getFeatured(6); // Render landing page

      res.render("index", {
        title: "FUFUFAFAGAMES - Discover Amazing Games",
        featuredGames,
        categories: [
          "Action",
          "Puzzle",
          "RPG",
          "Adventure",
          "Strategy",
          "Casual",
          "Sports",
          "Racing",
        ],
      });
    } catch (error) {
      console.error("Landing page error:", error); // Jika error, tetap render landing page tapi tanpa featured games
      res.render("index", {
        title: "FUFUFAFAGAMES - Discover Amazing Games",
        featuredGames: [],
        categories: [
          "Action",
          "Puzzle",
          "RPG",
          "Adventure",
          "Strategy",
          "Casual",
          "Sports",
          "Racing",
        ],
      });
    }
  },
  /**
   * Display all games dengan search & filter
   * UPDATED: Handle empty games dengan proper message
   */ index: async (req, res) => {
    try {
      const { search, category } = req.query;
      const games = await Game.getAll(search, category); // Render games index page

      res.render("games/index", {
        title: "All Games",
        games,
        search: search || "",
        category: category || "",
        categories: [
          "Action",
          "Puzzle",
          "RPG",
          "Adventure",
          "Strategy",
          "Casual",
          "Sports",
          "Racing",
        ], // Pass message jika games kosong
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

      // Get ratings
      const ratings = await Rating.getByGameId(game.id);
      const ratingStats = await Rating.getStats(game.id); // Check if current user has rated

      let userRating = null;
      if (req.session.user) {
        userRating = await Rating.getUserRating(req.session.user.id, game.id);
      }

      res.render("games/show", {
        title: game.title,
        game,
        ratings,
        ratingStats,
        userRating,
      });
    } catch (error) {
      console.error("Show error:", error);
      req.session.error = "Failed to load game details";
      res.redirect("/games");
    }
  },
  /**
   * Show upload game form
   */ create: (req, res) => {
    res.render("games/create", {
      title: "Upload Game",
      categories: [
        "Action",
        "Puzzle",
        "RPG",
        "Adventure",
        "Strategy",
        "Casual",
        "Sports",
        "Racing",
      ],
    });
  },
  /**
   * Store new game
   */ store: async (req, res) => {
    try {
      const { title, description, github_url, thumbnail_url, video_url, category, tags } =
        req.body; // Generate unique slug

      // Handle file uploads
      let finalThumbnailUrl = thumbnail_url;
      if (req.files && req.files['thumbnail']) {
        finalThumbnailUrl = '/uploads/thumbnails/' + req.files['thumbnail'][0].filename;
      } else if (!finalThumbnailUrl) {
          finalThumbnailUrl = "https://via.placeholder.com/400x300/1a1a2e/00D9FF?text=Game";
      }

      let finalVideoUrl = video_url;
      if (req.files && req.files['video']) {
        finalVideoUrl = '/uploads/videos/' + req.files['video'][0].filename;
      }

      let slug = slugify(title, { lower: true, strict: true });
      let slugExists = await Game.slugExists(slug);
      let counter = 1;

      while (slugExists) {
        slug = `${slugify(title, { lower: true, strict: true })}-${counter}`;
        slugExists = await Game.slugExists(slug);
        counter++;
      } // Auto-detect game type

      let game_type = "playable";
      if (
        github_url.includes("/releases/") ||
        github_url.includes(".zip") ||
        github_url.includes(".rar")
      ) {
        game_type = "download";
      } // Create game

      await Game.create({
        user_id: req.session.user.id,
        title,
        slug,
        description,
        github_url,
        thumbnail_url: finalThumbnailUrl,
        video_url: finalVideoUrl,
        game_type,
        category,
        tags: JSON.stringify(tags ? tags.split(",").map((t) => t.trim()) : []),
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
            // Kasus aneh: JSON.parse menghasilkan string
            tagsArray = parsed
              .split(",")
              .map((t) => t.trim())
              .filter((t) => t.length > 0);
          }
        } catch (e) {
          // 2. Jika JSON.parse gagal (kemungkinan data tersimpan sebagai string biasa)
          console.error(
            "Tags data is not valid JSON for edit, applying fallback parsing:",
            e.message
          );
          tagsArray = game.tags
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t.length > 0);
        } // Assign hasil array ke game.parsedTags

        game.parsedTags = tagsArray;
      } // END: KOREKSI FIX UNTUK JSON PARSING TAGS
      // ------------------------------------------------------------------

      res.render("games/edit", {
        title: "Edit Game",
        game,
        categories: [
          "Action",
          "Puzzle",
          "RPG",
          "Adventure",
          "Strategy",
          "Casual",
          "Sports",
          "Racing",
        ],
      });
    } catch (error) {
      console.error("Edit error:", error);
      req.session.error = "Failed to load game";
      res.redirect("/games");
    }
  },
  /**
   * Update game
   */ update: async (req, res) => {
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

      const { title, description, github_url, thumbnail_url, video_url, category, tags } =
        req.body; // Auto-detect game type

      // Handle file uploads
      let finalThumbnailUrl = game.thumbnail_url;
      if (req.files && req.files['thumbnail']) {
        finalThumbnailUrl = '/uploads/thumbnails/' + req.files['thumbnail'][0].filename;
      } else if (thumbnail_url) {
        finalThumbnailUrl = thumbnail_url;
      }

      let finalVideoUrl = game.video_url;
      if (req.files && req.files['video']) {
        finalVideoUrl = '/uploads/videos/' + req.files['video'][0].filename;
      } else if (video_url !== undefined) {
        // Only update if video_url is explicitly provided (even if empty string to clear it)
        // But since we use value="<%= game.video_url || '' %>" in view, empty string means clear
        finalVideoUrl = video_url;
      }

      let game_type = "playable";
      if (
        github_url.includes("/releases/") ||
        github_url.includes(".zip") ||
        github_url.includes(".rar")
      ) {
        game_type = "download";
      }

      await Game.update(req.params.slug, {
        title,
        description,
        github_url,
        thumbnail_url: finalThumbnailUrl,
        video_url: finalVideoUrl,
        category,
        tags: JSON.stringify(tags ? tags.split(",").map((t) => t.trim()) : []),
        game_type,
      });

      req.session.success = "Game updated successfully!";
      res.redirect(`/games/${req.params.slug}`);
    } catch (error) {
      console.error("Update error:", error);
      req.session.error = "Failed to update game";
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
};

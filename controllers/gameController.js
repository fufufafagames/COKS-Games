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

      // START: FIX UNTUK JSON PARSING TAGS
      game.parsedTags = [];

      if (game.tags) {
        try {
          // Jika game.tags adalah string, coba parse
          if (typeof game.tags === "string" && game.tags.trim().length > 0) {
            game.parsedTags = JSON.parse(game.tags);
          }

          // Pastikan hasilnya adalah array (penting!)
          if (!Array.isArray(game.parsedTags)) {
            // Jika parse berhasil tapi hasilnya bukan array (misalnya, hanya string "tag"),
            // coba pisahkan sebagai string biasa.
            if (typeof game.parsedTags === "string") {
              game.parsedTags = game.parsedTags
                .split(",")
                .map((t) => t.trim())
                .filter((t) => t.length > 0);
            } else {
              game.parsedTags = []; // Default ke array kosong
            }
          }
        } catch (e) {
          console.error("Error parsing tags for game:", game.slug, e.message);
          // FALLBACK KUAT: Jika parsing JSON gagal, coba pisahkan string secara manual
          if (typeof game.tags === "string" && game.tags.trim().length > 0) {
            game.parsedTags = game.tags
              .split(",")
              .map((t) => t.trim())
              .filter((t) => t.length > 0);
          } else {
            game.parsedTags = [];
          }
        }
      } // Get ratings
      // END: FIX UNTUK JSON PARSING TAGS

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
      const { title, description, github_url, thumbnail_url, category, tags } =
        req.body; // Generate unique slug

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
        thumbnail_url:
          thumbnail_url ||
          "https://via.placeholder.com/400x300/1a1a2e/00D9FF?text=Game",
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

      const { title, description, github_url, thumbnail_url, category, tags } =
        req.body; // Auto-detect game type

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
        thumbnail_url: thumbnail_url || game.thumbnail_url,
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
        // Convert GitHub repo URL ke raw URL jika perlu
        if (
          gameUrl.includes("github.com") &&
          !gameUrl.includes("raw.githubusercontent.com")
        ) {
          // Example: https://github.com/user/repo → https://raw.githubusercontent.com/user/repo/main/index.html
          gameUrl =
            gameUrl
              .replace("github.com", "raw.githubusercontent.com")
              .replace("/blob/", "/") + "/main/index.html";
        }
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

/**
 * FUFUFAFAGAMES - Client-side JavaScript
 * Handle interactive features
 */

// Auto-hide alerts after 5 seconds
document.addEventListener("DOMContentLoaded", function () {
  const alerts = document.querySelectorAll(".alert");
  alerts.forEach((alert) => {
    setTimeout(() => {
      const bsAlert = new bootstrap.Alert(alert);
      bsAlert.close();
    }, 5000);
  });
});

// Confirm before deleting
function confirmDelete(message) {
  return confirm(message || "Are you sure you want to delete this?");
}

// Star rating hover effect
document.addEventListener("DOMContentLoaded", function () {
  const starInputs = document.querySelectorAll(".star-input input");
  starInputs.forEach((input) => {
    input.addEventListener("change", function () {
      console.log("Rating selected:", this.value);
    });
  });
});

// Image lazy loading
document.addEventListener("DOMContentLoaded", function () {
  const images = document.querySelectorAll('img[loading="lazy"]');

  if ("IntersectionObserver" in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src || img.src;
          img.classList.add("loaded");
          observer.unobserve(img);
        }
      });
    });

    images.forEach((img) => imageObserver.observe(img));
  }
});

// Search form enhancement
const searchForm = document.querySelector(".search-form");
if (searchForm) {
  const searchInput = searchForm.querySelector('input[name="search"]');

  // Clear search on Escape key
  searchInput.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      this.value = "";
      this.blur();
    }
  });
}

// Game card click handling
document.addEventListener("DOMContentLoaded", function () {
  const gameCards = document.querySelectorAll(".game-card");

  gameCards.forEach((card) => {
    card.addEventListener("click", function (e) {
      // Don't navigate if clicking on action buttons
      if (e.target.closest(".game-actions")) {
        e.stopPropagation();
        return;
      }
    });
  });
});

// Form validation enhancement
document.addEventListener("DOMContentLoaded", function () {
  const forms = document.querySelectorAll("form");

  forms.forEach((form) => {
    form.addEventListener("submit", function (e) {
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML =
          '<i class="fas fa-spinner fa-spin"></i> Processing...';

        // Re-enable after 3 seconds (in case of validation errors)
        setTimeout(() => {
          submitBtn.disabled = false;
          submitBtn.innerHTML = submitBtn.dataset.originalText || "Submit";
        }, 3000);
      }
    });
  });
});

// Smooth scroll to top
function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

// Add scroll to top button
document.addEventListener("DOMContentLoaded", function () {
  // Create button
  const scrollBtn = document.createElement("button");
  scrollBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
  scrollBtn.className = "scroll-to-top";
  scrollBtn.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background-color: var(--aqua);
        color: var(--dark-primary);
        border: none;
        cursor: pointer;
        display: none;
        z-index: 1000;
        box-shadow: 0 4px 15px rgba(0, 217, 255, 0.5);
        transition: all 0.3s;
    `;

  document.body.appendChild(scrollBtn);

  // Show/hide on scroll
  window.addEventListener("scroll", function () {
    if (window.pageYOffset > 300) {
      scrollBtn.style.display = "block";
    } else {
      scrollBtn.style.display = "none";
    }
  });

  // Scroll to top on click
  scrollBtn.addEventListener("click", scrollToTop);
});

// Console welcome message
console.log(
  "%c🎮 FUFUFAFAGAMES",
  "color: #00D9FF; font-size: 24px; font-weight: bold;"
);
console.log(
  "%cWelcome to the browser game platform!",
  "color: #00D9FF; font-size: 14px;"
);
console.log(
  "%cBuilt with Node.js + Express + EJS",
  "color: #a0a0a0; font-size: 12px;"
);

// Game Player Controls
document.addEventListener("DOMContentLoaded", function () {
  const gameContainer = document.getElementById("game-container");
  const btnFullscreen = document.getElementById("btn-fullscreen");
  const btnLandscape = document.getElementById("btn-landscape");
  const btnPortrait = document.getElementById("btn-portrait");

  if (gameContainer && btnFullscreen) {
    // Fullscreen toggle
    btnFullscreen.addEventListener("click", function () {
      if (!document.fullscreenElement) {
        if (gameContainer.requestFullscreen) {
          gameContainer.requestFullscreen();
        } else if (gameContainer.webkitRequestFullscreen) { /* Safari */
          gameContainer.webkitRequestFullscreen();
        } else if (gameContainer.msRequestFullscreen) { /* IE11 */
          gameContainer.msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    });

    // Aspect Ratio Toggles
    if (btnLandscape && btnPortrait) {
      btnLandscape.addEventListener("click", function () {
        gameContainer.classList.remove("portrait");
        gameContainer.classList.add("landscape");
        btnLandscape.classList.add("active");
        btnPortrait.classList.remove("active");
      });

      btnPortrait.addEventListener("click", function () {
        gameContainer.classList.remove("landscape");
        gameContainer.classList.add("portrait");
        btnPortrait.classList.add("active");
        btnLandscape.classList.remove("active");
      });
    }
  }
});


document.addEventListener('DOMContentLoaded', () => {
    // 0. Setup Marquee (Duplicate content for infinite loop)
    const categoryTrack = document.getElementById('categoryTrack');
    if (categoryTrack) {
        // Clone children to ensure seamless loop (x2)
        // Note: We use cloneNode to avoid destroying original references if any,
        // but innerHTML is easier for bulk duplication.
        // Since we bind events later, innerHTML is fine.
        categoryTrack.innerHTML += categoryTrack.innerHTML;
    }
});

function createGameCard(game) {
    // Safe check for optional data
    const thumbnailUrl = game.thumbnail_url || 'https://via.placeholder.com/400x225/1a1a2e/ffffff?text=No+Image';
    const authorName = game.author_name || 'Anonymous';
    const rating = parseFloat(game.avg_rating) || 0;
    const priceDisplay = (game.price_type === 'free' || !game.price_type) ? '<span class="text-success fw-bold small">Free</span>' : `<span class="text-info fw-bold small">$${parseFloat(game.price).toLocaleString('id-ID')}</span>`;
    
    return `
    <div class="col-6 col-md-4 col-lg-3 game-item">
        <div class="game-card h-100" data-video-url="${game.video_url || ''}" 
            onclick="window.location.href='/games/${game.slug}'" 
            style="cursor:pointer;text-decoration:none;color:inherit;position:relative">
            
            <div class="game-card-img-wrapper">
                <img src="${thumbnailUrl}" alt="${game.title}" loading="lazy">
            </div>
            
            <div class="game-card-overlay">
                <span class="btn btn-info rounded-pill btn-sm fw-bold">
                    <i class="fas fa-play me-1"></i> Play Now
                </span>
            </div>
            
            <div class="game-badge">
                <span class="badge bg-dark border border-aqua text-aqua rounded-pill me-1 d-block">${game.category || 'Uncategorized'}</span>
            </div>
            
            <div class="game-card-body">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h6 class="game-title text-white text-truncate mb-0 flex-grow-1 pe-2" title="${game.title}">
                        ${game.title}
                    </h6>
                </div>
                
                <div class="text-warning small d-flex align-items-center flex-shrink-0">
                    <i class="fas fa-star me-1"></i>
                    <span>${rating}</span>
                </div>
                
                <p class="game-meta mb-1 text-truncate">
                    <i class="fas fa-user-circle me-1"></i> ${authorName}
                </p>
                
                <div class="mt-auto d-flex justify-content-between align-items-center border-top border-white-10 pt-1" style="border-color: rgba(255,255,255,0.1) !important">
                    <small class="text-white-50">${game.play_count} plays</small>
                    ${priceDisplay}
                </div>
            </div>
        </div>
    </div>
    `;
}

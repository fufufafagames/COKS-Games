document.addEventListener('DOMContentLoaded', function() {
    const gameCards = document.querySelectorAll('.game-card');
    let hoverTimeout;
    let popup = null;

    // Create popup element
    function createPopup() {
        if (document.getElementById('video-popup')) return document.getElementById('video-popup');
        
        const p = document.createElement('div');
        p.id = 'video-popup';
        p.className = 'video-popup';
        p.style.display = 'none';
        p.innerHTML = `
            <div class="video-popup-content">
                <iframe frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
            </div>
        `;
        document.body.appendChild(p);
        return p;
    }

    popup = createPopup();
    const iframe = popup.querySelector('iframe');

    gameCards.forEach(card => {
        card.addEventListener('mouseenter', function(e) {
            const videoUrl = this.getAttribute('data-video-url');
            if (!videoUrl) return;

            // Clear any existing timeout
            if (hoverTimeout) clearTimeout(hoverTimeout);

            // Delay showing popup slightly to avoid flickering
            hoverTimeout = setTimeout(() => {
                const rect = this.getBoundingClientRect();
                
                // Construct autoplay URL
                let src = videoUrl;
                if (src.includes('youtube.com') || src.includes('youtu.be')) {
                    if (src.includes('watch?v=')) {
                        src = src.replace('watch?v=', 'embed/');
                    } else if (src.includes('youtu.be/')) {
                        src = src.replace('youtu.be/', 'youtube.com/embed/');
                    }
                    src += (src.includes('?') ? '&' : '?') + 'autoplay=1&mute=1&controls=0&loop=1';
                }

                iframe.src = src;
                
                // Position popup
                // Calculate position to center it over the card or slightly offset
                // Let's make it slightly larger than the card and centered
                const popupWidth = 320; // Medium size
                const popupHeight = 180;
                
                let top = rect.top + window.scrollY - (popupHeight - rect.height) / 2;
                let left = rect.left + window.scrollX - (popupWidth - rect.width) / 2;

                // Boundary checks
                if (left < 10) left = 10;
                if (left + popupWidth > window.innerWidth - 10) left = window.innerWidth - popupWidth - 10;

                popup.style.top = `${top}px`;
                popup.style.left = `${left}px`;
                popup.style.width = `${popupWidth}px`;
                popup.style.height = `${popupHeight}px`;
                popup.style.display = 'block';
                popup.classList.add('active');

            }, 300); // 300ms delay
        });

        card.addEventListener('mouseleave', function() {
            if (hoverTimeout) clearTimeout(hoverTimeout);
            
            popup.classList.remove('active');
            popup.style.display = 'none';
            iframe.src = ''; // Stop video
        });
    });
});

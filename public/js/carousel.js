"use strict";

document.addEventListener('DOMContentLoaded', function() {
    const next = document.querySelector(".next");
    const prev = document.querySelector(".prev");
    const slide = document.querySelector(".slide");
    
    if (!next || !prev || !slide) return;

    let videoTimer = null;
    let currentVideoFrame = null;

    // Function to reset video state
    function resetVideoState() {
        if (videoTimer) clearTimeout(videoTimer);
        
        // Hide any active videos and show background images
        const items = document.querySelectorAll(".item");
        items.forEach(item => {
            const videoContainer = item.querySelector(".video-bg-container");
            const iframe = item.querySelector("iframe");
            if (videoContainer) videoContainer.style.display = "none";
            if (iframe) iframe.src = ""; // Stop video
            item.style.backgroundImage = ""; // Restore background image if it was hidden (though we overlay video usually)
        });
    }

    // Function to start video timer for the active item (2nd item in the list is usually the main one in this carousel logic)
    // Wait, looking at the CSS/HTML structure of this specific carousel type (often 1st or 2nd item is active).
    // Standard logic for this "slide" carousel: 
    // items[0] and items[1] are often visible. Let's assume items[1] is the "main" one or items[0] depending on CSS.
    // Based on previous `moveNext` appending items[0], items[1] becomes items[0].
    // Let's target the *second* item (index 1) as the "active" one usually in this specific design, 
    // OR if it's a simple slider, index 0.
    // Let's assume index 1 (the one that expands) for now, or index 0 if it's the only one.
    // Actually, usually in this "expanding cards" carousel, the first one (index 0) or second (index 1) is the big one.
    // Let's try index 1 as the target for autoplay.
    
    function startVideoTimer() {
        resetVideoState();

        const items = document.querySelectorAll(".item");
        if (items.length < 2) return; 
        
        // Target the second item (index 1) which is usually the "active/expanded" one in this layout
        const activeItem = items[1]; 
        const videoUrl = activeItem.getAttribute("data-video-url");

        if (videoUrl) {
            videoTimer = setTimeout(() => {
                const videoContainer = activeItem.querySelector(".video-bg-container");
                const iframe = activeItem.querySelector("iframe");
                
                if (videoContainer && iframe) {
                    // Construct autoplay URL
                    let src = videoUrl;
                    if (src.includes('youtube.com') || src.includes('youtu.be')) {
                         // Ensure embed format
                        if (src.includes('watch?v=')) {
                            src = src.replace('watch?v=', 'embed/');
                        } else if (src.includes('youtu.be/')) {
                            src = src.replace('youtu.be/', 'youtube.com/embed/');
                        }
                        // Add params
                        src += (src.includes('?') ? '&' : '?') + 'autoplay=1&mute=1&controls=0&loop=1&playlist=' + src.split('/').pop();
                    }
                    
                    iframe.src = src;
                    videoContainer.style.display = "block";
                    videoContainer.classList.add("fade-in");
                }
            }, 5000); // 5 seconds delay
        }
    }

    function moveNext() {
        let items = document.querySelectorAll(".item");
        slide.appendChild(items[0]);
        startVideoTimer();
    }

    function movePrev() {
        let items = document.querySelectorAll(".item");
        slide.prepend(items[items.length - 1]);
        startVideoTimer();
    }

    next.addEventListener("click", moveNext);
    prev.addEventListener("click", movePrev);

    // Start timer initially
    startVideoTimer();
});

"use strict";

document.addEventListener('DOMContentLoaded', function() {
    const next = document.querySelector(".next");
    const prev = document.querySelector(".prev");
    const slide = document.querySelector(".slide");
    
    if (!next || !prev || !slide) return;

    let videoTimer = null;
    let player = null;
    let currentLocalVideo = null;

    // Load YouTube IFrame API
    if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    // Function to reset video state
    function resetVideoState() {
        if (videoTimer) clearTimeout(videoTimer);
        
        // Reset current local video reference
        currentLocalVideo = null;
        
        // Hide any active videos
        const items = document.querySelectorAll(".item");
        items.forEach(item => {
            const videoContainer = item.querySelector(".video-bg-container");
            const iframe = item.querySelector("iframe.youtube-frame");
            const localVideo = item.querySelector("video.local-video");
            const spinner = item.querySelector(".video-spinner");
            const thumbBg = item.querySelector(".thumb-bg");
            const volumeBtn = item.querySelector(".volume-toggle");

            // Show thumbnail back
            if (thumbBg) thumbBg.style.opacity = "1";

            if (videoContainer) {
                videoContainer.style.opacity = "0";
                videoContainer.style.zIndex = "-1";
                setTimeout(() => {
                    videoContainer.style.display = "none";
                }, 300);
            }
            
            if (spinner) {
                spinner.style.display = "none";
            }

            if (volumeBtn) {
                volumeBtn.style.display = "none";
                volumeBtn.classList.remove("active");
                const icon = volumeBtn.querySelector("i");
                if (icon) icon.className = "fas fa-volume-mute";
            }
            
            if (iframe) {
                iframe.style.display = "none";
                const src = iframe.src;
                iframe.src = ''; // Stop YouTube video completely
                iframe.src = src;
            }

            if (localVideo) {
                localVideo.dataset.isActive = "false";
                localVideo.style.display = "none";
                localVideo.pause();
                localVideo.currentTime = 0;
                localVideo.oncanplay = null;
                localVideo.onerror = null;
                localVideo.onended = null;
                localVideo.removeAttribute('src');
                localVideo.load();
            }
        });

        if (player) {
            try {
                player.destroy();
            } catch(e) { 
                console.log("Player destroy error", e); 
            }
            player = null;
        }
    }

    function onPlayerStateChange(event) {
        // YT.PlayerState.ENDED = 0
        if (event.data === 0) {
            handleVideoEnd();
        }
    }

    function handleVideoEnd() {
        const items = document.querySelectorAll(".item");
        // Priority 2: If only 1 item, loop.
        if (items.length <= 1) {
            const activeItem = items[0];
            const localVideo = activeItem.querySelector("video.local-video");
            
            if (localVideo && localVideo.style.display !== "none") {
                localVideo.currentTime = 0;
                localVideo.play();
            } else if (player && player.playVideo) {
                player.seekTo(0);
                player.playVideo();
            }
        } else {
            // Priority 1: Move to next slide
            moveNext();
        }
    }

    function startVideoTimer() {
        resetVideoState();

        const items = document.querySelectorAll(".item");
        if (items.length < 1) return; 
        
        // Target the second item (index 1) which is the "active" one in this layout
        const activeItem = items.length > 1 ? items[1] : items[0]; 
        const videoUrl = activeItem.getAttribute("data-video-url");
        
        console.log("Start timer for:", videoUrl);

        if (videoUrl && videoUrl.trim() !== '') {
            // Wait 3 seconds before starting the video process
            videoTimer = setTimeout(() => {
                console.log("Timer triggered for:", videoUrl);
                const videoContainer = activeItem.querySelector(".video-bg-container");
                const iframe = activeItem.querySelector("iframe.youtube-frame");
                const localVideo = activeItem.querySelector("video.local-video");
                const spinner = activeItem.querySelector(".video-spinner");
                const thumbBg = activeItem.querySelector(".thumb-bg");
                const volumeBtn = activeItem.querySelector(".volume-toggle");
                
                if (videoContainer) {
                    // Show spinner first
                    if (spinner) {
                        spinner.style.display = "flex";
                        console.log("Spinner shown");
                    }

                    // Prepare video container
                    videoContainer.style.display = "block";
                    videoContainer.style.opacity = "0";
                    videoContainer.style.zIndex = "2";

                    // Check if YouTube
                    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
                        console.log("Detected YouTube video");
                        if (iframe) {
                            let videoId = "";

                            if (videoUrl.includes('watch?v=')) {
                                videoId = videoUrl.split('watch?v=')[1].split('&')[0];
                            } else if (videoUrl.includes('embed/')) {
                                videoId = videoUrl.split('embed/')[1].split('?')[0];
                            } else if (videoUrl.includes('youtu.be/')) {
                                videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
                            }

                            if (videoId) {
                                const origin = window.location.origin;
                                // Start MUTED for autoplay to work
                                const src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1&mute=1&controls=0&rel=0&modestbranding=1&origin=${origin}`;
                                
                                iframe.src = src;
                                iframe.id = "yt-player-" + Date.now(); 
                                iframe.style.display = "block";

                                iframe.onload = function() {
                                    function initPlayer() {
                                        if (window.YT && window.YT.Player) {
                                            player = new YT.Player(iframe.id, {
                                                events: {
                                                    'onReady': function(event) {
                                                        console.log("YouTube player ready");
                                                        
                                                        // Hide spinner
                                                        if (spinner) spinner.style.display = "none";
                                                        
                                                        // Fade out thumbnail
                                                        if (thumbBg) {
                                                            thumbBg.style.transition = "opacity 0.5s ease";
                                                            thumbBg.style.opacity = "0";
                                                        }
                                                        
                                                        // Fade in video
                                                        videoContainer.style.transition = "opacity 0.5s ease";
                                                        videoContainer.style.opacity = "1";
                                                        
                                                        // Show volume button
                                                        if (volumeBtn) {
                                                            volumeBtn.style.display = "flex";
                                                            volumeBtn.classList.add("active");
                                                            
                                                            // Set initial icon based on mute state
                                                            const icon = volumeBtn.querySelector("i");
                                                            if (icon) icon.className = "fas fa-volume-mute";
                                                            
                                                            // Volume toggle handler
                                                            volumeBtn.onclick = (e) => {
                                                                e.stopPropagation();
                                                                const icon = volumeBtn.querySelector("i");
                                                                if (player.isMuted()) {
                                                                    player.unMute();
                                                                    player.setVolume(70);
                                                                    if (icon) icon.className = "fas fa-volume-up";
                                                                    console.log("YouTube unmuted");
                                                                } else {
                                                                    player.mute();
                                                                    if (icon) icon.className = "fas fa-volume-mute";
                                                                    console.log("YouTube muted");
                                                                }
                                                            };
                                                        }

                                                        // Play video (muted for autoplay)
                                                        event.target.playVideo();
                                                    },
                                                    'onStateChange': onPlayerStateChange,
                                                    'onError': function(event) {
                                                        console.error("YouTube player error:", event.data);
                                                        if (spinner) spinner.style.display = "none";
                                                    }
                                                }
                                            });
                                        }
                                    }

                                    if (window.YT && window.YT.Player) {
                                        initPlayer();
                                    } else {
                                        const checkYT = setInterval(() => {
                                            if (window.YT && window.YT.Player) {
                                                clearInterval(checkYT);
                                                initPlayer();
                                            }
                                        }, 100);
                                        
                                        setTimeout(() => {
                                            clearInterval(checkYT);
                                            if (spinner) spinner.style.display = "none";
                                            console.error("YouTube API load timeout");
                                        }, 10000);
                                    }
                                };
                            }
                        }
                    } else {
                        // Local Video
                        console.log("Detected Local video");
                        if (localVideo) {
                            localVideo.dataset.isActive = "true";
                            currentLocalVideo = localVideo;

                            const timestampedUrl = videoUrl + "?t=" + new Date().getTime();
                            localVideo.src = timestampedUrl;
                            localVideo.style.display = "block";
                            
                            // START MUTED for autoplay (required by browsers)
                            localVideo.muted = true;
                            localVideo.volume = 0.7;
                            
                            const playLocalVideo = () => {
                                if (localVideo.dataset.isActive !== "true") {
                                    console.log("Video no longer active, skipping play");
                                    return;
                                }

                                console.log("Can play local video - Fading in");
                                
                                // Hide spinner
                                if (spinner) spinner.style.display = "none";
                                
                                // Fade out thumbnail
                                if (thumbBg) {
                                    thumbBg.style.transition = "opacity 0.5s ease";
                                    thumbBg.style.opacity = "0";
                                }
                                
                                // Fade in video container
                                videoContainer.style.transition = "opacity 0.5s ease";
                                videoContainer.style.opacity = "1";
                                
                                // Show volume button
                                if (volumeBtn) {
                                    volumeBtn.style.display = "flex";
                                    volumeBtn.classList.add("active");
                                    
                                    // Volume toggle handler
                                    volumeBtn.onclick = (e) => {
                                        e.stopPropagation();
                                        const icon = volumeBtn.querySelector("i");
                                        if (localVideo.muted) {
                                            localVideo.muted = false;
                                            if (icon) icon.className = "fas fa-volume-up";
                                            console.log("Local video unmuted, volume:", localVideo.volume);
                                        } else {
                                            localVideo.muted = true;
                                            if (icon) icon.className = "fas fa-volume-mute";
                                            console.log("Local video muted");
                                        }
                                    };
                                }

                                // Play video (muted for autoplay)
                                localVideo.play()
                                    .then(() => {
                                        console.log("Video playing successfully");
                                        
                                        // AUTO UNMUTE after 500ms (browsers allow this after play starts)
                                        setTimeout(() => {
                                            if (localVideo.dataset.isActive === "true" && !localVideo.paused) {
                                                localVideo.muted = false;
                                                console.log("Auto-unmuted! Volume:", localVideo.volume);
                                                
                                                // Update icon to show audio is ON
                                                if (volumeBtn) {
                                                    const icon = volumeBtn.querySelector("i");
                                                    if (icon) icon.className = "fas fa-volume-up";
                                                }
                                            }
                                        }, 500);
                                    })
                                    .catch(e => {
                                        console.error("Local video play error:", e);
                                        if (spinner) spinner.style.display = "none";
                                    });
                            };
                            
                            localVideo.onerror = (e) => {
                                if (localVideo.dataset.isActive !== "true") return;
                                console.error("Local video error:", localVideo.error, "URL:", timestampedUrl);
                                if (spinner) spinner.style.display = "none";
                            };

                            console.log("Video readyState:", localVideo.readyState);

                            if (localVideo.readyState >= 3) {
                                playLocalVideo();
                            } else {
                                localVideo.oncanplay = playLocalVideo;
                                localVideo.load();
                            }
                            
                            localVideo.onended = handleVideoEnd;
                        }
                    }
                }
            }, 3000); // 3 seconds delay
        } else {
            console.log("No video URL found for this slide");
        }
    }

    function moveNext() {
        let items = document.querySelectorAll(".item");
        if (items.length > 1) {
            slide.appendChild(items[0]);
        }
        startVideoTimer();
    }

    function movePrev() {
        let items = document.querySelectorAll(".item");
        if (items.length > 1) {
            slide.prepend(items[items.length - 1]);
        }
        startVideoTimer();
    }

    next.addEventListener("click", moveNext);
    prev.addEventListener("click", movePrev);

    // Start timer initially
    startVideoTimer();
    
    console.log("Carousel initialized with audio support");
});

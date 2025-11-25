/**
 * Upload Handler
 * Handles image resizing, preview, and AJAX upload with progress
 */

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('game-form');
    const thumbnailInput = document.getElementById('thumbnail');
    const thumbnailPreview = document.getElementById('thumbnail-preview'); // Need to add this ID to img
    const progressBarContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    
    // Configuration
    const MAX_WIDTH = 800; // Max width for resized image
    const JPEG_QUALITY = 0.8;

    // Store resized blob
    let resizedThumbnailBlob = null;

    if (thumbnailInput) {
        thumbnailInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;

            // Preview immediately
            const reader = new FileReader();
            reader.onload = function(e) {
                // Update preview if exists, or create one
                let img = document.querySelector('.thumbnail-preview-img');
                if (!img) {
                    // If no existing preview image, we might need to insert one
                    // But for now let's assume the EJS has a placeholder or we update the src
                    // If the user is in "create" mode, there might not be an img tag yet.
                    // We'll handle the UI update in the EJS, this script assumes specific IDs/classes
                }
                
                // Resize logic
                const image = new Image();
                image.src = e.target.result;
                image.onload = function() {
                    const canvas = document.createElement('canvas');
                    let width = image.width;
                    let height = image.height;

                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(image, 0, 0, width, height);

                    // Show resized preview
                    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
                    if (thumbnailPreview) {
                        thumbnailPreview.src = dataUrl;
                        thumbnailPreview.style.display = 'block';
                    }

                    // Convert to blob for upload
                    canvas.toBlob(function(blob) {
                        resizedThumbnailBlob = blob;
                        console.log(`Image resized: ${Math.round(blob.size/1024)}KB`);
                    }, 'image/jpeg', JPEG_QUALITY);
                };
            };
            reader.readAsDataURL(file);
        });
    }

    if (form) {
        form.addEventListener('submit', function(e) {
            // Only hijack submit if we have a file to upload or want to show progress
            // For simplicity, we'll always hijack to show progress for any upload
            
            // If it's a GET request (search), don't hijack
            if (form.method.toUpperCase() === 'GET') return;

            e.preventDefault();

            const formData = new FormData(form);
            
            // Replace thumbnail with resized version if available
            if (resizedThumbnailBlob) {
                formData.set('thumbnail', resizedThumbnailBlob, 'thumbnail.jpg');
            }

            const xhr = new XMLHttpRequest();
            xhr.open(form.method, form.action, true);

            // Progress handler
            xhr.upload.onprogress = function(e) {
                if (e.lengthComputable) {
                    const percentComplete = Math.round((e.loaded / e.total) * 100);
                    if (progressBar) {
                        progressBar.style.width = percentComplete + '%';
                        progressBar.setAttribute('aria-valuenow', percentComplete);
                    }
                    if (progressText) {
                        if (percentComplete === 100) {
                            progressText.textContent = 'Processing...';
                        } else {
                            progressText.textContent = percentComplete + '%';
                        }
                    }
                    if (progressBarContainer) {
                        progressBarContainer.style.display = 'block';
                    }
                }
            };

            xhr.onload = function() {
                if (xhr.status >= 200 && xhr.status < 300) {
                    // Success - usually a redirect
                    // Since we can't easily follow redirects with XHR outcome in the same way as browser,
                    // we check if the responseURL is different or if the response is HTML
                    window.location.href = xhr.responseURL || '/games';
                } else {
                    // Error
                    alert('Upload failed. Please try again.');
                    console.error('Upload error:', xhr.statusText);
                }
            };

            xhr.onerror = function() {
                alert('Upload failed. Network error.');
            };

            xhr.send(formData);
        });
    }
});

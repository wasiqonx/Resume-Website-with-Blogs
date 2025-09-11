/**
 * Blog Utilities
 * Contains shared functions for blog functionality
 */

// XMR Address utility
const x='8894XGTTAgrQhjJkj4DF4tYVLZbtLqZCWVrhSp664Du5PR2aiy7Lqkm8sdRPDeS1LoaWKEhHTBf8Q73MqxbZK3jWKkMW3Y7';

function copyXMRAddress() {
    navigator.clipboard.writeText(x).then(() => alert('XMR address copied!')).catch(() => alert('XMR address copied!'));
}

// Clipboard utility functions
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            alert('Link copied to clipboard!');
        }).catch(() => {
            fallbackCopyTextToClipboard(text);
        });
    } else {
        fallbackCopyTextToClipboard(text);
    }
}

function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand('copy');
        alert('Link copied to clipboard!');
    } catch (err) {
        alert('Could not copy link');
    }
    document.body.removeChild(textArea);
}

// Share functionality
function shareContent(title, url) {
    if (navigator.share) {
        navigator.share({
            title: title,
            url: url
        }).catch(err => {
            console.log('Error sharing:', err);
            copyToClipboard(url);
        });
    } else {
        copyToClipboard(url);
    }
}

// Template loading utility
async function loadTemplate(templatePath) {
    try {
        const response = await fetch(templatePath);
        if (!response.ok) {
            throw new Error(`Failed to load template: ${response.statusText}`);
        }
        return await response.text();
    } catch (error) {
        console.error('Template loading error:', error);
        return null;
    }
}

// Template interpolation utility
function interpolateTemplate(template, data) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return data[key] !== undefined ? data[key] : '';
    });
}

// Video ID extraction helpers
function extractYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function extractVimeoId(url) {
    const regExp = /vimeo\.com\/([0-9]+)/;
    const match = url.match(regExp);
    return match ? match[1] : null;
}

// Media HTML generation
function generateMediaHTML(blog) {
    if (blog.media_type === 'video' && blog.video_url) {
        if (blog.video_url.includes('youtube.com') || blog.video_url.includes('youtu.be')) {
            const videoId = extractYouTubeId(blog.video_url);
            return `
                <div class="blog-featured-video">
                    <iframe 
                        width="100%" 
                        height="400" 
                        src="https://www.youtube.com/embed/${videoId}" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen>
                    </iframe>
                </div>
            `;
        } else if (blog.video_url.includes('vimeo.com')) {
            const videoId = extractVimeoId(blog.video_url);
            return `
                <div class="blog-featured-video">
                    <iframe 
                        width="100%" 
                        height="400" 
                        src="https://player.vimeo.com/video/${videoId}" 
                        frameborder="0" 
                        allow="autoplay; fullscreen; picture-in-picture" 
                        allowfullscreen>
                    </iframe>
                </div>
            `;
        } else {
            return `
                <div class="blog-featured-video">
                    <video width="100%" height="400" controls>
                        <source src="${blog.video_url}" type="video/mp4">
                        <source src="${blog.video_url}" type="video/webm">
                        Your browser does not support the video tag.
                    </video>
                </div>
            `;
        }
    } else if (blog.image_url) {
        return `
            <div class="blog-featured-image">
                <img src="${blog.image_url}" alt="${blog.title}">
            </div>
        `;
    }
    return '';
}

// Initialize share buttons
function initializeShareButtons() {
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('share-button') || e.target.closest('.share-button')) {
            const button = e.target.classList.contains('share-button') ? e.target : e.target.closest('.share-button');
            const title = button.dataset.title;
            const url = window.location.origin + button.dataset.url;
            shareContent(title, url);
        }
        
        if (e.target.classList.contains('share-post-button') || e.target.closest('.share-post-button')) {
            const button = e.target.classList.contains('share-post-button') ? e.target : e.target.closest('.share-post-button');
            const title = button.dataset.title;
            const url = button.dataset.url || window.location.href;
            shareContent(title, url);
        }
    });
}

// Make functions globally available
window.copyXMRAddress = copyXMRAddress;
window.copyToClipboard = copyToClipboard;
window.shareContent = shareContent;
window.loadTemplate = loadTemplate;
window.interpolateTemplate = interpolateTemplate;
window.generateMediaHTML = generateMediaHTML;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeShareButtons();
});
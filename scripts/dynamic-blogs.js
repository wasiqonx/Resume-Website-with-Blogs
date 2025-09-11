/**
 * Dynamic Blog Loader for blogs.html
 * Loads blogs from the API and creates working "Read More" links
 * Enhanced with SEO features and structured data
 * Refactored to use external templates and CSS
 */
class DynamicBlogLoader {
    constructor() {
        this.blogsContainer = document.querySelector('.blog-grid') || document.querySelector('.news-container');
        this.blogCardTemplate = null;
        this.blogPostTemplate = null;
        console.log('🔧 DynamicBlogLoader initialized, container:', this.blogsContainer);
        this.initializeTemplates();
    }

    async initializeTemplates() {
        try {
            this.blogCardTemplate = await loadTemplate('/templates/blog-card.html');
            this.blogPostTemplate = await loadTemplate('/templates/blog-post.html');
            console.log('✅ Templates loaded successfully');
            this.loadDynamicBlogs();
            this.addStructuredDataToPage();
        } catch (error) {
            console.error('❌ Error loading templates:', error);
            this.loadDynamicBlogs(); // Fallback to inline templates
            this.addStructuredDataToPage();
        }
    }

    async loadDynamicBlogs() {
        // Check if we're on the blogs page and have the container
        if (!this.blogsContainer) {
            console.log('❌ No blogs container found');
            return;
        }

        console.log('📡 Loading blogs from API...');
        try {
            const response = await fetch('/api/blogs');
            if (response.ok) {
                const blogs = await response.json();
                console.log('✅ Loaded blogs:', blogs.length, 'blogs found');
                this.renderBlogs(blogs);
                this.addBlogListStructuredData(blogs);
            } else {
                console.error('❌ Failed to load blogs:', response.statusText);
                this.showError('Unable to load blog posts. Please try again later.');
            }
        } catch (error) {
            console.error('❌ Error loading blogs:', error);
            this.showError('Error loading blog posts. Please check your connection.');
        }
    }

    renderBlogs(blogs) {
        if (blogs.length === 0) {
            this.blogsContainer.innerHTML = `
                <div class="no-results">
                    <h3>No articles found</h3>
                    <p>Check back soon for new content!</p>
                </div>
            `;
            return;
        }

        console.log('🎨 Rendering', blogs.length, 'blogs');
        
        if (this.blogCardTemplate) {
            // Use template-based rendering
            this.blogsContainer.innerHTML = blogs.map((blog, index) => {
                const readTime = blog.read_time || blog.readTime || Math.ceil((blog.content || '').length / 200) || 2;
                const publishDate = new Date(blog.created_at || blog.dateCreated).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                
                const excerpt = blog.description || 
                               (blog.content ? blog.content.substring(0, 150) + '...' : 'No preview available');
                
                const templateData = {
                    category: blog.category || 'General',
                    readTime: readTime,
                    title: blog.title,
                    excerpt: excerpt,
                    publishDate: publishDate,
                    slug: blog.slug,
                    datePublished: new Date(blog.created_at || blog.dateCreated).toISOString()
                };
                
                const renderedCard = interpolateTemplate(this.blogCardTemplate, templateData);
                const div = document.createElement('div');
                div.innerHTML = renderedCard;
                div.firstElementChild.style.animationDelay = `${index * 0.1}s`;
                return div.innerHTML;
            }).join('');
        } else {
            // Fallback to simplified inline rendering
            this.blogsContainer.innerHTML = this.renderBlogsFallback(blogs);
        }
        
        console.log('✅ Blogs rendered successfully');
        
        // Add click tracking for analytics
        this.addClickTracking();
    }

    renderBlogsFallback(blogs) {
        return blogs.map((blog, index) => {
            const readTime = blog.read_time || blog.readTime || Math.ceil((blog.content || '').length / 200) || 2;
            const publishDate = new Date(blog.created_at || blog.dateCreated).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            const excerpt = blog.description || 
                           (blog.content ? blog.content.substring(0, 150) + '...' : 'No preview available');
            
            return `
                <div class="blog-card" style="animation-delay: ${index * 0.1}s;">
                    <div class="blog-meta">
                        <span class="blog-category">${blog.category || 'General'}</span>
                        <span>${readTime} min read</span>
                    </div>
                    
                    <h3>${blog.title}</h3>
                    <p>${excerpt}</p>
                    
                    <div class="blog-card-footer">
                        <span class="blog-date">${publishDate}</span>
                        <div class="blog-actions">
                            <a href="/blog/${blog.slug}" class="read-more-link">Read More →</a>
                            <button class="share-button" data-title="${blog.title}" data-url="/blog/${blog.slug}">Share</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    addClickTracking() {
        // Add event listeners for analytics tracking
        document.querySelectorAll('.blog-card a[href^="/blog/"]').forEach(link => {
            link.addEventListener('click', (e) => {
                const slug = e.target.getAttribute('href').replace('/blog/', '');
                console.log('📊 Blog link clicked:', slug);
                // You can add analytics tracking here
            });
        });

        document.querySelectorAll('.blog-card button.share-button').forEach(button => {
            button.addEventListener('click', (e) => {
                console.log('📊 Share button clicked');
                // You can add analytics tracking here
            });
        });
    }

    addBlogListStructuredData(blogs) {
        // Add structured data for the blog listing page
        const structuredData = {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "itemListElement": blogs.map((blog, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "item": {
                    "@type": "BlogPosting",
                    "@id": `/blog/${blog.slug}`,
                    "url": `/blog/${blog.slug}`,
                    "headline": blog.title,
                    "description": blog.description,
                    "image": blog.image_url || 'https://via.placeholder.com/800x400',
                    "datePublished": new Date(blog.created_at).toISOString(),
                    "author": {
                        "@type": "Person",
                        "name": "Wasiq Syed"
                    },
                    "publisher": {
                        "@type": "Organization",
                        "name": "Wasiq Syed"
                    },
                    "articleSection": blog.category,
                    "keywords": Array.isArray(blog.tags) ? blog.tags.join(', ') : blog.tags
                }
            }))
        };

        // Add the structured data to the page
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(structuredData, null, 2);
        document.head.appendChild(script);
        
        console.log('✅ Blog list structured data added');
    }

    addStructuredDataToPage() {
        // Add breadcrumb structured data
        const breadcrumbData = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Home",
                    "item": "/"
                },
                {
                    "@type": "ListItem",
                    "position": 2,
                    "name": "Blogs",
                    "item": "/blogs.html"
                }
            ]
        };

        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(breadcrumbData, null, 2);
        document.head.appendChild(script);
        
        console.log('✅ Breadcrumb structured data added');
    }

    formatTags(tags) {
        if (!tags) return '';
        if (Array.isArray(tags)) return tags;
        if (typeof tags === 'string') return tags.split(',').map(tag => tag.trim());
        return '';
    }

    formatDate(dateString) {
        if (!dateString) return 'Recent';
        
        try {
            return new Date(dateString).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        } catch (error) {
            return 'Recent';
        }
    }

    showError(message) {
        this.blogsContainer.innerHTML = `
            <div class="error-message">
                <p>${message}</p>
                <button onclick="window.location.reload()" class="retry-button">Try Again</button>
            </div>
        `;
    }
}

/**
 * Load individual blog post in a new window
 * This function is called when "Read More" popup option is clicked
 * PRESERVED - All existing functionality maintained
 */
async function loadBlogPost(blogSlug) {
    console.log('🚀 loadBlogPost called with slug:', blogSlug);
    
    // Check if popup blocker might interfere
    let newWindow;
    try {
        // Try to open window immediately (user action context)
        newWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
        
        if (!newWindow) {
            alert('Please allow pop-ups for this site to read blog posts in new windows.');
            return;
        }
        
        console.log('✅ New window opened successfully');
        
        // Show loading state
        newWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Loading...</title>
                <link rel="stylesheet" href="/styles/blog-components.css">
            </head>
            <body>
                <div class="loading-state">Loading blog post...</div>
                <div class="loading-spinner"></div>
                <p>Please wait while we fetch the content.</p>
            </body>
            </html>
        `);

        console.log('📡 Fetching blog data for:', blogSlug);
        const response = await fetch(`/api/blogs/${blogSlug}`);
        if (!response.ok) {
            throw new Error(`Failed to load blog: ${response.statusText}`);
        }

        const blog = await response.json();
        console.log('✅ Blog data loaded:', blog.title);
        
        // Generate and display the blog content
        const blogHTML = generateBlogHTML(blog);
        newWindow.document.open();
        newWindow.document.write(blogHTML);
        newWindow.document.close();
        
        // Set proper title
        newWindow.document.title = blog.title + ' - Wasiq Syed';
        console.log('✅ Blog post loaded successfully in new window');
        
    } catch (error) {
        console.error('❌ Error loading blog post:', error);
        
        if (newWindow) {
            // Show error in the opened window
            newWindow.document.open();
            newWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Error Loading Blog</title>
                    <link rel="stylesheet" href="/styles/blog-components.css">
                </head>
                <body>
                    <div class="status-error">❌ Error loading blog post</div>
                    <p>${error.message}</p>
                    <button class="retry-button" onclick="window.close()">Close Window</button>
                </body>
                </html>
            `);
            newWindow.document.close();
        } else {
            // Fallback if window couldn't be opened
            alert(`Error loading blog: ${error.message}\n\nPlease check your popup blocker settings.`);
        }
    }
}

/**
 * Generate complete HTML for a blog post (for popup windows)
 * PRESERVED - All existing functionality maintained
 */
function generateBlogHTML(blog) {
    const baseUrl = window.location.origin;
    
    // Check if we have the blog post template loaded
    const loader = new DynamicBlogLoader();
    if (loader.blogPostTemplate) {
        return generateBlogHTMLFromTemplate(blog, baseUrl, loader.blogPostTemplate);
    }
    
    // Fallback to generating HTML programmatically
    return generateBlogHTMLFallback(blog, baseUrl);
}

function generateBlogHTMLFromTemplate(blog, baseUrl, template) {
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": blog.title,
        "description": blog.description,
        "author": {"@type": "Person", "name": "Wasiq Syed"},
        "publisher": {"@type": "Organization", "name": "Wasiq Syed"},
        "datePublished": blog.created_at || new Date().toISOString(),
        "mainEntityOfPage": {"@type": "WebPage", "@id": `${baseUrl}/blog/${blog.slug}`}
    };
    
    const templateData = {
        title: blog.title,
        description: blog.description,
        category: blog.category || 'General',
        publishDate: new Date(blog.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        readTime: blog.read_time || 5,
        content: blog.content,
        baseUrl: baseUrl,
        mediaHTML: generateMediaHTML(blog),
        currentUrl: window.location.href,
        structuredDataJSON: JSON.stringify(structuredData, null, 2)
    };
    
    return interpolateTemplate(template, templateData);
}

function generateBlogHTMLFallback(blog, baseUrl) {
    const mediaHTML = generateMediaHTML(blog);
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${blog.description}">
    <title>${blog.title} - Wasiq Syed</title>
    <link rel="stylesheet" href="${baseUrl}/styles/styles.css">
    <link rel="stylesheet" href="${baseUrl}/styles/blog-components.css">
</head>
<body>
    <div class="blog-post-container">
        <div class="blog-breadcrumb"><a href="/blogs.html" class="back-link">← Back to Blog</a></div>
        <div class="blog-category-badge"><span class="category-tag">${blog.category || 'General'}</span></div>
        <h1 class="blog-post-title">${blog.title}</h1>
        <div class="blog-post-meta">${new Date(blog.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} • ${blog.read_time || 5} min read</div>
        <div class="blog-featured-media">${mediaHTML}</div>
        <div class="blog-post-content">${blog.content}</div>
        <div class="blog-post-footer">
            <div class="blog-share-section">
                <button class="share-post-button" data-title="${blog.title}" data-url="${window.location.href}">Share</button>
            </div>
        </div>
    </div>
    <script src="${baseUrl}/scripts/blog-utils.js"></script>
</body>
</html>`;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, initializing DynamicBlogLoader...');
    new DynamicBlogLoader();
});

// Make functions available globally
window.loadBlogPost = loadBlogPost;
console.log('✅ Blog functions attached to window object');
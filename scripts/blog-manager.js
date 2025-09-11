// Blog Management System - JavaScript Version
class BlogManager {
    constructor() {
        this.blogs = [];
        this.editingId = null;
        this.form = document.getElementById('blog-form');
        this.blogsList = document.getElementById('blogs-list');
        this.isAuthenticated = false;
        
        // Initialize when authentication is ready
        this.initializeWhenReady();
    }

    /**
     * Wait for authentication to be ready before initializing
     * This ensures all dependencies are loaded before starting
     */
    async initializeWhenReady() {
        let attempts = 0;
        const maxAttempts = 100; // 10 seconds max wait
        
        while (attempts < maxAttempts) {
            if (typeof authManager !== 'undefined' && authManager.isAuthenticated()) {
                this.isAuthenticated = true;
                break;
            }
            
            // Also check for valid session data directly
            if (typeof authManager === 'undefined' && this.getAuthToken()) {
                this.isAuthenticated = true;
                break;
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!this.isAuthenticated) {
            return;
        }
        
        try {
            await this.loadBlogs();
            this.initializeEventListeners();
            this.renderBlogsList();
            this.addSecurityFeatures();
            this.loadDraft();
        } catch (error) {
            console.error('BlogManager initialization error:', error);
        }
    }

    /**
     * Generate unique ID for blogs
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Generate URL-friendly slug from title
     */
    generateSlug(title) {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }

    /**
     * Load blogs from server API
     */
    async loadBlogs() {
        try {
            const response = await fetch('/api/admin/blogs', {
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });
            
            if (response.ok) {
                this.blogs = await response.json();
            } else {
                console.error('Failed to load blogs:', response.statusText);
                this.blogs = [];
            }
        } catch (error) {
            console.error('Error loading blogs:', error);
            this.blogs = [];
        }
    }

    /**
     * Get authentication token from session storage
     */
    getAuthToken() {
        try {
            const encryptedSession = localStorage.getItem('auth_session');
            if (!encryptedSession) return null;
            
            const sessionData = JSON.parse(atob(encryptedSession));
            if (!sessionData || !sessionData.token) return null;
            
            // Check if token is expired
            if (sessionData.expiresAt && Date.now() > sessionData.expiresAt) {
                console.log('Token expired, clearing session');
                localStorage.removeItem('auth_session');
                return null;
            }
            
            return sessionData.token;
        } catch (error) {
            console.error('Error getting auth token:', error);
            localStorage.removeItem('auth_session');
            return null;
        }
    }

    /**
     * Initialize form event listeners
     */
    initializeEventListeners() {
        this.form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        
        const cancelBtn = document.getElementById('cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.cancelEdit());
        }
    }

    /**
     * Handle form submission for create/update
     */
    handleFormSubmit(e) {
        e.preventDefault();
        
        if (!this.verifyAuthentication()) return;
        
        const formData = new FormData(this.form);
        const mediaType = formData.get('mediaType') || 'image';
        
        const blogData = {
            title: CryptoUtils.sanitizeInput(formData.get('title'), { maxLength: 200 }),
            category: CryptoUtils.sanitizeInput(formData.get('category'), { maxLength: 50 }),
            description: CryptoUtils.sanitizeInput(formData.get('description'), { maxLength: 500 }),
            mediaType: mediaType,
            image: mediaType === 'image' ? (formData.get('image') || 'https://via.placeholder.com/800x400') : null,
            video: mediaType === 'video' ? formData.get('video') : null,
            content: CryptoUtils.sanitizeInput(formData.get('content'), { allowHTML: true, maxLength: 50000 }),
            tags: CryptoUtils.sanitizeInput(formData.get('tags'), { maxLength: 200 }),
            readTime: parseInt(formData.get('readTime')) || 5
        };

        // Validate data before submission
        const validationErrors = this.validateBlogData(blogData);
        if (validationErrors.length > 0) {
            this.showMessage('Validation errors: ' + validationErrors.join(', '), 'error');
            return;
        }

        if (this.editingId) {
            this.updateBlog(this.editingId, blogData);
        } else {
            this.createBlog(blogData);
        }
        
        // Clear draft after successful submission
        localStorage.removeItem('blog_draft');
    }

    /**
     * Create new blog post via API
     */
    async createBlog(data) {
        // Verify authentication before proceeding
        if (!this.verifyAuthentication()) {
            return;
        }
        
        try {
            const response = await fetch('/api/admin/blogs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({
                    title: data.title,
                    category: data.category,
                    description: data.description,
                    content: data.content,
                    image_url: (data.mediaType === 'image' && data.image) ? data.image : null,
                    tags: data.tags,
                    read_time: data.readTime
                })
            });

            if (response.ok) {
                const result = await response.json();
                this.form.reset();
                if (typeof captchaManager !== 'undefined') {
                    captchaManager.reset('blog-form');
                }
                await this.loadBlogs();
                this.renderBlogsList();
                this.showMessage('Blog post created successfully!', 'success');
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create blog');
            }
        } catch (error) {
            console.error('Error creating blog:', error);
            this.showMessage('Error creating blog: ' + error.message, 'error');
        }
    }

    /**
     * Update existing blog post via API
     */
    async updateBlog(id, data) {
        // Verify authentication before proceeding
        if (!this.verifyAuthentication()) {
            return;
        }
        
        try {
            const response = await fetch(`/api/admin/blogs/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({
                    title: data.title,
                    category: data.category,
                    description: data.description,
                    content: data.content,
                    image_url: (data.mediaType === 'image' && data.image) ? data.image : null,
                    tags: data.tags,
                    read_time: data.readTime
                })
            });

            if (response.ok) {
                const result = await response.json();
                this.form.reset();
                if (typeof captchaManager !== 'undefined') {
                    captchaManager.reset('blog-form');
                }
                this.editingId = null;
                document.getElementById('submit-btn').textContent = 'Create Blog Post';
                document.getElementById('cancel-btn').style.display = 'none';
                await this.loadBlogs();
                this.renderBlogsList();
                this.showMessage('Blog post updated successfully!', 'success');
            } else if (response.status === 401 || response.status === 403) {
                this.showMessage('Authentication failed. Please log in again.', 'error');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
                return;
            } else {
                let errorMsg = 'Failed to update blog';
                try {
                    const errorText = await response.text();
                    if (errorText) {
                        try {
                            const error = JSON.parse(errorText);
                            errorMsg = error.error || errorText;
                        } catch (parseError) {
                            errorMsg = errorText;
                        }
                    }
                } catch (readError) {
                    errorMsg = `Server error (${response.status}): ${response.statusText}`;
                }
                throw new Error(errorMsg);
            }
        } catch (error) {
            console.error('Error updating blog:', error);
            this.showMessage('Error updating blog: ' + error.message, 'error');
        }
    }

    /**
     * Delete blog post via API
     */
    async deleteBlog(id) {
        // Verify authentication before proceeding
        if (!this.verifyAuthentication()) {
            return;
        }
        
        // Find the blog to confirm it exists
        const blog = this.blogs.find(b => b.id == id);
        if (!blog) {
            alert('Blog post not found. Please refresh the page and try again.');
            return;
        }
        
        if (confirm(`Are you sure you want to delete "${blog.title}"?\n\nThis action cannot be undone.`)) {
            try {
                const token = this.getAuthToken();
                
                const response = await fetch(`/api/admin/blogs/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    await this.loadBlogs();
                    this.renderBlogsList();
                    this.showMessage('Blog post deleted successfully!', 'success');
                } else if (response.status === 401 || response.status === 403) {
                    this.showMessage('Authentication failed. Please log in again.', 'error');
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                    return;
                } else {
                    let errorMsg = 'Failed to delete blog';
                    try {
                        const errorText = await response.text();
                        if (errorText) {
                            try {
                                const errorJson = JSON.parse(errorText);
                                errorMsg = errorJson.error || errorText;
                            } catch (parseError) {
                                errorMsg = errorText;
                            }
                        }
                    } catch (readError) {
                        errorMsg = `Server error (${response.status}): ${response.statusText}`;
                    }
                    
                    throw new Error(errorMsg);
                }
            } catch (error) {
                console.error('Error deleting blog:', error);
                this.showMessage('Error deleting blog: ' + error.message, 'error');
            }
        }
    }

    /**
     * Edit existing blog post
     */
    editBlog(id) {
        const blog = this.blogs.find(b => b.id == id);
        if (!blog) {
            this.showMessage('Blog not found', 'error');
            return;
        }

        this.editingId = id;
        document.getElementById('submit-btn').textContent = 'Update Blog Post';
        document.getElementById('cancel-btn').style.display = 'inline-block';

        // Populate form fields
        const titleField = document.getElementById('blog-title');
        const categoryField = document.getElementById('blog-category');
        const descriptionField = document.getElementById('blog-description');
        const imageField = document.getElementById('blog-image');
        const videoField = document.getElementById('blog-video');
        const contentField = document.getElementById('blog-content');
        const tagsField = document.getElementById('blog-tags');
        const readTimeField = document.getElementById('blog-read-time');
        const mediaTypeField = document.getElementById('media-type');

        titleField.value = blog.title || '';
        categoryField.value = blog.category || '';
        descriptionField.value = blog.description || '';
        contentField.value = blog.content || '';
        tagsField.value = Array.isArray(blog.tags) ? blog.tags.join(', ') : (blog.tags || '');
        readTimeField.value = blog.read_time || 5;
        
        // Set media type and populate appropriate field
        const mediaType = blog.media_type || 'image';
        mediaTypeField.value = mediaType;
        
        if (mediaType === 'image') {
            imageField.value = blog.image_url || blog.image || '';
            videoField.value = '';
        } else if (mediaType === 'video') {
            imageField.value = '';
            videoField.value = blog.video_url || blog.video || '';
        }
        
        // Update form display
        toggleMediaInput();
        
        // Scroll to form
        document.querySelector('.blog-form-section').scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * View blog post in new window
     */
    async viewBlog(slug) {
        try {
            const response = await fetch(`/api/blogs/${slug}`);
            
            if (!response.ok) {
                console.error('Failed to load blog post:', response.statusText);
                alert('Failed to load blog post. Please try again.');
                return;
            }

            const blog = await response.json();
            
            // Create a new window/tab with the blog content
            const blogWindow = window.open('', '_blank');
            const blogHTML = this.generateBlogHTML(blog);
            
            blogWindow.document.write(blogHTML);
            blogWindow.document.close();
        } catch (error) {
            console.error('Error loading blog post:', error);
            alert('Error loading blog post. Please try again.');
        }
    }

    /**
     * Generate HTML for blog preview
     */
    generateBlogHTML(blog) {
        const tagsHtml = Array.isArray(blog.tags)
            ? blog.tags.map(tag => `<span class="blog-category">${tag}</span>`).join('')
            : (blog.tags ? `<span class="blog-category">${blog.tags}</span>` : '');

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${blog.title} - A blog post by Wasiq Syed">
    <meta name="keywords" content="${Array.isArray(blog.tags) ? blog.tags.join(', ') : blog.tags || ''}">
    <meta name="author" content="Wasiq Syed">
    <title>${blog.title} - Wasiq Syed</title>
    <link rel="stylesheet" href="styles/styles.css">
    <link rel="stylesheet" href="styles/blog-components.css">
    <link rel="stylesheet" href="styles/blog-post.css">
</head>
<body>
    <nav class="site-nav">
        <div class="nav-inner">
            <a class="brand" href="/">Wasiq</a>
            <input type="checkbox" id="nav-toggle" class="nav-toggle" hidden>
            <label for="nav-toggle" class="nav-toggle-label">☰</label>
            <ul class="nav-pill">
                <li><a href="/#about">About</a></li>
                <li><a href="portfolio.html">Portfolio</a></li>
                <li><a href="blogs.html" class="active">Blog</a></li>
                <li><a href="/#contact">Contact</a></li>
            </ul>
        </div>
    </nav>

    <header>
        <h1>Hi! I'm Wasiq.</h1>
        <p>Smart with code.<br>Easy on the eyes.</p>
    </header>

    <div class="container">
        <article class="blog-full">
            <div class="blog-header">
                <a href="blogs.html" class="back-button">← Back to Blogs</a>
                <span class="blog-category">${blog.category}</span>
                <h2>${blog.title}</h2>
                <div class="blog-meta">
                    <span class="blog-date">${new Date(blog.created_at || blog.dateCreated).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}</span>
                    <span class="blog-read-time">${blog.read_time || blog.readTime} min read</span>
                </div>
            </div>

            ${(blog.media_type === 'video' || blog.video) ? `
            <div class="blog-featured-video">
                <iframe width="100%" height="400" src="${blog.video_url || blog.video}" frameborder="0" allowfullscreen style="border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"></iframe>
            </div>
            ` : (blog.image_url || blog.image) ? `
            <div class="blog-featured-image">
                <img src="${blog.image_url || blog.image}" alt="${blog.title}">
            </div>
            ` : ''}

            <div class="blog-content">
                ${blog.content}
            </div>

            <div class="blog-footer">
                ${tagsHtml ? `
                <div class="blog-tags">
                    <span>Tags:</span>
                    ${tagsHtml}
                </div>
                ` : ''}

                <div class="blog-share">
                    <span>Share:</span>
                    <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(blog.title)}&url=${encodeURIComponent(window.location.origin + '/blogs/' + blog.slug)}" target="_blank" aria-label="Share on Twitter">Twitter</a>
                    <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.origin + '/blogs/' + blog.slug)}" target="_blank" aria-label="Share on LinkedIn">LinkedIn</a>
                    <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin + '/blogs/' + blog.slug)}" target="_blank" aria-label="Share on Facebook">Facebook</a>
                </div>
            </div>
        </article>
    </div>

    <footer class="site-footer">
        <div class="footer-inner">
            <div class="footer-left">
                <div class="footer-address" onclick="copyXMRAddress()" title="Click to copy XMR address">
                    XMR: 8894XGTTAgrQhjJkj4DF4tYVLZbtLqZCWVrhSp664Du5PR2aiy7Lqkm8sdRPDeS1LoaWKEhHTBf8Q73MqxbZK3jWKkMW3Y7
                </div>
                <button class="copy-xmr-btn" onclick="copyXMRAddress()">Copy Address</button>
            </div>
            <div class="footer-center">
                <p>&copy; 2025 Wasiq Syed. All rights reserved.</p>
            </div>
            <div class="footer-right">
                <div class="social-media-icons">
                    <a href="https://x.com/wasiqonx" target="_blank" rel="noopener">Twitter</a>
                    <a href="https://youtube.com/@wasiqonx" target="_blank" rel="noopener">YouTube</a>
                    <a href="https://t.me/wasiqtg" target="_blank" rel="noopener">Telegram</a>
                    <a href="https://bsky.app/profile/wasiqonx.bsky.social" target="_blank" rel="noopener">Bluesky</a>
                    <a href="https://farcaster.xyz/wasciv" target="_blank" rel="noopener">Farcaster</a>
                </div>
            </div>
        </div>
    </footer>

    <script src="scripts/theme-manager.js"></script>
    <script src="scripts/crypto-utils.js"></script>
    <script>
        function copyXMRAddress() {
            const address = '8894XGTTAgrQhjJkj4DF4tYVLZbtLqZCWVrhSp664Du5PR2aiy7Lqkm8sdRPDeS1LoaWKEhHTBf8Q73MqxbZK3jWKkMW3Y7';
            navigator.clipboard.writeText(address).then(() => {
                alert('XMR address copied to clipboard!');
            }).catch(err => {
                console.error('Failed to copy address:', err);
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = address;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                alert('XMR address copied to clipboard!');
            });
        }
    </script>
</body>
</html>`;
    }

    /**
     * Cancel edit mode and reset form
     */
    cancelEdit() {
        this.editingId = null;
        this.form.reset();
        document.getElementById('form-title').textContent = 'Create New Blog Post';
        document.getElementById('submit-btn').textContent = 'Create Blog Post';
        document.getElementById('cancel-btn').style.display = 'none';
    }

    /**
     * Render the list of blogs in the admin interface
     */
    renderBlogsList() {
        if (this.blogs.length === 0) {
            this.blogsList.innerHTML = '<p>No blog posts yet. Create your first one!</p>';
            return;
        }

        this.blogsList.innerHTML = this.blogs.map(blog => {
            const blogId = blog.id;
            const blogSlug = blog.slug;
            
            return `
            <div class="blog-item" data-blog-id="${blogId}">
                <h3>${blog.title}</h3>
                <div class="blog-meta">
                    <span class="category">${blog.category}</span>
                    <span class="date">${new Date(blog.created_at || blog.dateCreated).toLocaleDateString()}</span>
                    <span class="read-time">${blog.read_time || blog.readTime} min read</span>
                </div>
                <div class="blog-description">${blog.description}</div>
                <div class="blog-actions">
                    <button class="view-btn" onclick="blogManager.viewBlog('${blogSlug}')" title="View this blog post">View</button>
                    <button class="edit-btn" onclick="blogManager.editBlog(${blogId})" title="Edit this blog post" data-blog-id="${blogId}">Edit</button>
                    <button class="delete-btn" onclick="blogManager.deleteBlog(${blogId})" title="Delete this blog post" data-blog-id="${blogId}">Delete</button>
                </div>
            </div>
        `}).join('');
        
        // Add backup event listeners for better reliability
        this.addButtonEventListeners();
    }
    
    /**
     * Add event listeners as backup for onclick handlers
     * This ensures buttons work even if global variables aren't set properly
     */
    addButtonEventListeners() {
        // Add event listeners for edit buttons
        const editButtons = this.blogsList.querySelectorAll('.edit-btn');
        editButtons.forEach(button => {
            const blogId = button.getAttribute('data-blog-id');
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.editBlog(blogId);
            });
        });
        
        // Add event listeners for delete buttons
        const deleteButtons = this.blogsList.querySelectorAll('.delete-btn');
        deleteButtons.forEach(button => {
            const blogId = button.getAttribute('data-blog-id');
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.deleteBlog(blogId);
            });
        });
    }

    /**
     * Create downloadable HTML file for blog (legacy feature)
     */
    createBlogPage(blog) {
        const blogPageHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${blog.title} - A blog post by Wasiq Syed">
    <meta name="keywords" content="${blog.tags.join(', ')}">
    <meta name="author" content="Wasiq Syed">
    <title>${blog.title} - Wasiq Syed</title>
    <link rel="stylesheet" href="styles/styles.css">
</head>
<body>
    <header>
        <nav>
            <ul>
                <li><a href="index.html#about">About Me</a></li>
                <li><a href="index.html#education">Education</a></li>
                <li><a href="index.html#projects">Projects</a></li>
                <li><a href="index.html#skills">Skills</a></li>
                <li><a href="blogs.html" class="active">Blogs</a></li>
                <li><a href="index.html#testimonials">Testimonials</a></li>
                <li><a href="index.html#contact">Contact</a></li>
            </ul>
        </nav>
        <h1>Wasiq Syed</h1>
        <p>Crypto Enthusiast, Developer, and Content Creator</p>
    </header>
    
    <div class="container">
        <article class="blog-full">
            <div class="blog-header">
                <a href="blogs.html" class="back-button">← Back to Blogs</a>
                <span class="blog-category">${blog.category}</span>
                <h2>${blog.title}</h2>
                <div class="blog-meta">
                    <span class="blog-date">${new Date(blog.dateCreated).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}</span>
                    <span class="blog-read-time">${blog.readTime} min read</span>
                </div>
            </div>
            
            <div class="blog-featured-image">
                <img src="${blog.image}" alt="${blog.title}">
            </div>
            
            <div class="blog-content">
                ${blog.content}
            </div>
            
            <div class="blog-footer">
                <div class="blog-tags">
                    <span>Tags:</span>
                    ${blog.tags.map(tag => `<a href="#">${tag}</a>`).join('')}
                </div>
                
                <div class="blog-share">
                    <span>Share:</span>
                    <a href="#" aria-label="Share on Twitter">Twitter</a>
                    <a href="#" aria-label="Share on LinkedIn">LinkedIn</a>
                    <a href="#" aria-label="Share on Facebook">Facebook</a>
                </div>
            </div>
        </article>
    </div>
    
    <footer>
        <p>&copy; 2025 Wasiq Syed. All rights reserved.</p>
    </footer>
    <script src="scripts/scripts.js"></script>
    <script src="scripts/adjust.js"></script>
</body>
</html>`;

        this.downloadFile(`${blog.slug}.html`, blogPageHTML);
    }

    /**
     * Download file helper
     */
    downloadFile(filename, content) {
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/html;charset=utf-8,' + encodeURIComponent(content));
        element.setAttribute('download', filename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }

    /**
     * Show user feedback messages
     */
    showMessage(message, type) {
        const existingMessage = document.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        
        const formSection = document.querySelector('.blog-form-section');
        if (formSection) {
            formSection.insertBefore(messageDiv, formSection.firstChild);
        }
        
        // Auto-remove message after 5 seconds
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }

    /**
     * Export blogs as JSON backup
     */
    exportBlogs() {
        if (!this.verifyAuthentication()) return;
        
        const dataStr = JSON.stringify(this.blogs, null, 2);
        this.downloadFile('blogs-backup.json', dataStr);
    }

    /**
     * Add security features and enhancements
     */
    addSecurityFeatures() {
        // Add audit logging
        this.setupAuditLogging();
        
        // Add data validation
        this.setupDataValidation();
        
        // Add auto-save protection
        this.setupAutoSave();
    }

    /**
     * Setup audit logging for admin actions
     */
    setupAuditLogging() {
        const originalCreateBlog = this.createBlog.bind(this);
        const originalUpdateBlog = this.updateBlog.bind(this);
        const originalDeleteBlog = this.deleteBlog.bind(this);
        
        this.createBlog = (data) => {
            this.logAction('CREATE_BLOG', { title: data.title, timestamp: new Date().toISOString() });
            return originalCreateBlog(data);
        };
        
        this.updateBlog = (id, data) => {
            this.logAction('UPDATE_BLOG', { id, title: data.title, timestamp: new Date().toISOString() });
            return originalUpdateBlog(id, data);
        };
        
        this.deleteBlog = (id) => {
            const blog = this.blogs.find(b => b.id === id);
            this.logAction('DELETE_BLOG', { id, title: blog?.title, timestamp: new Date().toISOString() });
            return originalDeleteBlog(id);
        };
    }

    /**
     * Log admin actions for audit trail
     */
    logAction(action, details) {
        const logs = JSON.parse(localStorage.getItem('blog_audit_logs') || '[]');
        logs.push({
            action,
            details,
            user: authManager?.getCurrentUser()?.username || 'unknown',
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 100 logs to prevent storage bloat
        if (logs.length > 100) {
            logs.splice(0, logs.length - 100);
        }
        
        localStorage.setItem('blog_audit_logs', JSON.stringify(logs));
    }

    /**
     * Setup enhanced data validation
     */
    setupDataValidation() {
        this.validateBlogData = (data) => {
            const errors = [];
            
            if (!data.title || data.title.trim().length < 3) {
                errors.push('Title must be at least 3 characters long');
            }
            
            if (!data.category) {
                errors.push('Category is required');
            }
            
            if (!data.description || data.description.trim().length < 10) {
                errors.push('Description must be at least 10 characters long');
            }
            
            if (!data.content || data.content.trim().length < 20) {
                errors.push('Content must be at least 20 characters long');
            }

            if (data.content && data.content.length > 50000) {
                errors.push('Content cannot exceed 50,000 characters');
            }
            
            // Validate media based on type
            if (data.mediaType === 'image') {
                if (data.image && !this.isValidImageUrl(data.image)) {
                    errors.push('Please enter a valid image URL');
                }
            } else if (data.mediaType === 'video') {
                if (!data.video) {
                    errors.push('Video URL is required for video type');
                } else if (!this.isValidVideoUrl(data.video)) {
                    errors.push('Please enter a valid video URL (YouTube, Vimeo, or direct video file)');
                }
            }
            
            if (data.readTime < 1 || data.readTime > 120) {
                errors.push('Read time must be between 1 and 120 minutes');
            }
            
            return errors;
        };
    }
    
    /**
     * Validate image URL
     */
    isValidImageUrl(url) {
        if (!url) return true; // Optional field
        const imageExtensions = /\.(jpg|jpeg|png|gif|webp)$/i;
        return imageExtensions.test(url) || url.startsWith('https://via.placeholder.com');
    }
    
    /**
     * Validate video URL
     */
    isValidVideoUrl(url) {
        if (!url) return false;
        
        // YouTube URLs
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
        
        // Vimeo URLs
        const vimeoRegex = /^(https?:\/\/)?(www\.)?(vimeo\.com)\/.+/;
        
        // Direct video file URLs
        const videoExtensions = /\.(mp4|webm|ogg|mov)$/i;
        
        return youtubeRegex.test(url) || vimeoRegex.test(url) || videoExtensions.test(url);
    }

    /**
     * Setup auto-save functionality for drafts
     */
    setupAutoSave() {
        // Auto-save drafts every 30 seconds
        setInterval(() => {
            if (this.form && this.isAuthenticated) {
                this.saveDraft();
            }
        }, 30000);
        
        // Save draft on form changes
        if (this.form) {
            this.form.addEventListener('input', () => {
                clearTimeout(this.draftTimeout);
                this.draftTimeout = setTimeout(() => this.saveDraft(), 5000);
            });
        }
    }

    /**
     * Save current form data as draft
     */
    saveDraft() {
        if (!this.form) return;
        
        const formData = new FormData(this.form);
        const draft = {
            title: formData.get('title'),
            category: formData.get('category'),
            description: formData.get('description'),
            image: formData.get('image'),
            content: formData.get('content'),
            tags: formData.get('tags'),
            readTime: formData.get('readTime'),
            timestamp: Date.now()
        };
        
        // Only save if there's actual content
        if (draft.title || draft.description || draft.content) {
            localStorage.setItem('blog_draft', JSON.stringify(draft));
        }
    }

    /**
     * Load saved draft into form
     */
    loadDraft() {
        const draft = localStorage.getItem('blog_draft');
        if (draft && this.form) {
            const draftData = JSON.parse(draft);
            
            // Check if draft is recent (less than 1 hour old)
            if (Date.now() - draftData.timestamp < 3600000) {
                if (confirm('A recent draft was found. Would you like to restore it?')) {
                    document.getElementById('blog-title').value = draftData.title || '';
                    document.getElementById('blog-category').value = draftData.category || '';
                    document.getElementById('blog-description').value = draftData.description || '';
                    document.getElementById('blog-image').value = draftData.image || '';
                    document.getElementById('blog-content').value = draftData.content || '';
                    document.getElementById('blog-tags').value = draftData.tags || '';
                    document.getElementById('blog-read-time').value = draftData.readTime || '5';
                }
            }
        }
    }

    /**
     * Verify user authentication
     */
    verifyAuthentication() {
        // Check both internal flag and auth manager
        const hasAuthToken = !!this.getAuthToken();
        const authManagerOK = authManager && authManager.isAuthenticated();
        
        if (!this.isAuthenticated && !hasAuthToken && !authManagerOK) {
            this.showMessage('Authentication required. Please log in again.', 'error');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return false;
        }
        
        // Auto-correct authentication status if we have a valid token
        if (!this.isAuthenticated && hasAuthToken) {
            this.isAuthenticated = true;
        }
        
        return true;
    }

    /**
     * Manual initialization method for troubleshooting
     */
    async forceInitialize() {
        // Reset state
        this.isAuthenticated = false;
        this.editingId = null;
        
        // Check for authentication
        if (this.getAuthToken()) {
            this.isAuthenticated = true;
        } else if (authManager && authManager.isAuthenticated()) {
            this.isAuthenticated = true;
        } else {
            return false;
        }
        
        try {
            await this.loadBlogs();
            this.initializeEventListeners();
            this.renderBlogsList();
            return true;
        } catch (error) {
            console.error('Force initialization failed:', error);
            return false;
        }
    }

    /**
     * Clear sensitive data from memory
     */
    clearSensitiveData() {
        // Clear form data
        if (this.form) {
            this.form.reset();
        }
        
        // Clear drafts
        localStorage.removeItem('blog_draft');
        
        // Clear any temporary data
        this.editingId = null;
        
        // Clear blog data from memory (but not from storage)
        this.blogs = [];
    }

    /**
     * Get audit logs for admin review
     */
    getAuditLogs() {
        if (!this.verifyAuthentication()) return [];
        return JSON.parse(localStorage.getItem('blog_audit_logs') || '[]');
    }

    /**
     * Export audit logs as JSON file
     */
    exportAuditLogs() {
        if (!this.verifyAuthentication()) return;
        
        const logs = this.getAuditLogs();
        const dataStr = JSON.stringify(logs, null, 2);
        this.downloadFile('blog-audit-logs.json', dataStr);
    }
}

// Global BlogManager instance
let blogManager;

/**
 * Initialize BlogManager with proper error handling
 */
function initializeBlogManager() {
    try {
        // Create the blog manager instance
        const manager = new BlogManager();
        
        // Make it available globally for onclick handlers
        window.blogManager = manager;
        window.BlogManagerInstance = manager;
        globalThis.blogManager = manager;
        
        // Set the global variable
        blogManager = manager;
        
        return manager;
        
    } catch (error) {
        console.error('BlogManager initialization failed:', error);
        throw error;
    }
}

/**
 * Initialize when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize on admin page
    if (window.location.pathname.includes('admin.html') || 
        window.location.pathname.endsWith('/admin.html') ||
        document.getElementById('blog-form')) {
        
        initializeBlogManager();
    }
});

/**
 * Fallback initialization if DOM is already loaded
 */
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    if ((window.location.pathname.includes('admin.html') || 
         window.location.pathname.endsWith('/admin.html') ||
         document.getElementById('blog-form')) && 
        !window.blogManager) {
        
        initializeBlogManager();
    }
} 
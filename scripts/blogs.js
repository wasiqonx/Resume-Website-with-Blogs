// Enhanced blog functionality
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('blog-search');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const blogGrid = document.getElementById('blog-grid');
    const loadingState = document.getElementById('loading-state');
    const noResults = document.getElementById('no-results');
    
    let allBlogs = [];
    let filteredBlogs = [];
    
    // Load blogs from API
    async function loadBlogs() {
        try {
            const response = await fetch('/api/blogs');
            if (response.ok) {
                const blogs = await response.json();
                allBlogs = filteredBlogs = blogs;
                loadingState.style.display = 'none';
                displayBlogs(blogs);
            } else {
                showError('Unable to load blogs. Try again.');
            }
        } catch {
            showError('Error loading blogs. Check connection.');
        }
    }
    
    function showError(message) {
        loadingState.style.display = 'none';
        blogGrid.innerHTML = `
            <div class="status-error">
                <h3>Error Loading Blogs</h3>
                <p>${message}</p>
            </div>
        `;
        blogGrid.style.display = 'grid';
    }
    
    // Search functionality
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        filterBlogs(searchTerm, getActiveCategory());
    });
    
    // Filter functionality
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Update active button
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            const category = this.dataset.category;
            const searchTerm = searchInput.value.toLowerCase();
            filterBlogs(searchTerm, category);
        });
    });
    
    function getActiveCategory() {
        return document.querySelector('.filter-btn.active').dataset.category;
    }
    
    function filterBlogs(searchTerm, category) {
        if (!allBlogs.length) return;
        
        filteredBlogs = allBlogs.filter(blog => {
            const matchesSearch = !searchTerm || 
                blog.title.toLowerCase().includes(searchTerm) ||
                (blog.description && blog.description.toLowerCase().includes(searchTerm)) ||
                blog.content.toLowerCase().includes(searchTerm) ||
                (blog.tags && blog.tags.toLowerCase().includes(searchTerm));
            
            const matchesCategory = category === 'all' || 
                blog.category.toLowerCase() === category ||
                (blog.tags && blog.tags.toLowerCase().includes(category));
            
            return matchesSearch && matchesCategory;
        });
        
        displayBlogs(filteredBlogs);
    }
    
    function displayBlogs(blogs) {
        if (blogs.length === 0) {
            blogGrid.style.display = 'none';
            noResults.style.display = 'block';
        } else {
            blogGrid.style.display = 'grid';
            noResults.style.display = 'none';
            
            // Clear and populate blog grid
            blogGrid.innerHTML = '';
            blogs.forEach((blog, index) => {
                const blogCard = createBlogCard(blog, index);
                blogGrid.appendChild(blogCard);
            });
        }
    }
    
    function createBlogCard(blog, index) {
        const card = document.createElement('div');
        card.className = 'blog-card';
        card.style.animationDelay = `${index * 0.1}s`;
        
        const readTime = blog.read_time || Math.ceil((blog.content || '').length / 200) || 2;
        const publishDate = new Date(blog.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const excerpt = blog.description || 
                       (blog.content ? blog.content.substring(0, 150) + '...' : 'No preview available');
        
        card.innerHTML = `
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
                    <button class="share-button" data-title="${blog.title}" data-url="/blog/${blog.slug}" title="Share this article">
                        <svg class="share-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
        
        return card;
    }
    
    // Load blogs when page loads
    loadBlogs();
    
    // Email subscription functionality
    const subscribeForm = document.getElementById('subscribe-form');
    const subscribeMessage = document.getElementById('subscribe-message');
    
    subscribeForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('subscribe-email').value;
        const name = document.getElementById('subscribe-name').value;
        const submitButton = subscribeForm.querySelector('button[type="submit"]');
        
        // Show loading state
        submitButton.textContent = 'Subscribing...';
        submitButton.disabled = true;
        subscribeMessage.innerHTML = '';
        
        try {
            const response = await fetch('/api/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, name })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                // Success
                subscribeMessage.innerHTML = `<div class="status-success">${result.message}</div>`;
                subscribeForm.reset();
            } else {
                // Error
                subscribeMessage.innerHTML = `<div class="status-error">${result.error}</div>`;
            }
        } catch (error) {
            console.error('Subscription error:', error);
            subscribeMessage.innerHTML = `<div class="status-error">Network error. Please try again.</div>`;
        } finally {
            // Reset button
            submitButton.textContent = 'Subscribe';
            submitButton.disabled = false;
        }
    });
});
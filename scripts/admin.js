const xmrAddress = '8894XGTTAgrQhjJkj4DF4tYVLZbtLqZCWVrhSp664Du5PR2aiy7Lqkm8sdRPDeS1LoaWKEhHTBf8Q73MqxbZK3jWKkMW3Y7';
function copyXMRAddress(){
  navigator.clipboard.writeText(xmrAddress).then(()=>{
    alert('XMR address copied to clipboard!');
  }).catch(()=>{
    alert('XMR address copied to clipboard!');
  });
}

/**
 * Admin Dashboard JavaScript
 * Handles logout functionality and basic initialization
 */

/**
 * Load admin blogs from API
 */
async function loadBlogs() {
    try {
        const token = getTokenFromStorage();
        if (!token) {
            console.log('⚠️ No token available for loading blogs');
            return;
        }

        const response = await fetch('/api/admin/blogs', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const blogs = await response.json();
            console.log('✅ Admin blogs loaded:', blogs.length, 'blogs');

            // Update the blogs list in the UI if the element exists
            const blogsList = document.getElementById('blogs-list');
            if (blogsList && Array.isArray(blogs)) {
                // Simple refresh - you might want to implement proper UI update here
                console.log('📋 Blogs list refreshed');
            }
        } else {
            console.log('⚠️ Failed to load admin blogs:', response.status);
        }
    } catch (error) {
        console.error('❌ Error loading admin blogs:', error);
    }
}

/**
 * Setup blog form submission handler with validation
 */
function setupBlogForm() {
    const blogForm = document.getElementById('blog-form');
    if (!blogForm) {
        console.log('Blog form not found');
        return;
    }

    console.log('Setting up blog form submission handler');

    blogForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('📝 === BLOG FORM SUBMISSION STARTED ===');

        // Get form data
        const formData = new FormData(blogForm);
        const blogData = {
            title: formData.get('title')?.trim(),
            category: formData.get('category')?.trim(),
            description: formData.get('description')?.trim(),
            content: formData.get('content')?.trim(),
            tags: formData.get('tags')?.trim(),
            image: formData.get('image')?.trim(),
            readTime: formData.get('readTime')?.trim()
        };

        console.log('📋 Form data collected:', {
            title: blogData.title ? '***PROVIDED***' : '***MISSING***',
            category: blogData.category,
            description: blogData.description ? '***PROVIDED***' : '***MISSING***',
            content: blogData.content ? '***PROVIDED***' : '***MISSING***',
            tags: blogData.tags,
            image: blogData.image,
            readTime: blogData.readTime
        });

        // Validate required fields
        const validationErrors = [];

        if (!blogData.title || blogData.title.length < 3) {
            validationErrors.push('Title must be at least 3 characters long');
        }

        if (!blogData.category) {
            validationErrors.push('Please select a category');
        }

        if (!blogData.description || blogData.description.length < 10) {
            validationErrors.push('Description must be at least 10 characters long');
        }

        if (!blogData.content || blogData.content.length < 20) {
            validationErrors.push('Content must be at least 20 characters long');
        }

        // Captcha is optional for blog creation

        // Optional field validation
        if (blogData.image && !isValidUrl(blogData.image)) {
            validationErrors.push('Please provide a valid image URL');
        }

        if (blogData.readTime && (!isValidNumber(blogData.readTime) || blogData.readTime < 1 || blogData.readTime > 120)) {
            validationErrors.push('Read time must be a number between 1 and 120 minutes');
        }

        if (validationErrors.length > 0) {
            console.log('❌ Client-side validation failed:', validationErrors);
            alert('Please fix the following errors:\n\n' + validationErrors.join('\n'));
            return;
        }

        console.log('✅ Client-side validation passed');

        // Get authentication token
        const token = getTokenFromStorage();
        if (!token) {
            console.log('❌ No authentication token found');
            alert('You are not authenticated. Please log in again.');
            window.location.href = 'login.html';
            return;
        }

        console.log('🎫 Authentication token present');

        // Prepare API request
        const requestData = {
            title: blogData.title,
            category: blogData.category,
            description: blogData.description,
            content: blogData.content,
            tags: blogData.tags || '',
            image_url: blogData.image || '',
            read_time: blogData.readTime ? parseInt(blogData.readTime) : 5
        };

        console.log('📤 Sending API request with data:', {
            title: requestData.title,
            category: requestData.category,
            descriptionLength: requestData.description.length,
            contentLength: requestData.content.length,
            tags: requestData.tags,
            image_url: requestData.image_url,
            read_time: requestData.read_time
        });

        try {
            const response = await fetch('/api/admin/blogs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(requestData)
            });

            const result = await response.json();
            console.log('📡 API response:', {
                status: response.status,
                ok: response.ok,
                result: result
            });

            if (response.ok) {
                console.log('✅ Blog created successfully:', result);
                alert('Blog post created successfully!');

                // Reset form
                blogForm.reset();

                // Reset captcha (only if it exists)
                if (captchaManager && typeof captchaManager.reset === 'function') {
                    try {
                        captchaManager.reset('blog-form');
                    } catch (captchaError) {
                        console.log('⚠️ Captcha reset failed (expected for blog form):', captchaError.message);
                    }
                }

                // Refresh blogs list
                loadBlogs();

            } else {
                console.log('❌ API error:', result);
                const errorMessage = result.details ?
                    result.details.map(err => err.msg).join('\n') :
                    result.error || 'Unknown error occurred';

                alert('Error creating blog post:\n\n' + errorMessage);
            }

        } catch (error) {
            console.error('❌ Network error during blog creation:', error);
            alert('Network error occurred. Please check your connection and try again.');
        }

        console.log('📝 === BLOG FORM SUBMISSION COMPLETED ===');
    });
}

/**
 * Validate URL format
 */
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

/**
 * Validate number
 */
function isValidNumber(value) {
    const num = parseFloat(value);
    return !isNaN(num) && isFinite(num);
}

/**
 * Handle user logout with multiple fallback methods
 * Clears session data and redirects to login page
 */
function handleLogout() {
    console.log('🚪 === LOGOUT PROCESS STARTED ===');
    console.log('📋 Current authManager status:', typeof authManager, !!authManager);

    if (confirm('Are you sure you want to logout?')) {
        console.log('✅ User confirmed logout');

        try {
            // Get token first for server-side logout
            const token = getTokenFromStorage();
            console.log('🎫 Token retrieved from storage:', !!token);

            // Clear browser storage immediately
            console.log('🗑️ Clearing browser storage...');
            localStorage.clear();
            sessionStorage.clear();
            console.log('✅ Browser storage cleared');

            // Try auth manager logout first (client-side cleanup)
            let authManagerWorked = false;
            if (authManager && typeof authManager.handleLogout === 'function') {
                console.log('👤 Calling auth manager logout...');
                try {
                    authManager.handleLogout();
                    console.log('✅ Auth manager logout completed');
                    authManagerWorked = true;
                } catch (authError) {
                    console.error('❌ Auth manager logout failed:', authError);
                    console.log('🔄 Auth manager failed, will do manual logout...');
                }
            } else {
                console.log('⚠️ Auth manager not available or handleLogout not found');
            }

            // Try server-side logout if token exists
            if (token) {
                console.log('📡 Making server-side logout API call...');
                fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }).then(response => {
                    console.log('✅ Server logout response:', response.status);
                    if (!response.ok) {
                        console.warn('⚠️ Server logout returned non-OK status');
                    }
                }).catch(error => {
                    console.error('❌ Server logout failed:', error);
                }).finally(() => {
                    console.log('🔄 Proceeding with fallback logout...');
                    performFallbackLogout();
                });
            } else {
                console.log('⚠️ No token found, proceeding with fallback logout');
                performFallbackLogout();
            }
        } catch (error) {
            console.error('❌ Logout error:', error);
            console.log('🔄 Proceeding with fallback logout due to error');
            performFallbackLogout();
        }
    } else {
        console.log('❌ User cancelled logout');
    }

    console.log('🚪 === LOGOUT PROCESS COMPLETED ===');
}

/**
 * Get authentication token from session storage
 */
function getTokenFromStorage() {
    try {
        const encryptedSession = localStorage.getItem('auth_session');
        if (encryptedSession) {
            const sessionData = JSON.parse(atob(encryptedSession));
            return sessionData.token;
        }
    } catch (error) {
        console.error('Error getting token from storage:', error);
    }
    return null;
}

/**
 * Fallback logout function that clears data and redirects
 */
function performFallbackLogout() {
    console.log('🔄 Starting fallback logout...');
    try {
        // Clear any remaining data
        console.log('🗑️ Clearing localStorage and sessionStorage...');
        localStorage.clear();
        sessionStorage.clear();
        console.log('✅ Storage cleared');
        
        // Clear form data
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            try {
                form.reset();
            } catch (formError) {
                console.error('Form reset error:', formError);
            }
        });
        
        // Clear sensitive variables
        window.blogManager = null;
        window.authManager = null;
        
        // Redirect to login page
        console.log('🔄 Redirecting to login.html...');
        window.location.href = 'login.html';

    } catch (fallbackError) {
        console.error('Fallback logout error:', fallbackError);
        // Emergency redirect
        console.log('🚨 Emergency redirect to login.html...');
        window.location.href = 'login.html';
    }
}

/**
 * Load email subscribers
 */
async function loadSubscribers() {
    try {
        const token = getTokenFromStorage();
        if (!token) return;
        
        const response = await fetch('/api/admin/subscribers', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const subscribers = await response.json();
            displaySubscribers(subscribers);
        } else {
            console.error('Failed to load subscribers:', response.statusText);
        }
    } catch (error) {
        console.error('Error loading subscribers:', error);
    }
}

function displaySubscribers(subscribers) {
    const container = document.getElementById('subscribers-list');
    if (!container) return;
    
    if (subscribers.length === 0) {
        container.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">No email subscribers yet.</p>';
        return;
    }

    const verifiedCount = subscribers.filter(s => s.verified && s.subscribed).length;
    const totalCount = subscribers.filter(s => s.subscribed).length;
    
    container.innerHTML = `
        <div style="background: #e8f4f8; padding: 10px; border-radius: 6px; margin-bottom: 15px; text-align: center;">
            <strong>Total: ${totalCount} subscribers</strong> | 
            <span style="color: #28a745;">Verified: ${verifiedCount}</span> | 
            <span style="color: #ffc107;">Unverified: ${totalCount - verifiedCount}</span>
        </div>
        ${subscribers.map(subscriber => {
            const statusColor = subscriber.verified && subscriber.subscribed ? '#28a745' : 
                               subscriber.subscribed ? '#ffc107' : '#dc3545';
            const statusText = subscriber.verified && subscriber.subscribed ? 'Verified & Subscribed' :
                              subscriber.subscribed ? 'Subscribed (Unverified)' : 'Unsubscribed';
            
            return `
                <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 12px; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>${subscriber.email}</strong>
                            ${subscriber.name ? ` (${subscriber.name})` : ''}
                        </div>
                        <div style="text-align: right;">
                            <span style="color: ${statusColor}; font-size: 0.9rem; font-weight: bold;">${statusText}</span>
                            <br>
                            <small style="color: #6c757d;">Joined: ${new Date(subscriber.created_at).toLocaleDateString()}</small>
                        </div>
                    </div>
                </div>
            `;
        }).join('')}
    `;
}

/**
 * Send custom email to subscribers
 */
async function sendCustomEmail(subject, message, recipients) {
    try {
        const token = getTokenFromStorage();
        if (!token) {
            showEmailStatus('Please log in to send emails.', 'error');
            return;
        }
        
        const response = await fetch('/api/admin/send-email', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                subject: subject,
                message: message,
                recipients: recipients
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showEmailStatus(`Email sent successfully! Sent to ${result.stats.sent} subscribers. ${result.stats.failed > 0 ? `Failed: ${result.stats.failed}` : ''}`, 'success');
            
            // Clear form
            document.getElementById('email-subject').value = '';
            document.getElementById('email-message').value = '';
            captchaManager.reset('email-form');
        } else {
            showEmailStatus(result.error || 'Failed to send email', 'error');
        }
    } catch (error) {
        console.error('Error sending email:', error);
        showEmailStatus('Failed to send email. Please try again.', 'error');
    }
}

function showEmailStatus(message, type) {
    const statusDiv = document.getElementById('email-status');
    if (!statusDiv) return;
    
    statusDiv.style.display = 'block';
    statusDiv.textContent = message;
    
    if (type === 'success') {
        statusDiv.style.background = '#d4edda';
        statusDiv.style.color = '#155724';
        statusDiv.style.border = '1px solid #c3e6cb';
    } else if (type === 'error') {
        statusDiv.style.background = '#f8d7da';
        statusDiv.style.color = '#721c24';
        statusDiv.style.border = '1px solid #f5c6cb';
    } else {
        statusDiv.style.background = '#d1ecf1';
        statusDiv.style.color = '#0c5460';
        statusDiv.style.border = '1px solid #bee5eb';
    }
    
    // Hide status after 10 seconds
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 10000);
}

/**
 * Load anonymous messages
 */
async function loadAnonMessages() {
    try {
        const token = getTokenFromStorage();
        if (!token) return;
        
        const response = await fetch('/api/admin/anon-messages', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const messages = await response.json();
            displayAnonMessages(messages);
        } else {
            console.error('Failed to load messages:', response.statusText);
        }
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

function displayAnonMessages(messages) {
    const container = document.getElementById('anon-messages-list');
    if (!container) return;
    
    if (messages.length === 0) {
        container.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">No anonymous messages yet.</p>';
        return;
    }
    
    container.innerHTML = messages.map(msg => `
        <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 15px; margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <strong style="color: #495057;">Message #${msg.id}</strong>
                <small style="color: #6c757d;">${new Date(msg.created_at).toLocaleString()}</small>
            </div>
            <div style="background: white; padding: 12px; border-radius: 6px; border-left: 4px solid var(--success); margin-bottom: 8px;">
                ${msg.message.replace(/\n/g, '<br>')}
            </div>
            <div style="font-size: 0.85rem; color: #6c757d;">
                IP: ${msg.ip_address || 'N/A'} | User Agent: ${msg.user_agent ? msg.user_agent.substring(0, 50) + '...' : 'N/A'}
            </div>
        </div>
    `).join('');
}

/**
 * Initialize the admin page when DOM is ready
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('📋 Admin page loaded, setting up components...');

    // Setup captcha for admin forms
    if (document.getElementById('blog-form')) {
        // Add blog form submission handler (no captcha required)
        setupBlogForm();
        console.log('✅ Blog form setup completed');
    }

    // Ensure logout button is functional
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = function(e) {
            e.preventDefault();
            handleLogout();
            return false;
        };
        console.log('✅ Logout button handler attached');
    }
    
    if (document.getElementById('email-form')) {
        captchaManager.setupFormWithCaptcha('email-form', {
            buttonSelector: '#send-email-btn'
        });
    }

    // Initialize media type toggle
    toggleMediaInput();
    
    // Load email subscribers
    loadSubscribers();
    
    // Load anonymous messages
    loadAnonMessages();
    
    // Email form submission
    const emailForm = document.getElementById('email-form');
    if (emailForm) {
        emailForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const subject = document.getElementById('email-subject').value.trim();
            const message = document.getElementById('email-message').value.trim();
            const recipients = document.getElementById('email-recipients').value;
            
            if (!subject || !message) {
                showEmailStatus('Please fill in both subject and message.', 'error');
                return;
            }
            
            const sendBtn = document.getElementById('send-email-btn');
            const originalText = sendBtn.textContent;
            sendBtn.textContent = 'Sending...';
            sendBtn.disabled = true;
            
            showEmailStatus('Sending emails...', 'info');
            
            try {
                await sendCustomEmail(subject, message, recipients);
            } finally {
                sendBtn.textContent = originalText;
                sendBtn.disabled = false;
            }
        });
    }
    
    // Refresh subscribers button
    const refreshSubscribersBtn = document.getElementById('refresh-subscribers');
    if (refreshSubscribersBtn) {
        refreshSubscribersBtn.addEventListener('click', loadSubscribers);
    }
    
    // Refresh messages button
    const refreshBtn = document.getElementById('refresh-messages');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadAnonMessages);
    }
});

/**
 * Toggle between image and video input fields
 */
function toggleMediaInput() {
    const mediaType = document.getElementById('media-type').value;
    const imageGroup = document.getElementById('image-input-group');
    const videoGroup = document.getElementById('video-input-group');
    
    if (mediaType === 'image') {
        imageGroup.style.display = 'block';
        videoGroup.style.display = 'none';
        document.getElementById('blog-image').required = false;
        document.getElementById('blog-video').required = false;
    } else {
        imageGroup.style.display = 'none';
        videoGroup.style.display = 'block';
        document.getElementById('blog-image').required = false;
        document.getElementById('blog-video').required = false;
    }
}
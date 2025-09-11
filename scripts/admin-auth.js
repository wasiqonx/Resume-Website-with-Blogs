// Admin Page Authentication Protection
(function() {
    'use strict';
    
    // Check authentication before page loads
    function checkAdminAccess() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', checkAdminAccess);
            return;
        }
        
        // Initialize auth manager if not already done
        if (typeof authManager === 'undefined') {
            // Create temporary auth manager for checking
            const tempAuth = new AuthManager();
            
            // Check if user is authenticated
            if (!tempAuth.isAuthenticated()) {
                // Redirect to login page
                window.location.href = 'login.html';
                return;
            }
            
            // Store reference for later use
            window.authManager = tempAuth;
        } else {
            // Use existing auth manager
            if (!authManager.isAuthenticated()) {
                window.location.href = 'login.html';
                return;
            }
        }
        
        // If we get here, user is authenticated
        initializeAdminPage();
    }
    
    // Initialize admin page features
    function initializeAdminPage() {
        // Add logout button to navigation
        addLogoutToNav();
        
        // Add user info display
        addUserInfo();
        
        // Add session status indicator
        addSessionIndicator();
        
        // Enhanced security for admin functions
        protectAdminFunctions();
    }
    
    // Add logout button to navigation (now handled in HTML)
    function addLogoutToNav() {
        // Check if logout button already exists in HTML
        const existingLogoutBtn = document.getElementById('logout-btn');
        if (existingLogoutBtn) {
            console.log('Logout button already exists in HTML');
            return;
        }
        
        // Fallback: add logout button dynamically if not found
        const nav = document.querySelector('nav ul');
        if (nav) {
            const logoutLi = document.createElement('li');
            logoutLi.innerHTML = '<a href="#" id="logout-btn" onclick="handleLogout(); return false;" style="color: #dc3545; font-weight: bold;">Logout</a>';
            nav.appendChild(logoutLi);
        }
    }
    
    // Add user info display
    function addUserInfo() {
        const header = document.querySelector('header');
        if (header && authManager) {
            const userInfo = authManager.getCurrentUser();
            if (userInfo) {
                const userDiv = document.createElement('div');
                userDiv.className = 'user-info';
                userDiv.style.cssText = 'text-align: center; margin-top: 10px; font-size: 14px; color: #666;';
                userDiv.innerHTML = `
                    <span>Welcome, ${userInfo.username}</span> | 
                    <span>Role: ${userInfo.role}</span>
                    ${userInfo.lastLogin ? ` | <span>Last Login: ${new Date(userInfo.lastLogin).toLocaleDateString()}</span>` : ''}
                `;
                header.appendChild(userDiv);
            }
        }
    }
    
    // Add session status indicator
    function addSessionIndicator() {
        const statusDiv = document.createElement('div');
        statusDiv.id = 'session-status';
        statusDiv.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: #28a745;
            color: white;
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 12px;
            z-index: 1000;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;
        statusDiv.textContent = '🔒 Secure Session Active';
        document.body.appendChild(statusDiv);
        
        // Update status periodically
        sessionStatusInterval = setInterval(updateSessionStatus, 30000); // Every 30 seconds
    }
    
    // Update session status
    function updateSessionStatus() {
        const statusDiv = document.getElementById('session-status');
        if (statusDiv && authManager) {
            if (authManager.isAuthenticated()) {
                statusDiv.style.background = '#28a745';
                statusDiv.textContent = '🔒 Secure Session Active';
            } else {
                statusDiv.style.background = '#dc3545';
                statusDiv.textContent = '⚠️ Session Expired';
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            }
        }
    }
    
    // Protect admin functions with additional security
    function protectAdminFunctions() {
        // Add CSRF protection to forms
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            const csrfInput = document.createElement('input');
            csrfInput.type = 'hidden';
            csrfInput.name = 'csrf_token';
            csrfInput.value = CryptoUtils.generateCSRFToken();
            form.appendChild(csrfInput);
        });
        
        // Protect against console tampering
        protectConsole();
        
        // Add right-click protection (optional)
        addContextMenuProtection();
    }
    
    // Protect console from tampering
    function protectConsole() {
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;
        
        // Override console methods to detect unauthorized access
        console.log = function(...args) {
            // Check if this is a security-related log
            const message = args.join(' ').toLowerCase();
            if (message.includes('password') || message.includes('token') || message.includes('session')) {
                console.warn('🚨 Security: Sensitive data access detected');
                return;
            }
            originalLog.apply(console, args);
        };
        
        // Warn about developer tools
        let devtools = {open: false, orientation: null};
        const threshold = 160;
        devtoolsInterval = setInterval(() => {
            if (window.outerHeight - window.innerHeight > threshold || 
                window.outerWidth - window.innerWidth > threshold) {
                if (!devtools.open) {
                    devtools.open = true;
                    console.warn('⚠️ Developer tools detected. Please ensure your session remains secure.');
                }
            } else {
                devtools.open = false;
            }
        }, 5000);
    }
    
    // Add context menu protection
    function addContextMenuProtection() {
        document.addEventListener('contextmenu', function(e) {
            // Allow context menu on form inputs for usability
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return true;
            }
            e.preventDefault();
            return false;
        });
        
        // Disable certain key combinations
        document.addEventListener('keydown', function(e) {
            // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
            if (e.keyCode === 123 || 
                (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) ||
                (e.ctrlKey && e.keyCode === 85)) {
                e.preventDefault();
                return false;
            }
        });
    }
    
    // Note: handleLogout is defined in admin.js to avoid conflicts
    
    // Store references to cleanup functions
    let sessionStatusInterval = null;
    let devtoolsInterval = null;
    let beforeUnloadHandler = null;

    // Add security headers simulation (for client-side)
    function addSecurityHeaders() {
        // Add meta tags for security
        const meta = document.createElement('meta');
        meta.httpEquiv = 'Content-Security-Policy';
        meta.content = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';";
        document.head.appendChild(meta);

        const metaXSS = document.createElement('meta');
        metaXSS.httpEquiv = 'X-XSS-Protection';
        metaXSS.content = '1; mode=block';
        document.head.appendChild(metaXSS);
    }

    // Cleanup function for intervals and event listeners
    function cleanup() {
        console.log('🧹 Cleaning up admin auth resources...');

        if (sessionStatusInterval) {
            clearInterval(sessionStatusInterval);
            sessionStatusInterval = null;
            console.log('✅ Session status interval cleared');
        }

        if (devtoolsInterval) {
            clearInterval(devtoolsInterval);
            devtoolsInterval = null;
            console.log('✅ Devtools interval cleared');
        }

        if (beforeUnloadHandler) {
            window.removeEventListener('beforeunload', beforeUnloadHandler);
            beforeUnloadHandler = null;
            console.log('✅ Beforeunload handler removed');
        }
    }

    // Initialize security headers
    addSecurityHeaders();

    // Start authentication check
    checkAdminAccess();

    // Handle page unload - clear sensitive data and cleanup
    beforeUnloadHandler = function() {
        // Clear any sensitive form data
        const passwordFields = document.querySelectorAll('input[type="password"]');
        passwordFields.forEach(field => field.value = '');

        // Clear sensitive variables
        if (window.blogManager && window.blogManager.clearSensitiveData) {
            window.blogManager.clearSensitiveData();
        }

        // Cleanup intervals and listeners
        cleanup();
    };

    window.addEventListener('beforeunload', beforeUnloadHandler);

    // Make cleanup available globally for manual cleanup if needed
    window.adminAuthCleanup = cleanup;
    
})(); 
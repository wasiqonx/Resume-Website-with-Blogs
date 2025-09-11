 // Authentication Manager - Secure Session Management
class AuthManager {
    
    constructor() {
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
        this.warningTime = 5 * 60 * 1000; // 5 minutes before timeout
        this.sessionTimer = null;
        this.warningTimer = null;
        this.currentUser = null;
        
        this.initializeEventListeners();
        this.checkExistingSession();
    }

    /**
     * Initialize event listeners
     */
    initializeEventListeners() {
        // Initialize captcha for login form
        if (typeof captchaManager !== 'undefined' && document.getElementById('login-form')) {
            captchaManager.setupFormWithCaptcha('login-form', {
                captchaContainerId: 'login-form-captcha'
            });
        }

        // Listen for form submission
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Listen for page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseSession();
            } else {
                this.resumeSession();
            }
        });

        // Listen for user activity to extend session
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, () => this.extendSession(), { passive: true });
        });

        // Prevent multiple tabs issue
        window.addEventListener('storage', (e) => {
            if (e.key === 'auth_session' && !e.newValue) {
                this.handleLogout();
            }
        });
    }

    /**
     * Handle login form submission
     * @param {Event} e - Form submission event
     */
    async handleLogin(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const username = formData.get('username');
        const password = formData.get('password');
        const captchaResponse = formData.get('h-captcha-response');
        const errorDiv = document.getElementById('error-message');
        const loginBtn = document.getElementById('login-btn');
        
        try {
            // Show loading state
            this.setLoadingState(true);
            
            // Clear previous errors
            this.hideError();
            
            // Check rate limiting
            CryptoUtils.checkRateLimit();
            
            // Validate inputs
            if (!username || !password) {
                throw new Error('Please enter both username and password.');
            }
            
            if (!captchaResponse) {
                throw new Error('Please complete the captcha verification.');
            }
            
            // Attempt authentication via API
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    username, 
                    password, 
                    'h-captcha-response': captchaResponse 
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }
            
            await this.handleSuccessfulLogin(data);
            
        } catch (error) {
            await this.handleFailedLogin(error.message);
        } finally {
            this.setLoadingState(false);
        }
    }

    /**
     * Handle successful login
     * @param {object} response - Server response with token and user data
     */
    async handleSuccessfulLogin(response) {
        try {
            // Clear failed attempts
            CryptoUtils.clearFailedAttempts();
            
            // Create session data from server response
            const sessionData = {
                token: response.token,
                username: response.user.username,
                role: response.user.role,
                loginTime: Date.now(),
                expiresAt: Date.now() + this.sessionTimeout,
                csrfToken: CryptoUtils.generateCSRFToken()
            };
            
            // Store session securely
            this.storeSession(sessionData);
            
            // Set current user
            this.currentUser = response.user;
            
            // Start session management
            this.startSessionTimer();
            
            // Redirect to admin dashboard
            this.redirectToAdmin();
            
        } catch (error) {
            console.error('Session creation error:', error);
            this.showError('Login successful but session creation failed. Please try again.');
        }
    }

    /**
     * Handle failed login
     * @param {string} message - Error message
     */
    async handleFailedLogin(message) {
        // Record failed attempt
        CryptoUtils.recordFailedAttempt();
        
        // Add security delay
        await CryptoUtils.secureDelay();
        
        // Show error
        this.showError(message);
        
        // Clear form
        document.getElementById('password').value = '';
        
        // Reset captcha
        if (typeof captchaManager !== 'undefined') {
            captchaManager.reset('login-form');
        }
    }

    /**
     * Store session data securely
     * @param {object} sessionData - Session information
     */
    storeSession(sessionData) {
        // Store in both localStorage and sessionStorage for redundancy
        const encryptedSession = btoa(JSON.stringify(sessionData));
        localStorage.setItem('auth_session', encryptedSession);
        sessionStorage.setItem('auth_active', 'true');
        
        // Store fingerprint to detect tampering
        const fingerprint = this.generateFingerprint();
        localStorage.setItem('auth_fingerprint', fingerprint);
    }

    /**
     * Generate browser fingerprint for additional security
     * @returns {string} - Browser fingerprint
     */
    generateFingerprint() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Security fingerprint', 2, 2);
        
        const fingerprint = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset(),
            canvas.toDataURL()
        ].join('|');
        
        return btoa(fingerprint).substring(0, 32);
    }

    /**
     * Check for existing valid session
     */
    async checkExistingSession() {
        try {
            const sessionData = this.getSession();
            
            if (sessionData && this.isSessionValid(sessionData)) {
                // Verify token with server
                const isValidToken = await this.verifyTokenWithServer(sessionData.token);
                
                if (isValidToken) {
                    // Redirect if already logged in and on login page
                    if (window.location.pathname.includes('login.html')) {
                        this.redirectToAdmin();
                        return;
                    }
                    
                    // Restore session
                    this.currentUser = {
                        username: sessionData.username,
                        role: sessionData.role
                    };
                    this.startSessionTimer();
                } else {
                    throw new Error('Invalid token');
                }
            } else {
                // Clear invalid session
                this.clearSession();
                
                // Redirect to login if on admin page
                if (window.location.pathname.includes('admin.html')) {
                    this.redirectToLogin();
                }
            }
        } catch (error) {
            console.error('Session check error:', error);
            this.clearSession();
            
            // Redirect to login if on admin page
            if (window.location.pathname.includes('admin.html')) {
                this.redirectToLogin();
            }
        }
    }

    /**
     * Verify token with server
     * @param {string} token - JWT token to verify
     * @returns {Promise<boolean>} - Is token valid
     */
    async verifyTokenWithServer(token) {
        try {
            const response = await fetch('/api/auth/verify', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                return data.valid;
            }
            
            return false;
        } catch (error) {
            console.error('Token verification error:', error);
            return false;
        }
    }

    /**
     * Get current session data
     * @returns {object|null} - Session data or null
     */
    getSession() {
        try {
            const encryptedSession = localStorage.getItem('auth_session');
            if (!encryptedSession) return null;
            
            const sessionData = JSON.parse(atob(encryptedSession));
            
            // Verify fingerprint
            const storedFingerprint = localStorage.getItem('auth_fingerprint');
            const currentFingerprint = this.generateFingerprint();
            
            if (storedFingerprint !== currentFingerprint) {
                console.warn('Session fingerprint mismatch - possible tampering');
                return null;
            }
            
            return sessionData;
            
        } catch (error) {
            console.error('Session retrieval error:', error);
            return null;
        }
    }

    /**
     * Validate session
     * @param {object} sessionData - Session to validate
     * @returns {boolean} - Is session valid
     */
    isSessionValid(sessionData) {
        if (!sessionData || !sessionData.token || !sessionData.expiresAt) {
            return false;
        }
        
        // Check expiration
        if (Date.now() > sessionData.expiresAt) {
            return false;
        }
        
        // Check session storage consistency
        const isActive = sessionStorage.getItem('auth_active');
        if (!isActive) {
            return false;
        }
        
        return true;
    }

    /**
     * Start session timer management
     */
    startSessionTimer() {
        this.clearTimers();
        
        // Set warning timer
        this.warningTimer = setTimeout(() => {
            this.showSessionWarning();
        }, this.sessionTimeout - this.warningTime);
        
        // Set logout timer
        this.sessionTimer = setTimeout(() => {
            this.handleSessionTimeout();
        }, this.sessionTimeout);
    }

    /**
     * Extend current session
     */
    extendSession() {
        const sessionData = this.getSession();
        if (sessionData && this.isSessionValid(sessionData)) {
            // Extend expiration time
            sessionData.expiresAt = Date.now() + this.sessionTimeout;
            this.storeSession(sessionData);
            
            // Restart timers
            this.startSessionTimer();
            
            // Hide warning if showing
            this.hideSessionWarning();
        }
    }

    /**
     * Show session timeout warning
     */
    showSessionWarning() {
        const warning = document.createElement('div');
        warning.className = 'session-warning';
        warning.id = 'session-warning';
        warning.innerHTML = `
            <strong>Session Timeout Warning</strong><br>
            Your session will expire in 5 minutes. Click anywhere to extend.
            <button onclick="authManager.extendSession()" style="margin-left: 10px; padding: 5px 10px; background: #ffc107; border: none; border-radius: 4px; cursor: pointer;">
                Extend Session
            </button>
        `;
        
        document.body.appendChild(warning);
        
        // Auto-hide after 10 seconds
        setTimeout(() => this.hideSessionWarning(), 10000);
    }

    /**
     * Hide session warning
     */
    hideSessionWarning() {
        const warning = document.getElementById('session-warning');
        if (warning) {
            warning.remove();
        }
    }

    /**
     * Handle session timeout
     */
    handleSessionTimeout() {
        this.showError('Session expired due to inactivity. Please log in again.');
        this.handleLogout();
    }

    /**
     * Pause session when tab is hidden
     */
    pauseSession() {
        this.clearTimers();
    }

    /**
     * Resume session when tab is visible
     */
    resumeSession() {
        const sessionData = this.getSession();
        if (sessionData && this.isSessionValid(sessionData)) {
            this.startSessionTimer();
        } else {
            this.handleLogout();
        }
    }

    /**
     * Handle logout
     */
    handleLogout() {
        this.clearSession();
        this.clearTimers();
        this.hideSessionWarning();
        this.currentUser = null;
        this.redirectToLogin();
    }

    /**
     * Clear session data
     */
    clearSession() {
        localStorage.removeItem('auth_session');
        localStorage.removeItem('auth_fingerprint');
        sessionStorage.removeItem('auth_active');
        sessionStorage.removeItem('csrf_token');
    }

    /**
     * Clear all timers
     */
    clearTimers() {
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
            this.sessionTimer = null;
        }
        if (this.warningTimer) {
            clearTimeout(this.warningTimer);
            this.warningTimer = null;
        }
    }

    /**
     * Set loading state for login form
     * @param {boolean} loading - Is loading
     */
    setLoadingState(loading) {
        const form = document.getElementById('login-form');
        const loginBtn = document.getElementById('login-btn');
        
        if (loading) {
            form.classList.add('loading');
            loginBtn.disabled = true;
            loginBtn.textContent = 'Logging in...';
        } else {
            form.classList.remove('loading');
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
        }
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        } else {
            alert(message); // Fallback
        }
    }

    /**
     * Hide error message
     */
    hideError() {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    /**
     * Redirect to admin dashboard
     */
    redirectToAdmin() {
        window.location.href = 'admin.html';
    }

    /**
     * Redirect to login page
     */
    redirectToLogin() {
        window.location.href = 'login.html';
    }

    /**
     * Check if user is authenticated
     * @returns {boolean} - Is user authenticated
     */
    isAuthenticated() {
        const sessionData = this.getSession();
        return sessionData && this.isSessionValid(sessionData);
    }

    /**
     * Get current user info
     * @returns {object|null} - Current user or null
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Add logout button to page (now handled in HTML for admin page)
     */
    addLogoutButton() {
        if (!this.isAuthenticated()) return;
        
        // Check if logout button already exists
        const existingLogoutBtn = document.getElementById('logout-btn');
        if (existingLogoutBtn) {
            console.log('Logout button already exists');
            return;
        }
        
        // Only add dynamically for non-admin pages
        if (!window.location.pathname.includes('admin.html')) {
            const nav = document.querySelector('nav ul');
            if (nav) {
                const logoutLi = document.createElement('li');
                logoutLi.innerHTML = '<a href="#" id="logout-btn" onclick="authManager.handleLogout(); return false;">Logout</a>';
                nav.appendChild(logoutLi);
            }
        }
    }
}

// Initialize authentication manager
let authManager;
document.addEventListener('DOMContentLoaded', () => {
    authManager = new AuthManager();
    
    // Add logout button if authenticated
    if (authManager.isAuthenticated()) {
        authManager.addLogoutButton();
    }
}); 
/**
 * Cryptographic Utilities - Security and Input Validation
 */
class CryptoUtils {
    
    /**
     * Rate limiting configuration
     */
    static rateLimitConfig = {
        maxAttempts: 5,
        windowMs: 15 * 60 * 1000, // 15 minutes
        key: 'login_attempts'
    };
    
    /**
     * Check rate limiting for login attempts
     * @throws {Error} If rate limit exceeded
     */
    static checkRateLimit() {
        const now = Date.now();
        const attempts = this.getStoredAttempts();
        
        // Filter attempts within the window
        const recentAttempts = attempts.filter(attempt => 
            now - attempt < this.rateLimitConfig.windowMs
        );
        
        if (recentAttempts.length >= this.rateLimitConfig.maxAttempts) {
            const timeRemaining = Math.ceil(
                (recentAttempts[0] + this.rateLimitConfig.windowMs - now) / 1000 / 60
            );
            throw new Error(`Too many login attempts. Please try again in ${timeRemaining} minutes.`);
        }
    }
    
    /**
     * Record a failed login attempt
     */
    static recordFailedAttempt() {
        const attempts = this.getStoredAttempts();
        attempts.push(Date.now());
        
        // Keep only recent attempts
        const recentAttempts = attempts.filter(attempt => 
            Date.now() - attempt < this.rateLimitConfig.windowMs
        );
        
        localStorage.setItem(this.rateLimitConfig.key, JSON.stringify(recentAttempts));
    }
    
    /**
     * Clear failed login attempts
     */
    static clearFailedAttempts() {
        localStorage.removeItem(this.rateLimitConfig.key);
    }
    
    /**
     * Get stored login attempts
     * @returns {Array} Array of attempt timestamps
     */
    static getStoredAttempts() {
        try {
            const stored = localStorage.getItem(this.rateLimitConfig.key);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error reading stored attempts:', error);
            return [];
        }
    }
    
    /**
     * Generate CSRF token
     * @returns {string} CSRF token
     */
    static generateCSRFToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    /**
     * Security delay to prevent timing attacks
     * @param {number} ms - Delay in milliseconds (default: 1000-3000ms random)
     * @returns {Promise} Promise that resolves after delay
     */
    static secureDelay(ms = null) {
        const delay = ms || Math.floor(Math.random() * 2000) + 1000; // 1-3 seconds
        return new Promise(resolve => setTimeout(resolve, delay));
    }
    
    /**
     * Sanitize input to prevent XSS and other attacks
     * @param {string} input - Input to sanitize
     * @param {Object} options - Sanitization options
     * @returns {string} Sanitized input
     */
    static sanitizeInput(input, options = {}) {
        if (!input || typeof input !== 'string') {
            return '';
        }
        
        const {
            maxLength = 1000,
            allowHTML = false,
            allowNewlines = true
        } = options;
        
        let sanitized = input.trim();
        
        // Apply length limit
        if (sanitized.length > maxLength) {
            sanitized = sanitized.substring(0, maxLength);
        }
        
        // Handle HTML
        if (!allowHTML) {
            sanitized = sanitized
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#x27;')
                .replace(/\//g, '&#x2F;');
        }
        
        // Handle newlines
        if (!allowNewlines) {
            sanitized = sanitized.replace(/\n/g, ' ').replace(/\r/g, ' ');
        }
        
        return sanitized;
    }
    
    /**
     * Generate secure random string
     * @param {number} length - Length of string
     * @returns {string} Random string
     */
    static generateRandomString(length = 32) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        const randomArray = new Uint8Array(length);
        crypto.getRandomValues(randomArray);
        
        for (let i = 0; i < length; i++) {
            result += chars[randomArray[i] % chars.length];
        }
        
        return result;
    }
    
    /**
     * Hash string using SubtleCrypto (for client-side hashing)
     * @param {string} message - Message to hash
     * @returns {Promise<string>} Hashed message
     */
    static async hashString(message) {
        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} Is valid email
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    /**
     * Validate strong password
     * @param {string} password - Password to validate
     * @returns {Object} Validation result
     */
    static validatePassword(password) {
        const result = {
            isValid: false,
            errors: []
        };
        
        if (!password || password.length < 8) {
            result.errors.push('Password must be at least 8 characters long');
        }
        
        if (!/[A-Z]/.test(password)) {
            result.errors.push('Password must contain at least one uppercase letter');
        }
        
        if (!/[a-z]/.test(password)) {
            result.errors.push('Password must contain at least one lowercase letter');
        }
        
        if (!/\d/.test(password)) {
            result.errors.push('Password must contain at least one number');
        }
        
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            result.errors.push('Password must contain at least one special character');
        }
        
        result.isValid = result.errors.length === 0;
        return result;
    }
}

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CryptoUtils;
}
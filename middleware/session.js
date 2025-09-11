const jwt = require('jsonwebtoken');

/**
 * Enhanced JWT middleware with secure session management
 */
class SessionManager {
    constructor(config) {
        this.jwtSecret = config.jwtSecret;
        this.sessionTimeout = config.sessionTimeout;
        this.tokenBlacklist = new Set(); // In-memory blacklist (use Redis in production)
    }

    /**
     * Generate a secure JWT token with additional claims
     */
    generateToken(user, req) {
        const payload = {
            id: user.id,
            username: user.username,
            role: user.role,
            iat: Math.floor(Date.now() / 1000),
            // Add security claims
            ip: req.ip,
            userAgent: req.get('User-Agent')?.substring(0, 100) || 'unknown'
        };

        return jwt.sign(payload, this.jwtSecret, {
            expiresIn: '30m',
            issuer: 'blog-system',
            audience: 'blog-users'
        });
    }

    /**
     * Verify and validate JWT token
     */
    verifyToken(token, req) {
        try {
            const decoded = jwt.verify(token, this.jwtSecret, {
                issuer: 'blog-system',
                audience: 'blog-users'
            });

            // Check if token is blacklisted
            if (this.tokenBlacklist.has(token)) {
                throw new Error('Token has been revoked');
            }

            // Verify IP consistency (optional, can be disabled for mobile users)
            const currentIP = req.ip;
            if (process.env.STRICT_IP_CHECK === 'true' && decoded.ip !== currentIP) {
                console.warn(`IP mismatch for user ${decoded.username}: ${decoded.ip} vs ${currentIP}`);
                // Log but don't reject - mobile users change IPs frequently
            }

            return decoded;
        } catch (error) {
            throw new Error(`Token validation failed: ${error.message}`);
        }
    }

    /**
     * Blacklist a token (logout)
     */
    revokeToken(token) {
        this.tokenBlacklist.add(token);
        // In production, you should store this in Redis with TTL
        // and clean up expired tokens periodically
    }

    /**
     * Clean up expired tokens from blacklist
     */
    cleanupBlacklist() {
        // In a real implementation, you'd decode each token and check expiry
        // For now, clear the entire list periodically (not ideal but works for demo)
        if (this.tokenBlacklist.size > 1000) {
            this.tokenBlacklist.clear();
        }
    }

    /**
     * Express middleware for token authentication
     */
    authenticate() {
        return (req, res, next) => {
            console.log('🔐 === AUTHENTICATION MIDDLEWARE ===');
            console.log('📍 Route:', req.method, req.originalUrl);
            console.log('🌐 Request details:', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                headers: {
                    authorization: req.headers.authorization ? '***PRESENT***' : '***MISSING***',
                    'content-type': req.headers['content-type'],
                    'user-agent': req.headers['user-agent']?.substring(0, 50)
                }
            });

            const authHeader = req.headers['authorization'];
            console.log('🔑 Authorization header present:', !!authHeader);
            console.log('🔑 Authorization header format:', authHeader ? authHeader.split(' ')[0] : 'N/A');

            const token = authHeader && authHeader.split(' ')[1];
            console.log('🎫 Token extracted:', !!token);
            console.log('🎫 Token length:', token ? token.length : 0);

            if (!token) {
                console.log('❌ AUTH FAILED: No token provided');
                return res.status(401).json({
                    error: 'Access token required',
                    code: 'NO_TOKEN'
                });
            }

            try {
                console.log('🔍 Starting token verification...');
                const user = this.verifyToken(token, req);
                console.log('✅ Token verification successful');
                console.log('👤 User authenticated:', {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    tokenExpiry: new Date(user.exp * 1000).toISOString()
                });

                req.user = user;
                req.token = token; // Store token for potential revocation

                console.log('🔐 === AUTHENTICATION SUCCESSFUL ===');
                next();
            } catch (error) {
                console.log('❌ AUTH FAILED: Token verification error');
                console.log('Error details:', error.message);
                return res.status(403).json({
                    error: 'Invalid or expired token',
                    code: 'INVALID_TOKEN',
                    details: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
        };
    }

    /**
     * Express middleware for role-based authorization
     */
    requireRole(requiredRole) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            if (req.user.role !== requiredRole) {
                return res.status(403).json({ 
                    error: 'Insufficient permissions',
                    required: requiredRole,
                    current: req.user.role
                });
            }

            next();
        };
    }
}

module.exports = SessionManager;
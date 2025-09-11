/**
 * Modern Blog System - Main Server File
 * Author: Wasiq Syed
 *
 * This is the main Express.js server file for the Modern Blog System.
 * It handles routing, authentication, database operations, and more.
 *
 * 🚀 QUICK START FOR DEVELOPERS:
 * 1. Install dependencies: npm install
 * 2. Copy .env.example to .env and configure your settings
 * 3. Initialize database: npm run init-db
 * 4. Start server: npm run dev (development) or npm start (production)
 *
 * 📁 KEY FILES TO UNDERSTAND:
 * - server.js (this file) - Main application logic
 * - scripts/init-database.js - Database setup and schema
 * - middleware/session.js - Session management
 * - utils/sanitizer.js - Input sanitization
 * - spam-filter.js - Spam detection logic
 *
 * 🔧 COMMON MODIFICATIONS:
 * - Add new routes in the "Routes" section below
 * - Modify authentication in the "Authentication" section
 * - Update database operations in the "Database Operations" section
 * - Add new middleware in the "Middleware Setup" section
 */

const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const path = require('path');
const https = require('https');
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');

// Load environment variables first - CRITICAL: Must be loaded before any other operations
require('dotenv').config();

const nodemailer = require('nodemailer');
const { isSpamMessage } = require('./spam-filter');
const { sanitizeHTML, sanitizeText } = require('./utils/sanitizer');
const SessionManager = require('./middleware/session');

// Captcha verification function
async function verifyCaptcha(token, clientIP) {
    if (!token) {
        return { success: false, error: 'Captcha token missing' };
    }

    // For development/testing - temporarily bypass captcha verification
    const NODE_ENV = process.env.NODE_ENV || 'development';
    if (NODE_ENV === 'development') {
        console.log('🔧 Development mode: Bypassing captcha verification');
        console.log('📝 To enable captcha in production, set NODE_ENV=production and configure real hCaptcha keys');
        return { success: true };
    }

    // Production captcha verification
    const hCaptchaSecret = process.env.HCAPTCHA_SECRET;
    if (!hCaptchaSecret) {
        console.error('❌ HCAPTCHA_SECRET not set in production mode');
        return { success: false, error: 'Captcha service not configured' };
    }

    console.log('🔐 Verifying captcha with production keys');

    try {
        const response = await fetch('https://hcaptcha.com/siteverify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `secret=${hCaptchaSecret}&response=${token}&remoteip=${clientIP}`
        });

        if (!response.ok) {
            console.error('❌ hCaptcha API error:', response.status, response.statusText);
            return { success: false, error: 'hCaptcha API error' };
        }

        const data = await response.json();

        if (data.success) {
            console.log('✅ Captcha verification successful');
            return { success: true };
        } else {
            console.log('❌ Captcha verification failed:', data['error-codes']);
            return {
                success: false,
                error: 'Captcha verification failed',
                details: data['error-codes']
            };
        }
    } catch (error) {
        console.error('❌ Captcha verification error:', error.message);
        return { success: false, error: 'Captcha verification error' };
    }
}

// ==========================================
// APPLICATION SETUP & CONFIGURATION
// ==========================================

// Initialize Express application
const app = express();

// Server port configuration - defaults to 3000 if not set in environment
const PORT = process.env.PORT || 3000;

// Trust proxy when behind reverse proxy (nginx/apache)
// IMPORTANT: Always trust proxy on VPS deployments for proper IP detection
app.set('trust proxy', true);

// ==========================================
// APPLICATION CONFIGURATION
// ==========================================
// 🔧 TO MODIFY: Update these values in your .env file or change defaults here
const config = {
    dbPath: path.join(__dirname, 'database', 'blog_system.db'),
    jwtSecret: process.env.JWT_SECRET || (() => {
        console.error('⚠️  WARNING: JWT_SECRET not set! Using fallback secret for development only.');
        console.error('   Generate a secure secret: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
        return 'fallback-development-secret-do-not-use-in-production';
    })(),
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    
    // Email configuration
    email: {
        recipient: 'wasiq@wasiq.in',
        service: 'gmail',
        from: process.env.EMAIL_FROM || 'wasiq@wasiq.in'
    }
};

// Database connection
let db;
function connectDatabase() {
    try {
        // Close existing connection if it exists
        if (db) {
            try {
                db.close();
                console.log('🔄 Closed existing database connection');
            } catch (closeErr) {
                console.warn('⚠️ Error closing existing connection:', closeErr.message);
            }
        }

        db = new Database(config.dbPath);
        console.log('🗄️  Connected to SQLite database');

        // Test the connection
        try {
            const testStmt = db.prepare('SELECT 1 as test');
            const result = testStmt.get();
            if (result.test === 1) {
                console.log('✅ Database connection test successful');
            }
        } catch (testErr) {
            console.error('❌ Database connection test failed:', testErr.message);
            throw testErr;
        }

    } catch (err) {
        console.error('❌ Error connecting to database:', err.message);
        console.error('Full error:', err);
        process.exit(1);
    }
}

// ==========================================
// MIDDLEWARE SETUP
// ==========================================
// 🔧 TO MODIFY: Add new middleware here or modify existing security settings
// Security middleware - protects against common web vulnerabilities
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://hcaptcha.com", "https://*.hcaptcha.com"], // TODO: Remove unsafe-inline and use nonces
            scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "https://hcaptcha.com", "https://*.hcaptcha.com", "'unsafe-inline'"], // Allow inline scripts and hCaptcha
            scriptSrcAttr: ["'none'"], // Block inline event handlers
            imgSrc: ["'self'", "data:", "https:", "http:"],
            connectSrc: ["'self'", "https://hcaptcha.com", "https://*.hcaptcha.com"], // Allow hCaptcha API calls
            objectSrc: ["'none'"], // Block plugins
            baseUri: ["'self'"], // Restrict base tag
            formAction: ["'self'"], // Restrict form submissions
            frameAncestors: ["'none'"], // Prevent framing (clickjacking)
            frameSrc: ["https://hcaptcha.com", "https://*.hcaptcha.com"], // Allow hCaptcha frames
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    dnsPrefetchControl: true,
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: false,
    referrerPolicy: { policy: "no-referrer" },
    xssFilter: true,
}));

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);

        const allowedOrigins = [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:8080',
            'http://127.0.0.1:8080',
            'https://wasiq.in',
            'https://www.wasiq.in',
            'http://wasiq.in',
            'http://www.wasiq.in'
        ];

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.'
    }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 login requests per windowMs
    message: {
        error: 'Too many login attempts, please try again later.'
    }
});

app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// Serve static files with absolute path
app.use(express.static(path.join(__dirname), {
    index: false,
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
    setHeaders: (res, filePath) => {
        // Additional security headers for static files
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Cache-Control', process.env.NODE_ENV === 'production' ? 'public, max-age=86400' : 'no-cache');
        
        // Prevent serving sensitive files
        const fileName = path.basename(filePath);
        if (fileName.startsWith('.') || fileName.endsWith('.env') || fileName.includes('secret')) {
            res.status(404).end();
            return;
        }
    }
}));

// Debug route to test static file serving
app.get('/test-static', (req, res) => {
    const fs = require('fs');
    const path = require('path');
    
    const files = {
        'styles.css': fs.existsSync('./styles/styles.css'),
        'scripts.js': fs.existsSync('./scripts/scripts.js'),
        'current_dir': __dirname,
        'files_in_styles': fs.readdirSync('./styles'),
        'files_in_scripts': fs.readdirSync('./scripts')
    };
    
    res.json(files);
});

// Initialize session manager
const sessionManager = new SessionManager(config);

// JWT middleware (using new session manager)
const authenticateToken = sessionManager.authenticate();

// Audit logging middleware
const auditLog = (action) => {
    return (req, res, next) => {
        const logData = {
            user_id: req.user ? req.user.id : null,
            action: action,
            details: JSON.stringify({
                method: req.method,
                url: req.url,
                body: req.body ? Object.keys(req.body).reduce((acc, key) => {
                    // Sanitize sensitive data
                    if (key.includes('password') || key.includes('token') || key.includes('captcha')) {
                        acc[key] = '***REDACTED***';
                    } else {
                        acc[key] = req.body[key];
                    }
                    return acc;
                }, {}) : {}
            }),
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.get('User-Agent')
        };

        // Only log if database is connected and open
        if (db && db.open) {
            try {
                db.prepare(`
                    INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent)
                    VALUES (?, ?, ?, ?, ?)
                `).run(logData.user_id, logData.action, logData.details, logData.ip_address, logData.user_agent);
            } catch (err) {
                console.error('Audit log error:', err.message);
                // Don't fail the request if audit logging fails
                console.error('Audit log failed but continuing with request');
            }
        } else {
            console.log('⚠️ Audit log skipped - database not connected');
        }

        next();
    };
};

// Root route - serve index.html
app.get('/', (req, res) => {
    // Read the HTML file and inject hCaptcha site key
    const htmlPath = path.join(__dirname, 'index.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    
    // Inject hCaptcha site key for frontend use
    const siteKey = process.env.HCAPTCHA_SITE_KEY || '10000000-ffff-ffff-ffff-000000000001';
    html = html.replace(
        '<script src="scripts/captcha-manager.js"></script>',
        `<script>window.HCAPTCHA_SITE_KEY = '${siteKey}';</script>\n    <script src="scripts/captcha-manager.js"></script>`
    );
    
    res.send(html);
});

// Admin page route - serve admin.html with hCaptcha site key
app.get('/admin.html', (req, res) => {
    console.log('🏠 === ADMIN PAGE REQUEST ===');
    console.log('📍 Admin page requested');
    console.log('🌐 Request details:', {
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        headers: {
            authorization: req.headers.authorization ? '***PRESENT***' : '***MISSING***',
            cookie: req.headers.cookie ? '***PRESENT***' : '***MISSING***'
        }
    });

    const htmlPath = path.join(__dirname, 'admin.html');
    console.log('📁 Loading admin HTML file:', htmlPath);
    console.log('📁 File exists:', require('fs').existsSync(htmlPath));

    let html;
    try {
        html = fs.readFileSync(htmlPath, 'utf8');
        console.log('✅ Admin HTML file loaded successfully, length:', html.length);
    } catch (error) {
        console.error('❌ Error loading admin HTML file:', error);
        return res.status(500).send('Error loading admin page');
    }

    // Inject hCaptcha site key for frontend use
    const siteKey = process.env.HCAPTCHA_SITE_KEY || '10000000-ffff-ffff-ffff-000000000001';
    console.log('🔑 Injecting hCaptcha site key:', siteKey ? '***PROVIDED***' : '***MISSING***');

    const oldScript = '<script src="scripts/captcha-manager.js"></script>';
    const newScript = `<script>window.HCAPTCHA_SITE_KEY = '${siteKey}';</script>\n    <script src="scripts/captcha-manager.js"></script>`;

    if (html.includes(oldScript)) {
        html = html.replace(oldScript, newScript);
        console.log('✅ hCaptcha script injection successful');
    } else {
        console.log('⚠️ hCaptcha script tag not found in HTML, appending to head');
        html = html.replace('</head>', `${newScript}\n</head>`);
    }

    console.log('📤 Sending admin page response');
    console.log('🏠 === ADMIN PAGE REQUEST COMPLETED ===');
    res.send(html);
});

// Test page route - serve test-captcha.html with hCaptcha site key
app.get('/test-captcha.html', (req, res) => {
    const htmlPath = path.join(__dirname, 'test-captcha.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    
    // Inject hCaptcha site key for frontend use
    const siteKey = process.env.HCAPTCHA_SITE_KEY || '10000000-ffff-ffff-ffff-000000000001';
    html = html.replace(
        "window.HCAPTCHA_SITE_KEY = '10000000-ffff-ffff-ffff-000000000001';",
        `window.HCAPTCHA_SITE_KEY = '${siteKey}';`
    );
    
    res.send(html);
});

// Login page route - serve login.html with hCaptcha site key
app.get('/login.html', (req, res) => {
    const htmlPath = path.join(__dirname, 'login.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    
    // Inject hCaptcha site key for frontend use
    const siteKey = process.env.HCAPTCHA_SITE_KEY || '10000000-ffff-ffff-ffff-000000000001';
    html = html.replace(
        '<script src="scripts/captcha-manager.js"></script>',
        `<script>window.HCAPTCHA_SITE_KEY = '${siteKey}';</script>\n    <script src="scripts/captcha-manager.js"></script>`
    );
    
    res.send(html);
});

// ==========================================
// API ROUTES
// ==========================================
// 🔧 TO MODIFY: Add new API endpoints here or modify existing ones
// All API routes are prefixed with /api/ and handle JSON requests/responses

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================
// 🔐 Login, logout, and session management routes
app.post('/api/auth/login', [
    body('username').trim().isLength({ min: 1 }).escape(),
    body('password').isLength({ min: 1 })
], auditLog('LOGIN_ATTEMPT'), async (req, res) => {
    console.log('🔐 === LOGIN ATTEMPT STARTED ===');
    console.log('📨 Request body:', {
        username: req.body.username,
        password: req.body.password ? '***PROVIDED***' : '***MISSING***',
        captchaToken: req.body['h-captcha-response'] ? '***PROVIDED***' : '***MISSING***'
    });
    console.log('🌐 Client info:', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        headers: {
            'x-forwarded-for': req.headers['x-forwarded-for'],
            'x-real-ip': req.headers['x-real-ip']
        }
    });

    try {
        const errors = validationResult(req);
        console.log('✅ Input validation result:', {
            hasErrors: !errors.isEmpty(),
            errorCount: errors.array().length,
            errors: errors.array()
        });

        if (!errors.isEmpty()) {
            console.log('❌ LOGIN FAILED: Invalid input validation');
            return res.status(400).json({ error: 'Invalid input', details: errors.array() });
        }

        const { username, password } = req.body;
        console.log('👤 Processing login for username:', username);

        // Verify captcha first
        const captchaToken = req.body['h-captcha-response'];
        const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];

        console.log('🤖 Starting captcha verification...');
        console.log('🔑 Captcha token present:', !!captchaToken);
        console.log('🌍 Client IP for captcha:', clientIP);

        const captchaResult = await verifyCaptcha(captchaToken, clientIP);
        console.log('✅ Captcha verification result:', {
            success: captchaResult.success,
            error: captchaResult.error,
            details: captchaResult.details
        });

        if (!captchaResult.success) {
            console.log('❌ LOGIN FAILED: Captcha verification failed');
            return res.status(400).json({
                error: 'Captcha verification failed. Please try again.',
                details: captchaResult.error
            });
        }

        console.log('🔍 Starting database user lookup...');
        try {
            // Check if user exists and get account info
            console.log('📊 Executing user lookup query for:', username);
            const user = db.prepare(`
                SELECT id, username, password_hash, role, login_attempts, locked_until
                FROM users WHERE username = ?
            `).get(username);

            console.log('👤 User lookup result:', {
                userFound: !!user,
                userId: user ? user.id : null,
                username: user ? user.username : null,
                role: user ? user.role : null,
                loginAttempts: user ? user.login_attempts : null,
                lockedUntil: user ? user.locked_until : null
            });

            if (!user) {
                console.log('❌ LOGIN FAILED: User not found in database');
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Check if account is locked
            console.log('🔒 Checking account lock status...');
            const now = new Date();
            const lockedUntil = user.locked_until ? new Date(user.locked_until) : null;
            const isLocked = lockedUntil && now < lockedUntil;

            console.log('🔒 Account lock check:', {
                lockedUntil: user.locked_until,
                currentTime: now.toISOString(),
                lockTime: lockedUntil ? lockedUntil.toISOString() : null,
                isLocked: isLocked
            });

            if (isLocked) {
                console.log('❌ LOGIN FAILED: Account is locked');
                return res.status(423).json({
                    error: 'Account temporarily locked due to too many failed attempts'
                });
            }

            // Verify password
            console.log('🔐 Starting password verification...');
            console.log('📝 Password hash exists:', !!user.password_hash);
            console.log('📝 Password hash length:', user.password_hash ? user.password_hash.length : 0);

            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            console.log('✅ Password verification result:', isValidPassword);

            if (!isValidPassword) {
                console.log('❌ LOGIN FAILED: Invalid password');

                // Increment failed attempts and lockout if needed
                const newAttempts = user.login_attempts + 1;
                const shouldLock = newAttempts >= config.maxLoginAttempts;
                const lockUntil = shouldLock ? new Date(Date.now() + config.lockoutDuration).toISOString() : null;

                console.log('📊 Failed login attempt handling:', {
                    currentAttempts: user.login_attempts,
                    newAttempts: newAttempts,
                    maxAttempts: config.maxLoginAttempts,
                    shouldLock: shouldLock,
                    lockDuration: config.lockoutDuration,
                    lockUntil: lockUntil
                });

                try {
                    const updateResult = db.prepare(`
                        UPDATE users
                        SET login_attempts = ?, locked_until = ?
                        WHERE id = ?
                    `).run(newAttempts, lockUntil, user.id);

                    console.log('✅ Failed login database update result:', {
                        changes: updateResult.changes,
                        lastInsertRowid: updateResult.lastInsertRowid
                    });
                } catch (dbError) {
                    console.error('❌ Database error during failed login update:', dbError);
                }

                return res.status(401).json({ error: 'Invalid credentials' });
            }

            console.log('✅ PASSWORD VERIFICATION SUCCESSFUL');

            // Successful login - reset attempts and update last login
            console.log('🔄 Resetting login attempts and updating last login...');
            try {
                const resetResult = db.prepare(`
                    UPDATE users
                    SET login_attempts = 0, locked_until = NULL, last_login = CURRENT_TIMESTAMP
                    WHERE id = ?
                `).run(user.id);

                console.log('✅ Successful login database update result:', {
                    changes: resetResult.changes,
                    userId: user.id
                });
            } catch (dbError) {
                console.error('❌ Database error during successful login update:', dbError);
            }

            // Generate secure JWT token
            console.log('🎫 Generating JWT token...');
            const token = sessionManager.generateToken(user, req);
            console.log('✅ JWT token generated successfully:', !!token);

            console.log('📤 Preparing successful login response...');
            const responseData = {
                message: 'Login successful',
                token: token,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role
                }
            };

            console.log('✅ LOGIN SUCCESSFUL - Final response data:', {
                message: responseData.message,
                tokenProvided: !!responseData.token,
                tokenLength: responseData.token ? responseData.token.length : 0,
                user: {
                    id: responseData.user.id,
                    username: responseData.user.username,
                    role: responseData.user.role
                }
            });

            console.log('🔐 === LOGIN PROCESS COMPLETED SUCCESSFULLY ===');
            res.json(responseData);

        } catch (dbError) {
            console.error('❌ LOGIN FAILED: Database error during login process');
            console.error('Database error details:', dbError);
            return res.status(500).json({ error: 'Database error' });
        }
    } catch (error) {
        console.error('❌ LOGIN FAILED: Unexpected error');
        console.error('Error details:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Logout endpoint - invalidates user session
app.post('/api/auth/logout', authenticateToken, auditLog('LOGOUT'), async (req, res) => {
    console.log('🚪 === LOGOUT REQUEST ===');
    console.log('👤 User logging out:', req.user ? {
        id: req.user.id,
        username: req.user.username,
        role: req.user.role
    } : 'NOT AUTHENTICATED');
    console.log('🎫 Token to revoke:', req.token ? '***PRESENT***' : '***MISSING***');

    try {
        console.log('🔄 Starting logout process...');

        // Revoke the current token
        if (req.token) {
            console.log('🗑️ Revoking token...');
            sessionManager.revokeToken(req.token);
            console.log('✅ Token revoked successfully');
        } else {
            console.log('⚠️ No token to revoke');
        }

        const responseData = {
            message: 'Logout successful',
            timestamp: new Date().toISOString(),
            user: req.user ? {
                id: req.user.id,
                username: req.user.username
            } : null
        };

        console.log('📤 Sending logout response:', responseData);
        console.log('🚪 === LOGOUT COMPLETED ===');
        res.json(responseData);

    } catch (error) {
        console.error('❌ LOGOUT ERROR: Unexpected error during logout');
        console.error('Error details:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Verify token endpoint
app.get('/api/auth/verify', authenticateToken, (req, res) => {
    console.log('🔍 === TOKEN VERIFICATION REQUEST ===');
    console.log('👤 Verified user:', req.user ? {
        id: req.user.id,
        username: req.user.username,
        role: req.user.role,
        tokenExpiry: req.user.exp ? new Date(req.user.exp * 1000).toISOString() : 'N/A'
    } : 'NOT AUTHENTICATED');

    const responseData = {
        valid: true,
        user: {
            id: req.user.id,
            username: req.user.username,
            role: req.user.role
        },
        timestamp: new Date().toISOString(),
        clientIP: req.ip
    };

    console.log('✅ Token verification successful, sending response:', responseData);
    console.log('🔍 === TOKEN VERIFICATION COMPLETED ===');

    res.json(responseData);
});

// ==========================================
// BLOG ENDPOINTS
// ==========================================
// 📝 Blog creation, reading, updating, and deletion routes
// 🔧 TO MODIFY: Add new blog features or modify existing blog operations here

// Get all published blogs
app.get('/api/blogs', (req, res) => {
    try {
        const blogs = db.prepare(`
            SELECT 
                b.id, b.title, b.slug, b.category, b.description, 
                b.image_url, b.tags, b.read_time, b.created_at,
                u.username as author
            FROM blogs b
            LEFT JOIN users u ON b.author_id = u.id
            WHERE b.published = 1
            ORDER BY b.created_at DESC
        `).all();

        // Parse tags from string to array
        const blogsWithParsedTags = blogs.map(blog => ({
            ...blog,
            tags: blog.tags ? blog.tags.split(',') : [],
            dateCreated: blog.created_at
        }));

        res.json(blogsWithParsedTags);
    } catch (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
    }
});

// Get single blog by slug
app.get('/api/blogs/:slug', (req, res) => {
    const { slug } = req.params;

    try {
        const blog = db.prepare(`
            SELECT 
                b.id, b.title, b.slug, b.category, b.description, b.content,
                b.image_url, b.tags, b.read_time, b.created_at, b.updated_at,
                u.username as author
            FROM blogs b
            LEFT JOIN users u ON b.author_id = u.id
            WHERE b.slug = ? AND b.published = 1
        `).get(slug);

        if (!blog) {
            return res.status(404).json({ error: 'Blog not found' });
        }

        // Parse tags from string to array
        blog.tags = blog.tags ? blog.tags.split(',') : [];
        blog.dateCreated = blog.created_at;

        res.json(blog);
    } catch (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
    }
});

// Admin blog endpoints (require authentication)

// Get all blogs (including unpublished) for admin
app.get('/api/admin/blogs', authenticateToken, auditLog('VIEW_ADMIN_BLOGS'), (req, res) => {
    console.log('📚 === ADMIN BLOGS REQUEST ===');
    console.log('👤 Authenticated user:', req.user ? {
        id: req.user.id,
        username: req.user.username,
        role: req.user.role
    } : 'NOT AUTHENTICATED');
    console.log('📋 Query parameters:', req.query);

    try {
        console.log('🔍 Executing admin blogs database query...');
        const blogs = db.prepare(`
            SELECT
                b.id, b.title, b.slug, b.category, b.description, b.content,
                b.image_url, b.tags, b.read_time, b.published, b.created_at, b.updated_at,
                u.username as author
            FROM blogs b
            LEFT JOIN users u ON b.author_id = u.id
            ORDER BY b.created_at DESC
        `).all();

        console.log('📊 Raw blogs data from database:', {
            totalBlogs: blogs.length,
            publishedBlogs: blogs.filter(b => b.published).length,
            unpublishedBlogs: blogs.filter(b => !b.published).length,
            sampleBlog: blogs.length > 0 ? {
                id: blogs[0].id,
                title: blogs[0].title,
                published: blogs[0].published,
                author: blogs[0].author
            } : null
        });

        const blogsWithParsedTags = blogs.map(blog => ({
            ...blog,
            tags: blog.tags ? blog.tags.split(',') : [],
            dateCreated: blog.created_at
        }));

        console.log('✅ Blogs processed successfully:', {
            totalBlogs: blogsWithParsedTags.length,
            blogsWithTags: blogsWithParsedTags.filter(b => b.tags.length > 0).length,
            blogsWithoutTags: blogsWithParsedTags.filter(b => b.tags.length === 0).length
        });

        console.log('📤 Sending admin blogs response');
        console.log('📚 === ADMIN BLOGS REQUEST COMPLETED ===');
        res.json(blogsWithParsedTags);
    } catch (err) {
        console.error('❌ ADMIN BLOGS ERROR: Database error');
        console.error('Database error details:', err);
        return res.status(500).json({ error: 'Database error' });
    }
});

// Helper function to generate unique slug
function generateUniqueSlug(baseSlug, excludeId = null) {
    let slugToTry = baseSlug;
    let counter = 1;
    
    while (true) {
        try {
            const query = excludeId 
                ? 'SELECT COUNT(*) as count FROM blogs WHERE slug = ? AND id != ?'
                : 'SELECT COUNT(*) as count FROM blogs WHERE slug = ?';
            const params = excludeId ? [slugToTry, excludeId] : [slugToTry];
            
            const row = db.prepare(query).get(...params);
            
            if (row.count === 0) {
                // Slug is unique
                return slugToTry;
            } else {
                // Slug exists, try with counter
                slugToTry = `${baseSlug}-${counter}`;
                counter++;
            }
        } catch (err) {
            throw err;
        }
    }
}

// Create new blog
app.post('/api/admin/blogs', authenticateToken, [
    body('title').trim().isLength({ min: 3, max: 255 }).escape(),
    body('category').trim().isLength({ min: 1, max: 100 }).escape(),
    body('description').trim().isLength({ min: 10, max: 2000 }),
    body('h-captcha-response').optional(),
    body('content').isLength({ min: 20, max: 50000 }),
    body('tags').optional().trim(),
    body('image_url').optional({ checkFalsy: true }).isURL(),
    body('read_time').optional().isInt({ min: 1, max: 120 })
], auditLog('CREATE_BLOG'), async (req, res) => {
    console.log('📝 === BLOG CREATION REQUEST RECEIVED ===');
    console.log('👤 Authenticated user:', req.user ? {
        id: req.user.id,
        username: req.user.username,
        role: req.user.role
    } : 'NOT AUTHENTICATED');
    console.log('📋 Request body received:', {
        title: req.body.title ? '***PROVIDED***' : '***MISSING***',
        category: req.body.category,
        description: req.body.description ? '***PROVIDED***' : '***MISSING***',
        content: req.body.content ? '***PROVIDED***' : '***MISSING***',
        tags: req.body.tags,
        image_url: req.body.image_url,
        read_time: req.body.read_time,
        captchaResponse: req.body['h-captcha-response'] ? '***PROVIDED***' : '***MISSING***'
    });

    const errors = validationResult(req);
    console.log('✅ Server-side validation result:', {
        hasErrors: !errors.isEmpty(),
        errorCount: errors.array().length,
        errors: errors.array()
    });

    if (!errors.isEmpty()) {
        console.log('❌ BLOG CREATION FAILED: Validation errors');
        return res.status(400).json({
            error: 'Invalid input',
            details: errors.array(),
            message: 'Please check all required fields and try again.'
        });
    }

    console.log('✅ Server-side validation passed');

    const { title, category, description, content, tags, image_url, read_time, 'h-captcha-response': captchaToken } = req.body;

    // Verify captcha if provided (optional for blog creation)
    const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    console.log('🤖 Starting captcha verification...');
    console.log('🔑 Captcha token present:', !!captchaToken);
    console.log('🌍 Client IP for captcha:', clientIP);

    let captchaVerification = { success: true, error: null, details: 'Captcha optional for blog creation' };
    if (captchaToken) {
        captchaVerification = await verifyCaptcha(captchaToken, clientIP);
    }
    console.log('✅ Captcha verification result:', {
        success: captchaVerification.success,
        error: captchaVerification.error,
        details: captchaVerification.details
    });

    if (!captchaVerification.success) {
        console.log('❌ BLOG CREATION FAILED: Captcha verification failed');
        return res.status(400).json({
            error: 'Captcha verification failed. Please try again.',
            details: captchaVerification.error
        });
    }

    console.log('✅ Captcha verification passed');

    // Generate base slug from title
    console.log('🔗 Generating slug from title:', title);
    const baseSlug = title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    console.log('🔗 Base slug generated:', baseSlug);

    // Generate unique slug
    console.log('🔗 Generating unique slug...');
    try {
        const uniqueSlug = generateUniqueSlug(baseSlug);
        console.log('🔗 Unique slug generated:', uniqueSlug);

        // Sanitize content before storing
        console.log('🧹 Sanitizing HTML content...');
        const sanitizedContent = sanitizeHTML(content);
        console.log('🧹 Content sanitized, original length:', content.length, 'sanitized length:', sanitizedContent.length);

        console.log('💾 Preparing database insertion...');
        const result = db.prepare(`
            INSERT INTO blogs (title, slug, category, description, content, image_url, tags, read_time, author_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            title,
            uniqueSlug,
            category,
            description,
            sanitizedContent,
            image_url || null,
            tags || '',
            read_time || 5,
            req.user.id
        );

        console.log('✅ Database insertion result:', {
            changes: result.changes,
            lastInsertRowid: result.lastInsertRowid,
            blogId: result.lastInsertRowid
        });

        if (result.changes === 0) {
            console.log('❌ BLOG CREATION FAILED: Database insertion failed');
            return res.status(500).json({ error: 'Failed to create blog post' });
        }

        console.log('✅ Blog created successfully in database');

        // Send notification emails to subscribers
        const newBlog = {
            id: result.lastInsertRowid,
            title,
            slug: uniqueSlug,
            category,
            description,
            content
        };

        console.log('📧 Preparing blog notification emails...');

        // Send notification emails asynchronously (don't wait for it)
        setTimeout(() => {
            try {
                sendBlogNotificationEmails(newBlog);
                console.log('✅ Blog notification emails sent');
            } catch (emailError) {
                console.error('❌ Error sending blog notification emails:', emailError);
            }
        }, 1000);

        console.log('📤 Preparing successful response...');
        const responseData = {
            message: 'Blog created successfully',
            blog: {
                id: result.lastInsertRowid,
                title,
                slug: uniqueSlug,
                category,
                description,
                tags: tags ? tags.split(',') : [],
                read_time: read_time || 5
            }
        };

        console.log('✅ BLOG CREATION COMPLETED SUCCESSFULLY');
        res.status(201).json(responseData);
    } catch (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
    }
});

// Update blog
app.put('/api/admin/blogs/:id', authenticateToken, [
    body('title').trim().isLength({ min: 3, max: 255 }).escape(),
    body('category').trim().isLength({ min: 1, max: 100 }).escape(),
    body('description').trim().isLength({ min: 10, max: 2000 }),
    body('content').isLength({ min: 20, max: 50000 }),
    body('tags').optional().trim(),
    body('image_url').optional({ checkFalsy: true }).isURL(),
    body('read_time').optional().isInt({ min: 1, max: 120 })
], auditLog('UPDATE_BLOG'), (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Invalid input', details: errors.array() });
    }

    const { id } = req.params;
    const { title, category, description, content, tags, image_url, read_time } = req.body;
    
    // Generate base slug from title
    const baseSlug = title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    // Generate unique slug (excluding current blog ID)
    try {
        const uniqueSlug = generateUniqueSlug(baseSlug, id);

        const result = db.prepare(`
            UPDATE blogs 
            SET title = ?, slug = ?, category = ?, description = ?, content = ?, 
                image_url = ?, tags = ?, read_time = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            title, 
            uniqueSlug, 
            category, 
            description, 
            content, 
            image_url,
            tags || '',
            read_time,
            id
        );

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Blog not found' });
        }

        res.json({
            message: 'Blog updated successfully',
            blog: {
                id,
                title,
                slug: uniqueSlug,
                category,
                description,
                tags: tags ? tags.split(',') : []
            }
        });
    } catch (err) {
        console.error('Error updating blog:', err);
        return res.status(500).json({ error: 'Database error' });
    }
});

// Delete blog
app.delete('/api/admin/blogs/:id', authenticateToken, auditLog('DELETE_BLOG'), (req, res) => {
    const { id } = req.params;

    try {
        const result = db.prepare('DELETE FROM blogs WHERE id = ?').run(id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Blog not found' });
        }

        res.json({ message: 'Blog deleted successfully' });
    } catch (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
    }
});

// Get audit logs
app.get('/api/admin/audit-logs', authenticateToken, (req, res) => {
    try {
        const logs = db.prepare(`
            SELECT 
                al.id, al.action, al.details, al.ip_address, al.created_at,
                u.username
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            ORDER BY al.created_at DESC
            LIMIT 100
        `).all();

        res.json(logs);
    } catch (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
    }
});

// Get anonymous messages for admin panel
app.get('/api/admin/anon-messages', authenticateToken, auditLog('VIEW_ANON_MESSAGES'), (req, res) => {
    try {
        const messages = db.prepare(`
            SELECT id, message, ip_address, user_agent, created_at
            FROM anon_messages
            ORDER BY created_at DESC
            LIMIT 100
        `).all();

        res.json(messages);
    } catch (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
    }
});

// Get email subscribers for admin panel
app.get('/api/admin/subscribers', authenticateToken, auditLog('VIEW_SUBSCRIBERS'), (req, res) => {
    try {
        const subscribers = db.prepare(`
            SELECT id, email, name, verified, subscribed, created_at, updated_at
            FROM email_subscribers
            ORDER BY created_at DESC
        `).all();

        res.json(subscribers);
    } catch (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
    }
});

// Send custom email to subscribers
app.post('/api/admin/send-email', authenticateToken, [
    body('subject').trim().isLength({ min: 3, max: 200 }).escape(),
    body('message').trim().isLength({ min: 10, max: 5000 }),
    body('recipients').optional().isIn(['all', 'verified']),
    body('h-captcha-response').notEmpty()
], auditLog('SEND_CUSTOM_EMAIL'), async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            error: 'Invalid input', 
            details: errors.array() 
        });
    }

    const { subject, message, recipients = 'verified', 'h-captcha-response': captchaToken } = req.body;

    // Verify captcha first
    const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    const captchaVerification = await verifyCaptcha(captchaToken, clientIP);
    
    if (!captchaVerification.success) {
        return res.status(400).json({ 
            error: 'Captcha verification failed. Please try again.' 
        });
    }
    
    if (!emailTransporter) {
        return res.status(500).json({ 
            error: 'Email service not available. Check EMAIL_PASS environment variable.' 
        });
    }

    // Get subscribers based on recipients filter
    const query = recipients === 'all' 
        ? 'SELECT email, name FROM email_subscribers WHERE subscribed = 1'
        : 'SELECT email, name FROM email_subscribers WHERE subscribed = 1 AND verified = 1';

    try {
        const subscribers = db.prepare(query).all();
        if (subscribers.length === 0) {
            return res.status(400).json({ 
                error: 'No subscribers found to send email to.' 
            });
        }

        console.log(`📧 Sending custom email to ${subscribers.length} subscribers`);
        console.log(`   Subject: ${subject}`);
        console.log(`   Recipients: ${recipients}`);

        let emailsSent = 0;
        let emailsFailed = 0;
        const errors = [];

        // Send email to each subscriber
        subscribers.forEach((subscriber) => {
            const baseUrl = process.env.BASE_URL || 'https://wasiq.in';
            const unsubscribeUrl = `${baseUrl}/api/unsubscribe/${encodeURIComponent(subscriber.email)}`;

            const mailOptions = {
                from: config.email.from,
                to: subscriber.email,
                subject: subject,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #374151;">${subject}</h2>
                        <p>Hi ${subscriber.name || 'there'},</p>
                        
                        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; line-height: 1.6;">
                            ${message.replace(/\n/g, '<br>')}
                        </div>
                        
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                        <p style="color: #666; font-size: 12px;">
                            This email was sent from Wasiq Syed's blog. 
                            <a href="${unsubscribeUrl}" style="color: #2563eb;">Unsubscribe</a>
                        </p>
                    </div>
                `
            };

            emailTransporter.sendMail(mailOptions, (error) => {
                if (error) {
                    console.error(`❌ Custom email failed for ${subscriber.email}:`, error.message);
                    emailsFailed++;
                    errors.push(`${subscriber.email}: ${error.message}`);
                } else {
                    console.log(`✅ Custom email sent to: ${subscriber.email}`);
                    emailsSent++;
                }

                // Send response when all emails are processed
                if (emailsSent + emailsFailed === subscribers.length) {
                    res.json({
                        success: true,
                        message: `Email broadcast completed`,
                        stats: {
                            total: subscribers.length,
                            sent: emailsSent,
                            failed: emailsFailed,
                            errors: errors.length > 0 ? errors : undefined
                        }
                    });
                }
            });
        });
    } catch (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
    }
});

// SEO-related endpoints

// Generate XML Sitemap
app.get('/sitemap.xml', (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    try {
        const blogs = db.prepare(`
            SELECT slug, updated_at, created_at
            FROM blogs 
            WHERE published = 1
            ORDER BY updated_at DESC
        `).all();

        const staticPages = [
            { url: '/', lastmod: new Date().toISOString(), changefreq: 'daily', priority: '1.0' },
            { url: '/blogs.html', lastmod: new Date().toISOString(), changefreq: 'daily', priority: '0.9' },
            { url: '/login.html', lastmod: new Date().toISOString(), changefreq: 'monthly', priority: '0.3' }
        ];

        const blogPages = blogs.map(blog => ({
            url: `/blog/${blog.slug}`,
            lastmod: new Date(blog.updated_at || blog.created_at).toISOString(),
            changefreq: 'weekly',
            priority: '0.8'
        }));

        const allPages = [...staticPages, ...blogPages];

        let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

        allPages.forEach(page => {
            sitemap += `
  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
        });

        sitemap += `
</urlset>`;

        res.set('Content-Type', 'application/xml');
        res.send(sitemap);
    } catch (err) {
        console.error('Database error:', err);
        return res.status(500).send('Error generating sitemap');
    }
});

// Generate Robots.txt
app.get('/robots.txt', (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    const robotsTxt = `User-agent: *
Allow: /
Allow: /blogs.html
Allow: /blog/*
Allow: /*.css
Allow: /*.js
Allow: /*.png
Allow: /*.jpg
Allow: /*.jpeg
Allow: /*.gif
Allow: /*.svg

Disallow: /admin.html
Disallow: /login.html
Disallow: /api/
Disallow: /database/
Disallow: /node_modules/
Disallow: /*debug*

Sitemap: ${baseUrl}/sitemap.xml`;

    res.set('Content-Type', 'text/plain');
    res.send(robotsTxt);
});

// Email subscription routes
app.post('/api/subscribe', [
    body('email').isEmail().normalizeEmail(),
    body('name').optional().trim().isLength({ min: 1, max: 100 }).escape(),
    body('h-captcha-response').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: 'Please provide a valid email address.' 
            });
        }

        const { email, name, 'h-captcha-response': captchaToken } = req.body;

        // Verify captcha first
        const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
        const captchaVerification = await verifyCaptcha(captchaToken, clientIP);
        
        if (!captchaVerification.success) {
            return res.status(400).json({ 
                error: 'Captcha verification failed. Please try again.' 
            });
        }
        const verificationToken = crypto.randomBytes(32).toString('hex');
        
        console.log(`📧 Subscription request for: ${email} with token: ${verificationToken.substring(0, 10)}...`);

        // Check if email already exists
        try {
            const existing = db.prepare('SELECT id, verified FROM email_subscribers WHERE email = ?').get(email);

            if (existing) {
                if (existing.verified) {
                    return res.status(400).json({ error: 'This email is already subscribed to our newsletter.' });
                } else {
                    // Update verification token before resending email
                    db.prepare(`
                        UPDATE email_subscribers 
                        SET verification_token = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE email = ?
                    `).run(verificationToken, email);
                    
                    console.log(`🔄 Updated verification token for existing subscriber: ${email}`);
                    
                    // Resend verification email with new token
                    sendVerificationEmail(email, name, verificationToken);
                    return res.json({ 
                        success: true, 
                        message: 'Verification email sent! Please check your inbox to confirm your subscription.' 
                    });
                }
            }

            // Insert new subscriber
            db.prepare(`
                INSERT INTO email_subscribers (email, name, verification_token, verified)
                VALUES (?, ?, ?, 0)
            `).run(email, name || '', verificationToken);

            // Send verification email
            sendVerificationEmail(email, name, verificationToken);
                
            res.json({ 
                success: true, 
                message: 'Thank you for subscribing! Please check your email to confirm your subscription.' 
            });
        } catch (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

    } catch (error) {
        console.error('Subscription error:', error);
        res.status(500).json({ error: 'Subscription failed' });
    }
});

// Verify email subscription
app.get('/api/verify-email/:token', (req, res) => {
    const { token } = req.params;

    console.log(`🔍 Verification attempt with token: ${token.substring(0, 10)}...`);
    
    // First check if the token exists in database
    try {
        const subscriber = db.prepare('SELECT email, verified FROM email_subscribers WHERE verification_token = ?').get(token);

        if (!subscriber) {
            console.log(`❌ Token not found in database: ${token.substring(0, 10)}...`);
            return res.status(400).send(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Verification Failed - Wasiq Syed</title>
                    <link rel="stylesheet" href="/styles/styles.css">
                </head>
                <body class="blog-page">
                    <div class="container">
                        <h1>❌ Verification Failed</h1>
                        <p>This verification link is invalid or has expired. This can happen if:</p>
                        <ul>
                            <li>You've already verified your email</li>
                            <li>You requested a new verification email (old links become invalid)</li>
                            <li>The link is older than expected</li>
                        </ul>
                        <p>Please try subscribing again to get a fresh verification link.</p>
                        <a href="/blogs.html">← Back to Blogs</a>
                    </div>
                </body>
                </html>
            `);
        }

        if (subscriber.verified) {
            console.log(`✅ Email already verified: ${subscriber.email}`);
            return res.send(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Already Verified - Wasiq Syed</title>
                    <link rel="stylesheet" href="/styles/styles.css">
                </head>
                <body class="blog-page">
                    <div class="container">
                        <h1>✅ Already Verified!</h1>
                        <p>Your email (${subscriber.email}) is already verified and you're subscribed to blog notifications.</p>
                        <a href="/blogs.html">← Back to Blogs</a>
                    </div>
                </body>
                </html>
            `);
        }

        // Proceed with verification
        db.prepare(`
            UPDATE email_subscribers 
            SET verified = 1, verification_token = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE verification_token = ?
        `).run(token);

        console.log(`✅ Email verified successfully: ${subscriber.email}`);
        
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Email Verified - Wasiq Syed</title>
                <link rel="stylesheet" href="/styles/styles.css">
            </head>
            <body class="blog-page">
                <div class="container">
                    <h1>✅ Email Verified!</h1>
                    <p>Your email has been successfully verified. You will now receive notifications when new blog posts are published.</p>
                    <a href="/blogs.html">← Back to Blogs</a>
                </div>
            </body>
            </html>
        `);
    } catch (err) {
        console.error('Database error during verification:', err);
        return res.status(500).send('Verification failed - database error');
    }
});

// Unsubscribe from email notifications
app.get('/api/unsubscribe/:email', (req, res) => {
    const { email } = req.params;
    const decodedEmail = decodeURIComponent(email);

    try {
        db.prepare(`
            UPDATE email_subscribers 
            SET subscribed = 0, updated_at = CURRENT_TIMESTAMP
            WHERE email = ?
        `).run(decodedEmail);

        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Unsubscribed - Wasiq Syed</title>
                <link rel="stylesheet" href="/styles/styles.css">
            </head>
            <body>
                <div class="container">
                    <h1>📧 Unsubscribed</h1>
                    <p>You have been successfully unsubscribed from email notifications.</p>
                    <a href="/blogs.html">← Back to Blogs</a>
                </div>
            </body>
            </html>
        `);
    } catch (err) {
        console.error('Database error:', err);
        return res.status(500).send('Unsubscribe failed');
    }
});

// Function to send verification email
function sendVerificationEmail(email, name, token) {
    if (!emailTransporter) {
        console.log('📧 Email transporter not available - verification email not sent');
        return;
    }

    const baseUrl = process.env.BASE_URL || 'https://wasiq.in';
    const verificationUrl = `${baseUrl}/api/verify-email/${token}`;

    const mailOptions = {
        from: config.email.from,
        to: email,
        subject: 'Confirm your subscription to Wasiq Syed\'s Blog',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #374151;">Confirm Your Subscription</h2>
                <p>Hi ${name || 'there'},</p>
                <p>Thank you for subscribing to my blog! To start receiving email notifications when new posts are published, please click the button below:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationUrl}" style="background: #374151; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Confirm Subscription</a>
                </div>
                
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
                
                <p>If you didn't request this subscription, you can safely ignore this email.</p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                <p style="color: #666; font-size: 12px;">This email was sent from Wasiq Syed's blog subscription system.</p>
            </div>
        `
    };

    emailTransporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('❌ Verification email failed:', error);
        } else {
            console.log('✅ Verification email sent to:', email);
        }
    });
}

// Function to send blog notification emails
function sendBlogNotificationEmails(blog) {
    if (!emailTransporter) {
        console.log('📧 Email transporter not available - notification emails not sent');
        return;
    }

    try {
        const subscribers = db.prepare('SELECT email, name FROM email_subscribers WHERE subscribed = 1 AND verified = 1').all();

        if (subscribers.length === 0) {
            console.log('📧 No verified subscribers to notify');
            return;
        }

        const baseUrl = process.env.BASE_URL || 'https://wasiq.in';
        const blogUrl = `${baseUrl}/blog/${blog.slug}`;
        const unsubscribeUrl = `${baseUrl}/api/unsubscribe/`;

        subscribers.forEach(subscriber => {
            const mailOptions = {
                from: config.email.from,
                to: subscriber.email,
                subject: `New Blog Post: ${blog.title}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #374151;">New Blog Post Published!</h2>
                        <p>Hi ${subscriber.name || 'there'},</p>
                        <p>I've just published a new blog post that you might find interesting:</p>
                        
                        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0;">${blog.title}</h3>
                            <p style="color: #666;">${blog.description}</p>
                            <p style="color: #888; font-size: 14px;">Category: ${blog.category}</p>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${blogUrl}" style="background: #374151; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Read Full Post</a>
                        </div>
                        
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                        <p style="color: #666; font-size: 12px;">
                            You're receiving this email because you subscribed to blog notifications. 
                            <a href="${unsubscribeUrl}${encodeURIComponent(subscriber.email)}" style="color: #2563eb;">Unsubscribe</a>
                        </p>
                    </div>
                `
            };

            emailTransporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error(`❌ Notification email failed for ${subscriber.email}:`, error);
                } else {
                    console.log(`✅ Notification email sent to: ${subscriber.email}`);
                }
            });
        });

        console.log(`📧 Blog notification emails sent to ${subscribers.length} subscribers`);
    } catch (err) {
        console.error('Database error fetching subscribers:', err);
    }
}

// Generate RSS Feed
app.get('/rss.xml', (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    try {
        const blogs = db.prepare(`
            SELECT 
                b.title, b.slug, b.category, b.description, b.content,
                b.created_at, b.updated_at,
                u.username as author
            FROM blogs b
            LEFT JOIN users u ON b.author_id = u.id
            WHERE b.published = 1
            ORDER BY b.created_at DESC
            LIMIT 20
        `).all();

        const rssDate = new Date().toUTCString();
        
        let rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Wasiq Syed - Blog</title>
    <description>Insights on web development and technology by Wasiq Syed</description>
    <link>${baseUrl}</link>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    <language>en-us</language>
    <lastBuildDate>${rssDate}</lastBuildDate>
    <pubDate>${rssDate}</pubDate>
    <ttl>1440</ttl>`;

        blogs.forEach(blog => {
            const pubDate = new Date(blog.created_at).toUTCString();
            const contentPreview = blog.content.replace(/<[^>]*>/g, '').substring(0, 200) + '...';
            
            rss += `
    <item>
      <title><![CDATA[${blog.title}]]></title>
      <description><![CDATA[${blog.description}]]></description>
      <content:encoded><![CDATA[${contentPreview}]]></content:encoded>
      <link>${baseUrl}/blog/${blog.slug}</link>
      <guid isPermaLink="true">${baseUrl}/blog/${blog.slug}</guid>
      <category><![CDATA[${blog.category}]]></category>
      <pubDate>${pubDate}</pubDate>
      <author>${blog.author || 'Wasiq Syed'}</author>
    </item>`;
        });

        rss += `
  </channel>
</rss>`;

        res.set('Content-Type', 'application/rss+xml');
        res.send(rss);
    } catch (err) {
        console.error('Database error:', err);
        return res.status(500).send('Error generating RSS feed');
    }
});

// SEO-optimized blog page route (instead of popup)
app.get('/blog/:slug', (req, res) => {
    const { slug } = req.params;
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    try {
        const blog = db.prepare(`
            SELECT 
                b.id, b.title, b.slug, b.category, b.description, b.content,
                b.image_url, b.tags, b.read_time, b.created_at, b.updated_at,
                u.username as author
            FROM blogs b
            LEFT JOIN users u ON b.author_id = u.id
            WHERE b.slug = ? AND b.published = 1
        `).get(slug);

        if (!blog) {
            return res.status(404).send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Blog Not Found - Wasiq Syed</title>
    <link rel="stylesheet" href="/styles/styles.css?v=3">
</head>
<body>
    <div class="container">
        <h1>Blog Post Not Found</h1>
        <p>The blog post you're looking for doesn't exist.</p>
        <a href="/blogs.html">← Back to Blogs</a>
    </div>
</body>
</html>`);
        }

        // Parse tags
        const tags = blog.tags ? blog.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
        const publishDate = new Date(blog.created_at).toISOString();
        const modifiedDate = new Date(blog.updated_at || blog.created_at).toISOString();
        const readingTime = blog.read_time || 5;
        
        // Generate structured data
        const structuredData = {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": blog.title,
            "description": blog.description,
            "image": blog.image_url || `${baseUrl}/images/default-blog.jpg`,
            "author": {
                "@type": "Person",
                "name": blog.author || "Wasiq Syed",
                "url": baseUrl
            },
            "publisher": {
                "@type": "Organization",
                "name": "Wasiq Syed",
                "logo": {
                    "@type": "ImageObject",
                    "url": `${baseUrl}/images/logo.png`
                }
            },
            "datePublished": publishDate,
            "dateModified": modifiedDate,
            "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": `${baseUrl}/blog/${blog.slug}`
            },
            "keywords": tags.join(', '),
            "articleSection": blog.category,
            "wordCount": blog.content.replace(/<[^>]*>/g, '').split(' ').length,
            "timeRequired": `PT${readingTime}M`
        };

        // Clean content preview for meta description
        const metaDescription = blog.description || blog.content.replace(/<[^>]*>/g, '').substring(0, 155) + '...';

        const htmlResponse = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- SEO Meta Tags -->
    <title>${blog.title} | Wasiq Syed</title>
    <meta name="description" content="${metaDescription}">
    <meta name="keywords" content="${tags.join(', ')}, Wasiq Syed, Blog">
    <meta name="author" content="${blog.author || 'Wasiq Syed'}">
    <meta name="robots" content="index, follow, max-snippet:155">
    <link rel="canonical" href="${baseUrl}/blog/${blog.slug}">
    
    <!-- Open Graph Tags -->
    <meta property="og:type" content="article">
    <meta property="og:title" content="${blog.title}">
    <meta property="og:description" content="${metaDescription}">
    <meta property="og:image" content="${blog.image_url || `${baseUrl}/images/default-blog.jpg`}">
    <meta property="og:url" content="${baseUrl}/blog/${blog.slug}">
    <meta property="og:site_name" content="Wasiq Syed">
    <meta property="article:author" content="${blog.author || 'Wasiq Syed'}">
    <meta property="article:published_time" content="${publishDate}">
    <meta property="article:modified_time" content="${modifiedDate}">
    <meta property="article:section" content="${blog.category}">
    ${tags.map(tag => `<meta property="article:tag" content="${tag}">`).join('\n    ')}
    
    <!-- Twitter Card Tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${blog.title}">
    <meta name="twitter:description" content="${metaDescription}">
    <meta name="twitter:image" content="${blog.image_url || `${baseUrl}/images/default-blog.jpg`}">
    <meta name="twitter:site" content="@wasiqsyed">
    <meta name="twitter:creator" content="@wasiqsyed">
    
    <!-- Additional SEO -->
    <link rel="alternate" type="application/rss+xml" title="Wasiq Syed Blog RSS" href="${baseUrl}/rss.xml">
    <meta name="theme-color" content="#374151">
    
    <!-- Structured Data -->
    <script type="application/ld+json">
    ${JSON.stringify(structuredData, null, 2)}
    </script>
    
    <link rel="stylesheet" href="/styles/styles.css">
    <style>
        .blog-content { max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.8; }
        .blog-meta { color: #888; margin: 20px 0; font-size: 14px; }
        .blog-tags { margin: 30px 0; }
        .tag { display: inline-block; background: #333; color: #2563eb; padding: 4px 8px; border-radius: 4px; margin-right: 8px; text-decoration: none; }
        .breadcrumb { margin: 20px 0; color: #888; }
        .breadcrumb a { color: #2563eb; text-decoration: none; }
        .share-buttons { margin: 30px 0; }
        .share-buttons a { display: inline-flex; align-items: center; gap: 4px; margin-right: 10px; padding: 4px 8px; background: #374151; color: white; text-decoration: none; border-radius: 4px; font-size: 12px; }
        .featured-image { text-align: center; margin: 30px 0; }
        .featured-image img { max-width: 100%; height: auto; border-radius: 8px; }
    </style>
</head>
<body>
    <header>
        <nav class="site-nav">
            <div class="nav-inner">
                <a class="brand" href="/">Wasiq</a>
                <ul class="nav-pill">
                    <li><a href="/#about">About</a></li>
                    <li><a href="/#education">Education</a></li>
                    <li><a href="/#projects">Projects</a></li>
                    <li><a href="/#skills">Skills</a></li>
                    <li><a href="/portfolio.html">Portfolio</a></li>
                    <li><a href="/blogs.html" class="active">Blog</a></li>
                    <li><a href="/login.html">Admin</a></li>
                    <li><a href="/#contact">Contact</a></li>
                </ul>
                <button class="mobile-menu-toggle" aria-label="Open menu" aria-expanded="false">☰</button>
            </div>
        </nav>
        <h1>Wasiq Syed</h1>
        <p>Developer and Content Creator</p>
    </header>
    
    <div class="container">
        <!-- Breadcrumb Navigation -->
        <nav class="breadcrumb" aria-label="Breadcrumb">
            <a href="/">Home</a> → 
            <a href="/blogs.html">Blogs</a> → 
            <span>${blog.category}</span> → 
            <span>${blog.title}</span>
        </nav>
        
        <article class="blog-content">
            <header>
                <span class="blog-category" style="background: #f8fafc; color: #374151; padding: 6px 12px; border-radius: 4px; border: 1px solid #e5e7eb; font-size: 12px; text-transform: uppercase; font-weight: bold; margin-bottom: 15px; display: inline-block;">${blog.category}</span>
                <h1>${blog.title}</h1>
                <div class="blog-meta">
                    <time datetime="${publishDate}" itemprop="datePublished">
                        ${new Date(blog.created_at).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        })}
                    </time>
                    <span> | ${readingTime} min read</span>
                    ${blog.author ? ` | By ${blog.author}` : ''}
                </div>
            </header>
            
            ${blog.image_url ? `
            <div class="featured-image">
                <img src="${blog.image_url}" alt="${blog.title}" itemprop="image">
            </div>
            ` : ''}
            
            <div itemprop="articleBody">
                ${blog.content}
            </div>
            
            ${tags.length > 0 ? `
            <div class="blog-tags">
                <strong>Tags:</strong>
                ${tags.map(tag => `<a href="/blogs.html?tag=${encodeURIComponent(tag)}" class="tag">${tag}</a>`).join('')}
            </div>
            ` : ''}
            
            <div class="share-buttons">
                <strong>Share:</strong>
                <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(blog.title)}&url=${encodeURIComponent(`${baseUrl}/blog/${blog.slug}`)}" target="_blank" rel="noopener" title="Share on Twitter">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                </a>
                <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${baseUrl}/blog/${blog.slug}`)}" target="_blank" rel="noopener" title="Share on Facebook">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                </a>
                <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${baseUrl}/blog/${blog.slug}`)}" target="_blank" rel="noopener" title="Share on LinkedIn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                </a>
                <a href="mailto:?subject=${encodeURIComponent(blog.title)}&body=${encodeURIComponent(`Check out this blog post: ${baseUrl}/blog/${blog.slug}`)}" target="_blank" title="Share via Email">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z"/>
                        <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z"/>
                    </svg>
                </a>
            </div>
            
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #333;">
                <a href="/blogs.html" style="color: #2563eb; text-decoration: none; font-weight: bold;">← Back to All Blogs</a>
            </div>
        </article>
    </div>
    
    <footer>
        <p>&copy; 2025 Wasiq Syed. All rights reserved.</p>
    </footer>
    
    <!-- Theme Manager -->
    <script src="/scripts/theme-manager.js"></script>
    
    <script src="/scripts/simple-mobile-nav.js"></script>
    <script>
        // Add reading progress indicator
        window.addEventListener('scroll', function() {
            const scrollTop = window.pageYOffset;
            const docHeight = document.body.offsetHeight - window.innerHeight;
            const scrollPercent = (scrollTop / docHeight) * 100;
            
            // You can add a progress bar here if desired
            document.title = \`(\${Math.round(scrollPercent)}%) ${blog.title} | Wasiq Syed\`;
        });
    </script>
</body>
</html>`;

        res.send(htmlResponse);
    } catch (err) {
        console.error('Database error:', err);
        return res.status(500).send('Database error');
    }
});

// Email transporter setup (using a simple fallback method)
let emailTransporter = null;

// Initialize email transporter
function initializeEmailTransporter() {
    try {
        const emailUser = process.env.EMAIL_USER || 'wasiq@wasiq.in';
        const emailPass = process.env.EMAIL_PASS;
        
        console.log('🔧 Email configuration check:');
        console.log('   - Email User:', emailUser);
        console.log('   - Email Pass:', emailPass ? '***SET***' : '❌ NOT SET');
        
        if (!emailPass) {
            console.log('⚠️  EMAIL_PASS environment variable not set, will log messages instead');
            emailTransporter = null;
            return;
        }
        
        // Using Hostinger's SMTP settings
        emailTransporter = nodemailer.createTransport({
            host: 'smtp.hostinger.com',
            port: 587,
            secure: false, // Use STARTTLS
            auth: {
                user: emailUser,
                pass: emailPass
            }
        });
        console.log('📧 Email transporter initialized with Hostinger SMTP');
        
        // Test the connection
        emailTransporter.verify((error, success) => {
            if (error) {
                console.log('❌ Email connection test failed:', error.message);
                emailTransporter = null;
            } else {
                console.log('✅ Email server connection verified successfully');
            }
        });
        
    } catch (error) {
        console.log('⚠️  Email transporter initialization failed:', error.message);
        emailTransporter = null;
    }
}

// Initialize email on startup
initializeEmailTransporter();

// Contact form handler (replaces black.php)
app.post('/contact', [
    body('_subject').trim().isLength({ min: 1 }).escape(),
    body('_replyto').isEmail().normalizeEmail(),
    body('message').trim().isLength({ min: 1 }).escape(),
    body('h-captcha-response').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: 'Oops! There was a problem with your submission. Please complete the form and try again.' 
            });
        }

        const { _subject: name, _replyto: email, message, 'h-captcha-response': captchaToken } = req.body;

        // Verify captcha first
        const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
        const captchaVerification = await verifyCaptcha(captchaToken, clientIP);
        
        if (!captchaVerification.success) {
            return res.status(400).json({ 
                error: 'Captcha verification failed. Please try again.' 
            });
        }

        // Check for spam before processing
        const spamCheck = isSpamMessage(message, name, email);
        
        if (spamCheck.isSpam) {
            console.log('🚫 Spam detected in contact form:', {
                name,
                email,
                confidence: spamCheck.confidence,
                reasons: spamCheck.reasons,
                timestamp: new Date().toISOString()
            });
            
            return res.status(400).json({ 
                error: 'Your message appears to contain promotional content. Please send a genuine inquiry.' 
            });
        }
        
        // Log suspicious messages for review (even if not blocked)
        if (spamCheck.confidence > 30) {
            console.log('⚠️ Suspicious contact form submission:', {
                name,
                email,
                confidence: spamCheck.confidence,
                reasons: spamCheck.reasons,
                message: message.substring(0, 100) + '...',
                timestamp: new Date().toISOString()
            });
        }

        // Log the contact form submission
        console.log('📧 Contact form submission:', {
            name,
            email,
            message: message.substring(0, 100) + '...',
            spamScore: spamCheck.spamScore,
            timestamp: new Date().toISOString()
        });

        // Try to send email
        try {
            if (emailTransporter) {
                console.log('📤 Attempting to send email to:', config.email.recipient);
                
                const mailOptions = {
                    from: config.email.from,
                    to: config.email.recipient,
                    subject: `New contact form message from ${name}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #556B2F;">New Contact Form Message</h2>
                            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                <p><strong>Name:</strong> ${name}</p>
                                <p><strong>Email:</strong> ${email}</p>
                                <p><strong>Message:</strong></p>
                                <div style="background: white; padding: 15px; border-radius: 4px; margin-top: 10px;">
                                    ${message.replace(/\n/g, '<br>')}
                                </div>
                            </div>
                            <p style="color: #666; font-size: 12px;">This message was sent from your website contact form.</p>
                        </div>
                    `,
                    replyTo: email
                };

                const result = await emailTransporter.sendMail(mailOptions);
                console.log('✅ Email sent successfully!');
                console.log('   - Message ID:', result.messageId);
                console.log('   - To:', config.email.recipient);
            } else {
                console.log('📝 Email transporter not available - message logged only');
                console.log('   - Check EMAIL_PASS environment variable');
                console.log('   - Check email configuration');
            }
        } catch (emailError) {
            console.error('❌ Email sending failed:');
            console.error('   - Error:', emailError.message);
            console.error('   - Code:', emailError.code);
            if (emailError.response) {
                console.error('   - Server response:', emailError.response);
            }
            // Continue anyway - we don't want to fail the form submission just because email failed
        }

        // Always return success to user (even if email fails, we've logged the message)
        res.json({ 
            success: true, 
            message: 'Thank you for your message! We will get back to you soon.' 
        });

    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({ 
            error: 'Oops! Something went wrong and we couldn\'t send your message.' 
        });
    }
});

// Function to send anonymous message notification email
function sendAnonMessageEmail(message, ip, userAgent) {
    if (!emailTransporter) {
        console.log('📧 Email transporter not available - anon message email not sent');
        return;
    }

    const timestamp = new Date().toLocaleString();
    
    const mailOptions = {
        from: config.email.from,
        to: config.email.recipient,
        subject: 'New Anonymous Message Received',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #374151;">New Anonymous Message</h2>
                <p><strong>Time:</strong> ${timestamp}</p>
                
                <div style="background: #f5f5f5; padding: 20px; border-radius: 6px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #333;">Message:</h3>
                    <p style="white-space: pre-wrap; color: #555;">${message}</p>
                </div>
                
                <div style="background: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <h4 style="margin-top: 0; color: #666;">Sender Information:</h4>
                    <p style="margin: 5px 0; color: #666;"><strong>IP Address:</strong> ${ip}</p>
                    <p style="margin: 5px 0; color: #666;"><strong>User Agent:</strong> ${userAgent}</p>
                </div>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                <p style="color: #666; font-size: 12px;">This email was sent from your website's anonymous message system.</p>
            </div>
        `
    };

    emailTransporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('❌ Anonymous message email failed:', error);
        } else {
            console.log('✅ Anonymous message email sent');
        }
    });
}

// Anonymous message API
app.post('/api/anon-message', [
    body('message').trim().isLength({ min: 1, max: 1000 }),
    body('h-captcha-response').notEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Message is required and must be under 1000 characters.' });
    }
    const { message, 'h-captcha-response': captchaToken } = req.body;

    // Verify captcha first
    const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    const captchaVerification = await verifyCaptcha(captchaToken, clientIP);
    
    if (!captchaVerification.success) {
        return res.status(400).json({ 
            error: 'Captcha verification failed. Please try again.' 
        });
    }

    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || '';
    try {
        db.prepare(`
            INSERT INTO anon_messages (message, ip_address, user_agent)
            VALUES (?, ?, ?)
        `).run(message, ip, userAgent);
        
        // Send email notification
        sendAnonMessageEmail(message, ip, userAgent);
        
        res.json({ success: true, message: 'Your anonymous message was sent!' });
    } catch (err) {
        console.error('Error saving anon message:', err);
        return res.status(500).json({ error: 'Failed to save message.' });
    }
});






// Catch-all 404 handler (must be after all other routes)
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '404.html'));
});

// ==========================================
// SERVER STARTUP
// ==========================================
// 🚀 Main server startup function - called when the application starts
// 🔧 TO MODIFY: Change port, add HTTPS, or modify startup behavior here
function startServer() {
    app.listen(PORT, () => {
        console.log(`🚀 HTTP Server running on http://localhost:${PORT}`);
        console.log('📱 API endpoints available:');
        console.log('   POST /api/auth/login');
        console.log('   GET  /api/blogs');
        console.log('   GET  /api/blogs/:slug');
        console.log('   GET  /api/admin/blogs (auth required)');
        console.log('   POST /api/admin/blogs (auth required)');
        console.log('   PUT  /api/admin/blogs/:id (auth required)');
        console.log('   DELETE /api/admin/blogs/:id (auth required)');
        console.log('\n💡 To initialize database, run: npm run init-db');
    });
}

// Graceful shutdown
let sigintCount = 0;
let shutdownStartTime = 0;

function gracefulShutdown() {
    sigintCount++;
    shutdownStartTime = Date.now();

    if (sigintCount === 1) {
        console.log('\n🛑 Shutting down server...');
        console.log('📊 Active resources:');
        console.log('   - Database connection:', !!db);
        console.log('   - Email transporter:', !!emailTransporter);

        // Force immediate exit after 5 seconds
        const forceExitTimeout = setTimeout(() => {
            console.log('⚠️  Force exiting after 5 seconds...');
            process.exit(0);
        }, 5000);

        if (db) {
            console.log('🔄 Closing database connection...');
            db.close((err) => {
                const shutdownTime = Date.now() - shutdownStartTime;
                clearTimeout(forceExitTimeout);

                if (err) {
                    console.error('❌ Error closing database:', err.message);
                    console.log(`⏱️  Shutdown took ${shutdownTime}ms`);
                } else {
                    console.log('✅ Database connection closed successfully');
                    console.log(`⏱️  Shutdown took ${shutdownTime}ms`);
                }
                process.exit(0);
            });
        } else {
            const shutdownTime = Date.now() - shutdownStartTime;
            clearTimeout(forceExitTimeout);
            console.log('ℹ️  No database connection to close');
            console.log(`⏱️  Shutdown took ${shutdownTime}ms`);
            process.exit(0);
        }
    } else if (sigintCount >= 3) {
        console.log('\n🚨 Force exiting immediately (multiple Ctrl+C detected)...');
        process.exit(1);
    } else {
        console.log('\n⚠️  Shutdown already in progress...');
    }
}

process.on('SIGINT', gracefulShutdown);

// Connect to database and export app for serverless environments
connectDatabase();

// Start server normally
startServer();

// Handle nodemon restarts gracefully
process.on('SIGUSR2', () => {
    console.log('🔄 Nodemon restart detected, preparing for graceful restart...');
    if (db && db.open) {
        try {
            db.close();
            console.log('🔄 Database connection closed for restart');
        } catch (err) {
            console.warn('⚠️ Error closing database during restart:', err.message);
        }
    }
});

// Export app for serverless environments
module.exports = app;
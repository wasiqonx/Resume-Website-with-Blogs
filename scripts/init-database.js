const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const ADMIN_PASS = process.env.ADMIN_PASS || 'f6hc8ay5hw$';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';

// Configuration
const config = {
    dbPath: './database/blog_system.db',
    adminUsername: ADMIN_USER,
    adminPassword: ADMIN_PASS
};

// Ensure database directory exists
const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database
function initDatabase() {
    let db;
    try {
        db = new Database(config.dbPath);
        console.log('🗄️  Connected to SQLite database');
    } catch (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }

    // Create tables
    try {
        // Users table
        db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(20) DEFAULT 'admin',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME,
                login_attempts INTEGER DEFAULT 0,
                locked_until DATETIME
            )
        `);
        console.log('✅ Users table created/verified');

        // Blogs table
        db.exec(`
            CREATE TABLE IF NOT EXISTS blogs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title VARCHAR(255) NOT NULL,
                slug VARCHAR(255) UNIQUE NOT NULL,
                category VARCHAR(100) NOT NULL,
                description TEXT NOT NULL,
                content TEXT NOT NULL,
                image_url VARCHAR(500),
                tags TEXT,
                read_time INTEGER DEFAULT 5,
                author_id INTEGER,
                published BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (author_id) REFERENCES users (id)
            )
        `);
        console.log('✅ Blogs table created/verified');

        // Audit logs table
        db.exec(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                action VARCHAR(100) NOT NULL,
                details TEXT,
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `);
        console.log('✅ Audit logs table created/verified');

        // Email subscribers table
        db.exec(`
            CREATE TABLE IF NOT EXISTS email_subscribers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email VARCHAR(255) UNIQUE NOT NULL,
                name VARCHAR(100),
                subscribed BOOLEAN DEFAULT 1,
                verification_token VARCHAR(255),
                verified BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Email subscribers table created/verified');

        // Anonymous messages table
        db.exec(`
            CREATE TABLE IF NOT EXISTS anon_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                ip_address TEXT,
                user_agent TEXT
            )
        `);
        console.log('✅ Anonymous messages table created/verified');


        // Create admin user
        createAdminUser(db);
        
        // Insert sample blog if no blogs exist
        insertSampleBlog(db);
        
    } catch (err) {
        console.error('Error creating tables:', err.message);
        process.exit(1);
    }

    return db;
}

async function createAdminUser(db) {
    try {
        if (!config.adminPassword || config.adminPassword.trim() === '') {
            throw new Error('Admin password cannot be empty');
        }
        
        const hashedPassword = await bcrypt.hash(config.adminPassword, 12);
        
        const result = db.prepare(`
            INSERT OR IGNORE INTO users (username, password_hash, role) 
            VALUES (?, ?, 'admin')
        `).run(config.adminUsername, hashedPassword);
        
        console.log('✅ Admin user ensured');
        console.log(`   Username: ${config.adminUsername}`);
        if (result.changes > 0) {
            console.log('   (created)');
        } else {
            console.log('   (already existed — left unchanged)');
        }
    } catch (error) {
        console.error('Error hashing admin password:', error);
    }
}

function insertSampleBlog(db) {
    try {
        const blogCount = db.prepare('SELECT COUNT(*) as count FROM blogs').get();
        
        if (blogCount.count === 0) {
            // Get admin user ID
            const user = db.prepare('SELECT id FROM users WHERE username = ?').get(config.adminUsername);
            
            const sampleBlog = {
                title: 'Getting Started with Modern Web Development',
                slug: 'getting-started-modern-web-development',
                category: 'Web Development',
                description: 'A comprehensive guide to modern web development practices, tools, and frameworks that every developer should know in 2025.',
                content: `
                    <p>Web development has evolved significantly over the past few years. With new frameworks, tools, and best practices emerging regularly, it can be challenging to keep up with the latest trends.</p>
                    
                    <h3>Essential Technologies</h3>
                    <p>Modern web development relies on a solid foundation of core technologies and frameworks:</p>
                    
                    <ul>
                        <li><strong>Frontend:</strong> React, Vue.js, or Angular for building interactive user interfaces</li>
                        <li><strong>Backend:</strong> Node.js, Python (Django/Flask), or Java for server-side development</li>
                        <li><strong>Databases:</strong> PostgreSQL, MongoDB, or SQLite for data persistence</li>
                        <li><strong>DevOps:</strong> Docker, CI/CD pipelines, and cloud deployment</li>
                    </ul>
                    
                    <h3>Best Practices</h3>
                    <p>Following industry best practices ensures code quality, maintainability, and scalability. Focus on clean code, version control with Git, testing, and continuous learning.</p>
                `,
                image_url: '/images/default-blog.svg',
                tags: 'WebDevelopment,JavaScript,Programming,Technology',
                read_time: 6,
                author_id: user ? user.id : 1
            };
            
            db.prepare(`
                INSERT INTO blogs (title, slug, category, description, content, image_url, tags, read_time, author_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                sampleBlog.title,
                sampleBlog.slug,
                sampleBlog.category,
                sampleBlog.description,
                sampleBlog.content,
                sampleBlog.image_url,
                sampleBlog.tags,
                sampleBlog.read_time,
                sampleBlog.author_id
            );
            
            console.log('✅ Sample blog post created');
        } else {
            console.log(`✅ Database already contains ${blogCount.count} blog post(s)`);
        }
    } catch (err) {
        console.error('Error with sample blog:', err.message);
    }
}

// Run if called directly
if (require.main === module) {
    // If database file already exists, do nothing (avoid overwriting on VPS)
    if (fs.existsSync(config.dbPath)) {
        console.log(`✅ Database already exists at ${config.dbPath}. Skipping initialization.`);
        process.exit(0);
    }

    console.log('🚀 Initializing database...');
    const db = initDatabase();
    
    // Close database connection after initialization
    setTimeout(() => {
        try {
            db.close();
            console.log('🔒 Database connection closed');
            console.log('✨ Database initialization complete!');
            console.log('\n📝 Next steps:');
            console.log('   1. Run: npm install');
            console.log('   2. Start server: npm start');
            console.log('   3. Open: http://localhost:3000');
        } catch (err) {
            console.error('Error closing database:', err.message);
        }
    }, 1000);
}

module.exports = { initDatabase, config }; 
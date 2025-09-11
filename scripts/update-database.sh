#!/bin/bash

# Database Update Script - Preserves existing blog posts
# This script updates the database schema and data while keeping blog posts intact

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_PATH="./database/blog_system.db"
BACKUP_PATH="./database/blog_system_backup_$(date +%Y%m%d_%H%M%S).db"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}🚀 Starting Database Update Script${NC}"
echo -e "${BLUE}======================================${NC}"

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo -e "${RED}❌ Database not found at $DB_PATH${NC}"
    echo -e "${YELLOW}💡 Run 'npm run init-db' first to create the database${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Creating backup...${NC}"
cp "$DB_PATH" "$BACKUP_PATH"
echo -e "${GREEN}✅ Backup created at $BACKUP_PATH${NC}"

echo -e "${YELLOW}🔄 Updating database schema...${NC}"

# Update database schema using Node.js
node << 'EOF'
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

const ADMIN_PASS = process.env.ADMIN_PASS || 'f6hc8ay5hw$';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';

const db = new Database('./database/blog_system.db');

try {
    console.log('🔧 Checking and updating table schemas...');
    
    // Create tables if they don't exist (with IF NOT EXISTS)
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
    
    db.exec(`
        CREATE TABLE IF NOT EXISTS anon_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            ip_address TEXT,
            user_agent TEXT
        )
    `);
    
    console.log('✅ Table schemas updated');
    
    // Update admin user (INSERT OR REPLACE to update password if needed)
    const hashedPassword = bcrypt.hashSync(ADMIN_PASS, 12);
    
    const result = db.prepare(`
        INSERT OR REPLACE INTO users (id, username, password_hash, role) 
        VALUES (
            (SELECT id FROM users WHERE username = ? LIMIT 1),
            ?, ?, 'admin'
        )
    `).run(ADMIN_USER, ADMIN_USER, hashedPassword);
    
    console.log('✅ Admin user updated');
    
    // Add any new indexes for performance
    try {
        db.exec('CREATE INDEX IF NOT EXISTS idx_blogs_slug ON blogs(slug)');
        db.exec('CREATE INDEX IF NOT EXISTS idx_blogs_published ON blogs(published)');
        db.exec('CREATE INDEX IF NOT EXISTS idx_blogs_created_at ON blogs(created_at)');
        db.exec('CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)');
        console.log('✅ Database indexes updated');
    } catch (err) {
        console.log('ℹ️  Indexes already exist or couldn\'t be created:', err.message);
    }
    
    // Update any existing placeholder image URLs
    const updateResult = db.prepare(`
        UPDATE blogs 
        SET image_url = '/images/default-blog.svg' 
        WHERE image_url LIKE '%placeholder%'
    `).run();
    
    if (updateResult.changes > 0) {
        console.log(`✅ Updated ${updateResult.changes} blog image URLs`);
    }
    
    console.log('🎉 Database schema update completed successfully!');
    
} catch (error) {
    console.error('❌ Error updating database:', error.message);
    process.exit(1);
} finally {
    db.close();
}
EOF

# Check if the update was successful
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database update completed successfully!${NC}"
    
    # Show current database stats
    echo -e "${BLUE}📊 Database Statistics:${NC}"
    node << 'EOF'
const Database = require('better-sqlite3');
const db = new Database('./database/blog_system.db');

try {
    const blogCount = db.prepare('SELECT COUNT(*) as count FROM blogs').get();
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    const subscriberCount = db.prepare('SELECT COUNT(*) as count FROM email_subscribers').get();
    const messageCount = db.prepare('SELECT COUNT(*) as count FROM anon_messages').get();
    
    console.log(`   📝 Blog posts: ${blogCount.count}`);
    console.log(`   👤 Users: ${userCount.count}`);
    console.log(`   📧 Subscribers: ${subscriberCount.count}`);
    console.log(`   💬 Anonymous messages: ${messageCount.count}`);
    
} catch (error) {
    console.error('Error getting stats:', error.message);
} finally {
    db.close();
}
EOF
    
    echo -e "${GREEN}🎉 All blog posts and data preserved!${NC}"
    echo -e "${BLUE}💾 Backup available at: $BACKUP_PATH${NC}"
else
    echo -e "${RED}❌ Database update failed!${NC}"
    echo -e "${YELLOW}🔄 Restoring from backup...${NC}"
    cp "$BACKUP_PATH" "$DB_PATH"
    echo -e "${GREEN}✅ Database restored from backup${NC}"
    exit 1
fi

echo -e "${BLUE}======================================${NC}"
echo -e "${GREEN}🚀 Database update script completed!${NC}"
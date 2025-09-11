const Database = require('better-sqlite3');
const path = require('path');

// Configuration
const config = {
    dbPath: './database/blog_system.db'
};

// Connect to database
let db;
try {
    db = new Database(config.dbPath);
    console.log('🗄️  Connected to SQLite database');
} catch (err) {
    console.error('❌ Error connecting to database:', err.message);
    process.exit(1);
}

// Function to generate unique slug
function generateUniqueSlug(baseSlug, excludeId = null, callback) {
    let slugToTry = baseSlug;
    let counter = 1;
    
    function checkSlug() {
        const query = excludeId 
            ? 'SELECT COUNT(*) as count FROM blogs WHERE slug = ? AND id != ?'
            : 'SELECT COUNT(*) as count FROM blogs WHERE slug = ?';
        const params = excludeId ? [slugToTry, excludeId] : [slugToTry];
        
        db.get(query, params, (err, row) => {
            if (err) {
                return callback(err, null);
            }
            
            if (row.count === 0) {
                // Slug is unique
                callback(null, slugToTry);
            } else {
                // Slug exists, try with counter
                slugToTry = `${baseSlug}-${counter}`;
                counter++;
                checkSlug();
            }
        });
    }
    
    checkSlug();
}

// Function to generate base slug from title
function generateBaseSlug(title) {
    return title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

// Fix duplicate slugs
function fixDuplicateSlugs() {
    console.log('🔍 Checking for duplicate slugs...');
    
    // Find blogs with duplicate slugs
    db.all(`
        SELECT slug, COUNT(*) as count 
        FROM blogs 
        GROUP BY slug 
        HAVING COUNT(*) > 1
    `, [], (err, duplicates) => {
        if (err) {
            console.error('❌ Error finding duplicates:', err.message);
            return;
        }
        
        if (duplicates.length === 0) {
            console.log('✅ No duplicate slugs found!');
            db.close();
            return;
        }
        
        console.log(`🚨 Found ${duplicates.length} duplicate slug(s):`);
        duplicates.forEach(dup => {
            console.log(`   - "${dup.slug}" appears ${dup.count} times`);
        });
        
        // Fix each duplicate
        let fixedCount = 0;
        const totalFixes = duplicates.reduce((sum, dup) => sum + dup.count - 1, 0);
        
        duplicates.forEach(duplicate => {
            // Get all blogs with this duplicate slug, ordered by creation date
            db.all(`
                SELECT id, title, slug, created_at 
                FROM blogs 
                WHERE slug = ? 
                ORDER BY created_at ASC
            `, [duplicate.slug], (err, blogs) => {
                if (err) {
                    console.error('❌ Error getting duplicate blogs:', err.message);
                    return;
                }
                
                // Keep the first one (oldest), fix the rest
                for (let i = 1; i < blogs.length; i++) {
                    const blog = blogs[i];
                    const baseSlug = generateBaseSlug(blog.title);
                    
                    // Generate unique slug for this blog
                    generateUniqueSlug(baseSlug, blog.id, (err, uniqueSlug) => {
                        if (err) {
                            console.error('❌ Error generating unique slug:', err.message);
                            return;
                        }
                        
                        // Update the blog with new unique slug
                        db.run(`
                            UPDATE blogs 
                            SET slug = ?, updated_at = CURRENT_TIMESTAMP 
                            WHERE id = ?
                        `, [uniqueSlug, blog.id], function(updateErr) {
                            if (updateErr) {
                                console.error('❌ Error updating blog:', updateErr.message);
                                return;
                            }
                            
                            console.log(`✅ Fixed: "${blog.title}" slug changed from "${blog.slug}" to "${uniqueSlug}"`);
                            fixedCount++;
                            
                            // Check if all fixes are complete
                            if (fixedCount === totalFixes) {
                                console.log(`\n🎉 Successfully fixed ${fixedCount} duplicate slug(s)!`);
                                
                                // Verify no duplicates remain
                                setTimeout(() => {
                                    verifyNoDuplicates();
                                }, 500);
                            }
                        });
                    });
                }
            });
        });
    });
}

// Verify no duplicates remain
function verifyNoDuplicates() {
    db.all(`
        SELECT slug, COUNT(*) as count 
        FROM blogs 
        GROUP BY slug 
        HAVING COUNT(*) > 1
    `, [], (err, remaining) => {
        if (err) {
            console.error('❌ Error verifying:', err.message);
            db.close();
            return;
        }
        
        if (remaining.length === 0) {
            console.log('✅ Verification complete: No duplicate slugs remain!');
        } else {
            console.log('⚠️  Warning: Still found duplicates:', remaining);
        }
        
        // Show all current slugs
        db.all('SELECT id, title, slug FROM blogs ORDER BY created_at', [], (err, allBlogs) => {
            if (err) {
                console.error('❌ Error listing blogs:', err.message);
            } else {
                console.log('\n📋 Current blog slugs:');
                allBlogs.forEach(blog => {
                    console.log(`   ${blog.id}: "${blog.title}" → ${blog.slug}`);
                });
            }
            
            db.close((closeErr) => {
                if (closeErr) {
                    console.error('❌ Error closing database:', closeErr.message);
                } else {
                    console.log('🔒 Database connection closed');
                }
            });
        });
    });
}

// Run the fix
console.log('🚀 Starting duplicate slug fix...');
fixDuplicateSlugs(); 
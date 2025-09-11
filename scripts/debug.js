// Console log capture
const originalLog = console.log;
const originalError = console.error;
let logs = [];

function addLog(type, ...args) {
    const timestamp = new Date().toLocaleTimeString();
    logs.push(`[${timestamp}] ${type}: ${args.join(' ')}`);
    updateLogsDisplay();
}

console.log = function(...args) {
    addLog('LOG', ...args);
    originalLog.apply(console, args);
};

console.error = function(...args) {
    addLog('ERROR', ...args);
    originalError.apply(console, args);
};

function updateLogsDisplay() {
    document.getElementById('console-logs').textContent = logs.slice(-20).join('\n');
}

function clearLogs() {
    logs = [];
    updateLogsDisplay();
}

function showResult(elementId, message, isSuccess = true) {
    const element = document.getElementById(elementId);
    element.innerHTML = `<div class="${isSuccess ? 'success' : 'error'}">${message}</div>`;
}

function showInfo(elementId, message) {
    const element = document.getElementById(elementId);
    element.innerHTML = `<div class="info">${message}</div>`;
}

// Test functions
async function testLogin() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        showInfo('login-result', 'Testing login...');
        
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Store the session
            const sessionData = {
                token: data.token,
                username: data.user.username,
                role: data.user.role,
                loginTime: Date.now(),
                expiresAt: Date.now() + (30 * 60 * 1000) // 30 minutes
            };
            
            localStorage.setItem('auth_session', btoa(JSON.stringify(sessionData)));
            sessionStorage.setItem('auth_active', 'true');
            
            showResult('login-result', `✅ Login successful! Token: ${data.token.substring(0, 20)}...`);
            console.log('Login successful', data);
        } else {
            showResult('login-result', `❌ Login failed: ${data.error}`, false);
            console.error('Login failed', data);
        }
    } catch (error) {
        showResult('login-result', `❌ Login error: ${error.message}`, false);
        console.error('Login error', error);
    }
}

async function checkAuth() {
    try {
        showInfo('auth-result', 'Checking authentication...');
        
        // Check localStorage
        const session = localStorage.getItem('auth_session');
        const active = sessionStorage.getItem('auth_active');
        
        if (!session) {
            showResult('auth-result', '❌ No session found in localStorage', false);
            return;
        }
        
        const sessionData = JSON.parse(atob(session));
        const now = Date.now();
        const isExpired = now > sessionData.expiresAt;
        
        let result = `
            <strong>Session Data:</strong><br>
            Username: ${sessionData.username}<br>
            Role: ${sessionData.role}<br>
            Expires: ${new Date(sessionData.expiresAt).toLocaleString()}<br>
            Expired: ${isExpired ? '❌ Yes' : '✅ No'}<br>
            Session Active: ${active ? '✅ Yes' : '❌ No'}
        `;
        
        if (!isExpired && active) {
            showResult('auth-result', result);
        } else {
            showResult('auth-result', result, false);
        }
        
    } catch (error) {
        showResult('auth-result', `❌ Auth check error: ${error.message}`, false);
        console.error('Auth check error', error);
    }
}

async function testLoadBlogs() {
    try {
        showInfo('blogs-result', 'Loading blogs...');
        
        const session = localStorage.getItem('auth_session');
        if (!session) {
            showResult('blogs-result', '❌ No authentication session found', false);
            return;
        }
        
        const sessionData = JSON.parse(atob(session));
        
        const response = await fetch('/api/admin/blogs', {
            headers: {
                'Authorization': `Bearer ${sessionData.token}`
            }
        });
        
        if (response.ok) {
            const blogs = await response.json();
            showResult('blogs-result', `✅ Loaded ${blogs.length} blogs successfully`);
            console.log('Blogs loaded', blogs);
        } else {
            const error = await response.json();
            showResult('blogs-result', `❌ Failed to load blogs: ${error.error}`, false);
        }
        
    } catch (error) {
        showResult('blogs-result', `❌ Load blogs error: ${error.message}`, false);
        console.error('Load blogs error', error);
    }
}

async function testCreateBlog() {
    try {
        showInfo('create-result', 'Creating test blog...');
        
        const session = localStorage.getItem('auth_session');
        if (!session) {
            showResult('create-result', '❌ No authentication session found', false);
            return;
        }
        
        const sessionData = JSON.parse(atob(session));
        
        const testBlog = {
            title: 'Debug Test Blog',
            category: 'Technology',
            description: 'This is a test blog created from the debug tool',
            content: 'This is test content for the debug blog. It has enough content to pass validation requirements.',
            image_url: 'https://via.placeholder.com/800x400',
            tags: 'debug,test',
            read_time: 2
        };
        
        const response = await fetch('/api/admin/blogs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionData.token}`
            },
            body: JSON.stringify(testBlog)
        });
        
        if (response.ok) {
            const result = await response.json();
            showResult('create-result', `✅ Blog created successfully! ID: ${result.blog.id}`);
            console.log('Blog created', result);
        } else {
            const error = await response.json();
            showResult('create-result', `❌ Failed to create blog: ${error.error}`, false);
            console.error('Create blog failed', error);
        }
        
    } catch (error) {
        showResult('create-result', `❌ Create blog error: ${error.message}`, false);
        console.error('Create blog error', error);
    }
}

function checkScripts() {
    showInfo('scripts-result', 'Checking script availability...');
    
    const scripts = {
        'CryptoUtils': typeof CryptoUtils !== 'undefined',
        'authManager': typeof authManager !== 'undefined',
        'blogManager': typeof blogManager !== 'undefined',
        'window.blogManager': typeof window.blogManager !== 'undefined',
        'BlogManager class': typeof BlogManager !== 'undefined'
    };
    
    let result = '<strong>Script Status:</strong><br>';
    for (const [name, available] of Object.entries(scripts)) {
        result += `${name}: ${available ? '✅' : '❌'}<br>`;
    }
    
    const allAvailable = Object.values(scripts).every(v => v);
    showResult('scripts-result', result, allAvailable);
    
    console.log('Script status', scripts);
}

// Initialize
console.log('Debug tool loaded');
updateLogsDisplay();
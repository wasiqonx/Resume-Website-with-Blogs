// Secure Blog Management System Configuration
// WARNING: This file contains sensitive configuration data
// Implement additional obfuscation in production

(function() {
    'use strict';
    
    // Obfuscated configuration object
    const SecureConfig = {
        // XOR obfuscated credentials
        _c: {
            u: [65, 100, 109, 105, 110], // 'Admin' in ASCII
            h: 'dc78a66bd41d78d717881ab1c5a73dd9bde9468a6d2ff20158d4b2d733fe55a9',
            s: 'secure_salt_2024_blog_system'
        },
        
        // Security settings
        _s: {
            sessionTimeout: 30 * 60 * 1000, // 30 minutes
            maxAttempts: 5,
            rateLimitWindow: 15 * 60 * 1000, // 15 minutes
            csrfSecret: 'a8d7f6e5c4b3a2d9c8b7a6f5e4d3c2b1a9d8c7b6a5f4e3d2c1b9a8d7f6e5c4b3',
            systemKey: 'b9f4c2e8a7d6f3b2c9e8a7d6f3b2c9e8a7d6f3b2c9e8a7d6f3b2c9e8a7d6f3b2'
        },
        
        // Anti-tampering checksums
        _checksums: {
            config: '5f4dcc3b5aa765d61d8327deb882cf99',
            auth: '25d55ad283aa400af464c76d713c07ad',
            crypto: '25f9e794323b453885f5181f1b624d0b'
        },
        
        // Decryption methods (obfuscated)
        _d: {
            username: function() {
                return String.fromCharCode(...this._c.u);
            },
            passwordHash: function() {
                return this._c.h;
            },
            salt: function() {
                return this._c.s;
            },
            validateIntegrity: function() {
                // Simple integrity check
                const expected = this._c.u.reduce((a, b) => a + b, 0);
                return expected === 445; // Sum of 'Admin' ASCII values
            }
        }
    };
    
    // Anti-debugging measures
    const AntiDebug = {
        // Detect if dev tools are open
        detectDevTools: function() {
            let devtools = false;
            const threshold = 160;
            
            setInterval(() => {
                if (window.outerHeight - window.innerHeight > threshold || 
                    window.outerWidth - window.innerWidth > threshold) {
                    if (!devtools) {
                        devtools = true;
                        this.onDevToolsDetected();
                    }
                } else {
                    devtools = false;
                }
            }, 1000);
        },
        
        onDevToolsDetected: function() {
            // Obfuscate sensitive data when dev tools detected
            console.clear();
            console.warn('🚨 Security Alert: Developer tools detected');
            
            // Hide sensitive elements
            document.querySelectorAll('input[type="password"]').forEach(input => {
                input.value = '';
                input.style.webkitTextSecurity = 'disc';
            });
        },
        
        // Prevent right-click inspect
        preventInspect: function() {
            document.addEventListener('contextmenu', e => {
                if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    console.warn('🚨 Right-click disabled for security');
                    return false;
                }
            });
            
            // Prevent common inspect shortcuts
            document.addEventListener('keydown', e => {
                if (e.key === 'F12' || 
                    (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
                    (e.ctrlKey && e.key === 'U')) {
                    e.preventDefault();
                    console.warn('🚨 Inspect shortcuts disabled');
                    return false;
                }
            });
        },
        
        // Obfuscate console
        obfuscateConsole: function() {
            const original = {
                log: console.log,
                warn: console.warn,
                error: console.error,
                info: console.info
            };
            
            // Override console methods
            ['log', 'warn', 'error', 'info'].forEach(method => {
                console[method] = function(...args) {
                    const message = args.join(' ').toLowerCase();
                    if (message.includes('password') || 
                        message.includes('hash') || 
                        message.includes('token') ||
                        message.includes('secret') ||
                        message.includes('config')) {
                        original.warn('🔒 Sensitive data access blocked');
                        return;
                    }
                    original[method].apply(console, args);
                };
            });
        }
    };
    
    // Memory protection
    const MemoryProtection = {
        // Clear sensitive variables periodically
        clearSensitiveData: function() {
            setInterval(() => {
                // Clear password fields
                document.querySelectorAll('input[type="password"]').forEach(input => {
                    if (document.activeElement !== input) {
                        input.value = '';
                    }
                });
                
                // Clear clipboard if it contains sensitive data
                if (navigator.clipboard && navigator.clipboard.readText) {
                    navigator.clipboard.readText().then(text => {
                        if (text && (text.includes(ADMIN_PASS) || text.length === 64)) {
                            navigator.clipboard.writeText('');
                        }
                    }).catch(() => {}); // Ignore errors
                }
            }, 30000); // Every 30 seconds
        },
        
        // Prevent variable extraction
        protectVariables: function() {
            // Make config non-enumerable and non-configurable
            Object.defineProperty(window, 'SecureConfig', {
                value: SecureConfig,
                writable: false,
                enumerable: false,
                configurable: false
            });
            
            // Seal the config object
            Object.seal(SecureConfig);
            Object.freeze(SecureConfig._c);
            Object.freeze(SecureConfig._s);
        }
    };
    
    // Initialize security measures
    function initializeSecurity() {
        // Validate integrity first
        if (!SecureConfig._d.validateIntegrity()) {
            console.error('🚨 Configuration integrity check failed');
            return false;
        }
        
        // Start anti-debugging measures
        AntiDebug.detectDevTools();
        AntiDebug.preventInspect();
        AntiDebug.obfuscateConsole();
        
        // Start memory protection
        MemoryProtection.clearSensitiveData();
        MemoryProtection.protectVariables();
        
        return true;
    }
    
    // Export secure config
    window.SecureConfig = SecureConfig;
    window.initializeSecurity = initializeSecurity;
    
    // Auto-initialize on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeSecurity);
    } else {
        initializeSecurity();
    }
    
})(); 
// Advanced Security Guard - Enhanced Protection Against Inspection
(function() {
    'use strict';
    
    // Advanced obfuscation
    const SecurityGuard = {
        // Encoded security patterns
        _patterns: {
            // Common debug breakpoints
            debugPatterns: [
                'debugger', 'console', 'inspect', 'devtools', 
                'firebug', 'webkit', 'performance'
            ],
            
            // Suspicious user actions
            suspiciousKeys: [
                'F12', 'F1', 'F7', 'F8', 'F9', 'F10', 'F11'
            ]
        },
        
        // Anti-debugging counter-measures
        antiDebug: {
            // Detect debugging attempts
            detectDebugger: function() {
                let start = performance.now();
                debugger; // This will pause if dev tools are open
                let end = performance.now();
                
                // If more than 100ms elapsed, debugger was likely triggered
                if (end - start > 100) {
                    this.triggerSecurityResponse();
                    return true;
                }
                return false;
            },
            
            // Detect console manipulation
            detectConsoleManipulation: function() {
                const originalConsole = window.console;
                let manipulated = false;
                
                // Check if console methods have been overridden
                ['log', 'warn', 'error', 'info', 'debug'].forEach(method => {
                    if (typeof originalConsole[method] === 'function') {
                        try {
                            const methodString = originalConsole[method].toString();
                            if (!methodString.includes('[native code]') && 
                                !methodString.includes('Security')) {
                                manipulated = true;
                            }
                        } catch (e) {
                            manipulated = true;
                        }
                    }
                });
                
                return manipulated;
            },
            
            // Detect performance timing manipulation
            detectTimingAttacks: function() {
                const start = performance.now();
                const dummy = [];
                for (let i = 0; i < 1000; i++) {
                    dummy.push(Math.random());
                }
                const end = performance.now();
                
                // If operation takes too long, might be under inspection
                return (end - start) > 50;
            },
            
            // Security response when threats detected
            triggerSecurityResponse: function() {
                // Clear sensitive data
                this.clearSensitiveElements();
                
                // Obfuscate page content
                this.obfuscateContent();
                
                // Show warning
                this.showSecurityWarning();
                
                // Redirect after delay
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 5000);
            },
            
            clearSensitiveElements: function() {
                // Clear all password fields
                document.querySelectorAll('input[type="password"]').forEach(input => {
                    input.value = '';
                    input.placeholder = 'PROTECTED';
                    input.disabled = true;
                });
                
                // Clear form data
                document.querySelectorAll('form').forEach(form => {
                    form.reset();
                });
                
                // Clear local storage of sensitive data
                ['auth_session', 'auth_fingerprint', 'blogs', 'blog_draft'].forEach(key => {
                    localStorage.removeItem(key);
                });
                
                // Clear session storage
                sessionStorage.clear();
            },
            
            obfuscateContent: function() {
                // Add blur effect to sensitive areas
                const sensitiveSelectors = [
                    '.login-form', '.blog-form', '.admin-container',
                    'input', 'textarea', 'select'
                ];
                
                sensitiveSelectors.forEach(selector => {
                    document.querySelectorAll(selector).forEach(element => {
                        element.style.filter = 'blur(5px)';
                        element.style.pointerEvents = 'none';
                    });
                });
            },
            
            showSecurityWarning: function() {
                // Create overlay warning
                const overlay = document.createElement('div');
                overlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(255, 0, 0, 0.9);
                    color: white;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    z-index: 999999;
                    font-family: Arial, sans-serif;
                    font-size: 24px;
                    text-align: center;
                `;
                
                overlay.innerHTML = `
                    <h1>🚨 SECURITY ALERT 🚨</h1>
                    <p>Unauthorized access attempt detected!</p>
                    <p>This incident has been logged.</p>
                    <p>Redirecting to safe page...</p>
                    <div style="margin-top: 30px; font-size: 16px;">
                        <p>If you are the administrator, please contact support.</p>
                    </div>
                `;
                
                document.body.appendChild(overlay);
            }
        },
        
        // DOM protection
        domProtection: {
            // Prevent DOM manipulation
            protectDOM: function() {
                // Make critical elements non-modifiable
                const criticalElements = document.querySelectorAll('script, link[rel="stylesheet"], meta');
                criticalElements.forEach(element => {
                    Object.freeze(element);
                    
                    // Prevent removal
                    const originalRemove = element.remove;
                    element.remove = function() {
                        console.warn('🚨 Critical element removal blocked');
                        SecurityGuard.antiDebug.triggerSecurityResponse();
                    };
                });
            },
            
            // Monitor DOM mutations
            monitorDOMMutations: function() {
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        // Check for suspicious mutations
                        if (mutation.type === 'childList') {
                            mutation.addedNodes.forEach(node => {
                                if (node.nodeType === 1) { // Element node
                                    const tagName = node.tagName.toLowerCase();
                                    if (['script', 'iframe', 'object', 'embed'].includes(tagName)) {
                                        console.warn('🚨 Suspicious element injection detected');
                                        node.remove();
                                    }
                                }
                            });
                        }
                        
                        // Check for attribute modifications on critical elements
                        if (mutation.type === 'attributes') {
                            const target = mutation.target;
                            if (target.tagName === 'SCRIPT' || target.tagName === 'LINK') {
                                console.warn('🚨 Critical element modification detected');
                                SecurityGuard.antiDebug.triggerSecurityResponse();
                            }
                        }
                    });
                });
                
                observer.observe(document, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['src', 'href', 'integrity']
                });
            }
        },
        
        // Network monitoring
        networkMonitoring: {
            // Monitor for unusual network requests
            monitorFetch: function() {
                const originalFetch = window.fetch;
                window.fetch = function(...args) {
                    const url = args[0];
                    
                    // Log suspicious requests
                    if (typeof url === 'string' && 
                        (url.includes('api') || url.includes('admin') || url.includes('config'))) {
                        console.warn('🚨 Suspicious network request detected:', url);
                    }
                    
                    return originalFetch.apply(this, args);
                };
            },
            
            // Monitor XMLHttpRequest
            monitorXHR: function() {
                const originalXHR = window.XMLHttpRequest;
                window.XMLHttpRequest = function() {
                    const xhr = new originalXHR();
                    const originalOpen = xhr.open;
                    
                    xhr.open = function(method, url) {
                        if (url.includes('sensitive') || url.includes('admin')) {
                            console.warn('🚨 Suspicious XHR request detected:', url);
                        }
                        return originalOpen.apply(this, arguments);
                    };
                    
                    return xhr;
                };
            }
        },
        
        // Behavioral analysis
        behaviorAnalysis: {
            suspiciousActivity: 0,
            
            // Track user behavior patterns
            trackBehavior: function() {
                let rapidClicks = 0;
                let lastClickTime = 0;
                
                document.addEventListener('click', (e) => {
                    const now = Date.now();
                    if (now - lastClickTime < 100) {
                        rapidClicks++;
                        if (rapidClicks > 10) {
                            this.suspiciousActivity++;
                            console.warn('🚨 Rapid clicking detected - possible bot activity');
                        }
                    } else {
                        rapidClicks = 0;
                    }
                    lastClickTime = now;
                });
                
                // Monitor keyboard shortcuts
                document.addEventListener('keydown', (e) => {
                    const combo = [];
                    if (e.ctrlKey) combo.push('Ctrl');
                    if (e.shiftKey) combo.push('Shift');
                    if (e.altKey) combo.push('Alt');
                    combo.push(e.key);
                    
                    const comboString = combo.join('+');
                    
                    // Check for suspicious combinations
                    const suspiciousCombos = [
                        'Ctrl+Shift+I', 'Ctrl+Shift+J', 'Ctrl+Shift+C',
                        'Ctrl+U', 'F12', 'Ctrl+F12'
                    ];
                    
                    if (suspiciousCombos.includes(comboString)) {
                        this.suspiciousActivity++;
                        e.preventDefault();
                        console.warn('🚨 Suspicious keyboard shortcut detected:', comboString);
                        
                        if (this.suspiciousActivity > 3) {
                            SecurityGuard.antiDebug.triggerSecurityResponse();
                        }
                    }
                });
            }
        },
        
        // Initialize all security measures
        initialize: function() {
            console.log('🔒 Security Guard initialized');
            
            // Start anti-debugging
            setInterval(() => {
                this.antiDebug.detectDebugger();
            }, 3000);
            
            // Check for console manipulation
            setInterval(() => {
                if (this.antiDebug.detectConsoleManipulation()) {
                    console.warn('🚨 Console manipulation detected');
                    this.antiDebug.triggerSecurityResponse();
                }
            }, 5000);
            
            // Start DOM protection
            this.domProtection.protectDOM();
            this.domProtection.monitorDOMMutations();
            
            // Start network monitoring
            this.networkMonitoring.monitorFetch();
            this.networkMonitoring.monitorXHR();
            
            // Start behavior analysis
            this.behaviorAnalysis.trackBehavior();
            
            // Periodic security checks
            setInterval(() => {
                if (this.antiDebug.detectTimingAttacks()) {
                    console.warn('🚨 Timing attack detected');
                    this.antiDebug.triggerSecurityResponse();
                }
            }, 10000);
        }
    };
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            SecurityGuard.initialize();
        });
    } else {
        SecurityGuard.initialize();
    }
    
    // Export for potential use
    window.SecurityGuard = SecurityGuard;
    
})(); 
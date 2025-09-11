/**
 * Modern Mobile Navigation Script (enhanced, but not used by default)
 * Handles responsive navigation without external dependencies.
 *
 * Note:
 * - The simpler variant `simple-mobile-nav.js` is included on pages for reliability.
 * - This file is kept for future expansion and parity with legacy behavior.
 */
(function() {
    'use strict';
    
    let mobileMenuToggle = null;
    let navMenu = null;
    let isMenuOpen = false;
    
    // Initialize navigation
    function initNavigation() {
        navMenu = document.querySelector('nav.site-nav .nav-pill');
        mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
        
        if (!navMenu || !mobileMenuToggle) {
            return;
        }
        
        // Set up event listeners
        setupEventListeners();
        
        // Handle initial screen size
        handleResize();
    }
    
    // Create mobile menu toggle button
    function createMobileToggle() {
        // Only create mobile toggle on screens 768px or smaller
        if (window.innerWidth > 768) {
            // Remove mobile toggle if it exists on desktop
            const existingToggle = document.querySelector('.mobile-menu-toggle');
            if (existingToggle) {
                existingToggle.remove();
            }
            return;
        }
        
        // Check if button already exists
        mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
        
        if (!mobileMenuToggle) {
            mobileMenuToggle = document.createElement('button');
            mobileMenuToggle.className = 'mobile-menu-toggle';
            mobileMenuToggle.innerHTML = `
                <span class="menu-icon">☰</span>
                <span class="menu-text">Menu</span>
            `;
            mobileMenuToggle.setAttribute('aria-label', 'Toggle navigation menu');
            mobileMenuToggle.setAttribute('aria-expanded', 'false');
            
            // Insert into header
            const header = document.querySelector('header');
            if (header) {
                header.appendChild(mobileMenuToggle);
            }
        }
    }
    
    // Setup event listeners
    function setupEventListeners() {
        // Mobile menu toggle click
        if (mobileMenuToggle) {
            mobileMenuToggle.addEventListener('click', function(e) {
                e.preventDefault();
                toggleMobileMenu();
            });
        }
        
        // Close menu when clicking nav links
        const navLinks = document.querySelectorAll('nav ul li a, nav.site-nav .nav-pill a');
        navLinks.forEach(link => {
            link.addEventListener('click', closeMobileMenu);
        });
        
        // Handle window resize
        window.addEventListener('resize', debounce(handleResize, 250));
        
        // Handle keyboard navigation
        document.addEventListener('keydown', handleKeydown);
        
        // Prevent scroll on touch when menu is open
        document.addEventListener('touchmove', function(e) {
            if (isMenuOpen && window.innerWidth <= 768) {
                e.preventDefault();
            }
        }, { passive: false });
    }
    
    // Toggle mobile menu
    function toggleMobileMenu() {
        if (window.innerWidth <= 768) {
            isMenuOpen = !isMenuOpen;
            updateMenuState();
        }
    }
    
    // Close mobile menu
    function closeMobileMenu() {
        if (isMenuOpen && window.innerWidth <= 768) {
            isMenuOpen = false;
            updateMenuState();
        }
    }
    
    // Update menu state
    function updateMenuState() {
        if (!navMenu || !mobileMenuToggle) return;
        
        if (isMenuOpen) {
            navMenu.classList.add('active');
            mobileMenuToggle.classList.add('active');
            mobileMenuToggle.setAttribute('aria-expanded', 'true');
            mobileMenuToggle.innerHTML = `✕`;
            
            // Prevent body scroll when menu is open
            document.body.classList.add('menu-open');
            
        } else {
            navMenu.classList.remove('active');
            mobileMenuToggle.classList.remove('active');
            mobileMenuToggle.setAttribute('aria-expanded', 'false');
            mobileMenuToggle.innerHTML = `☰`;
            
            // Restore body scroll
            document.body.classList.remove('menu-open');
        }
    }
    
    // Add close button to mobile menu
    function addCloseButton() {
        if (navMenu && !document.querySelector('.mobile-menu-close')) {
            const closeButton = document.createElement('button');
            closeButton.className = 'mobile-menu-close';
            closeButton.innerHTML = '✕';
            closeButton.setAttribute('aria-label', 'Close navigation menu');
            closeButton.addEventListener('click', closeMobileMenu);
            navMenu.appendChild(closeButton);
        }
    }
    
    // Remove close button from mobile menu
    function removeCloseButton() {
        const closeButton = document.querySelector('.mobile-menu-close');
        if (closeButton) {
            closeButton.remove();
        }
    }
    
    // Handle window resize
    function handleResize() {
        const width = window.innerWidth;
        
        if (width > 768) {
            // Desktop mode
            isMenuOpen = false;
            if (navMenu) {
                navMenu.classList.remove('active');
                navMenu.style.display = '';
            }
            
            // Remove mobile toggle button on desktop
            const existingToggle = document.querySelector('.mobile-menu-toggle');
            if (existingToggle) {
                existingToggle.remove();
                mobileMenuToggle = null;
            }
            
            // Restore body scroll in case it was locked
            document.body.classList.remove('menu-open');
            document.body.style.top = '';
            
        } else {
            // Mobile mode
            // Create mobile toggle if it doesn't exist
            if (!mobileMenuToggle) {
                createMobileToggle();
            }
            
            // Ensure menu is properly hidden if not active
            if (navMenu && !isMenuOpen) {
                navMenu.classList.remove('active');
                removeCloseButton();
            }
        }
        
        // Adjust media elements
        adjustMediaElements();
    }
    
    // Handle keyboard navigation
    function handleKeydown(event) {
        if (event.key === 'Escape' && isMenuOpen) {
            closeMobileMenu();
        }
        
        // Handle tab navigation within menu
        if (isMenuOpen && event.key === 'Tab') {
            const focusableElements = navMenu.querySelectorAll('a[href]');
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            
            if (event.shiftKey) {
                // Shift + Tab
                if (document.activeElement === firstElement) {
                    event.preventDefault();
                    lastElement.focus();
                }
            } else {
                // Tab
                if (document.activeElement === lastElement) {
                    event.preventDefault();
                    firstElement.focus();
                }
            }
        }
    }
    
    // Adjust media elements for responsiveness
    function adjustMediaElements() {
        const mediaElements = document.querySelectorAll('img, video, iframe');
        mediaElements.forEach(element => {
            if (!element.style.maxWidth) {
                element.style.maxWidth = '100%';
                element.style.height = 'auto';
            }
        });
    }
    
    // Debounce function to limit resize event calls
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Smooth scroll to anchor links
    function setupSmoothScroll() {
        const anchorLinks = document.querySelectorAll('a[href^="#"]');
        anchorLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                const targetId = this.getAttribute('href');
                if (targetId === '#') return;
                
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    e.preventDefault();
                    closeMobileMenu(); // Close menu if open
                    
                    // Wait for menu close animation to complete
                    setTimeout(() => {
                        // Calculate offset for sticky nav
                        const navHeight = document.querySelector('nav')?.offsetHeight || 0;
                        const targetPosition = targetElement.offsetTop - navHeight - 20;
                        
                        window.scrollTo({
                            top: targetPosition,
                            behavior: 'smooth'
                        });
                    }, isMenuOpen ? 300 : 0);
                }
            });
        });
    }
    
    // Focus management for accessibility
    function manageFocus() {
        if (isMenuOpen) {
            // Focus first menu item when menu opens
            const firstMenuItem = navMenu.querySelector('a');
            if (firstMenuItem) {
                setTimeout(() => firstMenuItem.focus(), 100);
            }
        } else {
            // Return focus to menu toggle when menu closes
            if (mobileMenuToggle) {
                mobileMenuToggle.focus();
            }
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            initNavigation();
            setupSmoothScroll();
        });
    } else {
        initNavigation();
        setupSmoothScroll();
    }
    
    // Export functions for potential external use
    window.MobileNav = {
        toggle: toggleMobileMenu,
        close: closeMobileMenu,
        isOpen: () => isMenuOpen,
        init: initNavigation
    };
    
})(); 
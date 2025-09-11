/**
 * Simple Mobile Navigation
 *
 * Purpose:
 * - Toggle the compact navigation "pill" as a full-screen dropdown on mobile
 * - Keep implementation dependency-free and CSP-friendly
 *
 * How it works:
 * - Finds `.mobile-menu-toggle` and `nav.site-nav .nav-pill`
 * - Toggles `.active` on the pill; CSS controls visibility/overlay
 * - Locks body scroll while menu is open for better UX
 *
 * Integration:
 * - Ensure your layout includes:
 *     <button class="mobile-menu-toggle" aria-expanded="false">☰</button>
 *     <ul class="nav-pill"> ... </ul>
 * - CSS must define styles for `.nav-pill.active` on mobile
 */
(function() {
    'use strict';
    
    function initMobileNav() {
        const toggle = document.querySelector('.mobile-menu-toggle');
        const menu = document.querySelector('.nav-pill');

        console.log('📱 Mobile nav init:', { 
            toggle: !!toggle, 
            menu: !!menu,
            toggleElement: toggle,
            menuElement: menu 
        });

        if (!toggle || !menu) {
            console.warn('📱 Mobile nav elements not found');
            console.log('Available elements:', {
                allToggles: document.querySelectorAll('.mobile-menu-toggle'),
                allNavPills: document.querySelectorAll('.nav-pill'),
                siteNav: document.querySelector('.site-nav')
            });
            return;
        }
        
        // Add click event to toggle
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const isActive = menu.classList.contains('active');
            console.log('📱 Menu toggle clicked, currently active:', isActive);
            
            if (isActive) {
                menu.classList.remove('active');
                toggle.innerHTML = '☰';
                toggle.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
                console.log('📱 Menu closed');
            } else {
                menu.classList.add('active');
                toggle.innerHTML = '✕';
                toggle.setAttribute('aria-expanded', 'true');
                document.body.style.overflow = 'hidden';
                console.log('📱 Menu opened');
            }
        });
        
        // Close menu when clicking menu links
        const menuLinks = menu.querySelectorAll('a');
        menuLinks.forEach(link => {
            link.addEventListener('click', function() {
                menu.classList.remove('active');
                toggle.innerHTML = '☰';
                toggle.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (menu.classList.contains('active') && 
                !menu.contains(e.target) && 
                !toggle.contains(e.target)) {
                menu.classList.remove('active');
                toggle.innerHTML = '☰';
                toggle.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
                console.log('📱 Menu closed (outside click)');
            }
        });
        
        // Close menu on window resize if it gets too wide
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768 && menu.classList.contains('active')) {
                menu.classList.remove('active');
                toggle.innerHTML = '☰';
                toggle.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
                console.log('📱 Menu closed (resize)');
            }
        });
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMobileNav);
    } else {
        initMobileNav();
    }
})();

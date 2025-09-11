const { JSDOM } = require('jsdom');
const createDOMPurify = require('dompurify');

// Create a JSDOM instance and DOMPurify
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param {string} dirty - Potentially unsafe HTML content
 * @param {Object} options - DOMPurify options
 * @returns {string} - Safe HTML content
 */
function sanitizeHTML(dirty, options = {}) {
    const defaultOptions = {
        ALLOWED_TAGS: [
            'p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'blockquote', 'code', 'pre', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
            'div', 'span'
        ],
        ALLOWED_ATTR: [
            'href', 'title', 'alt', 'src', 'class', 'id', 'target', 'rel'
        ],
        ALLOW_DATA_ATTR: false,
        FORBID_SCRIPT: true,
        FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit'],
        ADD_ATTR: ['target'],
        // Automatically add rel="noopener noreferrer" to external links
        TRANSFORM_TAGS: {
            'a': function(tagName, attribs) {
                if (attribs.href && attribs.href.startsWith('http')) {
                    attribs.target = '_blank';
                    attribs.rel = 'noopener noreferrer';
                }
                return {
                    tagName: tagName,
                    attribs: attribs
                };
            }
        }
    };

    const config = { ...defaultOptions, ...options };
    return DOMPurify.sanitize(dirty, config);
}

/**
 * Sanitize plain text content - strips all HTML
 * @param {string} dirty - Potentially unsafe text content
 * @returns {string} - Safe plain text
 */
function sanitizeText(dirty) {
    if (typeof dirty !== 'string') return '';
    return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

/**
 * Sanitize email content with more restrictive settings
 * @param {string} dirty - Potentially unsafe email content
 * @returns {string} - Safe email HTML content
 */
function sanitizeEmail(dirty) {
    return sanitizeHTML(dirty, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'div'],
        ALLOWED_ATTR: ['href', 'style'],
        ALLOW_DATA_ATTR: false
    });
}

module.exports = {
    sanitizeHTML,
    sanitizeText,
    sanitizeEmail
};
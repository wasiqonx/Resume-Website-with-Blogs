// Spam Filter for Contact Form
// This module contains patterns to detect promotional and spam messages

const spamWordList = {
    // Promotional keywords
    promotional: [
        'promo', 'promotion', 'promotional', 'offer', 'deals', 'discount', 'sale', 'sales',
        'limited time', 'act now', 'hurry', 'urgent', 'last chance', 'expires today',
        'free gift', 'free trial', 'no cost', 'risk free', 'money back guarantee',
        'special offer', 'exclusive offer', 'best deal', 'lowest price', 'save money',
        'earn money', 'make money', 'passive income', 'work from home', 'business opportunity',
        'mlm', 'affiliate', 'referral', 'commission', 'bonus', 'rewards'
    ],
    
    // Marketing terms
    marketing: [
        'marketing', 'advertisement', 'advertise', 'promote', 'campaign', 'seo services',
        'increase traffic', 'boost sales', 'lead generation', 'email marketing',
        'social media marketing', 'digital marketing', 'online marketing',
        'bulk email', 'mass email', 'email blast', 'newsletter subscription',
        'grow your business', 'increase revenue', 'conversion rate', 'roi'
    ],
    
    // Product selling
    selling: [
        'buy now', 'purchase', 'order now', 'shop now', 'add to cart',
        'product launch', 'new product', 'bestseller', 'top rated',
        'customer testimonial', 'five star', '5 star', 'highly rated',
        'premium quality', 'professional service', 'satisfaction guaranteed'
    ],
    
    // Investment/Finance spam
    finance: [
        'investment', 'invest', 'trading', 'forex', 'cryptocurrency', 'crypto',
        'bitcoin', 'profit', 'returns', 'portfolio', 'stocks', 'shares',
        'loan', 'credit', 'debt', 'mortgage', 'financial advisor',
        'get rich', 'millionaire', 'financial freedom'
    ],
    
    // Common spam phrases
    spam: [
        'congratulations', 'you have won', 'winner', 'prize', 'lottery',
        'claim your', 'click here', 'visit our website', 'check out',
        'follow us', 'subscribe to', 'join now', 'sign up',
        'unsubscribe', 'opt out', 'remove me', 'stop sending'
    ],
    
    // Adult content
    adult: [
        'dating', 'hookup', 'adult', 'singles', 'mature', 'escort'
    ],
    
    // Suspicious patterns
    suspicious: [
        'viagra', 'cialis', 'pharmacy', 'pills', 'medication',
        'weight loss', 'diet pills', 'lose weight',
        'replica', 'fake', 'counterfeit', 'imitation'
    ]
};

// Suspicious patterns (regex)
const suspiciousPatterns = [
    /\b\d{4}-\d{4}-\d{4}-\d{4}\b/, // Credit card patterns
    /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, // Multiple email addresses
    /http[s]?:\/\/[^\s]+/gi, // URLs
    /www\.[^\s]+/gi, // WWW links
    /\$\d+/g, // Dollar amounts
    /\d+%\s*(off|discount|save)/gi, // Percentage discounts
    /call\s*\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/gi, // Phone numbers
    /([A-Z]{2,}\s*){3,}/, // Excessive capitals
    /(.)\1{4,}/, // Repeated characters
    /!{3,}/, // Multiple exclamation marks
];

// Check if message contains spam content
function isSpamMessage(message, senderName = '', senderEmail = '') {
    if (!message || typeof message !== 'string') {
        return { isSpam: false, confidence: 0, reasons: [] };
    }
    
    const normalizedMessage = message.toLowerCase();
    const normalizedName = senderName.toLowerCase();
    const normalizedEmail = senderEmail.toLowerCase();
    const fullText = `${normalizedMessage} ${normalizedName} ${normalizedEmail}`;
    
    let spamScore = 0;
    let reasons = [];
    
    // Check against word lists
    for (const [category, words] of Object.entries(spamWordList)) {
        for (const word of words) {
            const wordCount = (fullText.match(new RegExp(`\\b${word}\\b`, 'gi')) || []).length;
            if (wordCount > 0) {
                spamScore += wordCount * getCategoryWeight(category);
                reasons.push(`Contains ${category} keyword: "${word}"`);
            }
        }
    }
    
    // Check suspicious patterns
    for (const pattern of suspiciousPatterns) {
        const matches = fullText.match(pattern);
        if (matches) {
            spamScore += matches.length * 2;
            reasons.push(`Suspicious pattern detected: ${getPatternDescription(pattern)}`);
        }
    }
    
    // Additional heuristics
    if (message.length > 1000) {
        spamScore += 1;
        reasons.push('Message is unusually long');
    }
    
    if (message.split(/\s+/).length < 5) {
        spamScore += 1;
        reasons.push('Message is suspiciously short');
    }
    
    // Check for excessive punctuation
    const punctuationCount = (message.match(/[!?.,;:]/g) || []).length;
    if (punctuationCount > message.length * 0.1) {
        spamScore += 2;
        reasons.push('Excessive punctuation detected');
    }
    
    // Check for mixed languages or character sets
    if (/[^\x00-\x7F]/.test(message) && message.length < 50) {
        spamScore += 1;
        reasons.push('Contains non-ASCII characters in short message');
    }
    
    const confidence = Math.min(spamScore / 10, 1); // Normalize to 0-1
    const isSpam = spamScore >= 5; // Threshold for spam detection
    
    return {
        isSpam,
        confidence: Math.round(confidence * 100),
        spamScore,
        reasons: reasons.slice(0, 5) // Limit to first 5 reasons
    };
}

// Get weight for different categories
function getCategoryWeight(category) {
    const weights = {
        promotional: 2,
        marketing: 2,
        selling: 2,
        finance: 3,
        spam: 3,
        adult: 4,
        suspicious: 4
    };
    return weights[category] || 1;
}

// Get description for regex patterns
function getPatternDescription(pattern) {
    const descriptions = {
        '/\\b\\d{4}-\\d{4}-\\d{4}-\\d{4}\\b/': 'Credit card number',
        '/[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}/gi': 'Multiple email addresses',
        '/http[s]?:\\/\\/[^\\s]+/gi': 'URL links',
        '/www\\.[^\\s]+/gi': 'Website links',
        '/\\$\\d+/g': 'Dollar amounts',
        '/\\d+%\\s*(off|discount|save)/gi': 'Percentage discounts',
        '/call\\s*\\d{3}[-\\.\\s]?\\d{3}[-\\.\\s]?\\d{4}/gi': 'Phone numbers',
        '/([A-Z]{2,}\\s*){3,}/': 'Excessive capital letters',
        '/(.)\1{4,}/': 'Character repetition',
        '/!{3,}/': 'Multiple exclamation marks'
    };
    
    const patternStr = pattern.toString();
    return descriptions[patternStr] || 'Unknown pattern';
}

// Test function for debugging
function testSpamFilter() {
    const testMessages = [
        "Hi, I'd like to discuss a project with you.",
        "AMAZING DISCOUNT!!! 50% OFF ALL PRODUCTS!!! BUY NOW!!!",
        "Free trial for our premium marketing service. Increase your sales by 300%!",
        "Hello, I found your contact through your website and would like to work together.",
        "Make money fast with our proven investment strategy! $5000 guaranteed returns!",
        "Congratulations! You have won $1,000,000! Click here to claim your prize!"
    ];
    
    console.log('Spam Filter Test Results:');
    console.log('========================');
    
    testMessages.forEach((message, index) => {
        const result = isSpamMessage(message);
        console.log(`\nTest ${index + 1}:`);
        console.log(`Message: "${message}"`);
        console.log(`Is Spam: ${result.isSpam}`);
        console.log(`Confidence: ${result.confidence}%`);
        console.log(`Score: ${result.spamScore}`);
        console.log(`Reasons: ${result.reasons.join(', ') || 'None'}`);
    });
}

module.exports = {
    isSpamMessage,
    spamWordList,
    testSpamFilter
};
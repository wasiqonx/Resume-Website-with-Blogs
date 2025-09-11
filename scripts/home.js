// Initialize captcha for forms when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Setup captcha for contact form
    if (document.getElementById('contact-form')) {
        captchaManager.setupFormWithCaptcha('contact-form', {
            captchaContainerId: 'contact-form-captcha'
        });
    }
    
    // Setup captcha for subscription form
    if (document.getElementById('subscribe-form')) {
        captchaManager.setupFormWithCaptcha('subscribe-form', {
            captchaContainerId: 'subscribe-form-captcha'
        });
    }
    
    // Setup captcha for anonymous message form
    if (document.getElementById('anon-message-form')) {
        captchaManager.setupFormWithCaptcha('anon-message-form', {
            captchaContainerId: 'anon-message-form-captcha'
        });
    }
});

// Handle contact form submission
document.getElementById('contact-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const submitButton = form.querySelector('button[type="submit"]');
    
    // Convert FormData to JSON
    const data = {};
    formData.forEach((value, key) => {
        data[key] = value;
    });
    
    // Show loading state
    submitButton.textContent = 'Sending...';
    submitButton.disabled = true;
    
    try {
        const response = await fetch('/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Success - show a nicer success message
            const successDiv = document.createElement('div');
            successDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: var(--primary-green); color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; font-weight: 500;';
            successDiv.textContent = '✅ Message sent successfully!';
            document.body.appendChild(successDiv);
            
            // Remove success message after 3 seconds
            setTimeout(() => {
                document.body.removeChild(successDiv);
            }, 3000);
            
            form.reset();
            captchaManager.reset('contact-form');
        } else {
            // Error - show a nicer error message
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #dc3545; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; font-weight: 500;';
            errorDiv.textContent = '❌ ' + (result.error || 'Something went wrong');
            document.body.appendChild(errorDiv);
            
            // Remove error message after 4 seconds
            setTimeout(() => {
                document.body.removeChild(errorDiv);
            }, 4000);
        }
    } catch (error) {
        console.error('Contact form error:', error);
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #dc3545; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; font-weight: 500;';
        errorDiv.textContent = '❌ Network error. Please try again.';
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            document.body.removeChild(errorDiv);
        }, 4000);
    } finally {
        // Reset button
        submitButton.textContent = 'Send';
        submitButton.disabled = false;
    }
});

// Email subscription functionality
const subscribeForm = document.getElementById('subscribe-form');
const subscribeMessage = document.getElementById('subscribe-message');

subscribeForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('subscribe-email').value;
    const name = document.getElementById('subscribe-name').value;
    const submitButton = subscribeForm.querySelector('button[type="submit"]');
    
    // Show loading state
    submitButton.textContent = 'Subscribing...';
    submitButton.disabled = true;
    subscribeMessage.textContent = '';
    
    try {
        const response = await fetch('/api/subscribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, name })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Success
            const successDiv = document.createElement('div');
            successDiv.style.cssText = 'color: #10b981; font-weight: 600; padding: 12px; background: rgba(16, 185, 129, 0.1); border-radius: 4px;';
            successDiv.textContent = '✅ ' + result.message;
            subscribeMessage.appendChild(successDiv);
            subscribeForm.reset();
            captchaManager.reset('subscribe-form');
        } else {
            // Error
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'color: #dc3545; font-weight: 600; padding: 12px; background: rgba(220, 53, 69, 0.1); border-radius: 4px;';
            errorDiv.textContent = '❌ ' + result.error;
            subscribeMessage.appendChild(errorDiv);
        }
    } catch (error) {
        console.error('Subscription error:', error);
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'color: #dc3545; font-weight: 600; padding: 12px; background: rgba(220, 53, 69, 0.1); border-radius: 4px;';
        errorDiv.textContent = '❌ Network error. Please try again.';
        subscribeMessage.appendChild(errorDiv);
    } finally {
        // Reset button
        submitButton.textContent = 'Subscribe';
        submitButton.disabled = false;
    }
});

// Anonymous message form
const anonForm = document.getElementById('anon-message-form');
const anonInput = document.getElementById('anon-message-input');
const anonStatus = document.getElementById('anon-message-status');
const charCount = document.getElementById('char-count');

if (anonInput && charCount) {
    anonInput.addEventListener('input', function() {
        const count = this.value.length;
        charCount.textContent = `${count}/1000`;
    });
}

if (anonForm) {
    anonForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        anonStatus.textContent = '';
        const msg = anonInput.value.trim();
        if (!msg) return;
        
        const submitBtn = anonForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
        
        try {
            const res = await fetch('/api/anon-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: msg })
            });
            const data = await res.json();
            if (res.ok) {
                const successDiv = document.createElement('div');
                successDiv.className = 'status-success';
                successDiv.textContent = data.message;
                anonStatus.appendChild(successDiv);
                anonInput.value = '';
                charCount.textContent = '0/1000';
                captchaManager.reset('anon-message-form');
            } else {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'status-error';
                errorDiv.textContent = data.error || 'Failed to send.';
                anonStatus.appendChild(errorDiv);
            }
        } catch (err) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'status-error';
            errorDiv.textContent = 'Network error.';
            anonStatus.appendChild(errorDiv);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
}
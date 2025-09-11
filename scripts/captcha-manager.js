class CaptchaManager {
    constructor() {
        // Use test site key for development, production should set proper site key via server-side rendering
        this.siteKey = window.HCAPTCHA_SITE_KEY || '10000000-ffff-ffff-ffff-000000000001'; // hCaptcha test site key
        this.scriptLoaded = false;
        this.loadScript();
    }

    loadScript() {
        if (this.scriptLoaded) return;
        
        const script = document.createElement('script');
        script.src = 'https://hcaptcha.com/1/api.js';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
        this.scriptLoaded = true;
    }

    createCaptcha(containerId, callback) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Captcha container with id "${containerId}" not found`);
            return null;
        }

        const captchaDiv = document.createElement('div');
        captchaDiv.className = 'h-captcha';
        captchaDiv.setAttribute('data-sitekey', this.siteKey);
        captchaDiv.setAttribute('data-callback', callback);
        captchaDiv.setAttribute('data-size', 'normal');
        captchaDiv.setAttribute('data-theme', 'light');
        
        container.appendChild(captchaDiv);
        return captchaDiv;
    }

    enableFormButton(formId, buttonSelector = 'button[type="submit"]') {
        const form = document.getElementById(formId);
        const button = form?.querySelector(buttonSelector);
        if (button) {
            button.disabled = false;
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
            button.classList.remove('captcha-disabled');
        }
    }

    disableFormButton(formId, buttonSelector = 'button[type="submit"]') {
        const form = document.getElementById(formId);
        const button = form?.querySelector(buttonSelector);
        if (button) {
            button.disabled = true;
            button.style.opacity = '0.6';
            button.style.cursor = 'not-allowed';
            button.classList.add('captcha-disabled');
        }
    }

    setupFormWithCaptcha(formId, options = {}) {
        const {
            captchaContainerId = `${formId}-captcha`,
            buttonSelector = 'button[type="submit"]',
            onCaptchaSuccess = null,
            onCaptchaError = null
        } = options;

        const form = document.getElementById(formId);
        if (!form) {
            console.error(`Form with id "${formId}" not found`);
            return;
        }

        let captchaContainer = document.getElementById(captchaContainerId);
        if (!captchaContainer) {
            console.log(`Creating new captcha container: ${captchaContainerId}`);
            captchaContainer = document.createElement('div');
            captchaContainer.id = captchaContainerId;
            captchaContainer.className = 'captcha-container';
            
            const submitButton = form.querySelector(buttonSelector);
            if (submitButton) {
                // Insert the captcha container directly before the submit button in the form
                form.insertBefore(captchaContainer, submitButton);
            } else {
                form.appendChild(captchaContainer);
            }
        } else {
            console.log(`Using existing captcha container: ${captchaContainerId}`);
        }
        
        // Ensure the container has proper styling for visibility
        captchaContainer.style.position = 'relative';
        captchaContainer.style.zIndex = '1000';
        captchaContainer.style.display = 'flex';
        captchaContainer.style.justifyContent = 'center';
        captchaContainer.style.alignItems = 'center';

        this.disableFormButton(formId, buttonSelector);

        const callbackName = `captchaCallback_${formId.replace(/-/g, '_')}`;
        
        window[callbackName] = (token) => {
            console.log(`Captcha solved for form ${formId}`);
            this.enableFormButton(formId, buttonSelector);
            
            let tokenInput = form.querySelector('input[name="h-captcha-response"]');
            if (!tokenInput) {
                tokenInput = document.createElement('input');
                tokenInput.type = 'hidden';
                tokenInput.name = 'h-captcha-response';
                form.appendChild(tokenInput);
            }
            tokenInput.value = token;

            if (onCaptchaSuccess) {
                onCaptchaSuccess(token);
            }
        };

        const errorCallbackName = `captchaErrorCallback_${formId.replace(/-/g, '_')}`;
        window[errorCallbackName] = (error) => {
            console.error(`Captcha error for form ${formId}:`, error);
            this.disableFormButton(formId, buttonSelector);
            
            if (onCaptchaError) {
                onCaptchaError(error);
            }
        };

        const waitForHcaptcha = () => {
            if (typeof window.hcaptcha !== 'undefined') {
                try {
                    const container = document.getElementById(captchaContainerId);
                    console.log(`Rendering captcha in container: ${captchaContainerId}`, container);
                    console.log('Container position relative to form:', container?.getBoundingClientRect());
                    
                    const widgetId = window.hcaptcha.render(captchaContainerId, {
                        sitekey: this.siteKey,
                        callback: callbackName,
                        'error-callback': errorCallbackName,
                        'expired-callback': () => {
                            console.log(`Captcha expired for form ${formId}`);
                            this.disableFormButton(formId, buttonSelector);
                        }
                    });
                    console.log(`Captcha rendered with widget ID: ${widgetId}`);
                } catch (error) {
                    console.error('Error rendering captcha:', error);
                }
            } else {
                setTimeout(waitForHcaptcha, 100);
            }
        };

        waitForHcaptcha();

        form.addEventListener('submit', (e) => {
            const token = form.querySelector('input[name="h-captcha-response"]')?.value;
            if (!token) {
                e.preventDefault();
                alert('Please complete the captcha verification.');
                return false;
            }
        });
    }

    reset(formId) {
        const captchaContainer = document.getElementById(`${formId}-captcha`);
        if (captchaContainer && typeof window.hcaptcha !== 'undefined') {
            const captchaWidget = captchaContainer.querySelector('.h-captcha');
            if (captchaWidget) {
                try {
                    window.hcaptcha.reset();
                    this.disableFormButton(formId);
                } catch (error) {
                    console.error('Error resetting captcha:', error);
                }
            }
        }
    }
}

const captchaManager = new CaptchaManager();

window.CaptchaManager = CaptchaManager;
window.captchaManager = captchaManager;
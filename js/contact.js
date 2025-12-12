// Contact Form JavaScript
// Uses localStorage to persist contact form submissions

const CONTACT_STORAGE_KEY = "webfit-contact-submissions";

export function initContactForm() {
    const contactForm = document.getElementById('contactForm');
    if (!contactForm) return;

    // Form submission handler
    contactForm.addEventListener('submit', function (e) {
        e.preventDefault(); // Prevent actual form submission for demo

        // Get form data
        const formData = new FormData(contactForm);
        const data = {};
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }

        // Validate required fields
        if (!validateForm(data)) {
            return;
        }
        // Simulate form submission
        submitForm(data);
    });

    // Form validation with detailed error messages
    function validateForm(data) {
        const required = ['name', 'email', 'subject', 'message'];
        let isValid = true;
        let errors = [];

        // Clear previous error styles and messages
        clearAllErrors();

        // Check required fields
        required.forEach(field => {
            if (!data[field] || data[field].trim() === '') {
                const element = document.getElementById(field);
                showFieldError(element, `${getFieldLabel(field)} is required`);
                isValid = false;
            }
        });

        // Validate name (min 2 characters)
        if (data.name && data.name.trim().length < 2) {
            showFieldError(document.getElementById('name'), 'Name must be at least 2 characters');
            isValid = false;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (data.email && !emailRegex.test(data.email)) {
            showFieldError(document.getElementById('email'), 'Please enter a valid email address');
            isValid = false;
        }

        // Validate phone format (optional but must be valid if provided)
        if (data.phone && data.phone.trim()) {
            const phoneRegex = /^[\d\s\-\+\(\)]{7,20}$/;
            if (!phoneRegex.test(data.phone)) {
                showFieldError(document.getElementById('phone'), 'Please enter a valid phone number');
                isValid = false;
            }
        }

        // Validate message length (min 10 characters)
        if (data.message && data.message.trim().length < 10) {
            showFieldError(document.getElementById('message'), 'Message must be at least 10 characters');
            isValid = false;
        }

        if (!isValid) {
            showMessage('Please correct the errors above and try again.', 'error');
        }

        return isValid;
    }

    // Get human-readable field label
    function getFieldLabel(field) {
        const labels = {
            name: 'Full Name',
            email: 'Email Address',
            phone: 'Phone Number',
            subject: 'Subject',
            message: 'Message'
        };
        return labels[field] || field;
    }

    // Show error on a specific field
    function showFieldError(element, message) {
        if (!element) return;

        element.classList.add('field-error');
        element.setAttribute('aria-invalid', 'true');

        // Create error message
        const errorEl = document.createElement('span');
        errorEl.className = 'field-error-message';
        errorEl.setAttribute('role', 'alert');
        errorEl.textContent = message;

        // Insert after the input
        const formGroup = element.closest('.form-group');
        if (formGroup) {
            formGroup.appendChild(errorEl);
        }
    }

    // Clear error from a field
    function clearFieldError(element) {
        if (!element) return;

        element.classList.remove('field-error');
        element.removeAttribute('aria-invalid');

        const formGroup = element.closest('.form-group');
        if (formGroup) {
            const errorMsg = formGroup.querySelector('.field-error-message');
            if (errorMsg) errorMsg.remove();
        }
    }

    // Clear all errors
    function clearAllErrors() {
        document.querySelectorAll('.form-group input, .form-group select, .form-group textarea').forEach(field => {
            clearFieldError(field);
        });
        document.querySelectorAll('.field-error-message').forEach(el => el.remove());
    }

    // Save contact submission to localStorage
    function saveToLocalStorage(data) {
        try {
            const existing = JSON.parse(localStorage.getItem(CONTACT_STORAGE_KEY) || '[]');
            existing.push({
                ...data,
                submittedAt: new Date().toISOString(),
                id: Date.now()
            });
            localStorage.setItem(CONTACT_STORAGE_KEY, JSON.stringify(existing));
            return true;
        } catch (err) {
            console.error('Failed to save to localStorage:', err);
            return false;
        }
    }

    // Simulate form submission
    function submitForm(data) {
        // Show loading state
        const submitBtn = document.querySelector('.submit-btn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="loading-spinner"></span> Sending...';
        submitBtn.disabled = true;

        // Simulate API call delay
        setTimeout(() => {
            // Save to localStorage for persistence
            saveToLocalStorage(data);

            // Reset button
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;

            // Show success message
            showMessage('Thank you for your message! We\'ll get back to you within 24 hours.', 'success');

            // Reset form
            contactForm.reset();
            clearAllErrors();

            // Log form data (in real implementation, this would be sent to a server)
            console.log('Form submitted with data:', data);
        }, 2000);
    }

    // Show message function
    function showMessage(message, type) {
        // Remove existing messages
        const existingMessage = document.querySelector('.form-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create message element
        const messageElement = document.createElement('div');
        messageElement.className = `form-message ${type}`;
        messageElement.setAttribute('role', 'alert');
        messageElement.innerHTML = `
            <span class="message-icon">${type === 'success' ? '✓' : '⚠'}</span>
            <span class="message-text">${message}</span>
        `;

        // Insert message after form
        contactForm.parentNode.insertBefore(messageElement, contactForm.nextSibling);

        // Animate in
        messageElement.style.animation = 'slideInUp 0.3s ease-out';

        // Remove message after 5 seconds
        setTimeout(() => {
            messageElement.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => messageElement.remove(), 300);
        }, 5000);
    }

    // Real-time validation feedback
    const inputs = document.querySelectorAll('.form-group input, .form-group select, .form-group textarea');
    inputs.forEach(input => {
        input.addEventListener('blur', function () {
            clearFieldError(this);

            if (this.hasAttribute('required') && !this.value.trim()) {
                showFieldError(this, `${getFieldLabel(this.id)} is required`);
            } else if (this.value.trim()) {
                // Field-specific validation
                if (this.type === 'email') {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(this.value)) {
                        showFieldError(this, 'Please enter a valid email address');
                    } else {
                        this.classList.add('field-valid');
                    }
                } else if (this.id === 'phone' && this.value.trim()) {
                    const phoneRegex = /^[\d\s\-\+\(\)]{7,20}$/;
                    if (!phoneRegex.test(this.value)) {
                        showFieldError(this, 'Please enter a valid phone number');
                    } else {
                        this.classList.add('field-valid');
                    }
                } else {
                    this.classList.add('field-valid');
                }
            }
        });

        // Clear error on input
        input.addEventListener('input', function () {
            if (this.classList.contains('field-error')) {
                clearFieldError(this);
            }
            this.classList.remove('field-valid');
        });
    });
}
// Contact Form JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contactForm');
    
    // Form submission handler
    contactForm.addEventListener('submit', function(e) {
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
    
    // Form validation
    function validateForm(data) {
        const required = ['name', 'email', 'subject', 'message'];
        let isValid = true;
        
        // Clear previous error styles
        document.querySelectorAll('.form-group input, .form-group select, .form-group textarea').forEach(field => {
            field.style.borderColor = '#ddd';
        });
        
        // Check required fields
        required.forEach(field => {
            if (!data[field] || data[field].trim() === '') {
                const element = document.getElementById(field);
                element.style.borderColor = '#ff6b6b';
                isValid = false;
            }
        });
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (data.email && !emailRegex.test(data.email)) {
            document.getElementById('email').style.borderColor = '#ff6b6b';
            showMessage('Please enter a valid email address.', 'error');
            isValid = false;
        }
        
        if (!isValid) {
            showMessage('Please fill in all required fields correctly.', 'error');
        }
        
        return isValid;
    }
    
    // Simulate form submission
    function submitForm(data) {
        // Show loading state
        const submitBtn = document.querySelector('.submit-btn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;
        
        // Simulate API call delay
        setTimeout(() => {
            // Reset button
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            
            // Show success message
            showMessage('Thank you for your message! We\'ll get back to you within 24 hours.', 'success');
            
            // Reset form
            contactForm.reset();
            
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
        messageElement.textContent = message;
        
        // Insert message after form
        contactForm.parentNode.insertBefore(messageElement, contactForm.nextSibling);
        
        // Remove message after 5 seconds
        setTimeout(() => {
            messageElement.remove();
        }, 5000);
    }
    
    // Real-time validation feedback
    const inputs = document.querySelectorAll('.form-group input, .form-group select, .form-group textarea');
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.hasAttribute('required') && !this.value.trim()) {
                this.style.borderColor = '#ff6b6b';
            } else {
                this.style.borderColor = '#ddd';
            }
            
            // Special validation for email
            if (this.type === 'email' && this.value) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(this.value)) {
                    this.style.borderColor = '#ff6b6b';
                } else {
                    this.style.borderColor = '#28a745';
                }
            }
        });
        
        // Green border for valid required fields
        input.addEventListener('input', function() {
            if (this.hasAttribute('required') && this.value.trim()) {
                this.style.borderColor = '#28a745';
            }
        });
    });
});
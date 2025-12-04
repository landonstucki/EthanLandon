/**
 * Form Validation Module
 * Reusable form validation utilities
 */

/**
 * Validation rules configuration
 */
export const validationRules = {
  required: (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim() !== '';
    return true;
  },
  
  email: (value) => {
    if (!value) return true; // Let required handle empty
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },
  
  phone: (value) => {
    if (!value) return true; // Let required handle empty
    const phoneRegex = /^[\d\s\-\+\(\)]{7,20}$/;
    return phoneRegex.test(value);
  },
  
  minLength: (min) => (value) => {
    if (!value) return true;
    return value.length >= min;
  },
  
  maxLength: (max) => (value) => {
    if (!value) return true;
    return value.length <= max;
  },
  
  pattern: (regex) => (value) => {
    if (!value) return true;
    return regex.test(value);
  },
  
  number: (value) => {
    if (!value) return true;
    return !isNaN(parseFloat(value)) && isFinite(value);
  },
  
  min: (minVal) => (value) => {
    if (!value) return true;
    return parseFloat(value) >= minVal;
  },
  
  max: (maxVal) => (value) => {
    if (!value) return true;
    return parseFloat(value) <= maxVal;
  }
};

/**
 * Error messages for validation rules
 */
export const errorMessages = {
  required: 'This field is required',
  email: 'Please enter a valid email address',
  phone: 'Please enter a valid phone number',
  minLength: (min) => `Must be at least ${min} characters`,
  maxLength: (max) => `Must be no more than ${max} characters`,
  pattern: 'Please enter a valid value',
  number: 'Please enter a valid number',
  min: (min) => `Must be at least ${min}`,
  max: (max) => `Must be no more than ${max}`
};

/**
 * Validate a single field
 * @param {string} value - Field value
 * @param {Array} rules - Array of rule objects { rule: string, params?: any }
 * @returns {Object} - { valid: boolean, errors: Array<string> }
 */
export function validateField(value, rules) {
  const errors = [];
  
  for (const ruleConfig of rules) {
    const { rule, params, message } = ruleConfig;
    
    let validator;
    let errorMsg;
    
    if (typeof validationRules[rule] === 'function') {
      if (params !== undefined) {
        validator = validationRules[rule](params);
        errorMsg = message || (typeof errorMessages[rule] === 'function' 
          ? errorMessages[rule](params) 
          : errorMessages[rule]);
      } else {
        validator = validationRules[rule];
        errorMsg = message || errorMessages[rule];
      }
      
      if (!validator(value)) {
        errors.push(errorMsg);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate an entire form
 * @param {Object} formData - Object with field names as keys
 * @param {Object} schema - Validation schema { fieldName: [rules] }
 * @returns {Object} - { valid: boolean, errors: { fieldName: [errors] } }
 */
export function validateForm(formData, schema) {
  const errors = {};
  let valid = true;
  
  for (const [fieldName, rules] of Object.entries(schema)) {
    const fieldResult = validateField(formData[fieldName], rules);
    
    if (!fieldResult.valid) {
      valid = false;
      errors[fieldName] = fieldResult.errors;
    }
  }
  
  return { valid, errors };
}

/**
 * Show error message on a field
 * @param {HTMLElement} field - The input field
 * @param {string} message - Error message
 */
export function showFieldError(field, message) {
  // Remove existing error
  clearFieldError(field);
  
  // Add error class
  field.classList.add('field-error');
  field.setAttribute('aria-invalid', 'true');
  
  // Create error message element
  const errorEl = document.createElement('span');
  errorEl.className = 'error-message';
  errorEl.setAttribute('role', 'alert');
  errorEl.textContent = message;
  
  // Insert after field
  field.parentNode.insertBefore(errorEl, field.nextSibling);
}

/**
 * Clear error from a field
 * @param {HTMLElement} field - The input field
 */
export function clearFieldError(field) {
  field.classList.remove('field-error');
  field.removeAttribute('aria-invalid');
  
  // Remove error message if exists
  const errorEl = field.parentNode.querySelector('.error-message');
  if (errorEl) {
    errorEl.remove();
  }
}

/**
 * Clear all errors from a form
 * @param {HTMLFormElement} form - The form element
 */
export function clearFormErrors(form) {
  form.querySelectorAll('.field-error').forEach(field => {
    clearFieldError(field);
  });
  
  form.querySelectorAll('.error-message').forEach(el => el.remove());
}

/**
 * Get form data as an object
 * @param {HTMLFormElement} form - The form element
 * @returns {Object} - Form data object
 */
export function getFormData(form) {
  const formData = new FormData(form);
  const data = {};
  
  for (const [key, value] of formData.entries()) {
    data[key] = value;
  }
  
  return data;
}

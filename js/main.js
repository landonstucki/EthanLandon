/**
 * Main Application Module
 * Central entry point that initializes all features
 */

import { initNavigation } from './navigation.js';

// Initialize navigation on all pages
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
});

// Export for use in other modules
export { initNavigation };

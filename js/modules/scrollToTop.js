/**
 * Scroll to Top Module
 * Adds a floating "Back to Top" button that appears when scrolling down
 */

export function initScrollToTop() {
    // Create button element
    const button = document.createElement('button');
    button.id = 'scroll-to-top';
    button.className = 'scroll-to-top hidden';
    button.setAttribute('aria-label', 'Scroll to top');
    button.innerHTML = '↑';

    // Add button to DOM
    document.body.appendChild(button);

    // Show/hide button based on scroll position
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        // Debounce to improve performance
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            if (window.scrollY > 300) {
                button.classList.remove('hidden');
            } else {
                button.classList.add('hidden');
            }
        }, 100);
    });

    // Smooth scroll to top when clicked
    button.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

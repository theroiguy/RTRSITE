// Fade-in animation on scroll
window.addEventListener('scroll', () => {
    document.querySelectorAll('.fade-in').forEach(el => {
        if (el.getBoundingClientRect().top < window.innerHeight - 50) {
            el.classList.add('show');
        }
    });
    // Back to top visibility
    const btn = document.getElementById('back-to-top');
    if (btn) {
        btn.style.display = window.scrollY > 200 ? 'block' : 'none';
    }
});

// Populate gallery page with images
function populateGallery() {
    const container = document.querySelector('.gallery-container');
    if (container) {
        for (let i = 1; i <= 31; i++) {
            const img = document.createElement('img');
            img.loading = 'lazy';
            img.src = `${i}.png`;
            img.alt = `Project Image ${i}`;
            container.appendChild(img);
        }
    }
}
window.addEventListener('DOMContentLoaded', populateGallery);

// Back to top handler
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Register service worker if supported
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js');
    });
}

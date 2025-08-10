// Fade-in animation on scroll
window.addEventListener('scroll', () => {
    document.querySelectorAll('.fade-in').forEach(el => {
        if (el.getBoundingClientRect().top < window.innerHeight - 50) {
            el.classList.add('show');
        }
    });
    const nav = document.querySelector('.navbar');
    if (nav) {
        nav.classList.toggle('shadow', window.scrollY > 50);
    }
    // Back to top visibility
    const btn = document.getElementById('back-to-top');
    if (btn) {
        btn.style.display = window.scrollY > 200 ? 'block' : 'none';
    }
});

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

// Lightbox for gallery
function initLightbox() {
    const images = document.querySelectorAll('.gallery img');
    if (!images.length) return;
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.innerHTML = '<span class="lightbox-close">&times;</span><img>';
    document.body.appendChild(lightbox);
    const lbImg = lightbox.querySelector('img');
    lightbox.addEventListener('click', e => {
        if (e.target.classList.contains('lightbox-close') || e.target === lightbox) {
            lightbox.classList.remove('show');
        }
    });
    images.forEach(img => {
        img.addEventListener('click', () => {
            lbImg.src = img.src;
            lbImg.alt = img.alt;
            lightbox.classList.add('show');
        });
    });
}

function handleLazyLoadedImages() {
    document.querySelectorAll('img[loading="lazy"]').forEach(img => {
        img.classList.add('lazy-init');
        if (img.complete) {
            img.classList.add('lazy-loaded');
        } else {
            img.addEventListener('load', () => img.classList.add('lazy-loaded'));
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initLightbox();
    handleLazyLoadedImages();
});

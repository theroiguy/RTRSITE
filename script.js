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
    const images = document.querySelectorAll('.gallery-grid img');
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

// Load gallery images and verify each file exists before displaying it.
// This helps catch path issues or missing assets on the server.
async function loadGallery() {
    const grid = document.getElementById('gallery');
    if (!grid) return;
    // Path relative to the current HTML file. Adjust if you deploy to a
    // different subdirectory.
    const basePath = 'images/gallery';
    for (let i = 1; i <= 31; i++) {
        const url = `${basePath}/photo${i}.jpg`;
        try {
            // Use a HEAD request to confirm the image exists before creating
            // the element. If the request fails, log the HTTP status.
            const resp = await fetch(url, { method: 'HEAD' });
            if (resp.ok) {
                const img = document.createElement('img');
                img.loading = 'lazy';
                img.src = url;
                img.alt = `Project Image ${i}`;
                img.onerror = () => {
                    console.error(`Failed to load ${img.src}. Check the path or file.`);
                    img.remove();
                };
                grid.appendChild(img);
            } else {
                console.error(`Image not found (HTTP ${resp.status}): ${url}`);
            }
        } catch (err) {
            console.error(`Error checking image ${url}:`, err);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadGallery();
    initLightbox();
    handleLazyLoadedImages();
});

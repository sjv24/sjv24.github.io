const menuIcon = document.querySelector('#menu-icon');
const navLinks = document.querySelector('.nav-links');

if (menuIcon && navLinks) {
    menuIcon.onclick = () => {
        navLinks.classList.toggle('active');
    };

    navLinks.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => navLinks.classList.remove('active'));
    });
}

// Give the sticky header a subtle border/shadow once the page scrolls.
const header = document.querySelector('.header');
if (header) {
    const updateHeaderState = () => {
        header.classList.toggle('header--scrolled', window.scrollY > 10);
    };
    updateHeaderState();
    window.addEventListener('scroll', updateHeaderState, { passive: true });
}

// Subtle scroll-reveal: fades/slides elements in once, respects reduced motion.
function initScrollReveal(root = document) {
    const items = root.querySelectorAll('.reveal:not(.is-visible)');
    if (!items.length) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !('IntersectionObserver' in window)) {
        items.forEach((el) => el.classList.add('is-visible'));
        return;
    }

    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                io.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    items.forEach((el) => io.observe(el));

    // Safety net: content must never stay permanently invisible if the
    // observer fails to fire for any reason (unusual browser/extension quirks).
    setTimeout(() => {
        items.forEach((el) => el.classList.add('is-visible'));
        io.disconnect();
    }, 1500);
}

async function loadProjects() {
    const homeGrid = document.querySelector('#projects .projects-grid');
    const allGrid = document.querySelector('.projects-collage .projects-grid');
    const container = homeGrid || allGrid;
    if (!container) return;

    try {
        const projects = await (await fetch('projects.json')).json();

        const toShow = homeGrid
            ? [...projects].slice(-2).reverse()
            : [...projects].reverse();

        container.innerHTML = toShow.map((p, i) => `
            <div class="project-card reveal" style="--i:${i}">
                <div class="project-card__media">
                    <img src="${p.image}" alt="${p.title}">
                </div>
                <h3>${p.title}</h3>
                <p>${p.desc}</p>
                <div class="tag-list">
                    ${(p.tags || []).map((t) => `<span class="tag">${t}</span>`).join('')}
                </div>
                <div class="btn-group">
                    <a href="${p.link}"><div class="btn">View More</div></a>
                </div>
            </div>
        `).join('');

        initScrollReveal(container);
    } catch (err) {
        console.error('Error loading projects:', err);
        container.innerHTML = '<p>Failed to load projects.</p>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadProjects();
    initScrollReveal();
});

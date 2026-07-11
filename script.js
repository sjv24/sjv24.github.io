const menuIcon = document.querySelector('#menu-icon');
const navLinks = document.querySelector('.nav-links');

if (menuIcon && navLinks) {
    menuIcon.onclick = () => {
        navLinks.classList.toggle('active');
    };
}

async function loadProjects() {
    const homeGrid = document.querySelector('#projects .projects-grid');
    const allGrid = document.querySelector('.projects-collage .projects-grid');
    const container = homeGrid || allGrid;
    if (!container) return;

    try {
        const projects = await (await fetch('projects.json')).json();

        const toShow = homeGrid
            ? [
                projects.find(p => p.title.toLowerCase().includes('diabetes')),
                projects[projects.length - 1],
              ].filter((p, i, arr) => p && arr.indexOf(p) === i)
            : [...projects].reverse();

        container.innerHTML = toShow.map(p => `
            <div class="project-card">
                <img src="${p.image}" alt="${p.title}">
                <h3>${p.title}</h3>
                <p>${p.desc}</p>
                <div class="btn-group">
                    <a href="${p.link}" target="_blank"><div class="btn">View More</div></a>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Error loading projects:', err);
        container.innerHTML = '<p>Failed to load projects.</p>';
    }
}

document.addEventListener('DOMContentLoaded', loadProjects);

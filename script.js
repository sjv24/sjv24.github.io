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

// Case-study video.
// Default: plays muted while on screen; clicking it restarts with sound.
// Reduced motion or data saver: nothing downloads until the play button is pressed.
function initProjectVideo() {
    const video = document.querySelector('#project-video');
    if (!video) return;
    const frame = video.closest('.project-video');
    const playBtn = frame.querySelector('.video-play');
    const soundBtn = frame.querySelector('.video-sound');
    const bar = frame.querySelector('.video-progress span');

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = Boolean(navigator.connection && navigator.connection.saveData);
    const autoplay = !reduced && !saveData;
    let userPaused = false;

    // If the video file is missing, hide the whole block instead of an empty box.
    const block = video.closest('.project-video-block');
    const hideBlock = () => { if (block) block.hidden = true; };
    video.addEventListener('error', hideBlock);
    fetch(video.currentSrc || video.src, { method: 'HEAD' })
        .then((res) => { if (!res.ok) hideBlock(); })
        .catch(() => {});

    const showPlay = (show) => { playBtn.hidden = !show; };

    const syncSound = () => {
        const icon = soundBtn.querySelector('i');
        const label = soundBtn.querySelector('span');
        soundBtn.setAttribute('aria-pressed', String(!video.muted));
        soundBtn.setAttribute('aria-label', video.muted ? 'Turn sound on' : 'Turn sound off');
        icon.className = video.muted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
        label.textContent = video.muted ? 'Sound off' : 'Sound on';
    };

    // Only fall back to the play button if the browser actually blocked playback.
    const play = () => video.play()
        .then(() => showPlay(false))
        .catch((err) => { if (err.name === 'NotAllowedError') showPlay(true); });

    const playFromStartWithSound = () => {
        userPaused = false;
        video.muted = false;
        video.currentTime = 0;
        play();
    };

    // Progress bar follows playback smoothly while the video runs.
    let raf = 0;
    const drawProgress = () => {
        if (video.duration) bar.style.transform = `scaleX(${video.currentTime / video.duration})`;
        raf = video.paused ? 0 : requestAnimationFrame(drawProgress);
    };
    video.addEventListener('play', () => { if (!raf) raf = requestAnimationFrame(drawProgress); });
    video.addEventListener('timeupdate', drawProgress);
    video.addEventListener('volumechange', syncSound);

    // Click anywhere on the video.
    frame.addEventListener('click', (e) => {
        if (soundBtn.contains(e.target)) return;
        if (video.paused) {
            if (video.muted || video.currentTime === 0) playFromStartWithSound();
            else { userPaused = false; play(); }
        } else if (video.muted) {
            playFromStartWithSound();
        } else {
            userPaused = true;
            video.pause();
            showPlay(true);
        }
    });

    soundBtn.addEventListener('click', () => {
        if (video.muted) playFromStartWithSound();
        else video.muted = true;
    });

    if (!autoplay) {
        showPlay(true);
        return;
    }

    video.preload = 'auto';
    const onScreen = () => {
        const r = video.getBoundingClientRect();
        return r.top < window.innerHeight && r.bottom > 0;
    };
    if (onScreen()) play();
    if ('IntersectionObserver' in window) {
        // Play while any of it is on screen; pause once it is fully off screen.
        new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting) video.pause();
            else if (!userPaused) play();
        }).observe(video);
    }
}

// Journey timeline: the rail fills as you scroll and each milestone lights up.
function initTimeline() {
    const timeline = document.querySelector('.timeline');
    if (!timeline) return;
    const items = [...timeline.querySelectorAll('.timeline__item')];
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
        items.forEach((el) => el.classList.add('is-active'));
        timeline.style.setProperty('--progress', 1);
        return;
    }

    let ticking = false;
    const update = () => {
        ticking = false;
        const rect = timeline.getBoundingClientRect();
        const focus = window.innerHeight * 0.6;
        let progress = Math.min(1, Math.max(0, (focus - rect.top) / rect.height));
        items.forEach((el) => {
            const dot = el.querySelector('.timeline__dot').getBoundingClientRect();
            if (dot.top < focus) el.classList.add('is-active');
        });
        // Light up the last milestone once the page bottoms out.
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
            items.forEach((el) => el.classList.add('is-active'));
            progress = 1;
        }
        timeline.style.setProperty('--progress', progress.toFixed(4));
    };
    const onScroll = () => {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(update);
        }
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
}

document.addEventListener('DOMContentLoaded', () => {
    loadProjects();
    initScrollReveal();
    initProjectVideo();
    initTimeline();
});

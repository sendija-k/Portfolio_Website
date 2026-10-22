function esc(s) {
    return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Headline markup: newline -> <br>, *text* -> <tag>text</tag> (accent/muted style)
function formatHeading(text, tag) {
    return esc(text)
        .replace(/\*([^*]+)\*/g, `<${tag}>$1</${tag}>`)
        .replace(/\n/g, '<br>');
}

const BAR_HEIGHTS = [45, 70, 55, 90, 65, 80, 50, 75, 95, 60, 85, 40];
const BARS_HTML = BAR_HEIGHTS.map((h, i) =>
    `<div class="bar" style="height:${h}%;animation-delay:${(0.2 + i * 0.1).toFixed(1)}s"></div>`
).join('');

let scrollObserver = null;

function setupScrollObserver() {
    scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add('visible');
                scrollObserver.unobserve(e.target);
            }
        });
    }, { threshold: 0.12 });
}

function renderFeatured(p) {
    const wrap = document.getElementById('featured-project-wrap');
    if (!wrap) return;
    const titleHTML = p.titleBreak || esc(p.title);
    const github = p.github || p.githubUrl || '#';
    wrap.innerHTML = `
        <a href="${esc(github)}" target="_blank" class="project-featured" id="feat-proj">
            <div class="project-featured-visual">
                <div class="project-chart">${BARS_HTML}</div>
                <p class="project-featured-label">Featured Project</p>
                <h3 class="project-featured-title">${titleHTML}</h3>
                <div class="project-featured-metric">
                    <span class="m-num">${esc(p.metric || '')}</span>
                    <span class="m-lbl">${esc(p.metricLabel || '')}</span>
                </div>
            </div>
            <div class="project-featured-info">
                <div>
                    <p class="project-description">${esc(p.description)}</p>
                    ${p.description2 ? `<p class="project-description" style="margin-top:1rem;">${esc(p.description2)}</p>` : ''}
                    <div class="project-stack">
                        ${(p.tags || p.tools || []).map(t => `<span class="stack-tag">${esc(t)}</span>`).join('')}
                    </div>
                </div>
                <span class="project-link">View on GitHub →</span>
            </div>
        </a>`;
    const card = wrap.querySelector('#feat-proj');
    if (card && scrollObserver) scrollObserver.observe(card);
}

function renderSecondary(projects) {
    const wrap = document.getElementById('secondary-projects-wrap');
    if (!wrap) return;
    wrap.innerHTML = projects.map((p, idx) => {
        const github = p.github || p.githubUrl || '#';
        return `
        <a href="${esc(github)}" target="_blank" class="project-card"
           ${idx > 0 ? `style="transition-delay:${idx * 0.1}s"` : ''}>
            <p class="card-num">0${idx + 2}</p>
            <h3 class="card-title">${esc(p.title)}</h3>
            <div class="card-metric">${esc(p.metric || '')}<span>${esc(p.metricLabel || '')}</span></div>
            <p class="card-desc">${esc(p.description)}</p>
            <div class="card-stack">
                ${(p.tags || p.tools || []).map(t => `<span class="card-tag">${esc(t)}</span>`).join('')}
            </div>
        </a>`;
    }).join('');
    wrap.querySelectorAll('.project-card').forEach(el => {
        if (scrollObserver) scrollObserver.observe(el);
    });
}

const DEFAULT_PROJECTS_COUNT = '{n} projects / 2024–2025';
let projectsTotal = 0;

// Count label next to the projects headline; {n} is replaced with the number of projects
function renderProjectsCount() {
    const countEl = document.getElementById('projectsCount');
    if (!countEl) return;
    const label = (homeData && homeData.projects && homeData.projects.countLabel != null)
        ? homeData.projects.countLabel
        : DEFAULT_PROJECTS_COUNT;
    countEl.textContent = label.replace(/\{n\}/g, projectsTotal);
}

function renderProjects(data) {
    if (!data || !data.projects) return;
    const projects = data.projects.slice().sort((a, b) => (a.order || 0) - (b.order || 0));

    projectsTotal = projects.length;
    renderProjectsCount();

    setupScrollObserver();
    if (projects[0]) renderFeatured(projects[0]);
    if (projects.length > 1) renderSecondary(projects.slice(1));

    attachEventListeners();
}

function renderHomeContent(data) {
    if (!data) return;

    const logo = document.getElementById('navLogo');
    if (logo && data.nav) logo.textContent = data.nav.logo;

    if (data.hero) {
        const eyebrow = document.getElementById('heroEyebrow');
        if (eyebrow) eyebrow.textContent = data.hero.eyebrow;

        const heroName = document.getElementById('heroName');
        if (heroName) heroName.innerHTML = data.hero.name.split('\n').map(esc).join('<br>');

        const tagline = document.getElementById('heroTagline');
        if (tagline) tagline.textContent = data.hero.tagline;

        const skillStrip = document.getElementById('heroSkillStrip');
        if (skillStrip && data.hero.skillTags) {
            skillStrip.innerHTML = data.hero.skillTags
                .map(t => `<span class="skill-tag">${esc(t)}</span>`).join('');
        }
    }

    if (data.about) {
        const aboutHeading = document.querySelector('.about-heading');
        if (aboutHeading && data.about.heading) aboutHeading.innerHTML = formatHeading(data.about.heading, 'em');

        const aboutBody = document.getElementById('aboutBody');
        if (aboutBody && data.about.body) {
            aboutBody.innerHTML = data.about.body.map(p => `<p>${esc(p)}</p>`).join('');
        }
    }

    if (data.projects) {
        const projectsTitle = document.querySelector('.projects-title');
        if (projectsTitle && data.projects.heading) projectsTitle.innerHTML = formatHeading(data.projects.heading, 'span');
    }
    renderProjectsCount();

    if (data.contact) {
        const contactHeading = document.querySelector('.contact-heading');
        if (contactHeading && data.contact.heading) contactHeading.innerHTML = formatHeading(data.contact.heading, 'em');

        const contactBody = document.getElementById('contactBody');
        if (contactBody) contactBody.textContent = data.contact.body;

        const contactLinks = document.getElementById('contactLinks');
        if (contactLinks && data.contact.links) {
            contactLinks.innerHTML = data.contact.links.map(l => `
                <a href="${esc(l.href)}" class="contact-link"${l.href.startsWith('http') ? ' target="_blank"' : ''}>
                    <span>${esc(l.label)}</span><span class="cl-arrow">→</span>
                </a>`).join('');
        }
    }

    if (data.footer) {
        const footerLeft = document.getElementById('footerLeft');
        if (footerLeft) footerLeft.textContent = data.footer.left;
        const footerRight = document.getElementById('footerRight');
        if (footerRight) footerRight.textContent = data.footer.right;
    }

    const nameText = data.hero ? data.hero.name.replace('\n', ' ') : 'Sendija Kurzemniece';
    document.title = nameText + ' — Data Analyst';
}

function updatePhotoContainer() {}
function updatePhotoPreview() {}

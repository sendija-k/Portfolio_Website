function initHomeAdmin() {
    const adminHomeButton = document.getElementById('adminHomeButton');
    const homeAdminModal = document.getElementById('homeAdminModal');
    const closeHomeAdminModal = document.getElementById('closeHomeAdminModal');

    if (!adminHomeButton || !homeAdminModal || !closeHomeAdminModal) {
        console.error('Home admin elements not found');
        return;
    }

    adminHomeButton.addEventListener('click', async () => {
        const isAuthenticated = await checkAuthentication();
        if (isAuthenticated) {
            homeAdminModal.classList.add('active');
            await loadHomeAdminData();
        } else {
            document.getElementById('loginModal').classList.add('active');
            sessionStorage.setItem('pendingAdminPanel', 'home');
        }
    });

    closeHomeAdminModal.addEventListener('click', () => {
        homeAdminModal.classList.remove('active');
    });

    homeAdminModal.addEventListener('click', (e) => {
        if (e.target === homeAdminModal) homeAdminModal.classList.remove('active');
    });

    const addContactLinkButton = document.getElementById('addContactLinkButton');
    if (addContactLinkButton) {
        addContactLinkButton.addEventListener('click', () => addContactLinkRow({ label: '', href: '' }));
    }

    const homeEditForm = document.getElementById('homeEditForm');
    if (homeEditForm) {
        homeEditForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);

            homeData.hero.eyebrow  = formData.get('heroEyebrow');
            homeData.hero.tagline  = formData.get('heroTagline');
            homeData.hero.skillTags = formData.get('heroSkillTags')
                .split(',').map(t => t.trim()).filter(t => t.length > 0);
            homeData.about.body = formData.get('aboutBody')
                .split(/\n\s*\n/)
                .map(p => p.trim())
                .filter(p => p.length > 0);
            homeData.about.heading = normalizeHeading(formData.get('aboutHeading'));
            homeData.projects = homeData.projects || {};
            homeData.projects.heading = normalizeHeading(formData.get('projectsHeading'));
            homeData.projects.countLabel = formData.get('projectsCountLabel').trim();
            homeData.contact.heading = normalizeHeading(formData.get('contactHeading'));
            homeData.contact.body = formData.get('contactBody');
            homeData.contact.links = Array.from(document.querySelectorAll('#contactLinksEditor .link-row'))
                .map(row => ({
                    label: row.querySelector('[name="linkLabel"]').value.trim(),
                    href:  row.querySelector('[name="linkHref"]').value.trim()
                }))
                .filter(l => l.label && l.href);
            homeData.footer = homeData.footer || {};
            homeData.footer.left  = formData.get('footerLeft');
            homeData.footer.right = formData.get('footerRight');

            const saved = await saveHomeData();
            if (saved) {
                renderHomeContent(homeData);
                homeAdminModal.classList.remove('active');
                alert('Content updated successfully!');
            }
        });
    }
}

async function loadHomeAdminData() {
    if (!homeData) await loadHomeData();
    if (!homeData) return;

    const form = document.getElementById('homeEditForm');
    form.elements['heroEyebrow'].value  = homeData.hero.eyebrow || '';
    form.elements['heroTagline'].value  = homeData.hero.tagline || '';
    form.elements['heroSkillTags'].value = (homeData.hero.skillTags || []).join(', ');
    form.elements['aboutBody'].value    = (homeData.about.body || []).join('\n\n');
    form.elements['aboutHeading'].value    = homeData.about.heading || '';
    form.elements['projectsHeading'].value = (homeData.projects && homeData.projects.heading) || '';
    form.elements['projectsCountLabel'].value = (homeData.projects && homeData.projects.countLabel != null)
        ? homeData.projects.countLabel
        : DEFAULT_PROJECTS_COUNT;
    form.elements['contactHeading'].value  = homeData.contact.heading || '';
    form.elements['contactBody'].value  = homeData.contact.body || '';
    form.elements['footerLeft'].value   = (homeData.footer && homeData.footer.left) || '';
    form.elements['footerRight'].value  = (homeData.footer && homeData.footer.right) || '';

    document.getElementById('contactLinksEditor').innerHTML = '';
    (homeData.contact.links || []).forEach(addContactLinkRow);
}

function normalizeHeading(text) {
    return text.replace(/\r\n/g, '\n').trim();
}

function addContactLinkRow(link) {
    const row = document.createElement('div');
    row.className = 'link-row';
    row.innerHTML = `
        <input type="text" name="linkLabel" placeholder="Label (e.g. LinkedIn)">
        <input type="text" name="linkHref" placeholder="https://...">
        <button type="button" class="btn-secondary" title="Remove link">&times;</button>`;
    row.querySelector('[name="linkLabel"]').value = link.label || '';
    row.querySelector('[name="linkHref"]').value = link.href || '';
    row.querySelector('button').addEventListener('click', () => row.remove());
    document.getElementById('contactLinksEditor').appendChild(row);
}

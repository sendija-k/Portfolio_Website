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
            homeData.contact.body = formData.get('contactBody');

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
    form.elements['contactBody'].value  = homeData.contact.body || '';
}

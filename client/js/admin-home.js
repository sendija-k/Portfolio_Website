// Home admin modal initialization
function initHomeAdmin() {
    const adminHomeButton = document.getElementById('adminHomeButton');
    const homeAdminModal = document.getElementById('homeAdminModal');
    const closeHomeAdminModal = document.getElementById('closeHomeAdminModal');

    if (!adminHomeButton || !homeAdminModal || !closeHomeAdminModal) {
        console.error('Home admin elements not found');
        return;
    }

    // Admin Home button click - check auth first
    adminHomeButton.addEventListener('click', async () => {
        const isAuthenticated = await checkAuthentication();
        if (isAuthenticated) {
            homeAdminModal.classList.add('active');
            await loadHomeAdminData();
        } else {
            const loginModal = document.getElementById('loginModal');
            loginModal.classList.add('active');
            // Store which admin panel to open after login
            sessionStorage.setItem('pendingAdminPanel', 'home');
        }
    });

    // Close home admin modal
    closeHomeAdminModal.addEventListener('click', () => {
        homeAdminModal.classList.remove('active');
    });

    // Close modal when clicking outside
    homeAdminModal.addEventListener('click', (e) => {
        if (e.target === homeAdminModal) {
            homeAdminModal.classList.remove('active');
        }
    });

    // Home edit form submission
    const homeEditForm = document.getElementById('homeEditForm');
    if (homeEditForm) {
        homeEditForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);

            // Update homeData object
            homeData.title = formData.get('title');
            homeData.welcome.heading = formData.get('welcomeHeading');
            homeData.welcome.description = formData.get('welcomeDescription');
            homeData.about.heading = formData.get('aboutHeading');
            homeData.about.preview = formData.get('aboutPreview');
            // Split by double newlines (blank lines) and filter out empty strings
            homeData.about.full = formData.get('aboutFull')
                .split(/\n\s*\n/)
                .map(p => p.trim())
                .filter(p => p.length > 0);
            homeData.about.photoUrl = '/client/profile/photo.jpg';

            // Save to server
            const saved = await saveHomeData();

            if (saved) {
                // Update the page content
                renderHomeContent(homeData);

                // Close modal
                homeAdminModal.classList.remove('active');

                alert('Home page updated successfully!');
            }
        });
    }
}

// Load home data into admin form
async function loadHomeAdminData() {
    if (!homeData) {
        await loadHomeData();
    }

    if (!homeData) return;

    const form = document.getElementById('homeEditForm');
    form.elements['title'].value = homeData.title;
    form.elements['welcomeHeading'].value = homeData.welcome.heading;
    form.elements['welcomeDescription'].value = homeData.welcome.description;
    form.elements['aboutHeading'].value = homeData.about.heading;
    form.elements['aboutPreview'].value = homeData.about.preview;
    // Join paragraphs with double newlines (blank lines)
    form.elements['aboutFull'].value = homeData.about.full.join('\n\n');
}
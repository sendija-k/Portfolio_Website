// Render projects dynamically
function renderProjects(data) {
    if (!data || !data.projects) return;

    // Sort projects by order
    const sortedProjects = data.projects.sort((a, b) => a.order - b.order);

    // Render home page project cards
    const homeProjectsContainer = document.querySelector('.home-projects');
    if (homeProjectsContainer) {
        homeProjectsContainer.innerHTML = sortedProjects.map(project => `
            <button class="home-project-card" data-project="${project.id}">
                <svg class="project-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    ${project.icon.svg}
                </svg>
                <span class="project-title">${project.title}</span>
                <div class="project-info-popup">
                    <span class="description">${project.description}</span>
                    <span class="tools">(${project.tools.join(', ')})</span>
                </div>
            </button>
        `).join('');
    }

    // Render project menu buttons
    const projectMenu = document.querySelector('.project-menu');
    if (projectMenu) {
        projectMenu.innerHTML = sortedProjects.map((project, index) => `
            <button class="project-button ${index === 0 ? 'active' : ''}" data-project="${project.id}">
                <svg class="project-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    ${project.icon.svg}
                </svg>
                ${project.title}
                <span class="description">${project.description}</span>
                <span class="tools">(${project.tools.join(', ')})</span>
            </button>
        `).join('');
    }

    // Render project details
    const projectDetails = document.querySelector('.project-details');
    if (projectDetails) {
        projectDetails.innerHTML = sortedProjects.map((project, index) => `
            <div id="${project.id}" class="project-content ${index === 0 ? 'active' : ''}">
                <a href="${project.githubUrl}" target="_blank" class="github-link">
                    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                    </svg>
                    View on GitHub
                </a>
                <div class="markdown-content" id="${project.id}-markdown">
                    <p>Loading project documentation...</p>
                </div>
            </div>
        `).join('');
    }

    // Re-attach event listeners after rendering
    attachEventListeners();

    // Load markdown for all projects
    loadProjectMarkdown();
}

// Render home content
function renderHomeContent(data) {
    if (!data) return;

    // Update header title
    document.getElementById('headerTitle').textContent = data.title;
    document.title = data.title;

    // Update welcome section
    document.getElementById('welcomeHeading').textContent = data.welcome.heading;
    document.getElementById('welcomeDescription').textContent = data.welcome.description;

    // Update about preview section
    document.getElementById('aboutHeading').textContent = data.about.heading;
    document.getElementById('aboutPreview').textContent = data.about.preview;

    // Update about page heading
    document.getElementById('aboutPageHeading').textContent = data.about.heading;

    // Update about full text
    const aboutFullText = document.getElementById('aboutFullText');
    aboutFullText.innerHTML = data.about.full.map(paragraph =>
        `<p>${paragraph}</p>`
    ).join('');

    // Update photo containers
    updatePhotoContainers(data.about.photoUrl);
}

// Update photo containers
function updatePhotoContainers(photoUrl) {
    const homePhotoContainer = document.getElementById('homePhotoContainer');
    const aboutPhotoContainer = document.getElementById('aboutPhotoContainer');

    if (photoUrl && photoUrl.trim() !== '') {
        homePhotoContainer.innerHTML = `<img src="${photoUrl}" alt="Profile photo">`;
        aboutPhotoContainer.innerHTML = `<img src="${photoUrl}" alt="Profile photo">`;
    } else {
        homePhotoContainer.innerHTML = '<span>Photo</span>';
        aboutPhotoContainer.innerHTML = '<span>Photo</span>';
    }
}

// Update photo preview in admin form
function updatePhotoPreview(url) {
    const preview = document.getElementById('homePhotoPreview');
    if (url && url.trim() !== '') {
        preview.innerHTML = `<img src="${url}" alt="Photo preview">`;
        preview.classList.add('show');
    } else {
        preview.innerHTML = '';
        preview.classList.remove('show');
    }
}
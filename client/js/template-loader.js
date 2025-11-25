// Template loader - loads HTML partials
async function loadTemplate(path) {
    try {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to load template: ${path}`);
        }
        return await response.text();
    } catch (error) {
        console.error('Error loading template:', error);
        return '';
    }
}

// Load all template into the page
async function loadAllTemplates() {
    // Load header
    const headerHTML = await loadTemplate('client/templates/header.html');
    document.getElementById('header-container').innerHTML = headerHTML;

    // Load tabs
    const homeTabHTML = await loadTemplate('client/templates/tabs/home-tab.html');
    const aboutTabHTML = await loadTemplate('client/templates/tabs/about-tab.html');
    const projectsTabHTML = await loadTemplate('client/templates/tabs/projects-tab.html');

    const contentPanel = document.querySelector('.content-panel');
    contentPanel.innerHTML = homeTabHTML + aboutTabHTML + projectsTabHTML;

    // Load models
    const loginModalHTML = await loadTemplate('client/templates/modals/login-modal.html');
    const homeAdminModalHTML = await loadTemplate('client/templates/modals/home-admin-modal.html');
    const projectsAdminModalHTML = await loadTemplate('client/templates/modals/projects-admin-modal.html');
    const blogAdminModalHTML = await loadTemplate('client/templates/modals/blog-admin-modal.html');

    const modalsContainer = document.getElementById('modals-container');
    modalsContainer.innerHTML = loginModalHTML + homeAdminModalHTML + projectsAdminModalHTML + blogAdminModalHTML;
}
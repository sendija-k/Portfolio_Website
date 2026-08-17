async function loadTemplate(path) {
    try {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`Failed to load template: ${path}`);
        return await response.text();
    } catch (error) {
        console.error('Error loading template:', error);
        return '';
    }
}

async function loadAllTemplates() {
    const headerHTML = await loadTemplate('client/templates/header.html');
    document.getElementById('header-container').innerHTML = headerHTML;

    const [heroHTML, aboutHTML, projectsHTML, contactHTML] = await Promise.all([
        loadTemplate('client/templates/tabs/home-tab.html'),
        loadTemplate('client/templates/tabs/about-tab.html'),
        loadTemplate('client/templates/tabs/projects-tab.html'),
        loadTemplate('client/templates/contact.html'),
    ]);
    document.getElementById('main-content').innerHTML = heroHTML + aboutHTML + projectsHTML + contactHTML;

    const [loginHTML, homeAdminHTML, projectsAdminHTML, blogAdminHTML, courseDataAdminHTML] = await Promise.all([
        loadTemplate('client/templates/modals/login-modal.html'),
        loadTemplate('client/templates/modals/home-admin-modal.html'),
        loadTemplate('client/templates/modals/projects-admin-modal.html'),
        loadTemplate('client/templates/modals/blog-admin-modal.html'),
        loadTemplate('client/templates/modals/course-data-admin-modal.html'),
    ]);
    document.getElementById('modals-container').innerHTML = loginHTML + homeAdminHTML + projectsAdminHTML + blogAdminHTML + courseDataAdminHTML;
}

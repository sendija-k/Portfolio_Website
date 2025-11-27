// Main initialization
document.addEventListener('DOMContentLoaded', async function() {
    // Load all HTML templates first
    await loadAllTemplates();

    // Initialize all admin panels and auth (after templates are loaded)
    initAuth();
    initHomeAdmin();
    initProjectsAdmin();
    initBlogAdmin();

    // Load home data and render
    const homeDataResult = await loadHomeData();
    if (homeDataResult) {
        renderHomeContent(homeDataResult);
    }

    // Load projects data and render
    const data = await loadProjectsData();
    if (data) {
        renderProjects(data);
    }

    // Populate icon dropdowns
    populateIconDropdowns();

    // Icon preview handlers
    document.getElementById('addIconSelect').addEventListener('change', function() {
        showIconPreview(this.value, 'addIconPreview');
    });

    document.getElementById('editIconSelect').addEventListener('change', function() {
        showIconPreview(this.value, 'editIconPreview');
    });

    // Show home admin button by default (since Home tab is active by default)
    // The button will prompt for login if user is not authenticated
    const adminHomeBtn = document.getElementById('adminHomeButton');
    if (adminHomeBtn) {
        adminHomeBtn.style.display = 'block';
    }

    // Initialize keyboard shortcut handler for hidden blog page
    initBlogShortcut();

    // Handle direct navigation to /blog URL
    if (window.location.pathname === '/blog') {
        handleBlogAccess();
    }
});
document.addEventListener('DOMContentLoaded', async function() {
    await loadAllTemplates();

    initAuth();
    initHomeAdmin();
    initProjectsAdmin();
    initBlogAdmin();
    initCourseDataAdmin();

    const homeDataResult = await loadHomeData();
    if (homeDataResult) {
        renderHomeContent(homeDataResult);
    }

    const data = await loadProjectsData();
    if (data) {
        renderProjects(data);
    }

    const adminWrap = document.getElementById('adminDropdownWrap');
    if (adminWrap) adminWrap.style.display = 'list-item';

    const gearBtn = document.getElementById('adminGearButton');
    const dropdown = document.getElementById('adminDropdown');
    if (gearBtn && dropdown) {
        gearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('open');
        });
        document.addEventListener('click', () => dropdown.classList.remove('open'));
        dropdown.addEventListener('click', () => dropdown.classList.remove('open'));
    }

    initBlogShortcut();
    initCourseShortcut();

    if (window.location.pathname === '/blog') {
        handleBlogAccess();
    }

    if (window.location.pathname === '/course') {
        handleCourseAccess();
    }
});

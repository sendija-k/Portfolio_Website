// Keyboard shortcut + routing for the hidden course planner page.
// Deliberately independent of blog-shortcut.js (own dataset tag, own 404
// element, own keydown state) so this feature can never regress the blog.

const COURSE_MAIN_ID = 'main-content';

function initCourseShortcut() {
    let coursePlannerKeysPressed = {};

    document.addEventListener('keydown', async (e) => {
        coursePlannerKeysPressed[e.key.toLowerCase()] = true;

        // Ctrl+P+L (or Cmd+P+L) opens the hidden course planner when logged in
        if ((e.ctrlKey || e.metaKey) && coursePlannerKeysPressed['p'] && coursePlannerKeysPressed['l']) {
            e.preventDefault();

            const isAuthenticated = await checkAuthentication();
            if (isAuthenticated) {
                navigateToCourse();
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        delete coursePlannerKeysPressed[e.key.toLowerCase()];
    });

    // Keep the view in sync with browser back/forward between / and /course
    window.addEventListener('popstate', async () => {
        if (window.location.pathname === '/course') {
            const isAuthenticated = await checkAuthentication();
            if (isAuthenticated) {
                navigateToCourse(false);
            } else {
                showCourse404Page();
            }
        } else if (window.location.pathname !== '/blog') {
            navigateToCourseHome(false);
        }
    });
}

// Hide every section in #main-content except the one we want to keep visible.
function hideMainSectionsForCourse(keepId) {
    const main = document.getElementById(COURSE_MAIN_ID);
    if (!main) return;

    Array.from(main.children).forEach((el) => {
        if (el.id === keepId) {
            el.style.display = 'block';
            return;
        }
        if (!el.dataset.courseHidden) {
            el.dataset.courseHidden = 'true';
        }
        el.style.display = 'none';
    });
}

// Restore the normal sections and tear down any course/404 view.
function restoreMainSectionsFromCourse() {
    const main = document.getElementById(COURSE_MAIN_ID);
    if (!main) return;

    Array.from(main.children).forEach((el) => {
        if (el.dataset && el.dataset.courseHidden) {
            el.style.display = '';
            delete el.dataset.courseHidden;
        }
    });

    const course = document.getElementById('course');
    if (course) course.style.display = 'none';

    const notFound = document.getElementById('courseNotFound');
    if (notFound) notFound.remove();
}

// Show the course planner (lazy-loading its template + data the first time).
async function navigateToCourse(updateHistory = true) {
    const main = document.getElementById(COURSE_MAIN_ID);
    if (!main) return;

    let course = document.getElementById('course');
    if (!course) {
        const courseHTML = await loadTemplate('client/templates/tabs/course-tab.html');
        main.insertAdjacentHTML('beforeend', courseHTML);
        attachCourseBackToHomeListener();
        course = document.getElementById('course');
    }

    const [catalog, plan] = await Promise.all([loadCourseCatalog(), loadCoursePlan()]);
    if (catalog && plan) {
        initCoursePlannerPage(catalog, plan);
    }

    hideMainSectionsForCourse('course');

    const adminCourseDataButton = document.getElementById('adminCourseDataButton');
    if (adminCourseDataButton) adminCourseDataButton.style.display = 'block';

    window.scrollTo(0, 0);

    if (updateHistory) {
        history.pushState({ page: 'course' }, '', '/course');
    }
}

function attachCourseBackToHomeListener() {
    const backButton = document.getElementById('courseBackButton');
    if (backButton) {
        backButton.addEventListener('click', () => navigateToCourseHome());
    }
}

// Return to the normal single-page site.
function navigateToCourseHome(updateHistory = true) {
    restoreMainSectionsFromCourse();

    const adminCourseDataButton = document.getElementById('adminCourseDataButton');
    if (adminCourseDataButton) adminCourseDataButton.style.display = 'none';

    window.scrollTo(0, 0);

    if (updateHistory) {
        history.pushState({ page: 'home' }, '', '/');
    }
}

// Handle direct navigation to /course
async function handleCourseAccess() {
    const isAuthenticated = await checkAuthentication();

    if (isAuthenticated) {
        await navigateToCourse(false); // URL is already /course
    } else {
        showCourse404Page();
    }
}

// Show a 404 for unauthenticated visitors hitting /course
function showCourse404Page() {
    const main = document.getElementById(COURSE_MAIN_ID);
    if (!main) return;

    if (!document.getElementById('courseNotFound')) {
        const notFoundHTML = `
            <div id="courseNotFound" style="text-align: center; padding: 6rem 2rem;">
                <h1 style="font-family: var(--ff-serif); font-size: 6rem; color: var(--accent); margin-bottom: 1rem;">404</h1>
                <h2 style="font-family: var(--ff-serif); color: var(--ink); margin-bottom: 1rem;">Page Not Found</h2>
                <p style="color: var(--ink-soft); margin-bottom: 2rem;">The page you are looking for doesn't exist or you don't have permission to access it.</p>
                <button onclick="window.location.href='/'" class="back-to-home-button">Go Back Home</button>
            </div>
        `;
        main.insertAdjacentHTML('beforeend', notFoundHTML);
    }

    hideMainSectionsForCourse('courseNotFound');
    window.scrollTo(0, 0);
}

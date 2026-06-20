// Keyboard shortcut + routing for the hidden blog page.
// The site is a single-page scroll layout: the blog is injected into #main-content
// and the normal sections are hidden while it is shown.

const MAIN_CONTENT_ID = 'main-content';

function initBlogShortcut() {
    let keysPressed = {};

    document.addEventListener('keydown', async (e) => {
        keysPressed[e.key.toLowerCase()] = true;

        // Ctrl+J+K (or Cmd+J+K) opens the hidden blog when logged in
        if ((e.ctrlKey || e.metaKey) && keysPressed['j'] && keysPressed['k']) {
            e.preventDefault();

            const isAuthenticated = await checkAuthentication();
            if (isAuthenticated) {
                navigateToBlog();
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        delete keysPressed[e.key.toLowerCase()];
    });

    // Keep the view in sync with browser back/forward between / and /blog
    window.addEventListener('popstate', async () => {
        if (window.location.pathname === '/blog') {
            const isAuthenticated = await checkAuthentication();
            if (isAuthenticated) {
                navigateToBlog(false);
            } else {
                show404Page();
            }
        } else {
            navigateToHome(false);
        }
    });
}

// Hide every section in #main-content except the one we want to keep visible.
function hideMainSections(keepId) {
    const main = document.getElementById(MAIN_CONTENT_ID);
    if (!main) return;

    Array.from(main.children).forEach((el) => {
        if (el.id === keepId) {
            el.style.display = 'block';
            return;
        }
        if (!el.dataset.blogHidden) {
            el.dataset.blogHidden = 'true';
        }
        el.style.display = 'none';
    });
}

// Restore the normal sections and tear down any blog/404 view.
function restoreMainSections() {
    const main = document.getElementById(MAIN_CONTENT_ID);
    if (!main) return;

    Array.from(main.children).forEach((el) => {
        if (el.dataset && el.dataset.blogHidden) {
            el.style.display = '';
            delete el.dataset.blogHidden;
        }
    });

    const blog = document.getElementById('blog');
    if (blog) blog.style.display = 'none';

    const notFound = document.getElementById('notFound');
    if (notFound) notFound.remove();
}

// Show the blog page (loading its template + data the first time).
async function navigateToBlog(updateHistory = true) {
    const main = document.getElementById(MAIN_CONTENT_ID);
    if (!main) return;

    // Inject the blog template once
    let blog = document.getElementById('blog');
    if (!blog) {
        const blogHTML = await loadTemplate('client/templates/tabs/blog-tab.html');
        main.insertAdjacentHTML('beforeend', blogHTML);
        attachBackToHomeListener();
        blog = document.getElementById('blog');
    }

    // Load and render blog content
    const data = await loadBlogData();
    if (data) {
        renderBlogContent(data);
    }

    hideMainSections('blog');

    // Reveal the "Edit Blog" admin option for the owner
    const adminBlogButton = document.getElementById('adminBlogButton');
    if (adminBlogButton) adminBlogButton.style.display = 'block';

    window.scrollTo(0, 0);

    if (updateHistory) {
        history.pushState({ page: 'blog' }, '', '/blog');
    }
}

// Attach the blog's "Back to Home" button
function attachBackToHomeListener() {
    const backButton = document.getElementById('backToHomeButton');
    if (backButton) {
        backButton.addEventListener('click', () => navigateToHome());
    }
}

// Return to the normal single-page site.
function navigateToHome(updateHistory = true) {
    restoreMainSections();

    const adminBlogButton = document.getElementById('adminBlogButton');
    if (adminBlogButton) adminBlogButton.style.display = 'none';

    window.scrollTo(0, 0);

    if (updateHistory) {
        history.pushState({ page: 'home' }, '', '/');
    }
}

// Handle direct navigation to /blog
async function handleBlogAccess() {
    const isAuthenticated = await checkAuthentication();

    if (isAuthenticated) {
        await navigateToBlog(false); // URL is already /blog
    } else {
        show404Page();
    }
}

// Show a 404 for unauthenticated visitors hitting /blog
function show404Page() {
    const main = document.getElementById(MAIN_CONTENT_ID);
    if (!main) return;

    if (!document.getElementById('notFound')) {
        const notFoundHTML = `
            <div id="notFound" style="text-align: center; padding: 6rem 2rem;">
                <h1 style="font-size: 6rem; color: #7fa8d5; margin-bottom: 1rem;">404</h1>
                <h2 style="color: #334155; margin-bottom: 1rem;">Page Not Found</h2>
                <p style="color: #64748b; margin-bottom: 2rem;">The page you are looking for doesn't exist or you don't have permission to access it.</p>
                <button onclick="window.location.href='/'" class="back-to-home-button">Go Back Home</button>
            </div>
        `;
        main.insertAdjacentHTML('beforeend', notFoundHTML);
    }

    hideMainSections('notFound');
    window.scrollTo(0, 0);
}

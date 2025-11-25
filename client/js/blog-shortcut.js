// Keyboard shortcut handler for hidden blog page
function initBlogShortcut() {
    let keysPressed = {};

    document.addEventListener('keydown', async (e) => {
        keysPressed[e.key.toLowerCase()] = true;

        // Check if Ctrl+J+K are all pressed
        if ((e.ctrlKey || e.metaKey) && keysPressed['j'] && keysPressed['k']) {
            e.preventDefault();

            // Check if user is authenticated
            const isAuthenticated = await checkAuthentication();

            if (isAuthenticated) {
                navigateToBlog();
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        delete keysPressed[e.key.toLowerCase()];
    });
}

// Navigate to blog page
async function navigateToBlog() {
    // Load blog template if not already loaded
    const blogTab = document.getElementById('blog');
    if (!blogTab) {
        const blogHTML = await loadTemplate('client/template/tabs/blog-tab.html');
        const contentPanel = document.querySelector('.content-panel');
        contentPanel.insertAdjacentHTML('beforeend', blogHTML);
        // Attach back button event listener
        attachBackToHomeListener();
    }

    // Load and render blog data
    const data = await loadBlogData();
    if (data) {
        renderBlogContent(data);
    }

    // Hide all tabs and buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));

    // Show blog tab
    const blogContent = document.getElementById('blog');
    if (blogContent) {
        blogContent.classList.add('active');
    }

    // Hide home and projects admin buttons, show blog admin button
    const adminHomeButton = document.getElementById('adminHomeButton');
    const adminProjectsButton = document.getElementById('adminProjectsButton');
    const adminBlogButton = document.getElementById('adminBlogButton');
    if (adminHomeButton) adminHomeButton.style.display = 'none';
    if (adminProjectsButton) adminProjectsButton.style.display = 'none';
    if (adminBlogButton) adminBlogButton.style.display = 'block';

    // Change header title to "HIDDEN BLOG"
    const headerTitle = document.getElementById('headerTitle');
    if (headerTitle) headerTitle.textContent = 'HIDDEN BLOG';

    // Update URL without reloading
    history.pushState({tab: 'blog'}, '', '/blog');
}

// Attach event listener to back to home button
function attachBackToHomeListener() {
    const backButton = document.getElementById('backToHomeButton');
    if (backButton) {
        backButton.addEventListener('click', navigateToHome);
    }
}

// Navigate back to home page
function navigateToHome() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    // Hide all tabs
    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));

    // Show home tab
    const homeButton = document.querySelector('[data-tab="home"]');
    const homeContent = document.getElementById('home');

    if (homeButton) homeButton.classList.add('active');
    if (homeContent) homeContent.classList.add('active');

    // Show admin home button
    const adminHomeButton = document.getElementById('adminHomeButton');
    if (adminHomeButton) adminHomeButton.style.display = 'block';

    // Restore original header title
    const headerTitle = document.getElementById('headerTitle');
    if (headerTitle && homeData) {
        headerTitle.textContent = homeData.title;
    }

    // Update URL without reloading
    history.pushState({tab: 'home'}, '', '/');
}

// Handle direct access to /blog URL
async function handleBlogAccess() {
    const isAuthenticated = await checkAuthentication();

    if (isAuthenticated) {
        // User is logged in, show blog
        await navigateToBlog();
    } else {
        // User is not logged in, show 404
        show404Page();
    }
}

// Show 404 page
function show404Page() {
    const contentPanel = document.querySelector('.content-panel');

    // Hide all existing tabs
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.classList.remove('active'));

    // Hide tab buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(btn => btn.classList.remove('active'));

    // Hide admin buttons
    const adminHomeButton = document.getElementById('adminHomeButton');
    const adminProjectsButton = document.getElementById('adminProjectsButton');
    if (adminHomeButton) adminHomeButton.style.display = 'none';
    if (adminProjectsButton) adminProjectsButton.style.display = 'none';

    // Create and show 404 content
    const notFoundHTML = `
        <div id="notFound" class="tab-content active" style="text-align: center; padding: 4rem 2rem;">
            <h1 style="font-size: 6rem; color: #7fa8d5; margin-bottom: 1rem;">404</h1>
            <h2 style="color: #334155; margin-bottom: 1rem;">Page Not Found</h2>
            <p style="color: #64748b; margin-bottom: 2rem;">The page you are looking for doesn't exist or you don't have permission to access it.</p>
            <button onclick="window.location.href='/'" class="back-to-home-button">Go Back Home</button>
        </div>
    `;

    contentPanel.insertAdjacentHTML('beforeend', notFoundHTML);
}
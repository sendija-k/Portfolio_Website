// Blog admin modal initialization
function initBlogAdmin() {
    const adminBlogButton = document.getElementById('adminBlogButton');
    const blogAdminModal = document.getElementById('blogAdminModal');
    const closeBlogAdminModal = document.getElementById('closeBlogAdminModal');

    if (!adminBlogButton || !blogAdminModal || !closeBlogAdminModal) {
        console.error('Blog admin elements not found');
        return;
    }

    // Admin Blog button click - check auth first
    adminBlogButton.addEventListener('click', async () => {
        const isAuthenticated = await checkAuthentication();
        if (isAuthenticated) {
            blogAdminModal.classList.add('active');
            await loadBlogAdminData();
        } else {
            const loginModal = document.getElementById('loginModal');
            loginModal.classList.add('active');
            // Store which admin panel to open after login
            sessionStorage.setItem('pendingAdminPanel', 'blog');
        }
    });

    // Close blog admin modal
    closeBlogAdminModal.addEventListener('click', () => {
        blogAdminModal.classList.remove('active');
    });

    // Close modal when clicking outside
    blogAdminModal.addEventListener('click', (e) => {
        if (e.taget === blogAdminModal) {
            blogAdminModal.classList.remove('active');
        }
    });

    // Blog edit form submission
    const blogEditForm = document.getElementById('blogEditForm');
    if (blogEditForm) {
        blogEditForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.taget);

            // Update blogData object
            blogData.title = formData.get('title');
            blogData.content = formData.get('content');

            // Save to server
            const result = await saveBlogData(blogdata);

            if (result.success) {
                alert('Blog data saved successfully!');
                blogAdminModal.classList.remove('active');

                // Reload blog content on the page
                renderBlogContent(blogData);
            } else {
                alert('Failed to save blog data: ' + result.error);
            }
        });
    }
}

// Load blog data into admin form
async function loadBlogAdminData() {
    const data = await loadBlogData();
    if (data) {
        blogData = data;

        // Populate form fields
        document.getElementById('blogTitleInput').value = data.title || '';
        document.getElementById('blogContentInput').value = data.content || '';
    }
}

// Render blog content on page
function renderBlogContent(data) {
    if (!data) return;

    const blogTitle = document.getElementById('blogTitle');
    const blogContent = document.getElementById('blogContent');

    if (blogTitle) blogTitle.textContent = data.title;
    if (blogContent) blogContent.innerHTML = data.content;
}
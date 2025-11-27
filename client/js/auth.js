// Initialize authentication
function initAuth() {
    const loginModal = document.getElementById('loginModal');
    const closeLoginModal = document.getElementById('closeLoginModal');
    const loginForm = document.getElementById('loginForm');

    if (!loginModal || !closeLoginModal || !loginForm) {
        console.error('Auth elements not found');
        return;
    }

    // Close login modal
    closeLoginModal.addEventListener('click', () => {
        loginModal.classList.remove('active');
        loginForm.reset();
        document.getElementById('loginError').classList.remove('show');
    });

    // Close modal when clicking outside
    loginModal.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            loginModal.classList.remove('active');
            loginForm.reset();
            document.getElementById('loginError').classList.remove('show');
        }
    });

    // Login form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const loginError = document.getElementById('loginError');

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: formData.get('username'),
                    password: formData.get('password')
                })
            });

            const data = await response.json();

            if (data.success) {
                // Close login modal
                loginModal.classList.remove('active');
                e.target.reset();
                loginError.classList.remove('show');

                // Open the appropriate admin panel
                const pendingPanel = sessionStorage.getItem('pendingAdminPanel');
                sessionStorage.removeItem('pendingAdminPanel');

                const homeAdminModal = document.getElementById('homeAdminModal');
                const projectsAdminModal = document.getElementById('projectsAdminModal');
                const blogAdminModal = document.getElementById('blogAdminModal');

                if (pendingPanel === 'home') {
                    homeAdminModal.classList.add('active');
                    await loadHomeAdminData();
                } else if (pendingPanel === 'blog') {
                    blogAdminModal.classList.add('active');
                    await loadBlogAdminData();
                } else {
                    projectsAdminModal.classList.add('active');
                    loadAdminProjects();
                }
            } else {
                loginError.textContent = data.error || 'Login failed';
                loginError.classList.add('show');
            }
        } catch (error) {
            console.error('Login error:', error);
            loginError.textContent = 'An error occurred. Please try again.';
            loginError.classList.add('show');
        }
    });
}

// Check authentication status
async function checkAuthentication() {
    try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        return data.authenticated;
    } catch (error) {
        console.error('Error checking authentication:', error);
        return false;
    }
}
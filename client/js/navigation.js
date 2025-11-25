// Attach all navigation event listeners
function attachEventListeners() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    // Main tab navigation
    tabButtons.forEach(button => {
        button.addEventListener('click', async function() {
            const targetTab = this.getAttribute('data-tab');

            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked button and corresponding content
            this.classList.add('active');
            document.getElementById(targetTab).classList.add('active');

            // Update admin button visibility based on tab
            if (targetTab === 'home' || targetTab === 'about') {
                adminHomeButton.style.display = 'block';
                adminProjectsButton.style.display = 'none';
            } else if (targetTab === 'projects') {
                adminHomeButton.style.display = 'none';
                adminProjectsButton.style.display = 'block';
            }
        });
    });

    // Project submenu navigation
    const projectButtons = document.querySelectorAll('.project-button');
    const projectContents = document.querySelectorAll('.project-content');

    projectButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetProject = this.getAttribute('data-project');

            // Remove active class from all project buttons and contents
            projectButtons.forEach(btn => btn.classList.remove('active'));
            projectContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked button and corresponding content
            this.classList.add('active');
            document.getElementById(targetProject).classList.add('active');
        });
    });

    // Read More button navigation
    const readMoreButton = document.querySelector('.read-more-button');
    if (readMoreButton) {
        readMoreButton.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');

            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to About tab
            document.querySelector(`[data-tab="${targetTab}"]`).classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    }

    // Home project cards navigation
    const homeProjectCards = document.querySelectorAll('.home-project-card');
    homeProjectCards.forEach(card => {
        card.addEventListener('click', function() {
            const targetProject = this.getAttribute('data-project');

            // Switch to Projects tab
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            document.querySelector(`[data-tab="projects"]`).classList.add('active');
            document.getElementById('projects').classList.add('active');

            // Switch to specific project
            projectButtons.forEach(btn => btn.classList.remove('active'));
            projectContents.forEach(content => content.classList.remove('active'));

            const targetProjectButton = document.querySelector(`.project-button[data-project="${targetProject}"]`);
            if (targetProjectButton) {
                targetProjectButton.classList.add('active');
            }
            
            document.getElementById(targetProject).classList.add('active');
        });
    });
}
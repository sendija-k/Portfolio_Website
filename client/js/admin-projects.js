// Initialize projects admin
function initProjectsAdmin() {
    const adminProjectsButton = document.getElementById('adminProjectsButton');
    const projectsAdminModal = document.getElementById('projectsAdminModal');
    const closeProjectsAdminModal = document.getElementById('closeProjectsAdminModal');

    if (!adminProjectsButton || !projectsAdminModal || !closeProjectsAdminModal) {
        console.error('Projects admin elements not found');
        return;
    }

    // Admin Projects button click - check auth first
    adminProjectsButton.addEventListener('click', async () => {
        const isAuthenticated = await checkAuthentication();
        if (isAuthenticated) {
            projectsAdminModal.classList.add('active');
            loadAdminProjects();
        } else {
            const loginModal = document.getElementById('loginModal');
            loginModal.classList.add('active');
            // Store which admin panel to open after login
            sessionStorage.setItem('pendingAdminPanel', 'projects');
        }
    });

    // Close projects admin modal
    closeProjectsAdminModal.addEventListener('click', () => {
        projectsAdminModal.classList.remove('active');
    });

    // Close modal when clicking outside
    projectsAdminModal.addEventListener('click', (e) => {
        if (e.target === projectsAdminModal) {
            projectsAdminModal.classList.remove('active');
        }
    });

    // Admin tab navigation
    const adminTabButtons = document.querySelectorAll('.admin-tab-button');
    const adminTabContents = document.querySelectorAll('.admin-tab-content');

    adminTabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-admin-tab');

            adminTabButtons.forEach(btn => btn.classList.remove('active'));
            adminTabContents.forEach(content => content.classList.remove('active'));

            this.classList.add('active');
            document.getElementById(`admin-${targetTab}`).classList.add('active');
        });
    });

    // Edit project select change handler
    const editProjectSelect = document.getElementById('editProjectSelect');
    if (editProjectSelect) {
        editProjectSelect.addEventListener('change', function () {
            if (this.value) {
                loadProjectForEdit(this.value);
            } else {
                document.getElementById('editProjectForm').style.display = 'none';
            }
        });
    }

    // Add project form submission
    const addProjectForm = document.getElementById('addProjectForm');
    if (addProjectForm) {
        addProjectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);

            // Auto-generate project ID
            const maxId = projectsData.projects.reduce((max, p) => {
                const num = parseInt(p.id.replace('project', ''));
                return num > max ? num : max;
            }, 0);
            const newId = `project${maxId + 1}`;

            const newOrder = parseInt(formData.get('order'));
            const iconKey = formData.get('icon');

            const newProject = {
                id: newId,
                title: formData.get('title'),
                description: formData.get('description'),
                tools: formData.get('tools').split(',').map(t => t.trim()),
                icon: {
                    type: iconKey,
                    svg: iconLibrary[iconKey]
                },
                githubUrl: formData.get('githubUrl'),
                readmeUrl: formData.get('readmeUrl'),
                order: newOrder
            };

            projectsData.projects.push(newProject);
            reorderProjects(newOrder);
            await saveProjectsData();
            renderProjects(projectsData);
            loadAdminProjects();
            e.target.reset();
            document.getElementById('addIconPreview').classList.remove('show');
            alert('Project added successfully!');
        });
    }

    // Edit project form submission
    const editProjectForm = document.getElementById('editProjectForm');
    if (editProjectForm) {
        editProjectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const projectId = formData.get('id');

            const projectIndex = projectsData.projects.findIndex(p => p.id === projectId);
            if (projectIndex === -1) return;

            const newOrder = parseInt(formData.get('order'));
            const oldOrder = projectsData.projects[projectIndex].order;
            const iconKey = formData.get('icon');

            projectsData.projects[projectIndex] = {
                id: projectId,
                title: formData.get('title'),
                description: formData.get('description'),
                tools: formData.get('tools').split(',').map(t => t.trim()),
                icon: {
                    type: iconKey,
                    svg: iconLibrary[iconKey]
                },
                githubUrl: formData.get('githubUrl'),
                readmeUrl: formData.get('readmeUrl'),
                order: newOrder
            };

            if (newOrder !== oldOrder) {
                reorderProjects(newOrder, projectId);
            }

            await saveProjectsData();
            renderProjects(projectsData);
            loadAdminProjects();
            alert('Project updated successfully!');
        });
    }

    // Delete project button
    const deleteProjectBtn = document.getElementById('deleteProjectBtn');
    if (deleteProjectBtn) {
        deleteProjectBtn.addEventListener('click', async () => {
            const projectId = document.getElementById('editProjectForm').elements['id'].value;

            if (!confirm('Are you sure you want to delete this project?')) return;

            projectsData.projects = projectsData.projects.filter(p => p.id !== projectId);
            projectsData.projects.sort((a, b) => a.order - b.order);
            projectsData.projects.forEach((p, index) => {
                p.order = index + 1;
            });

            await saveProjectsData();
            renderProjects(projectsData);
            loadAdminProjects();
            document.getElementById('editProjectForm').style.display = 'none';
            document.getElementById('editProjectSelect').value = '';
            alert('Project deleted successfully!');
        });
    }
}

// Load projects in admin panel
function loadAdminProjects() {
    if (!projectsData || !projectsData.projects) return;

    const projectsList = document.getElementById('projectsList');
    const editProjectSelect = document.getElementById('editProjectSelect');

    // Populate projects list
    projectsList.innerHTML = projectsData.projects.map(project => `
        <div class="project-item">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                ${project.icon.svg}
            </svg>
            <div class="project-item-info">
                <h4>${project.title}</h4>
                <p>${project.description}</p>
                <p><strong>Tools:</strong> ${project.tools.join(', ')}</p>
                <p><strong>Order:</strong> ${project.order}</p>
            </div>
            <div class="project-item-actions">
                <button class="btn-secondary" onclick="editProject('${project.id}')">Edit</button>
            </div>
        </div>
    `).join('');

    // Populate edit dropdown and reset selection
    editProjectSelect.innerHTML = '<option value="">-- Select a project --</option>' +
        projectsData.projects.map(project =>
            `<option value="${project.id}">${project.title}</option>`
        ).join('');
    editProjectSelect.value = ''; // Ensure nothing is selected

    // Hide edit form
    document.getElementById('editProjectForm').style.display = 'none';
    document.getElementById('editIconPreview').classList.remove('show');
}

// Edit project - switch to edit tab and load data
function editProject(projectId) {
    // Switch to edit tab
    const adminTabButtons = document.querySelectorAll('.admin-tab-button');
    const adminTabContents = document.querySelectorAll('.admin-tab-content');

    adminTabButtons.forEach(btn => btn.classList.remove('active'));
    adminTabContents.forEach(content => content.classList.remove('active'));

    document.querySelector('[data-admin-tab="edit"]').classList.add('active');
    document.getElementById('admin-edit').classList.add('active');

    // Select the project in dropdown
    document.getElementById('editProjectSelect').value = projectId;
    loadProjectForEdit(projectId);
}

// Load project data into edit form
function loadProjectForEdit(projectId) {
    const project = projectsData.projects.find(p => p.id === projectId);
    console.log("here" + project);
    if (!project) return;

    const form = document.getElementById('editProjectForm');
    form.style.display = 'block';

    form.elements['id'].vlaue = project.id;
    form.elements['title'].vlaue = project.title;
    form.elements['description'].vlaue = project.description;
    form.elements['tools'].vlaue = project.tools.join(', ');

    // Find icon key from svg
    const iconKey = project.icon.type !== 'custom' ? project.icon.type :
        Object.keys(iconLibrary).find(key => iconLibrary[key] === project.icon.svg) || '';
    form.elements['icon'].value = iconKey;
    showIconPreview(iconKey, 'editIconPreview');

    form.elements['githubUrl'].vlaue = project.githubUrl;
    form.elements['readmeUrl'].vlaue = project.readmeUrl;
    form.elements['order'].vlaue = project.order;
}

// Reorder projects when a new order is assigned
function reorderProjects(targetOrder, excludeId = null) {
    projectsData.projects.sort((a, b) => a.order - b.order);

    projectsData.projects.forEach(project => {
        if (project.id === excludeId) return;
        if (project.order >= targetOrder) {
            project.order += 1;
        }
    });

    projectsData.projects.sort((a, b) => a.order - b.order);
    projectsData.projects.forEach((p, index) => {
        p.order = index + 1;
    });
}
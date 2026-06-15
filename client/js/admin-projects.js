function initProjectsAdmin() {
    const adminProjectsButton = document.getElementById('adminProjectsButton');
    const projectsAdminModal  = document.getElementById('projectsAdminModal');
    const closeProjectsAdminModal = document.getElementById('closeProjectsAdminModal');

    if (!adminProjectsButton || !projectsAdminModal || !closeProjectsAdminModal) {
        console.error('Projects admin elements not found');
        return;
    }

    adminProjectsButton.addEventListener('click', async () => {
        const isAuthenticated = await checkAuthentication();
        if (isAuthenticated) {
            projectsAdminModal.classList.add('active');
            loadAdminProjects();
        } else {
            document.getElementById('loginModal').classList.add('active');
            sessionStorage.setItem('pendingAdminPanel', 'projects');
        }
    });

    closeProjectsAdminModal.addEventListener('click', () => {
        projectsAdminModal.classList.remove('active');
    });

    projectsAdminModal.addEventListener('click', (e) => {
        if (e.target === projectsAdminModal) projectsAdminModal.classList.remove('active');
    });

    const adminTabButtons  = document.querySelectorAll('.admin-tab-button');
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

    const editProjectSelect = document.getElementById('editProjectSelect');
    if (editProjectSelect) {
        editProjectSelect.addEventListener('change', function() {
            if (this.value) {
                loadProjectForEdit(this.value);
            } else {
                document.getElementById('editProjectForm').style.display = 'none';
            }
        });
    }

    const addProjectForm = document.getElementById('addProjectForm');
    if (addProjectForm) {
        addProjectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);

            const existingIds = projectsData.projects.map(p => parseInt(p.id.replace(/\D/g, ''))).filter(n => !isNaN(n));
            const maxId = existingIds.length ? Math.max(...existingIds) : 0;
            const newId = `proj-${maxId + 1}`;

            const newProject = {
                id: newId,
                title: formData.get('title'),
                metric: formData.get('metric'),
                metricLabel: formData.get('metricLabel'),
                description: formData.get('description'),
                description2: formData.get('description2') || '',
                tags: formData.get('tags').split(',').map(t => t.trim()).filter(t => t),
                github: formData.get('github'),
            };

            projectsData.projects.push(newProject);
            await saveProjectsData();
            renderProjects(projectsData);
            loadAdminProjects();
            e.target.reset();
            alert('Project added successfully!');
        });
    }

    const editProjectForm = document.getElementById('editProjectForm');
    if (editProjectForm) {
        editProjectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const projectId = formData.get('id');
            const idx = projectsData.projects.findIndex(p => p.id === projectId);
            if (idx === -1) return;

            projectsData.projects[idx] = {
                ...projectsData.projects[idx],
                title: formData.get('title'),
                metric: formData.get('metric'),
                metricLabel: formData.get('metricLabel'),
                description: formData.get('description'),
                description2: formData.get('description2') || '',
                tags: formData.get('tags').split(',').map(t => t.trim()).filter(t => t),
                github: formData.get('github'),
            };

            await saveProjectsData();
            renderProjects(projectsData);
            loadAdminProjects();
            alert('Project updated successfully!');
        });
    }

    const deleteProjectBtn = document.getElementById('deleteProjectBtn');
    if (deleteProjectBtn) {
        deleteProjectBtn.addEventListener('click', async () => {
            const projectId = document.getElementById('editProjectForm').elements['id'].value;
            if (!confirm('Are you sure you want to delete this project?')) return;

            projectsData.projects = projectsData.projects.filter(p => p.id !== projectId);
            await saveProjectsData();
            renderProjects(projectsData);
            loadAdminProjects();
            document.getElementById('editProjectForm').style.display = 'none';
            document.getElementById('editProjectSelect').value = '';
            alert('Project deleted successfully!');
        });
    }
}

function loadAdminProjects() {
    if (!projectsData || !projectsData.projects) return;

    const projectsList = document.getElementById('projectsList');
    projectsList.innerHTML = projectsData.projects.map(project => `
        <div class="project-item">
            <div class="project-item-info">
                <h4>${project.title}</h4>
                <p>${project.description}</p>
                <p><strong>Tags:</strong> ${(project.tags || []).join(', ')}</p>
                ${project.metric ? `<p><strong>Metric:</strong> ${project.metric} — ${project.metricLabel}</p>` : ''}
            </div>
            <div class="project-item-actions">
                <button class="btn-secondary" onclick="editProject('${project.id}')">Edit</button>
            </div>
        </div>
    `).join('');

    const editProjectSelect = document.getElementById('editProjectSelect');
    editProjectSelect.innerHTML = '<option value="">-- Select a project --</option>' +
        projectsData.projects.map(p => `<option value="${p.id}">${p.title}</option>`).join('');
    editProjectSelect.value = '';
    document.getElementById('editProjectForm').style.display = 'none';
}

function editProject(projectId) {
    const adminTabButtons  = document.querySelectorAll('.admin-tab-button');
    const adminTabContents = document.querySelectorAll('.admin-tab-content');
    adminTabButtons.forEach(btn => btn.classList.remove('active'));
    adminTabContents.forEach(content => content.classList.remove('active'));
    document.querySelector('[data-admin-tab="edit"]').classList.add('active');
    document.getElementById('admin-edit').classList.add('active');
    document.getElementById('editProjectSelect').value = projectId;
    loadProjectForEdit(projectId);
}

function loadProjectForEdit(projectId) {
    const project = projectsData.projects.find(p => p.id === projectId);
    if (!project) return;

    const form = document.getElementById('editProjectForm');
    form.style.display = 'block';
    form.elements['id'].value          = project.id;
    form.elements['title'].value       = project.title;
    form.elements['metric'].value      = project.metric || '';
    form.elements['metricLabel'].value = project.metricLabel || '';
    form.elements['description'].value = project.description;
    form.elements['description2'].value = project.description2 || '';
    form.elements['tags'].value        = (project.tags || project.tools || []).join(', ');
    form.elements['github'].value      = project.github || project.githubUrl || '';
}

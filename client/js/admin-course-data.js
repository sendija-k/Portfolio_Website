// Admin editor for the course catalog (client/templates/modals/course-data-admin-modal.html).
// Structurally mirrors admin-projects.js. Tab switching between List/Add/Edit
// is handled by the existing global .admin-tab-button listener wired up in
// initProjectsAdmin() (it queries all .admin-tab-button/.admin-tab-content
// elements on the page, not just the projects modal's), so this file only
// needs to handle opening/closing the modal and the add/edit/delete forms.

function initCourseDataAdmin() {
    const adminCourseDataButton = document.getElementById('adminCourseDataButton');
    const courseDataAdminModal = document.getElementById('courseDataAdminModal');
    const closeCourseDataAdminModal = document.getElementById('closeCourseDataAdminModal');

    if (!adminCourseDataButton || !courseDataAdminModal || !closeCourseDataAdminModal) {
        console.error('Course data admin elements not found');
        return;
    }

    adminCourseDataButton.addEventListener('click', async () => {
        const isAuthenticated = await checkAuthentication();
        if (isAuthenticated) {
            courseDataAdminModal.classList.add('active');
            loadAdminCourseData();
        } else {
            document.getElementById('loginModal').classList.add('active');
            sessionStorage.setItem('pendingAdminPanel', 'courseData');
        }
    });

    closeCourseDataAdminModal.addEventListener('click', () => {
        courseDataAdminModal.classList.remove('active');
    });

    courseDataAdminModal.addEventListener('click', (e) => {
        if (e.target === courseDataAdminModal) courseDataAdminModal.classList.remove('active');
    });

    const editCourseDataSelect = document.getElementById('editCourseDataSelect');
    if (editCourseDataSelect) {
        editCourseDataSelect.addEventListener('change', function () {
            if (this.value) {
                loadCourseDataForEdit(this.value);
            } else {
                document.getElementById('editCourseDataForm').style.display = 'none';
            }
        });
    }

    const addCourseDataForm = document.getElementById('addCourseDataForm');
    if (addCourseDataForm) {
        addCourseDataForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const code = formData.get('code').trim();

            if (courseCatalog.courses.some((c) => c.code === code)) {
                alert('A course with that code already exists.');
                return;
            }

            const newCourse = {
                code,
                title: formData.get('title'),
                terms: formData.getAll('terms'),
                prereq: parseRequirementText(formData.get('prereq')),
                coreq: parseRequirementText(formData.get('coreq')),
                yearLong: formData.get('yearLong') === 'on',
            };

            courseCatalog.courses.push(newCourse);
            await saveCourseCatalog(courseCatalog);
            refreshCoursePlannerAfterCatalogEdit();
            loadAdminCourseData();
            e.target.reset();
            alert('Course added successfully!');
        });
    }

    const editCourseDataForm = document.getElementById('editCourseDataForm');
    if (editCourseDataForm) {
        editCourseDataForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const code = formData.get('code');
            const idx = courseCatalog.courses.findIndex((c) => c.code === code);
            if (idx === -1) return;

            courseCatalog.courses[idx] = {
                ...courseCatalog.courses[idx],
                title: formData.get('title'),
                terms: formData.getAll('terms'),
                prereq: parseRequirementText(formData.get('prereq')),
                coreq: parseRequirementText(formData.get('coreq')),
                yearLong: formData.get('yearLong') === 'on',
            };

            await saveCourseCatalog(courseCatalog);
            refreshCoursePlannerAfterCatalogEdit();
            loadAdminCourseData();
            alert('Course updated successfully!');
        });
    }

    const deleteCourseDataBtn = document.getElementById('deleteCourseDataBtn');
    if (deleteCourseDataBtn) {
        deleteCourseDataBtn.addEventListener('click', async () => {
            const code = document.getElementById('editCourseDataForm').elements['code'].value;
            if (!confirm('Delete this course? Any plan picks or prerequisites referencing it may be affected.')) return;

            courseCatalog.courses = courseCatalog.courses.filter((c) => c.code !== code);
            await saveCourseCatalog(courseCatalog);
            refreshCoursePlannerAfterCatalogEdit();
            loadAdminCourseData();
            document.getElementById('editCourseDataForm').style.display = 'none';
            document.getElementById('editCourseDataSelect').value = '';
            alert('Course deleted successfully!');
        });
    }
}

function loadAdminCourseData() {
    if (!courseCatalog || !courseCatalog.courses) return;

    const list = document.getElementById('courseDataList');
    list.innerHTML = courseCatalog.courses.map((course) => `
        <div class="project-item">
            <div class="project-item-info">
                <h4>${course.code}</h4>
                <p>${course.title}</p>
                <p><strong>Offered:</strong> ${course.terms.join(', ') || 'None'}${course.yearLong ? ' (year-long)' : ''}</p>
            </div>
            <div class="project-item-actions">
                <button class="btn-secondary" onclick="editCourseData('${course.code}')">Edit</button>
            </div>
        </div>
    `).join('');

    const select = document.getElementById('editCourseDataSelect');
    select.innerHTML = '<option value="">-- Select a course --</option>' +
        courseCatalog.courses.map((c) => `<option value="${c.code}">${c.code} — ${c.title}</option>`).join('');
    select.value = '';
    document.getElementById('editCourseDataForm').style.display = 'none';
}

function editCourseData(code) {
    const adminTabButtons = document.querySelectorAll('.admin-tab-button');
    const adminTabContents = document.querySelectorAll('.admin-tab-content');
    adminTabButtons.forEach((btn) => btn.classList.remove('active'));
    adminTabContents.forEach((content) => content.classList.remove('active'));
    document.querySelector('[data-admin-tab="courseDataEdit"]').classList.add('active');
    document.getElementById('admin-courseDataEdit').classList.add('active');
    document.getElementById('editCourseDataSelect').value = code;
    loadCourseDataForEdit(code);
}

function loadCourseDataForEdit(code) {
    const course = courseCatalog.courses.find((c) => c.code === code);
    if (!course) return;

    const form = document.getElementById('editCourseDataForm');
    form.style.display = 'block';
    form.elements['code'].value = course.code;
    form.elements['title'].value = course.title;
    form.elements['prereq'].value = serializeRequirementList(course.prereq);
    form.elements['coreq'].value = serializeRequirementList(course.coreq);
    form.elements['yearLong'].checked = !!course.yearLong;

    form.querySelectorAll('input[name="terms"]').forEach((checkbox) => {
        checkbox.checked = course.terms.includes(checkbox.value);
    });
}

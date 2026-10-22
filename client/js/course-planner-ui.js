// Semester planner rendering, click handling, and page orchestration.
// Reads/writes the `courseCatalog` / `coursePlan` globals declared in
// data-loader.js (shared classic-script scope, same pattern used by
// projectsData/blogData elsewhere in this codebase). `coursePlan` holds the
// whole multi-plan document ({activePlanId, plans: [...]}) — use
// getActivePlan(coursePlan) to get the plan currently being edited.

let courseTermSequence = [];
let courseRenderedTermCount = 6;
let courseCompareVisible = false;

const debouncedSaveCoursePlan = debounceCoursePlanner(() => {
    saveCoursePlan(coursePlan);
}, 500);

function initCoursePlannerPage(catalog, rawPlanDoc) {
    courseCatalog = catalog;

    const wasOldShape = !(rawPlanDoc && Array.isArray(rawPlanDoc.plans));
    coursePlan = normalizeCoursePlanDocument(rawPlanDoc);
    if (wasOldShape) {
        debouncedSaveCoursePlan(); // persist the migrated shape
    }

    courseRenderedTermCount = Math.max(6, computeMinimumTermHorizon(getActivePlan(coursePlan)));
    renderCoursePlannerAll();

    const addTermButton = document.getElementById('courseAddTermButton');
    if (addTermButton && !addTermButton.dataset.bound) {
        addTermButton.dataset.bound = 'true';
        addTermButton.addEventListener('click', () => {
            courseRenderedTermCount += 3;
            renderCoursePlannerAll();
        });
    }

    const clearSelectionButton = document.getElementById('prereqMapClearSelection');
    if (clearSelectionButton && !clearSelectionButton.dataset.bound) {
        clearSelectionButton.dataset.bound = 'true';
        clearSelectionButton.addEventListener('click', () => clearPrereqMapSelection());
    }

    bindCoursePlanControlsOnce();
}

function renderCoursePlannerAll() {
    const activePlan = getActivePlan(coursePlan);
    courseTermSequence = generateTermSequence(courseRenderedTermCount);

    renderPrereqMap(courseCatalog, computeCumulativePlannedSet(activePlan));
    renderSemesterPlanner();
    updateCourseProgressSummary();
    renderCoursePlanSelector();
    if (courseCompareVisible) renderComparePlansTable();
}

// ── Plan switcher / compare controls ────────────────────────────────────

function renderCoursePlanSelector() {
    const select = document.getElementById('coursePlanSelect');
    if (!select) return;

    select.innerHTML = coursePlan.plans.map((p) => `
        <option value="${p.id}" ${p.id === coursePlan.activePlanId ? 'selected' : ''}>${p.name}</option>
    `).join('');
}

function switchToPlan(planId) {
    coursePlan = setActivePlanId(coursePlan, planId);
    courseRenderedTermCount = Math.max(6, computeMinimumTermHorizon(getActivePlan(coursePlan)));
    renderCoursePlannerAll();
    showCourseClearedNotice({});
    debouncedSaveCoursePlan();
}

function bindCoursePlanControlsOnce() {
    const select = document.getElementById('coursePlanSelect');
    if (select && !select.dataset.bound) {
        select.dataset.bound = 'true';
        select.addEventListener('change', () => switchToPlan(select.value));
    }

    const newBtn = document.getElementById('courseNewPlanButton');
    if (newBtn && !newBtn.dataset.bound) {
        newBtn.dataset.bound = 'true';
        newBtn.addEventListener('click', () => {
            const name = prompt('Name for the new plan:', `Plan ${coursePlan.plans.length + 1}`);
            if (name === null) return;
            coursePlan = createPlanInDocument(coursePlan, name.trim() || undefined);
            courseRenderedTermCount = 6;
            renderCoursePlannerAll();
            debouncedSaveCoursePlan();
        });
    }

    const dupBtn = document.getElementById('courseDuplicatePlanButton');
    if (dupBtn && !dupBtn.dataset.bound) {
        dupBtn.dataset.bound = 'true';
        dupBtn.addEventListener('click', () => {
            const activePlan = getActivePlan(coursePlan);
            const name = prompt('Name for the duplicated plan:', `${activePlan.name} (copy)`);
            if (name === null) return;
            coursePlan = duplicatePlanInDocument(coursePlan, activePlan.id, name.trim() || undefined);
            courseRenderedTermCount = Math.max(6, computeMinimumTermHorizon(getActivePlan(coursePlan)));
            renderCoursePlannerAll();
            debouncedSaveCoursePlan();
        });
    }

    const renameBtn = document.getElementById('courseRenamePlanButton');
    if (renameBtn && !renameBtn.dataset.bound) {
        renameBtn.dataset.bound = 'true';
        renameBtn.addEventListener('click', () => {
            const activePlan = getActivePlan(coursePlan);
            const name = prompt('Rename plan:', activePlan.name);
            if (name === null || !name.trim()) return;
            coursePlan = renamePlanInDocument(coursePlan, activePlan.id, name.trim());
            renderCoursePlannerAll();
            debouncedSaveCoursePlan();
        });
    }

    const deleteBtn = document.getElementById('courseDeletePlanButton');
    if (deleteBtn && !deleteBtn.dataset.bound) {
        deleteBtn.dataset.bound = 'true';
        deleteBtn.addEventListener('click', () => {
            if (coursePlan.plans.length <= 1) {
                alert('You need at least one plan — create a new one before deleting this one.');
                return;
            }
            const activePlan = getActivePlan(coursePlan);
            if (!confirm(`Delete plan "${activePlan.name}"? This cannot be undone.`)) return;
            coursePlan = deletePlanFromDocument(coursePlan, activePlan.id);
            courseRenderedTermCount = Math.max(6, computeMinimumTermHorizon(getActivePlan(coursePlan)));
            renderCoursePlannerAll();
            debouncedSaveCoursePlan();
        });
    }

    const compareBtn = document.getElementById('courseComparePlansButton');
    if (compareBtn && !compareBtn.dataset.bound) {
        compareBtn.dataset.bound = 'true';
        compareBtn.addEventListener('click', () => {
            courseCompareVisible = !courseCompareVisible;
            const panel = document.getElementById('coursePlanCompare');
            if (panel) panel.style.display = courseCompareVisible ? 'block' : 'none';
            compareBtn.textContent = courseCompareVisible ? 'Hide Comparison' : 'Compare Plans';
            if (courseCompareVisible) renderComparePlansTable();
        });
    }

    const generateBtn = document.getElementById('courseGenerateTrackButton');
    if (generateBtn && !generateBtn.dataset.bound) {
        generateBtn.dataset.bound = 'true';
        generateBtn.addEventListener('click', () => {
            const input = document.getElementById('courseMaxPerTermInput');
            const maxPerTerm = Math.max(1, Math.min(5, parseInt(input.value, 10) || 5));
            const activePlan = getActivePlan(coursePlan);
            const { updatedPlan, unplaced } = generateFastestTrack(courseCatalog, activePlan, maxPerTerm);

            activePlan.terms = updatedPlan.terms;
            activePlan.updatedAt = updatedPlan.updatedAt;

            courseRenderedTermCount = Math.max(courseRenderedTermCount, computeMinimumTermHorizon(activePlan));
            renderCoursePlannerAll();
            debouncedSaveCoursePlan();

            if (unplaced.length > 0) {
                showCourseGenerateWarning(unplaced);
            } else {
                showCourseClearedNotice({});
            }
        });
    }
}

function renderComparePlansTable() {
    const table = document.getElementById('coursePlanCompareTable');
    if (!table) return;

    const rows = coursePlan.plans.map((plan) => {
        const summary = computePlanSummary(courseCatalog, plan);
        const isActive = plan.id === coursePlan.activePlanId;
        return `
            <tr class="${isActive ? 'course-compare-row--active' : ''}">
                <td>${plan.name}${isActive ? ' (current)' : ''}</td>
                <td>${summary.plannedCount} / ${summary.totalRequired}</td>
                <td>${summary.termsUsedCount}</td>
                <td>${summary.lastUsedTermLabel || '—'}</td>
                <td>${summary.isComplete ? 'Complete' : 'In progress'}</td>
                <td>${isActive ? '' : `<button type="button" class="btn-secondary" data-action="switch-plan" data-plan-id="${plan.id}">Switch</button>`}</td>
            </tr>`;
    }).join('');

    table.innerHTML = `
        <thead>
            <tr><th>Plan</th><th>Courses Planned</th><th>Terms Used</th><th>Last Term</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>${rows}</tbody>
    `;

    if (!table.dataset.bound) {
        table.dataset.bound = 'true';
        table.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action="switch-plan"]');
            if (!btn) return;
            switchToPlan(btn.dataset.planId);
        });
    }
}

// ── Semester planner ─────────────────────────────────────────────────

function renderSemesterPlanner() {
    const grid = document.getElementById('semesterPlannerGrid');
    const addTermButton = document.getElementById('courseAddTermButton');
    if (!grid) return;

    const activePlan = getActivePlan(coursePlan);
    const allCodes = courseCatalog.courses.map((c) => c.code);
    const cumulativePlanned = computeCumulativePlannedSet(activePlan);
    const fullyScheduled = allCodes.every((code) => cumulativePlanned.has(code));

    let lastTouchedIndex = -1;
    for (let t = 0; t < courseTermSequence.length; t++) {
        const entry = activePlan.terms[courseTermSequence[t].id];
        const hasContinuation = !!getAutoCapstoneContinuation(courseCatalog, activePlan, courseTermSequence, t);
        if ((entry && (entry.mode !== 'normal' || entry.courses.length > 0)) || hasContinuation) lastTouchedIndex = t;
    }

    let html = '';

    for (let t = 0; t < courseTermSequence.length; t++) {
        const term = courseTermSequence[t];

        if (fullyScheduled && t > lastTouchedIndex) {
            html += `
                <div class="term-card term-card--complete" data-term-index="${t}">
                    <div class="term-card-header"><span>${term.label}</span></div>
                    <p class="term-card-note">All required courses planned.</p>
                </div>`;
            continue;
        }

        const entry = activePlan.terms[term.id] || { courses: [], mode: 'normal' };
        const completedBefore = computeCompletedBeforeTerm(courseCatalog, activePlan, courseTermSequence, t);
        const autoContinuation = getAutoCapstoneContinuation(courseCatalog, activePlan, courseTermSequence, t);
        const cap = getEffectiveCap(courseCatalog, activePlan, courseTermSequence, t);
        const pickedCount = entry.courses.length + (autoContinuation ? 1 : 0);

        let bodyHtml;
        if (entry.mode === 'skip') {
            bodyHtml = `<p class="term-card-note">Skipped — no courses planned this term.</p>`;
        } else {
            let chipsHtml = '';

            if (autoContinuation) {
                const prevLabel = t > 0 ? courseTermSequence[t - 1].label : '';
                chipsHtml += `<span class="course-chip course-chip--auto" title="Continues from ${prevLabel}">${autoContinuation} — capstone continues</span>`;
            }
            for (const code of entry.courses) {
                chipsHtml += `<button type="button" class="course-chip course-chip--picked" data-action="toggle-course" data-term-index="${t}" data-code="${code}">${code} ×</button>`;
            }

            const stagedThisTerm = new Set(entry.courses);
            const eligible = courseCatalog.courses.filter((course) => {
                if (course.code === autoContinuation) return false;
                if (entry.courses.includes(course.code)) return false;
                if (cumulativePlanned.has(course.code)) return false;
                return isCourseEligible(course, term.season, completedBefore, stagedThisTerm);
            });

            let eligibleHtml = '';
            if (pickedCount >= cap) {
                eligibleHtml = `<p class="term-card-note">Term full (${pickedCount}/${cap}).</p>`;
            } else if (eligible.length === 0) {
                eligibleHtml = `<p class="term-card-note">No new eligible courses this term.</p>`;
            } else {
                eligibleHtml = eligible.map((course) => `
                    <button type="button" class="course-chip course-chip--eligible" data-action="toggle-course" data-term-index="${t}" data-code="${course.code}">+ ${course.code}</button>
                `).join('');
            }

            bodyHtml = `
                <div class="course-chip-row">${chipsHtml}</div>
                <div class="course-chip-row course-chip-row--eligible">${eligibleHtml}</div>
            `;
        }

        const skipDisabled = !!autoContinuation;
        const modeOptions = [
            `<option value="normal" ${entry.mode === 'normal' ? 'selected' : ''}>Normal</option>`,
            `<option value="coop" ${entry.mode === 'coop' ? 'selected' : ''}>Co-op (max 1)</option>`,
            `<option value="skip" ${entry.mode === 'skip' ? 'selected' : ''} ${skipDisabled ? 'disabled title="A capstone continuation is already committed to this term"' : ''}>Skip</option>`,
        ].join('');

        html += `
            <div class="term-card ${entry.mode === 'coop' ? 'term-card--coop' : ''}" data-term-index="${t}">
                <div class="term-card-header">
                    <span>${term.label}${entry.mode === 'coop' ? ' <span class="term-badge">CO-OP</span>' : ''}</span>
                    <span class="term-card-count">${entry.mode === 'skip' ? 'Skipped' : `${pickedCount}/${cap}`}</span>
                </div>
                ${bodyHtml}
                <select class="term-mode-select" data-action="change-mode" data-term-index="${t}">${modeOptions}</select>
            </div>`;
    }

    grid.innerHTML = html;
    if (addTermButton) addTermButton.style.display = fullyScheduled ? 'none' : 'inline-block';

    if (!grid.dataset.bound) {
        grid.dataset.bound = 'true';
        grid.addEventListener('click', handleSemesterPlannerClick);
        grid.addEventListener('change', handleSemesterPlannerChange);
    }
}

function handleSemesterPlannerClick(e) {
    const target = e.target.closest('[data-action="toggle-course"]');
    if (!target) return;
    handleCourseClick(parseInt(target.dataset.termIndex, 10), target.dataset.code);
}

function handleSemesterPlannerChange(e) {
    const target = e.target.closest('[data-action="change-mode"]');
    if (!target) return;
    handleTermModeChange(parseInt(target.dataset.termIndex, 10), target.value);
}

function handleCourseClick(termIndex, courseCode) {
    const term = courseTermSequence[termIndex];
    if (!term) return;

    const activePlan = getActivePlan(coursePlan);
    if (!activePlan.terms[term.id]) activePlan.terms[term.id] = { courses: [], mode: 'normal' };
    const entry = activePlan.terms[term.id];
    if (entry.mode === 'skip') return;

    const isCurrentlyPicked = entry.courses.includes(courseCode);

    if (!isCurrentlyPicked) {
        const cap = getEffectiveCap(courseCatalog, activePlan, courseTermSequence, termIndex);
        const autoContinuation = getAutoCapstoneContinuation(courseCatalog, activePlan, courseTermSequence, termIndex);
        const pickedCount = entry.courses.length + (autoContinuation ? 1 : 0);
        if (pickedCount >= cap) return;

        const course = courseCatalog.courses.find((c) => c.code === courseCode);
        if (course && course.yearLong) {
            const nextTerm = courseTermSequence[termIndex + 1];
            const nextEntry = nextTerm ? activePlan.terms[nextTerm.id] : null;
            const nextCap = nextTerm ? getEffectiveCap(courseCatalog, activePlan, courseTermSequence, termIndex + 1) : 5;
            if (nextEntry && nextEntry.mode !== 'skip' && nextEntry.courses.length >= nextCap) {
                showCourseCapstoneRejection(nextTerm.label);
                return;
            }
        }

        entry.courses.push(courseCode);
    } else {
        entry.courses = entry.courses.filter((c) => c !== courseCode);
    }

    applyCoursePlanChange(termIndex);
}

function handleTermModeChange(termIndex, newMode) {
    const term = courseTermSequence[termIndex];
    if (!term) return;

    const activePlan = getActivePlan(coursePlan);
    if (!activePlan.terms[term.id]) activePlan.terms[term.id] = { courses: [], mode: 'normal' };
    const entry = activePlan.terms[term.id];
    entry.mode = newMode;

    const newCap = getEffectiveCap(courseCatalog, activePlan, courseTermSequence, termIndex);
    if (entry.courses.length > newCap) {
        entry.courses = entry.courses.slice(0, newCap);
    }

    applyCoursePlanChange(termIndex);
}

function applyCoursePlanChange(editedTermIndex) {
    const activePlan = getActivePlan(coursePlan);
    const { updatedPlan, clearedByTerm } = recomputeCascadeClears(courseCatalog, activePlan, courseTermSequence, editedTermIndex);
    activePlan.terms = updatedPlan.terms;
    activePlan.updatedAt = updatedPlan.updatedAt;

    renderCoursePlannerAll();
    showCourseClearedNotice(clearedByTerm);
    debouncedSaveCoursePlan();
}

// Re-run after the course catalog itself is edited via the admin modal, so
// picks that no longer resolve against the new catalog are cleared and the
// view refreshes without requiring a reload.
function refreshCoursePlannerAfterCatalogEdit() {
    if (!document.getElementById('course') || !coursePlan || !courseCatalog) return;

    const activePlan = getActivePlan(coursePlan);
    courseTermSequence = generateTermSequence(courseRenderedTermCount);
    const { updatedPlan, clearedByTerm } = recomputeCascadeClears(courseCatalog, activePlan, courseTermSequence, -1);
    activePlan.terms = updatedPlan.terms;
    activePlan.updatedAt = updatedPlan.updatedAt;

    renderCoursePlannerAll();
    showCourseClearedNotice(clearedByTerm);
    debouncedSaveCoursePlan();
}

function showCourseClearedNotice(clearedByTerm) {
    const notice = document.getElementById('courseClearedNotice');
    if (!notice) return;

    const termIds = Object.keys(clearedByTerm || {});
    if (termIds.length === 0) {
        notice.style.display = 'none';
        notice.textContent = '';
        return;
    }

    const parts = termIds.map((termId) => {
        const term = courseTermSequence.find((t) => t.id === termId);
        const label = term ? term.label : termId;
        return `${label}: ${clearedByTerm[termId].join(', ')}`;
    });
    notice.textContent = `Removed (prerequisite no longer met) — ${parts.join(' | ')}`;
    notice.style.display = 'block';
}

function showCourseCapstoneRejection(nextTermLabel) {
    const notice = document.getElementById('courseClearedNotice');
    if (!notice) return;
    notice.textContent = `${nextTermLabel} is already full — remove a course there before adding the year-long capstone.`;
    notice.style.display = 'block';
}

function showCourseGenerateWarning(unplaced) {
    const notice = document.getElementById('courseClearedNotice');
    if (!notice) return;
    notice.textContent = `Generated as much as possible, but couldn't place: ${unplaced.join(', ')} — check the catalog for a missing or incorrect prerequisite code.`;
    notice.style.display = 'block';
}

function updateCourseProgressSummary() {
    const progress = document.getElementById('coursePlanProgress');
    if (!progress) return;

    const activePlan = getActivePlan(coursePlan);
    const planned = computeCumulativePlannedSet(activePlan);
    const total = courseCatalog.courses.length;
    progress.textContent = `${planned.size} of ${total} required courses planned in "${activePlan.name}".`;
}

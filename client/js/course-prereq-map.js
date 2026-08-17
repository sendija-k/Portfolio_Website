// Renders the tiered prerequisite DAG: CSS columns per tier for structure,
// an absolutely-positioned SVG overlay for connector lines (no charting
// library exists in this codebase, so connectors are hand-drawn from each
// card's post-layout bounding box). Clicking a card highlights its full
// chain of prerequisite ancestors (cards + connecting edges) so a specific
// route through the map is easy to trace.

let coursePrereqMapCatalog = null;
let coursePrereqMapCumulativeSet = new Set();
let coursePrereqMapResizeBound = false;
let coursePrereqMapClickBound = false;
let coursePrereqMapSelectedCode = null;

function classifyStatus(course, cumulativePlannedSet) {
    if (cumulativePlannedSet.has(course.code)) return 'planned';
    if (isRequirementListSatisfied(course.prereq, cumulativePlannedSet)) return 'eligible';
    return 'locked';
}

function renderPrereqMap(catalog, cumulativePlannedSet) {
    coursePrereqMapCatalog = catalog;
    coursePrereqMapCumulativeSet = cumulativePlannedSet;

    const grid = document.getElementById('prereqMapGrid');
    if (!grid) return;

    // A course removed from the catalog (or never selected) can't stay "selected."
    if (coursePrereqMapSelectedCode && !catalog.courses.some((c) => c.code === coursePrereqMapSelectedCode)) {
        coursePrereqMapSelectedCode = null;
    }

    const tiers = computeCourseTiers(catalog);
    let maxTier = 0;
    for (const code in tiers) maxTier = Math.max(maxTier, tiers[code]);

    const columns = [];
    for (let t = 0; t <= maxTier; t++) columns.push([]);
    for (const course of catalog.courses) {
        columns[tiers[course.code] || 0].push(course);
    }

    grid.innerHTML = columns.map((courses, tierIndex) => `
        <div class="prereq-tier-column">
            <div class="prereq-tier-label">Tier ${tierIndex}</div>
            ${courses.map((course) => `
                <div class="course-card course-card--${classifyStatus(course, cumulativePlannedSet)}" data-code="${course.code}" title="${course.title}">
                    <div class="course-card-code">${course.code}</div>
                    <div class="course-card-title">${course.title}</div>
                    <div class="course-card-terms">${course.terms.map((s) => s[0]).join(' / ')}</div>
                </div>
            `).join('')}
        </div>
    `).join('');

    applyRouteHighlightClasses();
    requestAnimationFrame(drawPrereqConnectors);

    if (!coursePrereqMapResizeBound) {
        coursePrereqMapResizeBound = true;
        window.addEventListener('resize', debounceCoursePlanner(drawPrereqConnectors, 150));
    }

    if (!coursePrereqMapClickBound) {
        coursePrereqMapClickBound = true;
        grid.addEventListener('click', handlePrereqMapCardClick);
    }
}

function handlePrereqMapCardClick(e) {
    const card = e.target.closest('.course-card');
    if (!card) return;

    const code = card.dataset.code;
    coursePrereqMapSelectedCode = coursePrereqMapSelectedCode === code ? null : code;
    applyRouteHighlightClasses();
    drawPrereqConnectors();
}

function clearPrereqMapSelection() {
    if (!coursePrereqMapSelectedCode) return;
    coursePrereqMapSelectedCode = null;
    applyRouteHighlightClasses();
    drawPrereqConnectors();
}

// Layers the selected/route highlight classes on top of whatever status
// classes are already on each card, without touching those status classes.
function applyRouteHighlightClasses() {
    const grid = document.getElementById('prereqMapGrid');
    if (!grid) return;

    const clearLink = document.getElementById('prereqMapClearSelection');

    if (!coursePrereqMapSelectedCode) {
        grid.classList.remove('prereq-map-grid--has-selection');
        grid.querySelectorAll('.course-card').forEach((card) => {
            card.classList.remove('course-card--route', 'course-card--route-selected');
        });
        if (clearLink) clearLink.style.display = 'none';
        return;
    }

    const ancestors = computePrerequisiteAncestors(coursePrereqMapCatalog, coursePrereqMapSelectedCode);
    grid.classList.add('prereq-map-grid--has-selection');
    grid.querySelectorAll('.course-card').forEach((card) => {
        const code = card.dataset.code;
        card.classList.toggle('course-card--route-selected', code === coursePrereqMapSelectedCode);
        card.classList.toggle('course-card--route', ancestors.has(code));
    });
    if (clearLink) clearLink.style.display = 'inline';
}

function buildConnectorPath(x1, y1, x2, y2, { color, width, opacity, dashed }) {
    const midX = (x1 + x2) / 2;
    const dashAttr = dashed ? 'stroke-dasharray: 4 3;' : '';
    return `<path d="M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}" fill="none" style="stroke: ${color}; stroke-width: ${width}; opacity: ${opacity}; ${dashAttr}" />`;
}

function drawPrereqConnectors() {
    const svg = document.getElementById('prereqMapConnectors');
    const wrapper = document.getElementById('prereqMapWrapper');
    const grid = document.getElementById('prereqMapGrid');
    if (!svg || !wrapper || !grid || !coursePrereqMapCatalog) return;

    const wrapperRect = wrapper.getBoundingClientRect();
    const width = grid.scrollWidth;
    const height = grid.scrollHeight;
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const cardRects = {};
    grid.querySelectorAll('.course-card').forEach((card) => {
        const rect = card.getBoundingClientRect();
        cardRects[card.dataset.code] = {
            left: rect.left - wrapperRect.left + wrapper.scrollLeft,
            right: rect.right - wrapperRect.left + wrapper.scrollLeft,
            midY: rect.top - wrapperRect.top + wrapper.scrollTop + rect.height / 2,
        };
    });

    // Every node in the route (the selected course + its ancestors) has ALL
    // of its own direct prereqs also in the route, by construction — so an
    // edge is part of the route exactly when its TARGET is in the route.
    const routeSet = coursePrereqMapSelectedCode
        ? new Set([coursePrereqMapSelectedCode, ...computePrerequisiteAncestors(coursePrereqMapCatalog, coursePrereqMapSelectedCode)])
        : null;

    let normalPaths = '';
    let routePaths = '';

    for (const course of coursePrereqMapCatalog.courses) {
        const target = cardRects[course.code];
        if (!target) continue;

        const onRoute = routeSet && routeSet.has(course.code);

        for (const item of course.prereq || []) {
            const group = Array.isArray(item) ? item : [item];
            const dashed = Array.isArray(item);

            for (const sourceCode of group) {
                const source = cardRects[sourceCode];
                if (!source) continue;

                const x1 = source.right, y1 = source.midY;
                const x2 = target.left, y2 = target.midY;

                if (onRoute) {
                    routePaths += buildConnectorPath(x1, y1, x2, y2, { color: 'var(--accent)', width: '2.5px', opacity: '0.9', dashed });
                } else {
                    const dimmed = !!routeSet;
                    normalPaths += buildConnectorPath(x1, y1, x2, y2, { color: 'var(--ink-soft)', width: '1.5px', opacity: dimmed ? '0.12' : '0.55', dashed });
                }
            }
        }
    }

    // Route edges drawn last so they sit on top of the (possibly dimmed) rest.
    svg.innerHTML = normalPaths + routePaths;
}

function refreshPrereqMapStatuses(cumulativePlannedSet) {
    coursePrereqMapCumulativeSet = cumulativePlannedSet;
    if (!coursePrereqMapCatalog) return;

    document.querySelectorAll('#prereqMapGrid .course-card').forEach((card) => {
        const course = coursePrereqMapCatalog.courses.find((c) => c.code === card.dataset.code);
        if (!course) return;
        card.className = `course-card course-card--${classifyStatus(course, cumulativePlannedSet)}`;
    });

    applyRouteHighlightClasses();
    drawPrereqConnectors();
}

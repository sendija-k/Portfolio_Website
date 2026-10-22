// Pure logic for the course planner: no DOM access, safe to reason about in isolation.
// Requirement-list shape (used for both `prereq` and `coreq`): an array where each
// element is either a course code string (mandatory) or an array of course code
// strings (an OR-group — any one member satisfies that slot).

const COURSE_TERM_SEASONS = ['Winter', 'Summer', 'Fall'];

function buildCatalogIndex(catalog) {
    const byCode = {};
    for (const course of (catalog && catalog.courses) || []) {
        byCode[course.code] = course;
    }
    return byCode;
}

function flattenCourseCodes(list) {
    const codes = [];
    for (const item of list || []) {
        if (Array.isArray(item)) {
            codes.push(...item);
        } else {
            codes.push(item);
        }
    }
    return codes;
}

function isRequirementListSatisfied(list, satisfiedSet) {
    for (const item of list || []) {
        if (Array.isArray(item)) {
            if (!item.some((code) => satisfiedSet.has(code))) return false;
        } else {
            if (!satisfiedSet.has(item)) return false;
        }
    }
    return true;
}

function isCourseEligible(course, termSeason, completedBefore, stagedThisTerm) {
    if (!course.terms.includes(termSeason)) return false;
    if (!isRequirementListSatisfied(course.prereq, completedBefore)) return false;

    const coreqCheckSet = new Set(completedBefore);
    for (const code of stagedThisTerm) coreqCheckSet.add(code);
    if (!isRequirementListSatisfied(course.coreq, coreqCheckSet)) return false;

    return true;
}

// Longest-path-from-source depth over `prereq` only. Returns a plain object
// { [code]: tierNumber }. Cycle-guarded defensively (data is expected to be
// acyclic, but the catalog is user-editable, so don't infinite-loop on a
// mistake — treat a cycle member as tier 0 once detected).
function computeCourseTiers(catalog) {
    const byCode = buildCatalogIndex(catalog);
    const tiers = {};
    const inProgress = new Set();

    function tierOf(code) {
        if (code in tiers) return tiers[code];
        const course = byCode[code];
        if (!course) return 0; // unknown/external code — treat as a leaf
        if (inProgress.has(code)) return 0; // cycle guard
        inProgress.add(code);

        const prereqCodes = flattenCourseCodes(course.prereq);
        let tier = 0;
        for (const depCode of prereqCodes) {
            tier = Math.max(tier, 1 + tierOf(depCode));
        }

        inProgress.delete(code);
        tiers[code] = tier;
        return tier;
    }

    for (const course of catalog.courses) tierOf(course.code);
    return tiers;
}

// Every course that must be completed before `code` is reachable, direct or
// transitive (walks `prereq` only, not `coreq`). Does not include `code`
// itself. Cycle-safe (won't infinite-loop on a malformed catalog).
function computePrerequisiteAncestors(catalog, code) {
    const byCode = buildCatalogIndex(catalog);
    const ancestors = new Set();
    const stack = [code];

    while (stack.length > 0) {
        const current = stack.pop();
        const course = byCode[current];
        if (!course) continue;

        for (const depCode of flattenCourseCodes(course.prereq)) {
            if (!ancestors.has(depCode)) {
                ancestors.add(depCode);
                stack.push(depCode);
            }
        }
    }

    return ancestors;
}

function generateTermSequence(count, startYear = 2027, startSeason = 'Winter') {
    const startIndex = COURSE_TERM_SEASONS.indexOf(startSeason);
    const sequence = [];
    for (let i = 0; i < count; i++) {
        const seasonIndex = (startIndex + i) % 3;
        const yearOffset = Math.floor((startIndex + i) / 3);
        const season = COURSE_TERM_SEASONS[seasonIndex];
        const year = startYear + yearOffset;
        sequence.push({ id: `${year}-${season}`, season, year, label: `${season} ${year}` });
    }
    return sequence;
}

// Union of every course completed in terms strictly before termIndex. A
// year-long course only counts as "completed" once its automatic
// continuation term (the very next term) has also passed.
function computeCompletedBeforeTerm(catalog, plan, termSequence, termIndex) {
    const byCode = buildCatalogIndex(catalog);
    const completed = new Set();

    for (let i = 0; i < termIndex; i++) {
        const entry = plan.terms[termSequence[i].id];
        if (!entry || entry.mode === 'skip') continue;

        for (const code of entry.courses) {
            const course = byCode[code];
            if (course && course.yearLong) {
                if (i + 1 < termIndex) completed.add(code);
            } else {
                completed.add(code);
            }
        }
    }

    return completed;
}

// Every course assigned anywhere in the plan, regardless of term ordering —
// used for "at a glance" status coloring on the prerequisite map.
function computeCumulativePlannedSet(plan) {
    const planned = new Set();
    for (const termId of Object.keys(plan.terms)) {
        const entry = plan.terms[termId];
        if (!entry || entry.mode === 'skip') continue;
        for (const code of entry.courses) planned.add(code);
    }
    return planned;
}

// If the term immediately before termIndex contains a year-long course,
// that course automatically occupies a slot in termIndex too.
function getAutoCapstoneContinuation(catalog, plan, termSequence, termIndex) {
    if (termIndex <= 0) return null;
    const prevEntry = plan.terms[termSequence[termIndex - 1].id];
    if (!prevEntry || prevEntry.mode === 'skip') return null;

    const byCode = buildCatalogIndex(catalog);
    return prevEntry.courses.find((code) => byCode[code] && byCode[code].yearLong) || null;
}

// Term "mode" is one of: 'normal' (default, up to 5 — or 4 if a capstone
// continuation lands here), 'coop' (at most 1 course), 'skip' (0 courses).
function getEffectiveCap(catalog, plan, termSequence, termIndex) {
    const entry = plan.terms[termSequence[termIndex].id];
    const mode = entry ? entry.mode : 'normal';
    const baseCap = getAutoCapstoneContinuation(catalog, plan, termSequence, termIndex) ? 4 : 5;

    if (mode === 'skip') return 0;
    if (mode === 'coop') return Math.min(1, baseCap);
    return baseCap;
}

function cloneCoursePlan(plan) {
    const cloned = { terms: {}, updatedAt: plan.updatedAt || null };
    for (const termId of Object.keys(plan.terms || {})) {
        const entry = plan.terms[termId];
        cloned.terms[termId] = { courses: [...(entry.courses || [])], mode: entry.mode || 'normal' };
    }
    return cloned;
}

// How many terms (from Winter 2027) are needed to cover every term the plan
// has already touched, plus one extra so there's always a next actionable
// term to show.
function computeMinimumTermHorizon(plan) {
    const touchedIds = Object.keys((plan && plan.terms) || {});
    if (touchedIds.length === 0) return 6;

    let count = 6;
    while (count <= 300) {
        const seq = generateTermSequence(count);
        const ids = new Set(seq.map((t) => t.id));
        if (touchedIds.every((id) => ids.has(id))) return count + 1;
        count += 6;
    }
    return count;
}

// Re-validates every term from editedTermIndex + 1 onward (pass -1 to
// revalidate the whole plan, e.g. after a catalog edit) and drops any pick
// whose prereq/coreq is no longer satisfied, to a fixed point per term
// (dropping one course can invalidate a same-term coreq partner). Pure —
// does not mutate the input plan. Returns the updated plan plus a map of
// term id -> array of course codes that were cleared, so the caller can
// both apply the change and tell the user what happened.
function recomputeCascadeClears(catalog, plan, termSequence, editedTermIndex) {
    const byCode = buildCatalogIndex(catalog);
    const updatedPlan = cloneCoursePlan(plan);
    const clearedByTerm = {};

    for (let t = editedTermIndex + 1; t < termSequence.length; t++) {
        const termId = termSequence[t].id;
        const entry = updatedPlan.terms[termId];
        if (!entry || entry.mode === 'skip' || entry.courses.length === 0) continue;

        let changed = true;
        while (changed) {
            changed = false;
            const completedBefore = computeCompletedBeforeTerm(catalog, updatedPlan, termSequence, t);

            for (const code of [...entry.courses]) {
                const course = byCode[code];
                const stagedThisTerm = new Set(entry.courses.filter((c) => c !== code));
                const stillEligible = course && isCourseEligible(course, termSequence[t].season, completedBefore, stagedThisTerm);

                if (!stillEligible) {
                    entry.courses = entry.courses.filter((c) => c !== code);
                    if (!clearedByTerm[termId]) clearedByTerm[termId] = [];
                    clearedByTerm[termId].push(code);
                    changed = true;
                }
            }
        }
    }

    updatedPlan.updatedAt = new Date().toISOString();
    return { updatedPlan, clearedByTerm };
}

// Admin-editor text syntax for prereq/coreq fields: ";" separates mandatory
// (AND) items, "|" within an item separates OR-alternatives. Example:
// "SC/MATH1131; LE/EECS1015|LE/EECS1560" -> ["SC/MATH1131", ["LE/EECS1015","LE/EECS1560"]]
function parseRequirementText(text) {
    if (!text || !text.trim()) return [];
    return text.split(';')
        .map((chunk) => chunk.trim())
        .filter((chunk) => chunk.length > 0)
        .map((chunk) => {
            const alternatives = chunk.split('|').map((code) => code.trim()).filter((code) => code.length > 0);
            return alternatives.length > 1 ? alternatives : alternatives[0];
        });
}

function serializeRequirementList(list) {
    return (list || [])
        .map((item) => (Array.isArray(item) ? item.join('|') : item))
        .join('; ');
}

function debounceCoursePlanner(fn, ms) {
    let timeoutId = null;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), ms);
    };
}

// ── Multiple saved plans ──────────────────────────────────────────────
// The persisted document is { activePlanId, plans: [{id, name, terms, updatedAt}, ...] }.
// All plan-collection helpers below are pure — they return a new document
// rather than mutating the one passed in.

function createPlanDocument() {
    return {
        activePlanId: 'plan-1',
        plans: [{ id: 'plan-1', name: 'Plan 1', terms: {}, updatedAt: null }],
    };
}

function generateUniquePlanId(doc) {
    const existingIds = new Set(doc.plans.map((p) => p.id));
    let n = doc.plans.length + 1;
    let id = `plan-${n}`;
    while (existingIds.has(id)) {
        n++;
        id = `plan-${n}`;
    }
    return id;
}

// Migrates the old single-plan file shape ({terms, updatedAt}) into the
// multi-plan shape, and normalizes each term entry's old `skipped: boolean`
// field into the new `mode` field. Safe to call on already-normalized data
// (a no-op in that case).
function normalizeCoursePlanDocument(raw) {
    let doc;

    if (raw && Array.isArray(raw.plans)) {
        doc = { activePlanId: raw.activePlanId, plans: raw.plans.map((p) => ({ ...p, terms: { ...(p.terms || {}) } })) };
    } else if (raw && raw.terms) {
        doc = { activePlanId: 'plan-1', plans: [{ id: 'plan-1', name: 'Plan 1', terms: { ...raw.terms }, updatedAt: raw.updatedAt || null }] };
    } else {
        return createPlanDocument();
    }

    if (doc.plans.length === 0) {
        doc.plans.push({ id: 'plan-1', name: 'Plan 1', terms: {}, updatedAt: null });
    }

    for (const plan of doc.plans) {
        if (!plan.id) plan.id = generateUniquePlanId(doc);
        if (!plan.name) plan.name = plan.id;

        const normalizedTerms = {};
        for (const termId in plan.terms) {
            const entry = plan.terms[termId];
            const mode = entry.mode || (entry.skipped ? 'skip' : 'normal');
            normalizedTerms[termId] = { courses: entry.courses || [], mode };
        }
        plan.terms = normalizedTerms;
    }

    if (!doc.activePlanId || !doc.plans.some((p) => p.id === doc.activePlanId)) {
        doc.activePlanId = doc.plans[0].id;
    }

    return doc;
}

function getActivePlan(doc) {
    return doc.plans.find((p) => p.id === doc.activePlanId) || doc.plans[0];
}

function createPlanInDocument(doc, name) {
    const newDoc = { activePlanId: doc.activePlanId, plans: doc.plans.map((p) => ({ ...p, terms: { ...p.terms } })) };
    const id = generateUniquePlanId(newDoc);
    newDoc.plans.push({ id, name: name || id, terms: {}, updatedAt: null });
    newDoc.activePlanId = id;
    return newDoc;
}

function duplicatePlanInDocument(doc, planId, newName) {
    const source = doc.plans.find((p) => p.id === planId);
    if (!source) return doc;

    const newDoc = { activePlanId: doc.activePlanId, plans: doc.plans.map((p) => ({ ...p, terms: { ...p.terms } })) };
    const id = generateUniquePlanId(newDoc);

    const clonedTerms = {};
    for (const termId in source.terms) {
        clonedTerms[termId] = { courses: [...source.terms[termId].courses], mode: source.terms[termId].mode };
    }

    newDoc.plans.push({ id, name: newName || `${source.name} (copy)`, terms: clonedTerms, updatedAt: new Date().toISOString() });
    newDoc.activePlanId = id;
    return newDoc;
}

function renamePlanInDocument(doc, planId, newName) {
    return {
        activePlanId: doc.activePlanId,
        plans: doc.plans.map((p) => (p.id === planId ? { ...p, name: newName } : p)),
    };
}

// Refuses to delete the last remaining plan (returns the doc unchanged).
function deletePlanFromDocument(doc, planId) {
    if (doc.plans.length <= 1) return doc;

    const remaining = doc.plans.filter((p) => p.id !== planId);
    const activePlanId = doc.activePlanId === planId ? remaining[0].id : doc.activePlanId;
    return { activePlanId, plans: remaining };
}

function setActivePlanId(doc, planId) {
    if (!doc.plans.some((p) => p.id === planId)) return doc;
    return { activePlanId: planId, plans: doc.plans };
}

// ── Plan summary (for the compare view) ───────────────────────────────
function computePlanSummary(catalog, plan) {
    const totalRequired = catalog.courses.length;
    const planned = computeCumulativePlannedSet(plan);
    const termSequence = generateTermSequence(computeMinimumTermHorizon(plan));

    let lastUsedIndex = -1;
    for (let t = 0; t < termSequence.length; t++) {
        const entry = plan.terms[termSequence[t].id];
        const hasContinuation = !!getAutoCapstoneContinuation(catalog, plan, termSequence, t);
        if ((entry && (entry.mode !== 'normal' || entry.courses.length > 0)) || hasContinuation) lastUsedIndex = t;
    }

    let termsUsedCount = 0;
    for (let t = 0; t <= lastUsedIndex; t++) {
        const entry = plan.terms[termSequence[t].id];
        const hasContinuation = !!getAutoCapstoneContinuation(catalog, plan, termSequence, t);
        if (entry && entry.mode !== 'skip' && (entry.courses.length > 0 || hasContinuation)) termsUsedCount++;
    }

    return {
        plannedCount: planned.size,
        totalRequired,
        isComplete: planned.size >= totalRequired,
        lastUsedTermLabel: lastUsedIndex >= 0 ? termSequence[lastUsedIndex].label : null,
        termsUsedCount,
    };
}

// ── Auto-scheduler ─────────────────────────────────────────────────────
// For each course, the length of the longest chain of courses that depend
// on it (0 if nothing does). Used to prioritize "unlocks more downstream
// work" courses when a term has more eligible candidates than cap allows.
function computeCourseHeights(catalog) {
    const dependents = {};
    for (const course of catalog.courses) dependents[course.code] = [];
    for (const course of catalog.courses) {
        for (const depCode of flattenCourseCodes(course.prereq)) {
            if (dependents[depCode]) dependents[depCode].push(course.code);
        }
    }

    const heights = {};
    const inProgress = new Set();

    function heightOf(code) {
        if (code in heights) return heights[code];
        if (inProgress.has(code)) return 0;
        inProgress.add(code);

        let h = 0;
        for (const dependentCode of dependents[code] || []) {
            h = Math.max(h, 1 + heightOf(dependentCode));
        }

        inProgress.delete(code);
        heights[code] = h;
        return h;
    }

    for (const course of catalog.courses) heightOf(course.code);
    return heights;
}

// Greedily fills every UNTOUCHED term (any term already present in
// plan.terms — whether it has picks or just a coop/skip mode set — is left
// exactly as-is) with as many eligible courses as the term's effective cap
// allows, capped additionally at maxPerTerm. Priority among simultaneously
// eligible candidates: courses with a longer downstream dependency chain
// first (critical-path heuristic), then courses offered in fewer terms
// (scarcer slots), then course code for determinism. This is a greedy
// heuristic, not an exhaustive optimal search — but with this catalog's
// shallow dependency depth it produces the fastest or near-fastest track.
// Pure — does not mutate the input plan. Returns the filled plan plus any
// course codes that could not be placed within a generous horizon (which
// would indicate a catalog data problem, e.g. a prereq code that doesn't
// match any course).
function generateFastestTrack(catalog, plan, maxPerTerm) {
    const updatedPlan = cloneCoursePlan(plan);
    const allCodes = catalog.courses.map((c) => c.code);
    const heights = computeCourseHeights(catalog);

    let termCount = Math.max(computeMinimumTermHorizon(updatedPlan), 12);
    let termSequence = generateTermSequence(termCount);

    for (let attempt = 0; attempt < 40; attempt++) {
        termSequence = generateTermSequence(termCount);

        for (let t = 0; t < termSequence.length; t++) {
            const term = termSequence[t];
            const existingEntry = updatedPlan.terms[term.id];
            // Skipped terms are never touched. Every other term — whether
            // it's untouched, marked coop, or already has some (but not a
            // full cap's worth of) picks — gets topped up to its cap.
            // Existing picks are always kept as-is; generation only adds on
            // top of them, it never removes or replaces a course the user
            // already chose.
            if (existingEntry && existingEntry.mode === 'skip') continue;

            const completedBefore = computeCompletedBeforeTerm(catalog, updatedPlan, termSequence, t);
            const cap = Math.min(getEffectiveCap(catalog, updatedPlan, termSequence, t), maxPerTerm);

            const picks = existingEntry ? [...existingEntry.courses] : [];
            const alreadyHere = picks.length;
            if (alreadyHere >= cap) continue; // already full — nothing more fits

            const placedSoFar = computeCumulativePlannedSet(updatedPlan);
            const staged = new Set(picks);

            while (picks.length < cap) {
                const candidates = catalog.courses
                    .filter((c) => !placedSoFar.has(c.code) && !staged.has(c.code))
                    .filter((c) => isCourseEligible(c, term.season, completedBefore, staged))
                    .sort((a, b) => {
                        const dh = (heights[b.code] || 0) - (heights[a.code] || 0);
                        if (dh !== 0) return dh;
                        const dt = a.terms.length - b.terms.length;
                        if (dt !== 0) return dt;
                        return a.code < b.code ? -1 : 1;
                    });

                if (candidates.length === 0) break;
                staged.add(candidates[0].code);
                picks.push(candidates[0].code);
            }

            if (picks.length > alreadyHere) {
                const mode = existingEntry ? existingEntry.mode : 'normal';
                updatedPlan.terms[term.id] = { courses: picks, mode };
            }
        }

        const placed = computeCumulativePlannedSet(updatedPlan);
        if (allCodes.every((c) => placed.has(c))) {
            updatedPlan.updatedAt = new Date().toISOString();
            return { updatedPlan, unplaced: [] };
        }

        termCount += 6;
    }

    const placed = computeCumulativePlannedSet(updatedPlan);
    const unplaced = allCodes.filter((c) => !placed.has(c));
    updatedPlan.updatedAt = new Date().toISOString();
    return { updatedPlan, unplaced };
}

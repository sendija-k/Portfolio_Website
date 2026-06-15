# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install      # install dependencies
npm start        # start the server at http://localhost:2000
```

Requires a `.env` file at the project root (see Admin system below). The server exits on startup if any required env var is missing.

No test runner or linter is configured.

## Architecture

This is a single-page scrolling portfolio website for a data analyst. It uses an Express backend (`server/server.js`) to serve static files and expose a small authenticated REST API for content editing.

### Data flow

Content is stored as JSON files in `data/`:
- `home-data.json` — nav, hero, about, contact, and footer content
- `projects.json` — project cards (title, metric, metricLabel, tags, github, description)
- `blog-data.json` — hidden blog content

On page load, `client/js/data-loader.js` fetches these files and passes the data to render functions in `client/js/ui-renderer.js`.

### Template system

There is no frontend framework. HTML is split into partials under `client/templates/`. `template-loader.js` fetches all partials via `fetch()` on `DOMContentLoaded` and injects them into placeholder divs before any other initialization runs. DOM element lookups must happen after `loadAllTemplates()` resolves.

Placeholders in `index.html`:
- `#header-container` → `client/templates/header.html` (sticky nav)
- `#main-content` → sections concatenated in order:
  - `client/templates/tabs/home-tab.html` (hero section)
  - `client/templates/tabs/about-tab.html` (about slab)
  - `client/templates/tabs/projects-tab.html` (projects section)
  - `client/templates/contact.html` (contact section + footer)
- `#modals-container` → all modal partials

### Page layout

The site is a scrolling single-pager with five sections: **Hero → About → Projects → Contact → Footer**. There are no tabs. `navigation.js` only handles the sticky nav's `scrolled` class (hairline border appears after 40px scroll).

### Data structures

**`home-data.json`:**
```json
{
  "nav": { "logo": "..." },
  "hero": { "eyebrow": "...", "name": "...", "tagline": "...", "skillTags": [] },
  "about": { "heading": "...", "body": [] },
  "contact": { "heading": "...", "body": "...", "links": [] },
  "footer": { "left": "...", "right": "..." }
}
```

**`projects.json`:**
```json
{
  "projects": [{
    "id": "proj-1",
    "title": "...",
    "titleBreak": "...",
    "metric": "95.1%",
    "metricLabel": "AUC Score",
    "description": "...",
    "description2": "...",
    "tags": ["Python", "Pandas"],
    "github": "https://github.com/..."
  }]
}
```

The first project in the array is rendered as a featured card; the rest become secondary cards in a 3-column grid.

### Admin system

The owner edits site content via a single gear icon (⚙) in the nav, which opens a dropdown with two options:

1. **Edit Content** (`adminHomeButton`) → home admin modal — edits hero tagline, skill tags, about body, contact body
2. **Edit Projects** (`adminProjectsButton`) → projects admin modal — add/edit/delete project cards

Admin flow:
1. Click gear → select option → check auth status via `/api/auth/status`
2. If not authenticated → open login modal (`client/js/auth.js`) → POST `/api/login` → session cookie stored server-side
3. After login → open the relevant admin modal
4. Save → POST to `/api/home` or `/api/projects` → server writes to the corresponding `data/*.json` file

**Credentials are in `.env`** (never committed to git). Required variables:
```
ADMIN_USERNAME=...
ADMIN_PASSWORD=...
SESSION_SECRET=...
```

### Hidden blog

The blog is intentionally hidden from the main navigation. It is only accessible to logged-in users via:
- Keyboard shortcut `Ctrl+J+K`
- Direct navigation to `/blog` (returns 404 if not authenticated)

The blog template is lazy-loaded on first access in `client/js/blog-shortcut.js`.

## Future additions

### Project screenshots / previews

Add actual screenshots of dashboards and visualizations to the project cards:

- Place images in `client/images/projects/`
- **Featured card** — replace the animated bar chart watermark with a dashboard screenshot at ~0.6 opacity (title sits on top). Update `project-featured-visual` in the HTML rendered by `renderFeatured()` in `ui-renderer.js`.
- **Secondary cards** — add a thumbnail image above the card content. Update `renderSecondary()` in `ui-renderer.js`.
- Add an `image` field to each project in `data/projects.json` (e.g. `"image": "/client/images/projects/crm-sales.png"`).
- The Power BI and Excel projects (CRM Sales, DS Salaries, Bike Sales) are the highest priority since their output is visual. The attrition project could use a feature importance chart or ROC curve.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install      # install dependencies
npm start        # start the server at http://localhost:2000
```

No test runner or linter is configured.

## Architecture

This is a single-page portfolio website for a data analyst. It uses an Express backend (`server/server.js`) primarily to serve static files, proxy GitHub markdown, and expose a small authenticated REST API for content editing.

### Data flow

Content is stored as JSON files in `data/` (`home-data.json`, `projects.json`, `blog-data.json`). On page load, `client/js/data-loader.js` fetches these files and passes the data to render functions in `client/js/ui-renderer.js`. Project README files are fetched from GitHub at runtime via the `/api/markdown` proxy endpoint, then parsed with `marked` and injected into the DOM.

### Template system

There is no frontend framework. HTML is split into partials under `client/templates/` (tabs and modals). `template-loader.js` fetches all partials via `fetch()` on `DOMContentLoaded` and injects them into placeholder divs (`#header-container`, `.content-panel`, `#modals-container`) before any other initialization runs. DOM element lookups must happen after `loadAllTemplates()` resolves.

### Tab navigation

Tabs (Home, About, Projects) are managed with `data-tab` attributes and `active` CSS classes in `client/js/navigation.js`. No URL changes happen on tab switch. Projects also have a submenu layer (`data-project` / `.project-button`).

### Admin system

The owner can edit site content through admin modals (gear icons in the header). Flow:

1. Click admin button → check auth status via `/api/auth/status`
2. If not authenticated → open login modal (`client/js/auth.js`) → POST `/api/login` → session cookie stored server-side
3. After login → open the relevant admin modal (home, projects, or blog)
4. Save → POST to `/api/home`, `/api/projects`, or `/api/blog` → server writes to the corresponding `data/*.json` file

Admin credentials default to `admin` / `stardew0505` but should be set via `ADMIN_USERNAME` / `ADMIN_PASSWORD` env vars in production. The session secret should also be set via `SESSION_SECRET`.

### Hidden blog

The blog tab is intentionally hidden from the main navigation. It is only accessible to logged-in users via:
- Keyboard shortcut `Ctrl+J+K`
- Direct navigation to `/blog` (shows 404 if not authenticated)

The blog template is lazy-loaded on first access in `client/js/blog-shortcut.js`.

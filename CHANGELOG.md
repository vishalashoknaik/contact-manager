# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project uses [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes (e.g. removed features, auth overhaul)
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, test improvements, minor tweaks

---

## [2.2.2] — 2026-05-10

### Fixed
- **Login: backend pre-warm on page load** — `LoginPage` now fires a silent health ping to the Render backend as soon as it mounts. On Render free tier, the server sleeps after inactivity and needs ~30 s to wake; the ping starts that process immediately, so it is usually ready by the time the user types their credentials and clicks Login.
- **Login: "warming up" notice** — If the backend ping hasn't returned within 3 s (server is cold), a yellow notice appears: *"Server is starting up — ready to log you in once it wakes."* This replaces the confusing "Cannot reach the server" failure with a clear, actionable state.
- **Login error hint expanded** to also match "cannot reach" in the error text.

---

## [2.2.1] — 2026-05-10

### Fixed
- **Production login broken on non-`vercel.app` domains**: The API URL detection only routed to the production backend when the hostname ended with `.vercel.app`. Any other deployed domain (custom domain, preview URL, etc.) silently fell back to `http://localhost:3001/api`, causing "Cannot reach the server" on real devices. Now routes to production backend for any non-`localhost` / non-`127.0.0.1` hostname.

---

## [2.2.0] — 2026-05-10

### Changed (Breaking — Data Integrity Overhaul)
- **No more dummy/default values anywhere**: The app no longer pre-populates message templates, activities, areas, or programs with hardcoded fallback data. Users must configure everything explicitly.
- **No optimistic updates in `useConfig`**: Configuration changes (activities, areas, programs) are only reflected in the UI *after* the backend confirms the write. If the save fails, the local state is unchanged.
- **All errors now surfaced to the user**: Every backend failure has a visible error message. Silent `catch` blocks removed from `saveTemplates`, `refreshCampaign`, `loadSessions`, and attendee refresh.
- **`CampaignCallScreen`**: WhatsApp and SMS links are disabled (not hidden) when no message templates are configured, with an explanatory warning. This prevents crashes on empty template arrays.
- **Attendance setup**: Config loading is now gated — the setup screen blocks until real programs/activities/areas are loaded from the backend. Shows a loading indicator and error if config fails.

### Added
- `CHANGELOG.md` — this file
- Version exposed at build time via `NEXT_PUBLIC_APP_VERSION` from `package.json`; displayed as `vX.Y.Z` in the app footer

### Fixed
- `useConfig` initial state is now `[]` (was hardcoded `['Walkathon']`, `['Area1']`, `['Program1']`), preventing phantom data appearing before the real config loads

---

## [2.1.0] — 2026-05-08

### Fixed
- **ADMIN role could not edit message templates**: `canEditTemplates` was gated to `role === 'USER'` only. Now includes `'ADMIN'`.

### Added
- 50+ regression tests for campaign template logic covering all edge/boundary cases (null, empty, corrupt, non-array templates; role visibility; template editing workflow)

---

## [2.0.0] — 2026-05-07

### Added
- **Renamed**: App renamed from "Meditators Nurturing App" to "Volunteers Coordination"
- **Campaigns module**: Full campaign management with contact call queues, call logs, volunteer assignment, and WhatsApp/SMS message templates
- **Attendance module**: Attendance session creation, attendee tracking per session, offline sync with pending record retry
- **Message templates**: Per-campaign SMS and WhatsApp templates with `{name}`, `{campaign}`, `{center}` placeholders
- **Role-based template editing**: Only `USER` (coordinator) and `ADMIN` roles can edit templates; `ATTENDANCE_TAKER` is read-only
- **Presentation**: Isha Volunteers Coordination slide deck (`Isha-Volunteers-Coordination.html`)

### Changed
- Demo credentials shown on login page instead of raw "phone = password" hint

---

## [1.5.0] — 2026-05-06

### Added
- Comprehensive test coverage for all components and hooks
- Race condition fix for contact editing

---

## [1.4.0] — 2026-05-05

### Added
- Sync status notices (pending, syncing, failed states with visible banners)
- Optimistic UI for contact add/edit with rollback on failure

---

## [1.3.0] — 2026-05-04

### Added
- Offline attendance sync: records taken offline are queued and synced when connectivity is restored
- Pending record retry mechanism with conflict detection

---

## [1.2.0] — 2026-05-03

### Added
- Message templates synced via backend API (previously localStorage-only)
- Test coverage for template features

---

## [1.1.0] — 2026-05-02

### Added
- Backend sync for activities, areas, and programs per center
- CSV import for bulk contact upload

---

## [1.0.0] — 2026-05-01

### Added
- Initial release: contact management with add, edit, filter, search
- Role-based access control (`ADMIN`, `USER`, `ATTENDANCE_TAKER`)
- Multi-center support with center selection
- PostgreSQL backend (Prisma ORM)
- JWT authentication (phone-based)
- PWA manifest for installable mobile experience

---

## How to update this file

When making a change:

1. **Bump the version** in `package.json` — follow semantic versioning:
   - Bug fix → patch (`2.2.0` → `2.2.1`)
   - New feature → minor (`2.2.0` → `2.3.0`)
   - Breaking change → major (`2.2.0` → `3.0.0`)

2. **Add a section** at the top of this file (above previous versions) using the format:
   ```
   ## [X.Y.Z] — YYYY-MM-DD
   ### Added / Changed / Fixed / Removed
   - Description of change
   ```

3. **Commit** with message: `vX.Y.Z: Short description of release`

The version is automatically read from `package.json` at build time and displayed in the app footer.

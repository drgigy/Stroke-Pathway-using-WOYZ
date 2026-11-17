# WOYZ Stroke Notes

Shared clinical notes foundation for the Stroke Pathway rebuild.

## Deployment Targets

- GitHub repository: `drgigy/Stroke-Pathway-using-WOYZ`
- Firebase project: `minutes-woyz-3`
- Firestore database: `(default)`, region `asia-south1`
- Administrator: `index.html`
- Shared review dashboard: `dashboard.html`
- Shared staff workspace: `user.html`

This application is derived from the supplied WOYZ Notes handover dated 7 November 2026. It retains dictation, review notes, editable patient timelines, printing, and browser-local Gemini key settings. Every page lists all non-deleted case entries from all dates and authors, newest creation first. OP/IP selection, Today/All switches, date navigation, the home template chooser, Anonymize, and Select credential/Layout settings are not displayed. Legacy dates, visit-type metadata, print preferences, and clinical content are preserved without data migration. No master-admin page is used.

The user page's large recording and + Note sidebar buttons are not displayed. On mobile, its top navigation contains only List. Back, Settings, and Logout sit inside the list panel; Back closes the panel without changing the selected case. Administrator and dashboard Settings/Logout controls are also inside their case-list sidebars.

The user home screen offers Start New Code 7. Each activation creates a fresh, empty shared draft with today's date and creator metadata, then opens it for editing. Existing manual drafts and cases are not reused or overwritten. The same home screen opens on desktop and mobile.

## Access

Staff browsers use Firebase Anonymous Authentication. The device UID identifies its approval request under `deviceApprovals/{uid}`. Staff enter their name and department, share their displayed code, and wait for administrator approval. Approval opens the workspace automatically. Each new browser profile requires approval. A shared browser profile shares one device identity and access. Clearing its Firebase/browser storage requires a new request.

The administrator signs in using Email/Password and must have the `admin: true` custom claim assigned through a trusted administrative environment. Public clients cannot grant this role. Device approval, blocking, revocation and unblocking are managed through the Devices control on `index.html`. Unblocking returns a device to pending. Approval is checked against the server before opening the user workspace. Offline access is locked; clinical records are not stored in the service-worker cache or a persistent Firestore cache.

`dashboard.html` provides the same notes review interface as `index.html`, without Workspace or Devices controls. It accepts Email/Password accounts in this Firebase project, including accounts added through Firebase Console Authentication. These accounts can view all shared cases, edit notes, copy, print, and mark discharge; they cannot manage device approvals or access the administrator page without the admin claim. There is no public sign-up form. Password-authenticated accounts have shared review access by design; the page is not restricted to an email allowlist. Anonymous accounts still require device approval for clinical access.

After changing the main page, run `node scripts/build-dashboard.mjs` to synchronize the dashboard layout. Its differences are limited to login access and the two omitted controls.

All approved devices can read, create, edit and delete notes in one shared collection: `workspaces/stroke/notes/{noteId}`. The notes themselves contain patient identity, visit date and type, transcription, and timeline information. Creator UID, creator name and creation timestamp are retained; changes include the latest editor UID and server timestamp. The administrator sees every author's notes and combined patient timelines. Personal credential and print-layout preferences use `users/{uid}`.

`firestore.rules` enforces device approval and administration on the server. Pending devices cannot read clinical notes, enumerate other requests, or approve themselves. A blocked device loses protected reads and writes even if it retains an older authentication token.

## Configuration

`firebase-config.js` contains the public Firebase web-app configuration for this project. Never put private keys, administrative credentials, password setup links, or service-account material in this repository. The administrator password setup file is stored privately outside the repository.

Gemini dictation requires an authorization key entered through Settings on each browser. No key is bundled. Printing remains available. Email delivery and Ask WOYZ are disabled because their original backend services belong to other applications and are not included in the handover. No original backend is contacted by this rebuild.

## Local Preview

Run `python3 -m http.server 8097 --bind 127.0.0.1` from this directory, then open `http://127.0.0.1:8097/` for administration or `http://127.0.0.1:8097/user.html` for device access. The preview connects to the configured Firebase project.

Run `node scripts/check-syntax.mjs` before publishing. Deploy Firestore rules with `firebase deploy --only firestore:rules --project minutes-woyz-3`. Publish the static root files through the repository's GitHub Pages configuration. Increment the service worker cache name when changing the shell. Cache cleanup is limited to this application's prefix.

The previous application, Git history, Firestore data, rules, and authentication exports remain backed up outside this repository in the parent project's backup directory. This foundation does not yet implement the twelve stroke-pathway forms.

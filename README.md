# WOYZ Stroke Notes

Shared clinical notes foundation for the Stroke Pathway rebuild.

## Deployment Targets

- GitHub repository: `drgigy/Stroke-Pathway-using-WOYZ`
- Firebase project: `minutes-woyz-3`
- Firestore database: `(default)`, region `asia-south1`
- Administrator case workspace: `index.html`
- Device/dashboard approval and shared-key management: `master-admin.html`
- Shared review dashboard: `dashboard.html`
- Shared staff workspace: `user.html`

This application is derived from the supplied WOYZ Notes handover dated 7 November 2026. It retains dictation, review notes, editable patient timelines, printing, and browser-local Gemini key settings. Every page lists all non-deleted case entries from all dates and authors, newest creation first. OP/IP selection, Today/All switches, date navigation, the home template chooser, Anonymize, and Select credential/Layout settings are not displayed. Legacy dates, visit-type metadata, print preferences, and clinical content are preserved without data migration. Access and key settings are managed separately in `master-admin.html`, restricted to the pinned Firebase UID of `drgigy@gmail.com` plus its existing `admin: true` claim. Other accounts cannot become master administrators through an admin claim or display name.

The user page's large recording and + Note sidebar buttons are not displayed. On mobile, its top navigation contains List and a red Home button, which returns to Start New Code 7. Back, Settings, and Logout sit inside the list panel; Back closes the panel without changing the selected case. Administrator and dashboard Settings/Logout controls are also inside their case-list sidebars.

The user home screen offers Start New Code 7. Each activation creates a fresh, empty shared draft with today's date and creator metadata, then opens the protocol reference. Existing manual drafts and cases are not reused or overwritten. The same home screen opens on desktop and mobile.

Code 7 cases open the original nine-page Rajagiri Hospital stroke protocol with filled field values, starting on page 1. A small round button showing the current page floats at the top-right of the form, just below the main toolbar, and stays in place while the form scrolls. Tapping it opens a translucent vertical overlay listing all nine page numbers and names. The original form remains visible beneath it, and the picker reserves no layout space. The list scrolls within the overlay on short screens. Selecting a page closes it; tapping outside, tapping the round button again, or pressing Escape also closes it. Page navigation alone does not write to the case. User, administrator, and dashboard views share this viewer. The supplied `Stroke_Protocol_Form.pdf` replaces the previous scanned form. `protocol/stroke-protocol.pdf` is byte-identical to that supplied file. Each page is exported as a vector SVG, preserving the supplied layout, lettering and embedded figures. `protocol.html` displays all nine exports; `protocol/source-manifest.json` records their checksums and PDF source hash. Previous assets are backed up outside the repository and remain in Git history.

Each protocol page in the user workspace offers **Start dictation** in the top bar. During capture the same bar shows Recording, Pause/Resume and Stop & transcribe, without a voice popup. Navigation to other pages/cases is locked until the take is saved, to prevent misfiling; scrolling the reference remains available. Backgrounding the app pauses capture. Microphone tracks stop when capture finishes or access is reset. Recording uses supported MediaRecorder audio formats, including MP4 on Safari. The existing browser-local authorization key is reused; master-admin includes the shared key form.

Stop & transcribe sends the captured audio and the corresponding checked field reference from `protocol-reference.js` to Gemini. It does not upload a form image or PDF and does not fetch an extra image for transcription. The nine references were checked against the supplied PDF and preserve field names and source spelling; graphical scoring examples and printed clinical orders are not treated as patient facts. The prompt uses this text only for organization, preserves dictated facts and uncertainty, omits undictated fields, and does not infer findings, scores, treatments or consent. Removing the image reduces request size and visual-processing work; actual transcription time still depends on audio length and the service. The viewer uses faithful vector exports of the supplied PDF.

Each successful output is appended atomically under `protocolDictations.pageN.take_ID` in the existing shared case document, with page number/title, author UID, server timestamp and `reviewStatus: unreviewed`. The case's existing transcription, creator metadata, other pages and prior takes are preserved. Approved dashboard users, administrators and approved devices retain the same shared-case permissions; this feature does not change Firestore rules. Admin/dashboard views show saved dictations below the matching protocol form, labelled for clinical review. The user, administrator and approved dashboard views all show the same saved field values over the supplied form. The full dictations remain below it for review.

Failed transcription retains the audio in memory for Retry transcription. Failed saves retain generated output for Retry save without resending audio; the same take ID prevents duplication after an ambiguous acknowledgement. Unsaved recordings do not survive reload/closing the tab, and the browser warns before leaving. Access reset cancels pending processing and clears the recording. Audio is not uploaded to Firebase Storage or cached by the service worker. Administrative Workspace and Devices navigation is in the case-list controls so recording controls fit the top bar on phones.

The active protocol page name is centered between Previous and Next within the top bar, on the same row as List/Home. Long titles wrap inside the available title space without adding a separate navigation row. The buttons move one page at a time, synchronize with numbered selection, and are disabled at the first and last page respectively. These controls do not modify the original forms or case data.

## Access

Staff browsers use Firebase Anonymous Authentication. The device UID identifies its approval request under `deviceApprovals/{uid}`. Staff enter their name and department, share their displayed code, and wait for administrator approval. Approval opens the workspace automatically. Each new browser profile requires approval. A shared browser profile shares one device identity and access. Clearing its Firebase/browser storage requires a new request.

The administrator signs in using Email/Password and must have the `admin: true` custom claim assigned through a trusted administrative environment. Public clients cannot grant this role. Device approval, blocking, revocation and unblocking are managed through the Devices control on `index.html`. Unblocking returns a device to pending. Approval is checked against the server before opening the user workspace. Offline access is locked; clinical records are not stored in the service-worker cache or a persistent Firestore cache.

`dashboard.html` provides the same notes review interface as `index.html`, without Workspace, Devices, or Dashboard users controls. Email/Password sign-in alone grants no clinical access. On first sign-in, a user submits a pending request under `dashboardApprovals/{uid}` and waits. The administrator opens **Dashboard users** on `index.html`, checks the email, and explicitly approves or blocks the request. Creating an account in Firebase Authentication does not approve it. No existing password accounts are automatically approved. The administrator's existing `admin: true` claim retains administrative access.

All approved dashboard users can view every shared case, edit notes, copy, print, and mark discharge, regardless of author or date. They cannot approve themselves or other accounts, list approval records, manage devices, or enter the administrator page. Revoke blocks further protected reads and writes using the existing token; the open dashboard also locks and clears its case view. Returning a blocked user to pending requires administrator action followed by explicit approval. Approval is verified with the server, and the dashboard locks offline. Anonymous staff devices retain their separate administrator approval workflow.

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

To import a replacement with the same nine-page order, run `python3 scripts/import-protocol.py /path/to/Stroke_Protocol_Form.pdf` with pypdf and Poppler installed (or pass `--pdftocairo /path/to/pdftocairo`). The importer validates page order, preserves the PDF bytes and generates self-contained SVG assets. Existing page-specific dictations keep their page IDs; this replacement makes no database, account or rules changes.

Dictation field filling uses the nine page-specific maps in `protocol-fields.js`, pinned to the supplied PDF SHA-256. Gemini receives the page reference and an exact ID/label contract and returns a complete clinical text plus only explicitly dictated field values. Unknown or duplicate IDs, invalid value types and incomplete responses are rejected before saving. Scores, intervals, checklist answers, signatures and consent are never calculated or inferred from the reference. Unspecified NIHSS timepoints and facts without a matching blank remain under Other dictated details. No form image or PDF is uploaded.

Each take stores its field values, source hash, schema version and author alongside its complete text, using the existing shared case document and approval rules. The latest explicitly supplied value for each field appears on the form; omitted fields do not erase earlier values. Earlier takes remain intact. Yes/No marks use the printed columns, completion boxes are checked only for explicit Yes, and uncertain/nonmatching details remain preserved in the stored dictation. Text fields scroll within the original field. These values require clinical review and do not create signatures.

Historical free-text takes are preserved without an extra panel beneath the form. Read-only blank form navigation does not trigger Gemini or write data.

`node scripts/check-protocol-fields.mjs` checks PDF provenance, field bounds, strict output validation and page/source isolation. `scripts/build-protocol-fields.py` documents the checked PDF-point placements; a different protocol PDF requires reviewing these positions and labels before generating a new field-map version.

## Shared dictation key

Open `master-admin.html` with the existing administrator login. Enter the Gemini key once under **Shared Gemini key → Save for approved devices**, or choose **Share this browser’s saved key** when it is already configured locally. The value is saved in the exact Firestore document `runtimeSecrets/gemini`. Only administrators may create or update it; only administrators, approved devices and explicitly approved dashboard users may get it. Collection listing is denied. The key is never written to repository files, manifests, approval records or service-worker caches.

Clients verify approval against the server before subscribing to the key document. An approved installation receives key changes automatically and stores the key in its own local storage. Managed copies are removed on lock/revocation, sign-out, offline notification or key disablement while the app is running, and are cleared before a fresh approval check at startup. A closed/offline device cannot receive a server change until it reconnects. A key delivered to a browser is readable on that device; this is deliberate client-side key distribution, not server-only secret storage. Rotate the key at its provider if an issued copy must be invalidated. Legacy manually configured browser keys remain a fallback for approved identities when no shared key is configured.

The **Devices** and **Dashboard users** management controls have moved out of `index.html` into `master-admin.html`. Master administration is opened directly through `master-admin.html`. Existing case-sharing and approval rules are otherwise unchanged.

## Phone installation

The staff app is installable from `user.html` using `manifest.webmanifest`, PNG and maskable icons, the Apple touch icon and `sw.js`. Inside **List → Install app**, Android uses its native install prompt when available; otherwise the app shows browser-specific instructions. On iPhone/iPad, open the staff page in Safari and use **Share → Add to Home Screen → Add**. Request device approval from the installed app if it has a separate browser identity. Existing administrator and dashboard pages link to the same manifest.

The service worker caches only public application files and blank protocol SVGs. It does not cache Gemini requests, Firestore responses, keys, audio or filled case records. An offline launch shows a reconnect screen; approved access, shared cases and dictation require connectivity. App updates expose an **Update app** control instead of reloading a recording.

## Master and ordinary user accounts

Only the verified `drgigy@gmail.com` UID in `roles.js`, with the existing administrator claim, may open `master-admin.html`, list/manage devices and users, or change the shared Gemini key. Firestore rules enforce the same UID restriction. Other email/password accounts use `user.html`, `index.html` (the admin case workspace), or `dashboard.html` to access the same shared cases. Master administration opens directly at `master-admin.html`; case review pages do not link to it, and direct navigation enforces the master role.

Under **Master admin → Create user**, enter the new user's email and initial password. Creation uses a temporary, memory-only Firebase Auth instance so drgigy remains signed in. The master's primary Firestore session creates the account's enabled access record before reporting success. The password is sent only to Firebase Authentication and is never stored in Firestore or case data. Users created here can sign in immediately, with no separate approval step. Existing enabled accounts and anonymous-device approvals continue to work. Explicitly blocked users remain blocked.

Account access uses the existing `dashboardApprovals/{uid}` collection for all three case pages. The user page now offers **User sign in** alongside device enrollment. Arbitrary self-created or externally created accounts without a master-issued access record do not gain patient access merely by signing in; they can request enablement under Users. Create future ready-to-use users through the master page. Both client gates and Firestore continue denying blocked/unprovisioned accounts, and live revocation clears open cases and managed keys. Ordinary enabled users may create and update shared cases but cannot manage access or change the shared key.

## Review pages

`index.html` and `dashboard.html` are review-only surfaces. They display all shared cases and the filled protocol form with page navigation. Form fields can be edited directly and autosave as preserved manual corrections. Extra field-value and dictation-history panels are hidden. The case list uses page 1 name, age and UHID. The 11 page 1 risk factors use explicit Yes/No values; unstated values remain blank. They do not configure dictation, mount microphone controls, set a recording context or offer Gemini conversion of earlier text. Their note editors are read-only; save/discharge actions and copy audit writes are disabled. Copy and print remain available where supported.

Master admin, Workspace and Install app controls are absent from review pages. Device enrollment, account creation, shared-key configuration and dictation are opened through their dedicated pages. The user workspace retains its dictation and installation controls; master admin retains its existing owner-only access. This separates page functionality without changing Firebase account permissions or shared records.

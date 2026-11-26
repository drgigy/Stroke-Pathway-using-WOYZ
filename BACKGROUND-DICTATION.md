# Case-wide background dictation — prepared, not activated

Scope: `drgigy/Stroke-Pathway-using-WOYZ`, Firebase `minutes-woyz-3` only.
`background-config.js` deliberately has `enabled:false`. Existing foreground dictation remains active. No cloud functions, storage policies, billing settings, or deployed rules were changed while preparing this feature.

## Workflow

1. Start reserves a server job for the original case and captures the current field revisions. Recording still has live waveform, Pause/Resume and Stop.
2. Stop uploads captured audio to the existing private bucket. Upload progress blocks navigation until confirmed. Failed uploads retain audio in page memory for retry; closing before acknowledgement can lose it.
3. Acknowledged upload frees the recorder and navigation immediately. Storage finalization queues a Firestore job; the worker continues independently of the device.
4. One Gemini request uses the current blank contracts for clinical pages 1,2,3,4,6,9 and all KPI fields. Explicit facts map across pages regardless of which page was open. Paper counseling/consent pages 5,7,8 are excluded.
5. Strict validators reject unknown fields, ambiguous typed dates, invalid checkbox answers and incomplete model responses. Unstated facts stay absent. Backend atomically saves the entries and completed status. Shared note listeners refresh approved clients.
6. Results retain server recording-start order. Newer recordings win when overlapping; any intervening manual correction or deliberate clear is preserved. Full dictated text remains saved in the case's existing dictation history, with skipped-field warnings for review.
7. Jobs have finite retries and leases; duplicate events cannot save twice. Failed processing can be retried from the recorder without uploading again, while audio remains available. Revoked/disabled users are checked before processing and again before commit.

This changes waiting behavior; it does not guarantee faster Gemini inference or a fixed completion time. No real clinical audio has been benchmarked for this prepared backend.

## Validation

Run `node scripts/sync-functions.mjs`, `npm ci --prefix functions --ignore-scripts`, `npm test --prefix functions`, the existing `scripts/check-*.mjs` checks and browser fixtures. Tests use synthetic records/audio and mocked Gemini. Cloud rules:test can compile candidates without publishing them.

## Activation prerequisite and scoped deployment

Run `node scripts/check-background-preflight.mjs` first. It refuses the wrong repository/project and stops when billing is disabled. Project owner must enable Blaze; do not attach a billing account automatically.

After Blaze is enabled:

1. Re-read active Firestore/Storage releases and back them up. Confirm only the new job match differs in Firestore. Storage keeps the pre-existing `/users/{uid}/...` path unchanged and adds only the reserved `/stroke-dictation/...` prefix. Back up bucket lifecycle settings and existing indexes before appending anything.
2. Create only `stroke-dictation-worker@minutes-woyz-3.iam.gserviceaccount.com`. Give this worker Firestore data access, Firebase Auth read access, and the permissions required for its Eventarc delivery. Grant object access only to `stroke-dictation/` in the existing bucket `minutes-woyz-3.firebasestorage.app`; do not grant public reads or broad access to other buckets. Configure cross-service Storage rules access to Firestore through the Firebase Storage service agent.
3. Append a seven-day audio deletion lifecycle rule for the reserved `stroke-dictation/` prefix, preserving all other lifecycle settings. Completed/cancelled jobs delete their audio immediately; failures retain it for retry. Set a 30-day TTL on `dictationJobs.expiresAt` for job metadata. Existing bucket location is us-east1; database is asia-south1.
4. Deploy only the new codebase: `firebase deploy --project minutes-woyz-3 --only functions:stroke-background`. Callable/Firestore workers use asia-south1, Storage finalization uses us-east1. Dedicated service account, instance caps, timeouts and retry bounds are in `functions/index.js`. Do not delete or replace other functions.
5. Publish the tested candidate rules and append the `dictationJobs` createdBy/createdAt index in this project only. Wait for the index to be ready. Do not blindly replace indexes added after this snapshot.
6. Exercise a synthetic approved account/case on the deployed backend: upload, leave the case, close client, cross-page fill, manual correction during processing, duplicate delivery, retry and revocation. Verify reserved audio is not downloadable by clients and is deleted after completion. Remove only the synthetic artifacts created for this check.
7. Only then change `background-config.js` to enabled:true, bump the app cache version and publish to the same repository. Confirm live hashes and installed-PWA updates. Blank form cache stays at the same form revision.

Runtime key stays in the existing `runtimeSecrets/gemini` record; never place credentials in source, uploads, job records or logs. Existing key management/access is otherwise unchanged. Service worker caches blank app assets/forms only, never clinical audio or job/API responses.

## Rollback

Disable the frontend flag and publish a new app-cache version to return to foreground dictation. Already acknowledged jobs remain durable and should finish; do not delete their audio or jobs as part of UI rollback. Restore only backed-up rules/resources for this feature after pending work is resolved. Never alter another repository or Firebase project.

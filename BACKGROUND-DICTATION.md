# Case-wide background dictation — active

Scope: `drgigy/Stroke-Pathway-using-WOYZ`, Firebase `minutes-woyz-3` only.
`background-config.js` is enabled after deployment and synthetic live checks on 2026-11-26. Five functions, job/audio rules, the job query index, prefix-only audio lifecycle and job TTL are active in this project. All other repositories and Firebase projects were untouched.

Live verification covered approved account/device shared access, denied unapproved access and forged job updates, cross-page extraction to pages 1/2/3/6/9 and KPI fields, paper-form exclusion, a manual correction made after recording began, original-case isolation, duplicate confirmation, private audio removal and revocation before commit. Temporary synthetic cases, accounts, jobs and audio were cleaned up. Mobile fixture tests cover navigation after upload, retry, reload and access loss.

The worker's conditional Storage role is bound at project level with an exact bucket/audio-prefix condition, preserving the bucket's existing ACL mode. Private event receivers grant invocation only to the dedicated worker account. Storage checks one provider-appropriate approval record plus the reserved job, staying within its two-document rules limit. Completed audio is deleted from active storage; the bucket's pre-existing seven-day soft-delete recovery policy is unchanged.

## Workflow

1. Start reserves a server job for the original case and captures the current field revisions. Recording still has live waveform, Pause/Resume and Stop.
2. Stop uploads captured audio to the existing private bucket. An upload progress bar replaces the recording controls and blocks navigation until confirmed. A short “Uploaded. You can continue your work” confirmation then disappears after three seconds, leaving the compact Start button for the next recording. Failed uploads retain audio in page memory for retry; closing before acknowledgement can lose it.
3. Acknowledged upload frees the recorder and navigation immediately. Storage finalization queues a Firestore job; the worker continues independently of the device.
4. One Gemini request uses the current blank contracts for clinical pages 1,2,3,4,6,9 and all KPI fields. Explicit facts map across pages regardless of which page was open. Paper counseling/consent pages 5,7,8 are excluded.
5. The complete minimally edited transcript is copied directly into page 3 Stroke Consultant Comments; no separately generated summary is used. New narrative takes append in server recording order, including when jobs finish out of order. Existing manually reviewed comments remain a base, and later manual replacements or clears take precedence over older pending recordings. Structured fields still receive matching facts independently. The response contract constrains field IDs separately for each clinical page; earlier in-flight array responses remain readable. Strict validators reject unknown fields, ambiguous typed dates, invalid checkbox answers and incomplete model responses. Unstated facts stay absent. Backend atomically saves the entries and completed status. Shared note listeners refresh approved clients.
6. Results retain server recording-start order. Newer recordings win when overlapping; any intervening manual correction or deliberate clear is preserved. Full dictated text remains saved in the case's existing dictation history, with skipped-field warnings for review.
7. Recordings with no intelligible speech finish as `no_speech`, without writing case fields or showing a processing retry. The client briefly shows “No speech detected” and clears it automatically. Their audio is removed from active storage. Brief/quiet intelligible speech remains valid dictation. Jobs have finite retries and leases; duplicate events cannot save twice. Failed processing can be retried from the recorder without uploading again, while audio remains available. Revoked/disabled users are checked before processing and again before commit.

This changes waiting behavior; it does not guarantee faster Gemini inference or a fixed completion time. Live testing used synthetic audio; real clinical latency has not been benchmarked.

## Validation

Run `node scripts/sync-functions.mjs`, `npm ci --prefix functions --ignore-scripts`, `npm test --prefix functions`, the existing `scripts/check-*.mjs` checks and browser fixtures. Tests use synthetic records/audio and mocked Gemini. Cloud rules:test can compile candidates without publishing them.

## Activation prerequisite and scoped deployment

Run `node scripts/check-background-preflight.mjs` first. It refuses the wrong repository/project and stops when billing is disabled. Project owner must enable Blaze; do not attach a billing account automatically.

After Blaze is enabled:

1. Re-read active Firestore/Storage releases and back them up. Confirm only the new job match differs in Firestore. Storage keeps the pre-existing `/users/{uid}/...` path unchanged and adds only the reserved `/stroke-dictation/...` prefix. Back up bucket lifecycle settings and existing indexes before appending anything.
2. Create only `stroke-dictation-worker@minutes-woyz-3.iam.gserviceaccount.com`. Give this worker Firestore data access, Firebase Auth read access, and the permissions required for its Eventarc delivery. Grant object access only to `stroke-dictation/` in the existing bucket `minutes-woyz-3.firebasestorage.app`; do not grant public reads or broad access to other buckets. Configure cross-service Storage rules access to Firestore through the Firebase Storage service agent. Grant `roles/run.invoker` directly to this worker account on the two private services `queuestrokedictationupload` (us-east1) and `processstrokedictation` (asia-south1); never make these event receivers public.
3. Append a seven-day audio deletion lifecycle rule for the reserved `stroke-dictation/` prefix, preserving all other lifecycle settings. Completed/cancelled jobs delete their audio immediately; failures retain it for retry. Set a 30-day TTL on `dictationJobs.expiresAt` for job metadata. Existing bucket location is us-east1; database is asia-south1.
4. Deploy only the new codebase: `firebase deploy --project minutes-woyz-3 --only functions:stroke-background`. Callable/Firestore workers use asia-south1, Storage finalization uses us-east1. Dedicated service account, instance caps, timeouts and retry bounds are in `functions/index.js`. Do not delete or replace other functions.
5. Publish the tested candidate rules and append the `dictationJobs` createdBy/createdAt index in this project only. Wait for the index to be ready. Do not blindly replace indexes added after this snapshot.
6. Exercise a synthetic approved account/case on the deployed backend: upload, leave the case, close client, cross-page fill, manual correction during processing, duplicate delivery, retry and revocation. Verify reserved audio is not downloadable by clients and is deleted after completion. Remove only the synthetic artifacts created for this check.
7. Only then change `background-config.js` to enabled:true, bump the app cache version and publish to the same repository. Confirm live hashes and installed-PWA updates. Blank form cache stays at the same form revision.

Runtime key stays in the existing `runtimeSecrets/gemini` record; never place credentials in source, uploads, job records or logs. Existing key management/access is otherwise unchanged. Service worker caches blank app assets/forms only, never clinical audio or job/API responses.

## Rollback

Disable the frontend flag and publish a new app-cache version to return to foreground dictation. Already acknowledged jobs remain durable and should finish; do not delete their audio or jobs as part of UI rollback. Restore only backed-up rules/resources for this feature after pending work is resolved. Never alter another repository or Firebase project.

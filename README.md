# WOYZ Stroke - shared KPI workspace

Repository: `drgigy/Stroke-Pathway-using-WOYZ`.
Firebase project: `minutes-woyz-3`.
Production: https://code7.codestroke.in/

## Entry points

- `user.html`: approved staff/device workspace, shared cases and voice input.
- `index.html`: shared case review and direct field corrections, without recording.
- `dashboard.html`: the same review workflow for approved email/password accounts.
- `master-admin.html`: drgigy-only account/device approvals and shared Gemini key management.

## Admin layout

The review entry points use the uploaded Stroke handover's visual layout and original stylesheet, preserved as `admin-reference.css`. A full-width Rajagiri Stroke Code header and fixed bottom navigation replace the former notes sidebar. Home shows shared-case counts and recent cases; Cases provides search and date/treatment filters; Dashboard provides a horizontally scrollable timings table and print view; KPI opens all 24 indicators and shared monthly inputs without requiring a selected patient; Analysis provides KPI trends and individual recorded-event timelines; More contains Settings and Logout. Selecting a case opens the six sections: editable on review pages and voice input on the user page. Neither review entry point offers recording, user-workspace links, installation controls, or device management. The user page uses this same layout, with Start New Code 7 on Home and Start dictation, Pause/Resume and Stop & transcribe in the selected case top bar. The monthly aggregate report has no dictation target. Device and approved account sign-in remain available; all approved identities share the same case collection. Install controls are under More.

Source styling is reused, not the handover's Firebase configuration, PIN, records or application initialization. The current project's shared data model, calculation code and approval boundaries are retained.

## Six sections

1. Patient and admission: identity and the episode/diagnosis fields needed to determine KPI populations.
2. Assessment and imaging: first imaging, neurological assessment, dysphagia documentation and imaging-service waiting times.
3. IVT / EVT: explicit treatment indications, treatment received, relevant timestamps and final reperfusion grade.
4. Complications and procedures: only outcomes, evidence, observation status, procedures and event counts used by the 24 indicators.
5. Rehabilitation and follow-up: referral/assessment, speech-therapy reassessment and 90-day outcome.
6. KPI results: monthly shared cohort, 24 indicators, missing information, hospital inputs and CSV export.

Questions appear conditionally when the relevant fact is explicitly supplied. Name/UHID and optional age identify a case. Risk-factor tables, detailed examination prose, routine vital signs, consent/signatures, drug doses and notification/transfer stages are not requested in the KPI workflow. No clinical finding or negative is defaulted from a blank.

## Voice and review

Staff use Start dictation, Pause/Resume and Stop & transcribe in the existing top bar. There is no voice popup. Each section supplies Gemini an exact typed field contract; section 6 can capture missing patient fields across sections. Dates/times require an unambiguous ISO timezone. Today/yesterday are anchored to the recording date in Asia/Kolkata; a bare clock time without a date or AM/PM is retained as uncertainty rather than guessed. Unrecognized IDs, wrong-section values, invalid dates, invalid choices and invalid numbers are rejected before any save.

Gemini extracts explicitly spoken facts and a faithful transcript. JavaScript calculates KPI numerators, denominators and elapsed times. Gemini does not calculate KPIs, infer indications, sign consent or assume No/zero. Stored uncertainty appears under Details needing clarification. The user view shows field values; review pages support direct correction/autosave and an optional source-dictation dialog.

Recording stays attached to the selected case/section. Navigation is blocked while recording or retryable work is pending. Access termination releases the microphone and clears the visible workspace. Pending KPI input is held only in memory during a transient connection/verification loss. Recover pending input becomes available only after fresh access verification by the same UID; it restores the original case and section. Logout, identity change or explicit revocation discards this recovery state. No audio is written to local storage or the service-worker cache. A removed case invalidates an active recording, and transactional saves check that the case still exists and is not deleted. Failed transcription/save retains retry state while the page remains open. Firestore transactions require a live connection; an offline edit is not represented as a confirmed server save.

## Persistence and compatibility

Existing shared collection and authentication rules are retained. Case documents remain at `workspaces/stroke/notes/{caseId}`. New typed facts append immutable `kpiEntries/{entryId}` map entries with author, server timestamp, recorded timestamp, section, source/version, fields, transcript and warnings. Manual clears are explicit entries; omitted dictated fields do not erase existing values. Creator metadata and previous records are not rewritten.

Only legacy name/age/UHID can be reused automatically. Clinical facts from the old PDF fields are not treated as verified KPI facts. Previous nine-page records remain accessible through View previous protocol form, as a read-only archive, with existing navigation and zoom. The source PDF/SVG assets are unchanged.

Shared hospital monthly inputs are stored as reserved documents `workspaces/stroke/notes/kpi-month-YYYY-MM`, with `noteType: kpi-monthly`. They use the same approved shared-access boundary and are excluded from patient lists. Monthly values are medication-error opportunities, thrombolytic stock-out instances, number of formulary thrombolytics and stroke-unit patient-days. They are not duplicated in individual patient records or saved only in browser storage. Concurrent creation uses a transaction and preserves the first creator.

Monthly reports group records by admission month, otherwise arrival month, in Asia/Kolkata. A draft with no episode timestamp provisionally uses its creation visit date; unknown eligibility is not silently counted as a confirmed admission. Later outcomes update the original episode cohort. The reporting screen discloses this cohort policy; agree a different institutional reporting policy before changing date allocation. Genuine relevant admissions/procedure cases must be entered even when there was no Code 7 activation; a draft alone never establishes denominator membership.

## NABH definition limits

The mapping is based on the user-supplied nine-page *NABH Certification Standards for Stroke Centre*, first edition September 2023, Annexure 1, printed pages 61-69. Source key: `nabh-stroke-2023-v1`.

The supplied document is internally ambiguous for indicators 1, 3, 4, 6, 13, 16, 18, 23 and 24. These display provisional counts and a Definition needs clarification status with no final rate. The application does not silently substitute assumptions from the handover app:

- KPI 1 prints a time average multiplied by 100.
- KPIs 3/18 say 24 hours in the formula but 36 hours in remarks.
- KPI 4 does not define the initial timing baseline.
- KPI 6 mixes referral with assessment and an organization-defined referral window.
- KPI 13 omits a ratio/percentage multiplier.
- KPI 16 omits its denominator.
- KPI 23 mixes 120/150 minutes and eligibility/denominator language.
- KPI 24's printed denominator is all ischemic strokes, while its narrative describes treated LVO; its formula also prints =60 versus narrative <=60.

KPI 21 follows the printed denominator of all ischemic stroke patients, not only patients receiving EVD. Exact time boundaries use milliseconds before rate display rounding; timestamp inputs and displayed values retain seconds. Explicit follow-up completeness is required for negative time-window outcomes. NIHSS/imaging evidence is captured for qualifying symptomatic hemorrhage. The 90-day outcome records the actual follow-up date and onset date; no onset clock time is requested solely for that KPI. no undictated score is inferred.

## Access and PWA

The existing owner UID and claim checks in `roles.js`, approved device access and dashboard approval records are unchanged. Other accounts created by master admin receive their existing immediate approved shared access. Review versus dictation is a page-mode distinction, not a new Firebase role: approved users can open the authorized review page. The handover's Firebase project, browser PIN and device IDs are not copied.

`runtimeSecrets/gemini` remains protected by the existing rules. No private key is included in source. PWA identity and start URL are retained; the service-worker cache version includes the new workflow modules. Case review pages remain free of recording, Workspace, Master admin and Install app controls.

## Validation

Run:

```sh
node scripts/check-syntax.mjs
node scripts/check-kpi.mjs
node scripts/check-kpi-data.mjs
node scripts/check-protocol-fields.mjs
```

The pure tests cover all 24 indicators, missing eligibility, exact time boundaries, follow-up completeness, explicit zeros, source ambiguities, typed extraction, leading-zero UHID, source/version isolation and legacy identity-only fallback. Local browser QA uses synthetic cases and mocked Firebase/Gemini; it does not read real patient data. A Git bundle of the previous version was saved outside the repository before this restructuring. No Firestore rule deployment or data migration is needed for this version.

Imported cases preserve explicit KPI inclusion/exclusion. Imported records with no inclusion decision remain available in Cases but await confirmation before entering aggregate reports. Reviewers can change Include case in KPI reporting in Patient and admission. Import provenance contains source IDs and field mapping, never authentication keys. Patient exports and private import reports are kept outside the public repository.

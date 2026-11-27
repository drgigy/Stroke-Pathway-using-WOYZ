# WOYZ Stroke - shared KPI workspace

Repository: `drgigy/Stroke-Pathway-using-WOYZ`.
Firebase project: `minutes-woyz-3`.
Production: https://code7.codestroke.in/

## Entry points

- `user.html`: approved account workspace, shared cases and voice input.
- `index.html`: shared case review and direct field corrections, without recording.
- `dashboard.html`: the same review workflow for approved email/password accounts.
- `master-admin.html`: drgigy-only account approvals and shared Gemini key management.

## Admin layout

The review entry points use the uploaded Stroke handover's visual layout and original stylesheet, preserved as `admin-reference.css`. A full-width Rajagiri Stroke Code header and fixed bottom navigation replace the former notes sidebar. Home shows case actions and recent cases; Cases provides search and date/treatment filters; Dashboard provides a horizontally scrollable timings table and print view; KPI opens all 24 indicators and shared monthly inputs without requiring a selected patient; Analysis provides KPI trends and individual recorded-event timelines; More contains Settings and Logout. Selecting a case opens the Stroke Protocol Form. Two side-by-side tabs switch between that form and Other Parameters, which lists the five patient parameter sections. Review pages support direct corrections; the user page supports voice input. Neither review entry point offers recording, user-workspace links, installation controls, or device management. The user page uses this same layout, with Start New Code 7 on Home and Start dictation beside the Rajagiri Stroke Code brand. Start opens a floating recorder with Pause/Resume and Stop & transcribe. The monthly aggregate report has no dictation target. User, Admin and Dashboard use one approved email/password account and Firebase local persistence. Returning in the same browser restores the session; Logout also notifies other open app tabs. Legacy anonymous device sessions require one account sign-in. All approved accounts share the same case collection. Install controls are under More.

Source styling is reused, not the handover's Firebase configuration, PIN, records or application initialization. The current project's shared data model, calculation code and approval boundaries are retained.

## Patient parameters and shared reporting

1. Patient and admission: identity and the episode/diagnosis fields needed to determine KPI populations.
2. Assessment and imaging: first imaging, neurological assessment, dysphagia documentation and imaging-service waiting times.
3. IVT / EVT: explicit treatment indications, treatment received, relevant timestamps and final reperfusion grade.
4. Complications and procedures: only outcomes, evidence, observation status, procedures and event counts used by the 24 indicators.
5. Rehabilitation and follow-up: referral/assessment, speech-therapy reassessment and 90-day outcome.
The main KPI tab contains the monthly shared cohort, all 24 indicators, missing information, hospital inputs and CSV export. It is not a section inside an individual patient case.

Questions appear conditionally when the relevant fact is explicitly supplied. Name/UHID and optional age identify a case. Risk-factor tables, detailed examination prose, routine vital signs, consent/signatures, drug doses and notification/transfer stages are not requested in the KPI workflow. No clinical finding or negative is defaulted from a blank.

## Voice and review

Staff press Start dictation in the brand header to open a floating recorder. A Web Audio analyser draws the actual microphone waveform, using a small noise gate for a flat silent baseline; paused input is flat. There is no synthetic waveform animation. Pause changes to Resume. Stop & transcribe closes the microphone and processes the captured audio. The timer excludes paused time and continues while the recorder is minimized. Minimizing leaves a visible Recording/Paused header button to reopen it; it does not discard the capture. Each section supplies Gemini an exact typed field contract; the Other Parameters menu can capture missing patient fields across sections. Dates/times require an unambiguous ISO timezone. Today/yesterday are anchored to the recording date in Asia/Kolkata; a bare clock time without a date or AM/PM is retained as uncertainty rather than guessed. Unrecognized IDs, wrong-section values, invalid dates, invalid choices and invalid numbers are rejected before any save.

Gemini extracts explicitly spoken facts and a faithful transcript. JavaScript calculates KPI numerators, denominators and elapsed times. Gemini does not calculate KPIs, infer indications, sign consent or assume No/zero. Stored uncertainty appears under Details needing clarification. The user view shows field values; review pages support direct correction/autosave and an optional source-dictation dialog.

Recording stays attached to the selected case/section. Navigation is blocked while recording or retryable work is pending. Access termination releases the microphone and clears the visible workspace. Pending form and KPI input is held only in memory during a transient connection/verification loss. Recover pending input becomes available only after fresh access verification by the same UID; it restores the original case and section. Logout, identity change or explicit revocation discards this recovery state. No audio is written to local storage or the service-worker cache. A removed case invalidates an active recording, and transactional saves check that the case still exists and is not deleted. Failed transcription/save retains retry state while the page remains open. Firestore transactions require a live connection; an offline edit is not represented as a confirmed server save.

## Persistence and compatibility

Existing shared collection and authentication rules are retained. Case documents remain at `workspaces/stroke/notes/{caseId}`. New typed facts append immutable `kpiEntries/{entryId}` map entries with author, server timestamp, recorded timestamp, section, source/version, fields, transcript and warnings. Manual clears are explicit entries; omitted dictated fields do not erase existing values. Creator metadata and previous records are not rewritten.

Existing PDF facts are preserved. Legacy clinical PDF entries are not automatically relabeled as verified KPI evidence. New form dictation extracts two separately validated maps in one Gemini request: fields belonging to the selected PDF page and explicitly spoken typed KPI facts. Both append to the same case in one Firestore transaction. Retrying an acknowledged-lost save returns the existing entries without changing their timestamps. Common patient identity corrections synchronize between the form and KPI capture. The original nine-page PDF/SVG source is retained for compatibility; the six clinical sheets are available in page selection and zoom. Review pages can edit the form directly; user fields are filled by dictation.

Shared hospital monthly inputs are stored as reserved documents `workspaces/stroke/notes/kpi-month-YYYY-MM`, with `noteType: kpi-monthly`. They use the same approved shared-access boundary and are excluded from patient lists. Monthly values are medication-error opportunities, thrombolytic stock-out instances, number of formulary thrombolytics and an optional stroke-unit patient-day override. They are not duplicated in individual patient records or saved only in browser storage. Concurrent creation uses a transaction and preserves the first creator.

Monthly reports group records by admission month, otherwise arrival month, in Asia/Kolkata. A draft with no episode timestamp provisionally uses its creation visit date; unknown eligibility is not silently counted as a confirmed admission. Later outcomes update the original episode cohort. The reporting screen discloses this cohort policy; agree a different institutional reporting policy before changing date allocation. Genuine relevant admissions/procedure cases must be entered even when there was no Code 7 activation; a draft alone never establishes denominator membership.

## KPI calculation reference

The owner supplied Stroke-Clone-Handover-2026-11-24.zip to resolve the earlier document-definition ambiguities. The current calculation profile is `rajagiri-handover-20261124-v1`; all 24 formulas, denominators, parameters, source fingerprint and intentional safeguards are documented in [KPI-REFERENCE.md](KPI-REFERENCE.md) and `kpi-policy.js`. Reports, analysis and CSV exports show the chosen definition/profile. This is a hospital operational reference, not a claim of new NABH certification.

Key definitions: imaging/neurological assessment/waiting averages are minutes without ×100; inpatient neurological assessment starts at recognition; rehabilitation assessment is ≤48 hours; DVT uses ×100; falls use ×1000 per stroke-unit patient-days; EVD ventriculitis uses ischemic EVD patients; LVO first-pass success uses ≤150 minutes in the numerator; puncture-to-reperfusion success uses an EVT-treated denominator and ≤60 minutes. The owner explicitly confirmed that sICH after IVT uses IVT-treated patients only, correcting the archived code's eligible-or-treated union for this complication measure.

Only explicit Include in KPI reporting = Yes enters the cohort. Unknown inclusion remains visible as pending in Cases. Missing clinical facts remain pending rather than No/zero; strict timestamps and completed negative follow-up remain required. No LVO suspicion or treatment timestamp is used to invent an ischemic diagnosis, treatment or eligibility. Exact time boundaries are checked before display rounding. Older clinical/audit fields and existing case entries remain readable; no Firestore migration or patient-record rewrite is performed.

Stroke-unit patient-days derive from documented unit admission/discharge timestamps (ceiling days, minimum one per stay); the existing monthly total remains an explicit override. Empty stay timestamps are not treated as zero. New fields support voice input and direct review corrections. A 90-day mRS explicitly recorded as such belongs in the 90-day assessment denominator without an additional exact-calendar-day restriction.

## Access and PWA

The existing owner UID and claim checks in `roles.js`, dashboard approval records remain the shared-access authority. Device approval records no longer grant clinical access and are retained as read-only history for the owner. Other accounts created by master admin receive their existing immediate approved shared access. Review versus dictation is a page-mode distinction, not a new Firebase role: approved users can open the authorized review page. The handover's Firebase project, browser PIN and device IDs are not copied.

`runtimeSecrets/gemini` remains protected by the existing rules. No private key is included in source. PWA identity and start URL are retained; the service-worker cache version includes the new workflow modules. Case review pages remain free of recording, Workspace, Master admin and Install app controls.

## Validation

Run:

```sh
node scripts/check-syntax.mjs
node scripts/check-kpi.mjs
node scripts/check-kpi-reference.mjs
node scripts/check-kpi-data.mjs
node scripts/check-protocol-fields.mjs
node scripts/check-dictation-output.mjs
```

The pure tests cover all 24 indicators, missing eligibility, exact time boundaries, follow-up completeness, explicit zeros, source ambiguities, typed extraction, leading-zero UHID, source/version isolation and legacy identity-only fallback. Local browser QA uses synthetic cases and mocked Firebase/Gemini; it does not read real patient data. A Git bundle of the previous version was saved outside the repository before this restructuring. No Firestore rule deployment or data migration is needed for this version.

Imported cases preserve explicit KPI inclusion/exclusion. Imported records with no inclusion decision remain available in Cases but await confirmation before entering aggregate reports. Reviewers can change Include case in KPI reporting in Patient and admission. Import provenance contains source IDs and field mapping, never authentication keys. Patient exports and private import reports are kept outside the public repository.

New Code 7 drafts open page 1 of Stroke Protocol Form by default. Other Parameters offers Patient and admission, Assessment and imaging, IVT / EVT, Complications and procedures, Rehabilitation and follow-up, with KPI results available separately from the main KPI tab. Switching tabs, pages, cases or navigation is blocked while recording or retryable work is pending. Admin remains free of recording controls.

After approval, the PWA warms a versioned local cache of the six active blank protocol SVG pages. Forms are served from that cache first; the form cache is keyed to the protocol revision, so interface updates retain it. A new protocol revision replaces its form cache and approved sessions warm the replacement. Patient records, Gemini requests, keys and audio are excluded. Shared records and dictation still require online access.

Admin review pages offer Print filled form for the selected shared case. It prints only the six clinical protocol pages (original pages 1, 2, 3, 4, 6 and 9) in A4 portrait with saved values and vector ticks. Counselling and both consent pages are excluded from printing. Values fit inside their original form cells; no continuation or extra summary sheet is appended. Unsaved/pending work blocks printing. Prepared print data stays in memory, is removed after printing or navigation/access loss, and is not stored in the static cache.

On the user page, Home contains only Start New Code 7. Inside an opened case, Stroke pathway and KPI parameters switch the content; Pages opens the six-page overlay, including when invoked from the parameter view. The user form has no separate previous/next navigator row or floating green selector. Admin navigation and printing remain available. The compact recorder places Pause/Resume, timer-over-waveform and Stop in one row. Drag the waveform/timer area to move it; arrow keys move it and Home resets its position. Positions are held only in memory and clamped on viewport changes. Stop still transcribes and saves the same captured case/page.

User case workspace: the brand header is hidden while a case is open. Stroke pathway, KPI parameters and Pages form the top row. A persistent, movable bottom recorder starts with Start, switches to Pause/Resume + live waveform/timer + Stop, and returns to Start after saving. Home and review pages retain their existing header.

Dictation request latency (25 November 2026): repeated per-field instructions are factored into shared rule sets and cached as blank-form contracts in memory. Expanding them reproduces every original ID, label, choice, condition and instruction exactly. No fields, audio detail, model capability or output validation are removed. Contracts and the Gemini connection are prepared while recording; local encoding and access-key resolution overlap after Stop. PDF and KPI results still validate and save atomically before being shown as saved.

`node scripts/check-dictation-request.mjs` verifies lossless contracts for all nine pages and all parameter sections. `protocolDictationTimings()` from `protocol-dictation.js` provides the last attempt's capture, key-resolution, encoding, Gemini request, validation, save and total durations plus byte/attempt counts, in memory only. It contains no patient facts, IDs, keys or audio and is cleared when access ends. Request-size reduction is not a measured reduction in Gemini response time; actual latency depends on recording length, network and provider load.

Protocol template revision 2 (25 November 2026) removes TSH from the page-1 blood urea/creatinine label and adds Patient on anticoagulation to the empty page-6 non-treatment row. The source PDF and only the page-1/page-6 SVGs change; the other seven SVGs remain byte-identical. Source provenance and both approved edits are recorded in protocol/source-manifest.json. The previous PDF fingerprint/version is explicitly recognized for read-only merging of existing entries; its laboratory ID maps to urea_creatinine, with no Firestore rewrite. New anticoagulation reason entries require revision 2; legacy and unrelated sources cannot fabricate the new field. Dictation must explicitly state anticoagulation as a non-treatment reason; medication use alone does not establish it.

## Background dictation

Case-wide extraction and durable server processing are active in `minutes-woyz-3`. After upload acknowledgement, staff can navigate or record again while the server fills the original shared case. Newer manual corrections are protected; paper consent/counseling forms are excluded. See [BACKGROUND-DICTATION.md](BACKGROUND-DICTATION.md) for architecture, validation, deployment details and rollback.

Stroke Consultant Comments retain the complete minimally edited dictation, copied directly from the transcript while relevant facts also populate structured form/KPI fields. New recordings append in recording order. Manual corrections replace earlier narrative text and remain protected from delayed older jobs. Existing records are not rewritten.

Active form navigation contains six sheets: Stroke Protocol Form, Quality Assessment Timings, Radiology Form, mRS / ASPECTS, Thrombolytic Checklist and NIHSS. The viewer labels them 1–6, while saved field identifiers retain original source page IDs 1,2,3,4,6,9. Counselling and both consent sheets are excluded from viewing, standalone HTML, printing and form prefetch. The original source PDF and field contracts remain unchanged for historical compatibility.

On Android and iPhone, a horizontal swipe at the fully fitted form scale navigates between these six sheets. Zoomed forms retain horizontal/vertical panning. Case-wide background recording can continue during a page swipe; the recording remains bound to its original case. Upload/save transitions and unsaved review edits still prevent page changes.

Protocol template revision 3 (27 November 2026) adds First Pass Time and Recanalization Time to Quality Assessment Timings. Door to imaging uses scan start minus ER arrival; door to needle uses IVT start minus ER arrival; first-pass and recanalization intervals use their respective new event timestamps minus ER arrival. These four values are derived at rendering/printing time and cannot be entered or extracted as independent facts, so corrected source times cannot leave stale durations. Ambiguous, missing, mixed dated/undated, invalid or reversed times stay blank; explicit dates support midnight crossings. No overnight date is assumed. The original page IDs and historical revision-1/2 data remain supported, with only the page-2 SVG and source PDF revised.

Stroke Consultant Comments contain only explicitly identified consultant remarks, minimally edited, not the general patient narrative. The complete transcript remains in case history. Earlier automatic full-transcript copies are omitted from the comments view without rewriting/deleting stored entries; manual comments remain visible. New consultant-only entries append in recording order and preserve later manual corrections.

Dashboard opens on All dates and keeps its date/treatment filters separate from Cases. Existing typed KPI times take precedence, including explicit manual clears. Where a separate KPI time is absent, saved Quality Assessment Timings form values are shown as reference only; they do not change reporting inclusion or become KPI evidence. Missing, mixed dated/undated or reversed event times remain Pending. Door to recanalization is included alongside the other dashboard intervals. Run `node scripts/check-dashboard-data.mjs` to verify the display projection and its ambiguity/clear safeguards.

KPI parameters now opens a single continuous list instead of five section cards. Each non-identity KPI field appears once; name, age and UHID remain in the Stroke pathway form. User dictation receives the complete KPI contract and shows conditional cues without requiring section navigation. Review pages retain in-place KPI corrections and their existing applicability rules; each correction keeps its original field-section provenance. Shared case storage, background case-wide extraction and all 24 calculation definitions are unchanged.

Dashboard intervals with mixed dated KPI and clock-only form sources use paired form clocks only when each dated KPI endpoint agrees with its corresponding form clock. Conflicts, explicit clears, missing paired clocks and reversed clocks remain Pending. This is a reference display fallback and does not assign an event date or alter KPI evidence.

Stroke pathway / KPI cross-check (27 November): explicit same-meaning form values now feed a read-time KPI projection. Valid full event datetimes, exact confirmed diagnosis labels, documented start/first-pass events, final TICI and completed initial screening are reused. KPI parameters initially hides matching captured values; Show captured details retains review access. Only fields used by the 24 definitions, their applicability helpers and optional pressure-ulcer baseline are requested; obsolete capture-only acute-stroke/onset/referral/follow-up-date prompts are not repeated. Missing dates, uncertain diagnoses, treatment decisions, generic sICH/LVO and discharge mRS are not silently converted into different clinical facts. Manual clears and newer form corrections are respected, disagreements remain visible, and no stored entries are rewritten. KPI readiness lists missing patient and monthly inputs; all 24 checks remain available, with inapplicable indicators distinguished from zero. See the field-by-field audit in KPI-REFERENCE.md.

The 27 November printable KPI supplement removes two remaining nonessential prompts: a separate Admitted Yes/No question (the actual admission timestamp remains available), and optional baseline pressure-ulcer staging. Stored baseline values remain readable and correctable in review via Show captured details, and retain conflict checking. The patient dictation questionnaire groups conditional follow-up questions; monthly hospital inputs are recorded separately. Existing fields and data are not deleted.

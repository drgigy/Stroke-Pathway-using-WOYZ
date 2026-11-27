# KPI calculation reference adopted on 27 November 2026

The owner supplied Stroke-Clone-Handover-2026-11-24.zip as the hospital calculation reference. The archive describes drgigy/Stroke commit feff4aa3cfa985f3996aa1917c79754dfd4f9799. Its source/app.js SHA-256 is 3178af409afb1120e5b8f88fa253ec766a59b3ec652694d7f14210fb394f8943. Only calculation definitions/parameters were adopted; none of the archived app's Firebase configuration, authentication, PIN/device logic, storage behavior or patient records were imported. The existing repository/project/access model is unchanged.

This profile is a hospital operational interpretation, not a claim that the reference implementation resolves every ambiguity in the separately supplied NABH document. Each current report/CSV carries profile ID rajagiri-handover-20261124-v1.

## Indicators

| KPI | Formula | Parameters | Definition notes |
|---|---|---|---|
| 1 | Sum of reference-to-first-imaging minutes ÷ cases with brain imaging | presentation, arrivalTime, recognitionTime, brainImaging, firstSliceTime | ER reference is arrival; inpatient reference is recognition. An average in minutes, without ×100. |
| 2 | IVT-indicated OR IVT-treated cases with door-to-IVT ≤60 min ÷ IVT-indicated OR IVT-treated cases ×100 | ivtIndicated, ivtGiven, arrivalTime, ivtTime | Also shows the ≤45-minute numerator. Hospital arrival is the door baseline. |
| 3 | Qualifying sICH within 24 h of IVT ÷ IVT-treated cases ×100 | ivtGiven, ivtTime, ivtSich, ivtSichTime, ivtNihssIncrease4, ivtQualifyingImaging, ivt36HourFollowupComplete | Owner confirmed on 27 Nov: denominator includes IVT-treated patients only, correcting the uploaded code’s eligible/treated union for this complication KPI. Requires NIHSS increase ≥4 and qualifying imaging; explicit negatives require completed observation. |
| 4 | Sum of inpatient recognition-to-neurological-assessment minutes ÷ inpatient-stroke cases | presentation, recognitionTime, neurologicalAssessmentTime | Only inpatient stroke; no ×100 and no admission-to-assessment substitution. |
| 5 | Cases with dysphagia screen documented ÷ included cases ×100 | dysphagiaDocumented | — |
| 6 | Cases with rehabilitation assessment ≤48 h from admission reference ÷ included cases ×100 | rehabAssessed, rehabAssessmentTime, admissionTime, arrivalTime | Assessment, not referral. Admission reference uses recorded hospital admission, otherwise hospital arrival. |
| 7 | 90-day assessments with mRS 0–2 ÷ cases with completed/recorded 90-day assessment ×100 | followup90Days, mrs90Days | A score explicitly identified as 90-day mRS is evidence of that assessment. No exact-calendar-day filter; incomplete follow-up is not a poor outcome. |
| 8 | Medication-error events ÷ monthly medication-error opportunities ×100 | medicationErrors, monthlyInputs.medicationOpportunities | — |
| 9 | In-hospital deaths ≤7 days after admission reference ÷ included cases ×100 | diedInHospital, deathTime, admissionTime, arrivalTime, inHospital7DayFollowupComplete | — |
| 10 | Stroke/death ≤30 days after carotid intervention ÷ carotid-intervention cases ×100 | carotidProcedure, carotidProcedureTime, carotidStrokeDeath, carotidStrokeDeathTime, carotid30DayFollowupComplete | — |
| 11 | Stroke/death ≤24 h after diagnostic cerebral angiography ÷ diagnostic-angiography cases ×100 | cerebralAngiography, cerebralAngiographyTime, angiographyStrokeDeath, angiographyStrokeDeathTime, angiography24HourFollowupComplete | — |
| 12 | New/worsening pressure-ulcer cases ÷ stroke-unit patient-days ×100 | pressureUlcer, pressureUlcerCurrentStage, strokeUnitAdmissionTime, strokeUnitDischargeTime, strokeUnitStay, monthlyInputs.strokeUnitPatientDays | A positive needs a documented current stage; baseline stage is optional but conflicts are checked when supplied. |
| 13 | DVT-after-admission cases ÷ included cases ×100 | dvtAfterAdmission | — |
| 14 | Sum of imaging-service presentation-to-imaging-start minutes ÷ diagnostic-imaging cases | diagnosticImaging, imagingServiceTime, imagingStartTime, firstSliceTime | Uses service presentation, not hospital arrival; recorded brain-imaging start is a fallback endpoint. |
| 15 | Monthly thrombolytic stockout events ÷ formulary thrombolytic drugs ×100 | monthlyInputs.stockouts, monthlyInputs.formularyDrugs | — |
| 16 | Patient-fall events ÷ stroke-unit patient-days ×1000 | falls, strokeUnitAdmissionTime, strokeUnitDischargeTime, strokeUnitStay, monthlyInputs.strokeUnitPatientDays | Patient-days are derived from documented stays: max(1, ceiling(duration/24 h)) per stay. An explicit monthly patient-day total overrides the derivation. |
| 17 | EVT-indicated ischemic cases treated within the arrival-specific window ÷ EVT-indicated ischemic cases ×100 | diagnosis, evtIndicated, evtGiven, arrivalMode, arrivalTime, evtDeviceTime | Direct arrival ≤90 min; transfer ≤60 min. Unknown arrival type is not assumed direct. |
| 18 | Qualifying sICH within 24 h of EVT reference ÷ EVT-treated cases ×100 | evtGiven, evtDeviceTime, skinPunctureTime, evtStartTime, evtSich, evtSichTime, evtNihssIncrease4, evtQualifyingImaging, evt36HourFollowupComplete | Reference: first pass, otherwise puncture; an older explicit EVT-start timestamp is retained as a fallback. Requires NIHSS increase ≥4 and qualifying imaging. |
| 19 | Speech-therapy dysphagia reassessment ≤24 h from admission reference ÷ included cases ×100 | speechReassessed, speechReassessmentTime, admissionTime, arrivalTime | — |
| 20 | Stroke/death ≤30 days after intracranial angioplasty/stenting ÷ intracranial-intervention cases ×100 | intracranialProcedure, intracranialProcedureTime, intracranialStrokeDeath, intracranialStrokeDeathTime, intracranial30DayFollowupComplete | — |
| 21 | Post-EVD ventriculitis cases ÷ ischemic-stroke cases with EVD ×100 | diagnosis, evd, ventriculitis | Non-EVD ischemic cases are outside this denominator. |
| 22 | Ischemic reperfusion-therapy cases with final TICI 2B/2C/3 ÷ ischemic cases receiving EVT and/or IA thrombolysis ×100 | diagnosis, evtGiven, iaThrombolysis, finalTici | The union counts a patient once. A TICI score alone does not establish treatment or ischemic diagnosis. |
| 23 | LVO EVT cases with arrival-to-first-pass ≤150 min AND final TICI ≥2B ÷ LVO EVT cases ×100 | largeVesselOcclusion, evtGiven, arrivalTime, evtDeviceTime, finalTici | The time window is in the numerator, not the denominator. Late treated cases remain denominator failures. |
| 24 | EVT cases with final TICI ≥2B within ≤60 min of puncture ÷ EVT-treated cases ×100 | evtGiven, skinPunctureTime, reperfusionTime, finalTici | Denominator is EVT-treated cases, not all ischemic strokes; no additional LVO filter. |

## Adaptations and retained safeguards

- The owner explicitly confirmed that KPI 3 uses only IVT-treated patients. The archived buildNabhKpiReport reuses an eligible-or-treated cohort for KPI 3; that exception is deliberately corrected here. KPI 2 still uses the union.
- Only cases explicitly marked Include in KPI reporting = Yes enter reports. Existing exclusions and unconfirmed cases remain visible in Cases, without automatic inclusion. No records are rewritten.
- Confirmed ischemic diagnosis is required where the denominator specifies ischemic stroke. The archived default that equates LVO Suspected with an ischemic diagnosis is not copied. A TICI value or puncture timestamp is not used to invent treatment, LVO or diagnostic eligibility.
- Blank/Pending/Not applicable are not converted to No or zero. Missing eligibility, required times, event counts, outcome evidence or hospital inputs keep the indicator pending. Contradictions are flagged.
- Explicit negative time-window outcomes require completed observation/follow-up. The current legacy *36HourFollowupComplete keys are retained so old data is readable; their UI labels now describe the chosen 24-hour KPI window. A prior 36-hour completion also covers 24 hours. No old negative flag is silently upgraded.
- Exact timestamp differences are used, with explicit timezone/date validation. The archived helper rounds each duration to whole minutes before comparison; that can count a late event as on time. That rounding is not copied. Display formatting does not change threshold comparisons.
- Admission-reference fallbacks, first-pass/puncture EVT reference and ceiling/minimum-one stroke-unit patient-days follow the uploaded implementation. A recorded monthly patient-day total is retained as an explicit override, preserving existing hospital inputs; otherwise complete stay timestamps are required. A documented No stroke-unit stay contributes zero; a missing stay does not.
- Cohorts remain grouped by the current site's admission month, falling back to arrival. The archived site's different range selector is not imported. Later outcomes continue updating their original cohort.
- Older capture fields such as referral time, onset date and follow-up date remain available for clinical/audit history, but do not impose additional requirements on these revised formulas.
- The original pure calculation excerpts (no initialization, Firebase or auth code) are in reference/kpi-source-excerpts.js.txt. The test adapter reads explicit fixture answers only; original inferred/default answers are not executed. check-kpi-reference.mjs compares numerators, denominators and unrounded numeric values for all 24 indicators across three complete cohorts (72 comparisons), plus the owner-confirmed KPI-3 exception.

## Validation

Run node scripts/check-kpi.mjs, node scripts/check-kpi-reference.mjs, node scripts/check-kpi-data.mjs, node scripts/check-dictation-request.mjs, node scripts/sync-functions.mjs and npm test --prefix functions. Use synthetic browser fixtures for formula/parameter visibility, CSV metadata, explicit inclusion, shared review and new stay-timestamp capture.

## Stroke pathway / KPI parameter cross-check — 27 November 2026

This audit covers all 80 patient capture fields and all 24 current formula definitions. The UI asks only for formula inputs/applicability helpers plus reporting inclusion and optional pressure-ulcer baseline. Existing historical fields remain readable; no patient data is rewritten. Same-meaning form facts are validated and reused at read time. Captured matches are hidden by default, with an explicit Show captured details option.

| KPI field | Stroke pathway reuse / remaining requirement | Used by KPI |
|---|---|---|
| name — Name | Identity from page 1; no repeated parameter prompt. | Helper / audit |
| uhid — UHID | Identity from page 1; no repeated parameter prompt. | Helper / audit |
| age — Age (optional) | Identity from page 1; no repeated parameter prompt. | Helper / audit |
| includeInReporting — Include case in KPI reporting (explicit Yes required) | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | Helper / audit |
| acuteStroke — Acute stroke | Retained in historical schema; not requested in the current KPI list (not required by these formulas). | Helper / audit |
| diagnosis — Diagnosis | Page 1: diagnosis. Only exact confirmed diagnostic labels; suspicion/free narrative needs clarification. | 17, 21, 22 |
| admitted — Admitted | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | Helper / audit |
| presentation — Presentation | Explicit ER-arrival event (page 2); inpatient presentation still needs its own evidence. | 1, 4 |
| arrivalTime — Hospital arrival | Page 2: er_arrival, or NIHSS-sheet arrival (original page 9); newest duplicate-sheet correction wins. Requires explicit full date/time; never assign the header/visit date. | 1, 2, 6, 9, 17, 19, 23 |
| admissionTime — Hospital admission | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 6, 9, 19 |
| onsetDate — Stroke onset date (for 90-day follow-up) | Retained in historical schema; not requested in the current KPI list (not required by these formulas). | Helper / audit |
| recognitionTime — Inpatient stroke recognition | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 1, 4 |
| strokeUnitStay — Managed in the stroke unit | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 12, 16 |
| strokeUnitAdmissionTime — Stroke-unit admission | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 12, 16 |
| strokeUnitDischargeTime — Stroke-unit discharge | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 12, 16 |
| brainImaging — Brain imaging performed | Recorded imaging-start event (page 2). | 1 |
| firstSliceTime — First brain imaging start / first slice | Page 2: scan_start. Requires explicit full date/time; never assign the header/visit date. | 1, 14 |
| neurologicalAssessmentTime — Detailed neurological assessment of inpatient stroke | Page 2: neuro_assessment. Requires explicit full date/time; never assign the header/visit date. | 4 |
| dysphagiaDocumented — Initial dysphagia screen documented | Completed initial screen responses (page 1); not speech reassessment. | 5 |
| diagnosticImaging — Reported to diagnostic imaging service | Recorded scan-service arrival (page 2). | 14 |
| imagingServiceTime — Imaging service arrival / requisition presented (scheduled time for appointment) | Page 2: scan_arrival. Requires explicit full date/time; never assign the header/visit date. | 14 |
| imagingStartTime — Diagnostic imaging test initiated | Page 2: scan_start. Requires explicit full date/time; never assign the header/visit date. | 14 |
| ivtIndicated — IV thrombolysis indicated | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 2 |
| ivtGiven — IV thrombolysis received | Actual IVT-start event (page 2), never a decision checkbox. | 2, 3 |
| ivtTime — IV thrombolytic bolus / treatment start | Page 2: ivt_start. Requires explicit full date/time; never assign the header/visit date. | 2, 3 |
| evtIndicated — Acute endovascular treatment indicated | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 17 |
| evtGiven — Mechanical endovascular reperfusion received | Actual first-pass event (page 2), never puncture or a treatment decision alone. | 17, 18, 22, 23, 24 |
| arrivalMode — Arrival mode for EVT | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 17 |
| evtStartTime — EVT treatment start (fallback if first-pass/puncture time is unavailable) | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 18 |
| evtDeviceTime — First device deployment / first pass | Page 2: first_pass. Requires explicit full date/time; never assign the header/visit date. | 17, 18, 23 |
| skinPunctureTime — Skin puncture | Page 2: groin_puncture. Requires explicit full date/time; never assign the header/visit date. | 18, 24 |
| reperfusionTime — Time TICI 2B or higher achieved | Page 2: recanalisation. Requires explicit full date/time; never assign the header/visit date. | 24 |
| iaThrombolysis — Intra-arterial thrombolytic therapy received | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 22 |
| finalTici — Final post-treatment TICI grade | Page 2: tici. Exact TICI grade only. | 22, 23, 24 |
| largeVesselOcclusion — Qualifying ICA / ICA terminus / MCA M1 or M2 / basilar occlusion | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 23 |
| ivt36HourFollowupComplete — Post-IVT observation complete for the 24-hour KPI window (prior 36-hour completion also qualifies) | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 3 |
| ivtSich — Qualifying symptomatic intracranial haemorrhage after IVT (record actual event time; KPI uses 24 h; NIHSS increase ≥4 plus qualifying imaging) | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 3 |
| ivtNihssIncrease4 — Post-IVT NIHSS increase ≥4 confirmed | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 3 |
| ivtQualifyingImaging — Post-IVT imaging confirms parenchymal hematoma / subarachnoid / intraventricular haemorrhage | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 3 |
| ivtSichTime — Post-IVT symptomatic haemorrhage time | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 3 |
| evt36HourFollowupComplete — Post-EVT observation complete for the 24-hour KPI window (prior 36-hour completion also qualifies) | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 18 |
| evtSich — Qualifying symptomatic intracranial haemorrhage after EVT (record actual event time; KPI uses 24 h; NIHSS increase ≥4 plus qualifying imaging) | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 18 |
| evtNihssIncrease4 — Post-EVT NIHSS increase ≥4 confirmed | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 18 |
| evtQualifyingImaging — Post-EVT imaging confirms parenchymal hematoma / subarachnoid / intraventricular haemorrhage | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 18 |
| evtSichTime — Post-EVT symptomatic haemorrhage time | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 18 |
| medicationErrors — Number of medication errors | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 8 |
| inHospital7DayFollowupComplete — In-hospital mortality ascertainment complete through day 7 or live discharge | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 9 |
| diedInHospital — In-hospital death (review through 7 days after admission) | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 9 |
| deathTime — In-hospital death time | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 9 |
| carotidProcedure — CEA / carotid angioplasty / stenting performed | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 10 |
| carotidProcedureTime — Carotid procedure time | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 10 |
| carotid30DayFollowupComplete — Carotid procedure follow-up complete through 30 days | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 10 |
| carotidStrokeDeath — Stroke or death after carotid procedure (review through 30 days) | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 10 |
| carotidStrokeDeathTime — First stroke or death after carotid procedure | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 10 |
| cerebralAngiography — Diagnostic cerebral angiography performed | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 11 |
| cerebralAngiographyTime — Diagnostic cerebral angiography time | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 11 |
| angiography24HourFollowupComplete — Diagnostic angiography follow-up complete through 24 hours | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 11 |
| angiographyStrokeDeath — Stroke or death after diagnostic angiography (review through 24 h) | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 11 |
| angiographyStrokeDeathTime — First stroke or death after diagnostic angiography | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 11 |
| pressureUlcer — New / worsening pressure ulcer after admission (EPUAP/NPUAP staging) | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 12 |
| pressureUlcerInitialStage — Initial pressure ulcer stage (optional baseline, EPUAP/NPUAP) | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | Helper / audit |
| pressureUlcerCurrentStage — Current pressure ulcer stage (EPUAP/NPUAP) | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 12 |
| dvtAfterAdmission — Deep venous thrombosis after admission | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 13 |
| falls — Number of patient falls, including assisted falls | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 16 |
| intracranialProcedure — Intracranial angioplasty / stenting for atherosclerosis performed | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 20 |
| intracranialProcedureTime — Intracranial procedure time | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 20 |
| intracranial30DayFollowupComplete — Intracranial procedure follow-up complete through 30 days | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 20 |
| intracranialStrokeDeath — Stroke or death after intracranial procedure (review through 30 days) | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 20 |
| intracranialStrokeDeathTime — First stroke or death after intracranial procedure | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 20 |
| evd — EVD performed | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 21 |
| ventriculitis — Ventriculitis after EVD | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 21 |
| rehabReferred — Referred to physiotherapist / rehabilitation | Retained in historical schema; not requested in the current KPI list (not required by these formulas). | Helper / audit |
| rehabReferralTime — Rehabilitation referral | Retained in historical schema; not requested in the current KPI list (not required by these formulas). | Helper / audit |
| rehabAssessed — Initial assessment by stroke rehabilitation specialist completed | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 6 |
| rehabAssessmentTime — Initial rehabilitation assessment | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 6 |
| followup90Days — Stroke follow-up at 90 days from onset completed | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 7 |
| followupDate — Actual 90-day follow-up date (optional audit date) | Retained in historical schema; not requested in the current KPI list (not required by these formulas). | Helper / audit |
| mrs90Days — Modified Rankin Scale at 90 days from onset (0–6) | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 7 |
| speechReassessed — Speech therapist dysphagia reassessment documented | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 19 |
| speechReassessmentTime — Documented speech therapist reassessment | Additional KPI-specific evidence; no equivalent structured field in the six-page pathway. | 19 |

### Similar-looking items that must stay distinct

- IVT/IA/MT decision boxes are plans, not evidence of actual administration or completion. Eligibility is separate from treatment received. A timed IVT start or first pass is an actual documented event.
- Generic LVO does not specify the qualifying vessel distribution required by KPI 23. Generic SICH does not establish its IVT/EVT attribution, event time, NIHSS increase, imaging criteria or completed observation.
- Initial dysphagia screening, speech referral need and later speech reassessment have different meanings. Rehabilitation referral is not completed specialist assessment.
- ER arrival, hospital admission, inpatient stroke recognition and stroke-unit admission/discharge are separate events. Scan-service arrival is not hospital arrival.
- Admission/discharge mRS cannot substitute for an explicitly identified 90-day mRS. Exclusion checklist answers do not supply later complication outcomes.
- Recanalization can supply the KPI reperfusion timestamp only with explicit final TICI 2B/2C/3. No qualifying grade, timing window, diagnosis or outcome is inferred from a number alone.

### Completion of all 24 indicators

Complete applicable patient evidence plus completed required observation/follow-up resolves patient contributions. Reports still require explicit inclusion and use the reporting-month cohort. No eligible patients means not applicable, not zero or missing. Monthly medication-error opportunities (KPI 8), stockouts and formulary-drug counts (KPI 15) are hospital inputs, not individual-patient answers. Pressure-ulcer/fall denominators (KPIs 12/16) additionally need complete stroke-unit stays or an explicit monthly patient-day override. Filling the six-page acute form alone cannot establish later follow-up or hospital monthly totals.

`node scripts/check-protocol-kpi-reuse.mjs` verifies reusable source facts, identity, explicit dates, rejected clock-only date guesses, unknown sources, protected clears, newer manual corrections, mismatches, clinical distinctions and a complete synthetic case that resolves all 24 KPIs with hospital inputs. The same complete case keeps KPIs 8/15 pending without their hospital inputs.

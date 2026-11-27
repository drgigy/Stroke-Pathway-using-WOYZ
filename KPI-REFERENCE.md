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

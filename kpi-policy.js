// Hospital calculation reference supplied by the owner; not a new certification of the NABH document.
export const kpiCalculationProfile = Object.freeze({
 id:'rajagiri-handover-20261124-v1',
 title:'Rajagiri reference formulas — uploaded Stroke app (24 Nov 2026)',
 sourceRepository:'drgigy/Stroke', sourceCommit:'feff4aa3cfa985f3996aa1917c79754dfd4f9799',
 sourceFile:'source/app.js',sourceSha256:'3178af409afb1120e5b8f88fa253ec766a59b3ec652694d7f14210fb394f8943',sourceFunction:'buildNabhKpiReport',
});
const rule=(formula,parameters,note='')=>Object.freeze({formula,parameters:Object.freeze([...parameters]),note});
export const kpiDefinitions=Object.freeze([
 rule('Sum of reference-to-first-imaging minutes ÷ cases with brain imaging',['presentation','arrivalTime','recognitionTime','brainImaging','firstSliceTime'],'ER reference is arrival; inpatient reference is recognition. An average in minutes, without ×100.'),
 rule('IVT-indicated OR IVT-treated cases with door-to-IVT ≤60 min ÷ IVT-indicated OR IVT-treated cases ×100',['ivtIndicated','ivtGiven','arrivalTime','ivtTime'],'Also shows the ≤45-minute numerator. Hospital arrival is the door baseline.'),
 rule('Qualifying sICH within 24 h of IVT ÷ IVT-treated cases ×100',['ivtGiven','ivtTime','ivtSich','ivtSichTime','ivtNihssIncrease4','ivtQualifyingImaging','ivt36HourFollowupComplete'],'Owner confirmed on 27 Nov: denominator includes IVT-treated patients only, correcting the uploaded code’s eligible/treated union for this complication KPI. Requires NIHSS increase ≥4 and qualifying imaging; explicit negatives require completed observation.'),
 rule('Sum of inpatient recognition-to-neurological-assessment minutes ÷ inpatient-stroke cases',['presentation','recognitionTime','neurologicalAssessmentTime'],'Only inpatient stroke; no ×100 and no admission-to-assessment substitution.'),
 rule('Cases with dysphagia screen documented ÷ included cases ×100',['dysphagiaDocumented']),
 rule('Cases with rehabilitation assessment ≤48 h from admission reference ÷ included cases ×100',['rehabAssessed','rehabAssessmentTime','admissionTime','arrivalTime'],'Assessment, not referral. Admission reference uses recorded hospital admission, otherwise hospital arrival.'),
 rule('90-day assessments with mRS 0–2 ÷ cases with completed/recorded 90-day assessment ×100',['followup90Days','mrs90Days'],'A score explicitly identified as 90-day mRS is evidence of that assessment. No exact-calendar-day filter; incomplete follow-up is not a poor outcome.'),
 rule('Medication-error events ÷ monthly medication-error opportunities ×100',['medicationErrors','monthlyInputs.medicationOpportunities']),
 rule('In-hospital deaths ≤7 days after admission reference ÷ included cases ×100',['diedInHospital','deathTime','admissionTime','arrivalTime','inHospital7DayFollowupComplete']),
 rule('Stroke/death ≤30 days after carotid intervention ÷ carotid-intervention cases ×100',['carotidProcedure','carotidProcedureTime','carotidStrokeDeath','carotidStrokeDeathTime','carotid30DayFollowupComplete']),
 rule('Stroke/death ≤24 h after diagnostic cerebral angiography ÷ diagnostic-angiography cases ×100',['cerebralAngiography','cerebralAngiographyTime','angiographyStrokeDeath','angiographyStrokeDeathTime','angiography24HourFollowupComplete']),
 rule('New/worsening pressure-ulcer cases ÷ stroke-unit patient-days ×100',['pressureUlcer','pressureUlcerCurrentStage','strokeUnitAdmissionTime','strokeUnitDischargeTime','strokeUnitStay','monthlyInputs.strokeUnitPatientDays'],'A positive needs a documented current stage; baseline stage is optional but conflicts are checked when supplied.'),
 rule('DVT-after-admission cases ÷ included cases ×100',['dvtAfterAdmission']),
 rule('Sum of imaging-service presentation-to-imaging-start minutes ÷ diagnostic-imaging cases',['diagnosticImaging','imagingServiceTime','imagingStartTime','firstSliceTime'],'Uses service presentation, not hospital arrival; recorded brain-imaging start is a fallback endpoint.'),
 rule('Monthly thrombolytic stockout events ÷ formulary thrombolytic drugs ×100',['monthlyInputs.stockouts','monthlyInputs.formularyDrugs']),
 rule('Patient-fall events ÷ stroke-unit patient-days ×1000',['falls','strokeUnitAdmissionTime','strokeUnitDischargeTime','strokeUnitStay','monthlyInputs.strokeUnitPatientDays'],'Patient-days are derived from documented stays: max(1, ceiling(duration/24 h)) per stay. An explicit monthly patient-day total overrides the derivation.'),
 rule('EVT-indicated ischemic cases treated within the arrival-specific window ÷ EVT-indicated ischemic cases ×100',['diagnosis','evtIndicated','evtGiven','arrivalMode','arrivalTime','evtDeviceTime'],'Direct arrival ≤90 min; transfer ≤60 min. Unknown arrival type is not assumed direct.'),
 rule('Qualifying sICH within 24 h of EVT reference ÷ EVT-treated cases ×100',['evtGiven','evtDeviceTime','skinPunctureTime','evtStartTime','evtSich','evtSichTime','evtNihssIncrease4','evtQualifyingImaging','evt36HourFollowupComplete'],'Reference: first pass, otherwise puncture; an older explicit EVT-start timestamp is retained as a fallback. Requires NIHSS increase ≥4 and qualifying imaging.'),
 rule('Speech-therapy dysphagia reassessment ≤24 h from admission reference ÷ included cases ×100',['speechReassessed','speechReassessmentTime','admissionTime','arrivalTime']),
 rule('Stroke/death ≤30 days after intracranial angioplasty/stenting ÷ intracranial-intervention cases ×100',['intracranialProcedure','intracranialProcedureTime','intracranialStrokeDeath','intracranialStrokeDeathTime','intracranial30DayFollowupComplete']),
 rule('Post-EVD ventriculitis cases ÷ ischemic-stroke cases with EVD ×100',['diagnosis','evd','ventriculitis'],'Non-EVD ischemic cases are outside this denominator.'),
 rule('Ischemic reperfusion-therapy cases with final TICI 2B/2C/3 ÷ ischemic cases receiving EVT and/or IA thrombolysis ×100',['diagnosis','evtGiven','iaThrombolysis','finalTici'],'The union counts a patient once. A TICI score alone does not establish treatment or ischemic diagnosis.'),
 rule('LVO EVT cases with arrival-to-first-pass ≤150 min AND final TICI ≥2B ÷ LVO EVT cases ×100',['largeVesselOcclusion','evtGiven','arrivalTime','evtDeviceTime','finalTici'],'The time window is in the numerator, not the denominator. Late treated cases remain denominator failures.'),
 rule('EVT cases with final TICI ≥2B within ≤60 min of puncture ÷ EVT-treated cases ×100',['evtGiven','skinPunctureTime','reperfusionTime','finalTici'],'Denominator is EVT-treated cases, not all ischemic strokes; no additional LVO filter.'),
]);

/** Minimum capture contract for NABH Stroke Centre KPIs (September 2023).
 * Blank/absent values mean unknown; explicit No/0 is required for negatives.
 * A time-window outcome No also requires its explicit follow-up-complete flag.
 * All datetime values supplied to calculations require ISO offsets or Z.
 */
export const kpiSchemaVersion = 1;
export const kpiSource = 'nabh-stroke-2023-v1';
const yn = ['Yes', 'No'];
const ulcerStages = ['No pressure ulcer', 'Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Unstageable', 'Deep tissue pressure injury'];
const field = (id, label, type, kpis, extra = {}) => ({ id, label, type, kpis, ...extra });
const choice = (id, label, kpis, extra = {}) => field(id, label, 'choice', kpis, { choices: yn, ...extra });
const time = (id, label, kpis, extra = {}) => field(id, label, 'datetime', kpis, extra);
const when = (field, values = ['Yes']) => ({ showIf: { field, values } });
export const kpiSections = [
  { id: 'patientAdmission', title: 'Patient and admission', fields: [
    field('name', 'Name', 'text', []),
    field('uhid', 'UHID', 'text', []),
    field('age', 'Age (optional)', 'number', []),
    choice('includeInReporting', 'Include case in KPI reporting', []),
    choice('acuteStroke', 'Acute stroke', [1, 2, 9, 17]),
    field('diagnosis', 'Diagnosis', 'choice', [2, 6, 7, 17, 21, 22, 23, 24], { choices: ['Ischemic Stroke', 'Hemorrhagic Stroke', 'TIA', 'Stroke mimic', 'Undetermined'] }),
    choice('admitted', 'Admitted', [4, 5, 6, 9, 12, 13, 19]),
    field('presentation', 'Presentation', 'choice', [1, 2, 17], { choices: ['ER arrival', 'Inpatient stroke'] }),
    time('arrivalTime', 'Hospital arrival', [1, 2, 17, 23]),
    time('admissionTime', 'Hospital admission', [4, 6, 9, 19], when('admitted')),
    field('onsetDate', 'Stroke onset date (for 90-day follow-up)', 'date', [7]),
    time('recognitionTime', 'Inpatient stroke recognition', [1, 2, 17], when('presentation', ['Inpatient stroke'])),
  ] },
  { id: 'assessmentImaging', title: 'Assessment and imaging', fields: [
    choice('brainImaging', 'Brain imaging performed', [1]),
    time('firstSliceTime', 'First brain imaging slice', [1], when('brainImaging')),
    time('neurologicalAssessmentTime', 'Detailed initial neurological assessment', [4], when('admitted')),
    choice('dysphagiaDocumented', 'Initial dysphagia screen documented at admission', [5], when('admitted')),
    choice('diagnosticImaging', 'Reported to diagnostic imaging service', [14]),
    time('imagingServiceTime', 'Imaging service arrival / requisition presented (scheduled time for appointment)', [14], when('diagnosticImaging')),
    time('imagingStartTime', 'Diagnostic imaging test initiated', [14], when('diagnosticImaging')),
  ] },
  { id: 'ivtEvt', title: 'IVT / EVT', fields: [
    choice('ivtIndicated', 'IV thrombolysis indicated', [2]),
    choice('ivtGiven', 'IV thrombolysis received', [2, 3]),
    time('ivtTime', 'IV thrombolytic bolus / treatment start', [2, 3], when('ivtGiven')),
    choice('evtIndicated', 'Acute endovascular treatment indicated', [17]),
    choice('evtGiven', 'Mechanical endovascular reperfusion received', [17, 18, 22, 23, 24]),
    field('arrivalMode', 'Arrival mode for EVT', 'choice', [17], { choices: ['Direct', 'Transfer'], ...when('evtGiven') }),
    time('evtStartTime', 'Mechanical endovascular treatment start', [18], when('evtGiven')),
    time('evtDeviceTime', 'First device deployment / first pass', [17, 23], when('evtGiven')),
    time('skinPunctureTime', 'Skin puncture', [24], when('evtGiven')),
    time('reperfusionTime', 'Time TICI 2B or higher achieved', [24], when('evtGiven')),
    choice('iaThrombolysis', 'Intra-arterial thrombolytic therapy received', [22]),
    field('finalTici', 'Final post-treatment TICI grade', 'choice', [22, 23, 24], { choices: ['0', '1', '2A', '2B', '2C', '3'], showIfAny: [{ field: 'evtGiven', values: ['Yes'] }, { field: 'iaThrombolysis', values: ['Yes'] }] }),
    choice('largeVesselOcclusion', 'Qualifying ICA / ICA terminus / MCA M1 or M2 / basilar occlusion', [23, 24]),
  ] },
  { id: 'complicationsProcedures', title: 'Complications and procedures', fields: [
    choice('ivt36HourFollowupComplete', 'Post-IVT observation complete through 36 hours', [3], when('ivtGiven')),
    choice('ivtSich', 'Qualifying symptomatic intracranial haemorrhage after IVT (review through 36 h; NIHSS increase ≥4 plus qualifying imaging)', [3], when('ivtGiven')),
    choice('ivtNihssIncrease4', 'Post-IVT NIHSS increase ≥4 confirmed', [3], when('ivtSich')),
    choice('ivtQualifyingImaging', 'Post-IVT imaging confirms parenchymal hematoma / subarachnoid / intraventricular haemorrhage', [3], when('ivtSich')),
    time('ivtSichTime', 'Post-IVT symptomatic haemorrhage time', [3], when('ivtSich')),
    choice('evt36HourFollowupComplete', 'Post-EVT observation complete through 36 hours', [18], when('evtGiven')),
    choice('evtSich', 'Qualifying symptomatic intracranial haemorrhage after EVT (review through 36 h; NIHSS increase ≥4 plus qualifying imaging)', [18], when('evtGiven')),
    choice('evtNihssIncrease4', 'Post-EVT NIHSS increase ≥4 confirmed', [18], when('evtSich')),
    choice('evtQualifyingImaging', 'Post-EVT imaging confirms parenchymal hematoma / subarachnoid / intraventricular haemorrhage', [18], when('evtSich')),
    time('evtSichTime', 'Post-EVT symptomatic haemorrhage time', [18], when('evtSich')),
    field('medicationErrors', 'Number of medication errors', 'number', [8], { integer: true }),
    choice('inHospital7DayFollowupComplete', 'In-hospital mortality ascertainment complete through day 7 or live discharge', [9], when('admitted')),
    choice('diedInHospital', 'In-hospital death (review through 7 days after admission)', [9], when('admitted')),
    time('deathTime', 'In-hospital death time', [9], when('diedInHospital')),
    choice('carotidProcedure', 'CEA / carotid angioplasty / stenting performed', [10]),
    time('carotidProcedureTime', 'Carotid procedure time', [10], when('carotidProcedure')),
    choice('carotid30DayFollowupComplete', 'Carotid procedure follow-up complete through 30 days', [10], when('carotidProcedure')),
    choice('carotidStrokeDeath', 'Stroke or death after carotid procedure (review through 30 days)', [10], when('carotidProcedure')),
    time('carotidStrokeDeathTime', 'First stroke or death after carotid procedure', [10], when('carotidStrokeDeath')),
    choice('cerebralAngiography', 'Diagnostic cerebral angiography performed', [11]),
    time('cerebralAngiographyTime', 'Diagnostic cerebral angiography time', [11], when('cerebralAngiography')),
    choice('angiography24HourFollowupComplete', 'Diagnostic angiography follow-up complete through 24 hours', [11], when('cerebralAngiography')),
    choice('angiographyStrokeDeath', 'Stroke or death after diagnostic angiography (review through 24 h)', [11], when('cerebralAngiography')),
    time('angiographyStrokeDeathTime', 'First stroke or death after diagnostic angiography', [11], when('angiographyStrokeDeath')),
    choice('pressureUlcer', 'New / worsening pressure ulcer after admission (EPUAP/NPUAP staging)', [12], when('admitted')),
    field('pressureUlcerInitialStage', 'Initial pressure ulcer stage (EPUAP/NPUAP)', 'choice', [12], { choices: ulcerStages, ...when('pressureUlcer') }),
    field('pressureUlcerCurrentStage', 'Current pressure ulcer stage (EPUAP/NPUAP)', 'choice', [12], { choices: ulcerStages, ...when('pressureUlcer') }),
    choice('dvtAfterAdmission', 'Deep venous thrombosis after admission', [13], when('admitted')),
    field('falls', 'Number of patient falls, including assisted falls', 'number', [16], { integer: true }),
    choice('intracranialProcedure', 'Intracranial angioplasty / stenting for atherosclerosis performed', [20]),
    time('intracranialProcedureTime', 'Intracranial procedure time', [20], when('intracranialProcedure')),
    choice('intracranial30DayFollowupComplete', 'Intracranial procedure follow-up complete through 30 days', [20], when('intracranialProcedure')),
    choice('intracranialStrokeDeath', 'Stroke or death after intracranial procedure (review through 30 days)', [20], when('intracranialProcedure')),
    time('intracranialStrokeDeathTime', 'First stroke or death after intracranial procedure', [20], when('intracranialStrokeDeath')),
    choice('evd', 'EVD performed', [21]),
    choice('ventriculitis', 'Ventriculitis after EVD', [21], when('evd')),
  ] },
  { id: 'rehabFollowup', title: 'Rehabilitation and follow-up', fields: [
    choice('rehabReferred', 'Referred to physiotherapist / rehabilitation', [6], when('admitted')),
    time('rehabReferralTime', 'Rehabilitation referral', [6], when('rehabReferred')),
    choice('rehabAssessed', 'Initial assessment by stroke rehabilitation specialist completed', [6], when('admitted')),
    time('rehabAssessmentTime', 'Initial rehabilitation assessment', [6], when('rehabAssessed')),
    choice('followup90Days', 'Stroke follow-up at 90 days from onset completed', [7]),
    field('followupDate', 'Actual 90-day follow-up date', 'date', [7], when('followup90Days')),
    field('mrs90Days', 'Modified Rankin Scale at 90 days from onset (0–6)', 'number', [7], when('followup90Days')),
    choice('speechReassessed', 'Speech therapist dysphagia reassessment documented', [19], when('admitted')),
    time('speechReassessmentTime', 'Documented speech therapist reassessment', [19], when('speechReassessed')),
  ] },
  { id: 'kpiResults', title: 'KPI results', fields: [] },
];
export const kpiFields = kpiSections.flatMap(section => section.fields);
export const hospitalFields = [
  { id: 'medicationOpportunities', label: 'Monthly opportunities of medication errors', type: 'number' },
  { id: 'stockouts', label: 'Monthly instances of thrombolytic agent stockout', type: 'number' },
  { id: 'formularyDrugs', label: 'Number of thrombolytic drugs in hospital formulary', type: 'number' },
  { id: 'strokeUnitPatientDays', label: 'Monthly patient days in stroke unit', type: 'number' },
];

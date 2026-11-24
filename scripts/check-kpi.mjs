/** Run with node scripts/check-kpi.mjs. Pure in-memory contract/boundary tests. */
import assert from 'node:assert/strict';
import { calculateKpis } from '../kpi-calculations.js';
import { kpiSections, kpiFields, kpiSchemaVersion, kpiSource, hospitalFields } from '../kpi-schema.js';

let checks = 0;
function test(name, run) {
  try { run(); checks++; }
  catch (error) { error.message = `${name}: ${error.message}`; throw error; }
}
const M = 60_000, H = 60 * M, D = 24 * H;
const base = Date.parse('2026-01-01T00:00:00+05:30');
const at = ms => `${new Date(base + ms + 330 * M).toISOString().slice(0, -1)}+05:30`;
const monthly = { medicationOpportunities: 100, stockouts: 2, formularyDrugs: 4, strokeUnitPatientDays: 1000 };
const clarification = new Set([1, 3, 4, 6, 13, 16, 18, 23, 24]);
const r = {
  name: 'Synthetic boundary case', uhid: 'TEST', age: 50,
  acuteStroke: 'Yes', diagnosis: 'Ischemic Stroke', admitted: 'Yes', presentation: 'ER arrival',
  arrivalTime: at(0), admissionTime: at(0), onsetDate: '2026-01-01', recognitionTime: at(0),
  brainImaging: 'Yes', firstSliceTime: at(20 * M), neurologicalAssessmentTime: at(10 * M), dysphagiaDocumented: 'Yes',
  diagnosticImaging: 'Yes', imagingServiceTime: at(5 * M), imagingStartTime: at(20 * M),
  ivtIndicated: 'Yes', ivtGiven: 'Yes', ivtTime: at(45 * M),
  evtIndicated: 'Yes', evtGiven: 'Yes', arrivalMode: 'Direct', evtStartTime: at(60 * M), evtDeviceTime: at(90 * M),
  skinPunctureTime: at(60 * M), reperfusionTime: at(120 * M), iaThrombolysis: 'Yes', finalTici: '2B', largeVesselOcclusion: 'Yes',
  ivt36HourFollowupComplete: 'Yes', ivtSich: 'Yes', ivtNihssIncrease4: 'Yes', ivtQualifyingImaging: 'Yes', ivtSichTime: at(45 * M + D),
  evt36HourFollowupComplete: 'Yes', evtSich: 'Yes', evtNihssIncrease4: 'Yes', evtQualifyingImaging: 'Yes', evtSichTime: at(60 * M + D),
  medicationErrors: 2, inHospital7DayFollowupComplete: 'Yes', diedInHospital: 'Yes', deathTime: at(7 * D),
  carotidProcedure: 'Yes', carotidProcedureTime: at(0), carotid30DayFollowupComplete: 'Yes', carotidStrokeDeath: 'Yes', carotidStrokeDeathTime: at(30 * D),
  cerebralAngiography: 'Yes', cerebralAngiographyTime: at(0), angiography24HourFollowupComplete: 'Yes', angiographyStrokeDeath: 'Yes', angiographyStrokeDeathTime: at(D),
  pressureUlcer: 'Yes', pressureUlcerInitialStage: 'No pressure ulcer', pressureUlcerCurrentStage: 'Stage 2', dvtAfterAdmission: 'Yes', falls: 1,
  intracranialProcedure: 'Yes', intracranialProcedureTime: at(0), intracranial30DayFollowupComplete: 'Yes', intracranialStrokeDeath: 'Yes', intracranialStrokeDeathTime: at(30 * D),
  evd: 'Yes', ventriculitis: 'Yes',
  rehabReferred: 'Yes', rehabReferralTime: at(D), rehabAssessed: 'Yes', rehabAssessmentTime: at(48 * H),
  followup90Days: 'Yes', followupDate: '2026-04-01', mrs90Days: 2,
  speechReassessed: 'Yes', speechReassessmentTime: at(D),
};
const run = (record = r, inputs = monthly) => calculateKpis([record], inputs);
const get = (no, changes = {}, inputs = monthly) => run({ ...r, ...changes }, inputs)[no - 1];
function missing(result, id) {
  assert(result.missing.some(value => value.includes(id)), `${result.no} should report missing ${id}: ${result.missing}`);
  assert.equal(result.value, null);
}

test('schema contract and all conditional references', () => {
  assert.equal(kpiSchemaVersion, 1);
  assert.equal(kpiSource, 'nabh-stroke-2023-v1');
  assert.equal(kpiSections.length, 6);
  assert.deepEqual(kpiSections.map(s => s.title), ['Patient and admission', 'Assessment and imaging', 'IVT / EVT', 'Complications and procedures', 'Rehabilitation and follow-up', 'KPI results']);
  assert.deepEqual(kpiSections[5].fields, []);
  assert.deepEqual(kpiFields, kpiSections.flatMap(s => s.fields));
  const ids = new Set(kpiFields.map(f => f.id));
  assert.equal(ids.size, kpiFields.length);
  for (const f of kpiFields) {
    assert.match(f.id, /^[a-z][a-zA-Z0-9]*$/);
    assert(['text', 'datetime', 'date', 'number', 'choice'].includes(f.type));
    assert(f.kpis.every(k => Number.isInteger(k) && k >= 1 && k <= 24));
    if (f.type === 'choice') assert(f.choices.length);
    for (const conditions of [f.showIf, f.showIfAny]) {
      for (const condition of [conditions ?? []].flat()) {
        assert(ids.has(condition.field));
        assert(condition.values.every(v => kpiFields.find(f => f.id === condition.field).choices.includes(v)));
      }
    }
  }
  assert.deepEqual(hospitalFields.map(f => f.id), ['medicationOpportunities', 'stockouts', 'formularyDrugs', 'strokeUnitPatientDays']);
  assert(hospitalFields.every(f => f.type === 'number'));
  assert.equal(kpiFields.find(f => f.id === 'followupDate').type, 'date');
  for (const f of ['ivtNihssIncrease4', 'ivtQualifyingImaging', 'evtNihssIncrease4', 'evtQualifyingImaging'])
    assert.deepEqual(kpiFields.find(x => x.id === f).choices, ['Yes', 'No']);
});

test('all 24 results, counts, status, and units', () => {
  const results = run();
  assert.equal(results.length, 24);
  const numerators = [20, 1, 1, 10, 1, 1, 1, 2, 1, 1, 1, 1, 1, 15, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1];
  for (const [index, result] of results.entries()) {
    const no = index + 1;
    assert.equal(result.no, no);
    assert(result.title.length);
    assert.equal(result.numerator, numerators[index], `numerator ${no}`);
    assert.equal(result.denominator, ({ 8: 100, 12: 1000, 15: 4, 16: null })[no] ?? (no === 16 ? null : 1), `denominator ${no}`);
    assert.equal(result.status, clarification.has(no) ? 'clarification' : 'complete', `status ${no}`);
    assert.deepEqual(result.missing, []);
    assert.equal(result.eligibilityPending, 0);
    if (clarification.has(no)) { assert.equal(result.value, null); assert(result.note.length); }
    else assert.equal(result.value, ({ 8: 2, 12: 0.1, 14: 15, 15: 50 })[no] ?? 100, `value ${no}`);
  }
});

test('pure: no mutations, no current-clock dependency, reproducible', () => {
  const record = Object.freeze({ ...r });
  const inputs = Object.freeze({ ...monthly });
  assert.deepEqual(calculateKpis(Object.freeze([record]), inputs), calculateKpis([record], inputs));
});

test('empty cohort has no eligible cases; empty draft is not an admission', () => {
  const empty = calculateKpis([], monthly);
  for (const result of empty) {
    if (clarification.has(result.no)) assert.equal(result.status, 'clarification');
    else if (result.no === 15 || result.no === 8 || result.no === 12) assert.equal(result.status, 'complete');
    else assert.equal(result.status, 'not-applicable');
  }
  const draft = calculateKpis([{}], monthly);
  for (const no of [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 13, 14, 17, 18, 19, 20, 21, 22, 23, 24]) {
    assert.equal(draft[no - 1].denominator, 0, `draft denominator ${no}`);
    assert.equal(draft[no - 1].eligibilityPending, 1, `draft eligibility ${no}`);
    assert(draft[no - 1].missing.length);
    assert.equal(draft[no - 1].value, null);
  }
  for (const no of [8, 12, 16]) assert(draft[no - 1].missing.length);
});

test('all 24 missing capture paths', () => {
  const cases = [
    [1, 'firstSliceTime'], [2, 'ivtGiven'], [3, 'ivtSich'], [4, 'neurologicalAssessmentTime'],
    [5, 'dysphagiaDocumented'], [6, 'rehabAssessed'], [7, 'mrs90Days'], [8, 'medicationErrors'],
    [9, 'diedInHospital'], [10, 'carotidStrokeDeath'], [11, 'angiographyStrokeDeath'], [12, 'pressureUlcer'],
    [13, 'dvtAfterAdmission'], [14, 'imagingStartTime'], [16, 'falls'], [17, 'evtGiven'], [18, 'evtSich'],
    [19, 'speechReassessed'], [20, 'intracranialStrokeDeath'], [21, 'evd'], [22, 'finalTici'],
    [23, 'evtDeviceTime'], [24, 'skinPunctureTime'],
  ];
  for (const [no, id] of cases) missing(get(no, { [id]: '' }), id);
  missing(get(15, {}, { ...monthly, stockouts: '' }), 'stockouts');
});

test('missing eligibility cannot silently exclude; explicit exclusions work', () => {
  for (const [no, id] of [[2, 'ivtIndicated'], [17, 'evtIndicated'], [5, 'admitted'], [21, 'diagnosis'], [22, 'evtGiven']]) {
    const changes = { [id]: '', ...(no === 22 ? { iaThrombolysis: 'No' } : {}) };
    const result = get(no, changes);
    assert.equal(result.denominator, 0);
    assert.equal(result.eligibilityPending, 1);
    missing(result, id);
  }
  assert.equal(get(2, { acuteStroke: 'No', diagnosis: '', ivtIndicated: '' }).status, 'not-applicable');
  assert.equal(get(21, { diagnosis: 'TIA', evd: '' }).status, 'not-applicable');
  assert.equal(get(21, { diagnosis: 'Undetermined' }).status, 'pending');
  const mixed = calculateKpis([r, {}], monthly)[4];
  assert.equal(mixed.denominator, 1); assert.equal(mixed.eligibilityPending, 1); assert.equal(mixed.status, 'pending');
});

for (const [no, start, end, limit] of [
  [2, 'arrivalTime', 'ivtTime', 60 * M], [3, 'ivtTime', 'ivtSichTime', D],
  [6, 'admissionTime', 'rehabAssessmentTime', 48 * H], [9, 'admissionTime', 'deathTime', 7 * D],
  [10, 'carotidProcedureTime', 'carotidStrokeDeathTime', 30 * D],
  [11, 'cerebralAngiographyTime', 'angiographyStrokeDeathTime', D],
  [17, 'arrivalTime', 'evtDeviceTime', 90 * M], [18, 'evtStartTime', 'evtSichTime', D],
  [19, 'admissionTime', 'speechReassessmentTime', D],
  [20, 'intracranialProcedureTime', 'intracranialStrokeDeathTime', 30 * D],
  [24, 'skinPunctureTime', 'reperfusionTime', 60 * M],
]) test(`KPI ${no}: inclusive threshold, +1 ms, zero, negative duration`, () => {
  assert.equal(get(no, { [start]: at(0), [end]: at(limit) }).numerator, 1);
  assert.equal(get(no, { [start]: at(0), [end]: at(limit + 1) }).numerator, 0);
  assert.equal(get(no, { [start]: at(0), [end]: at(0) }).numerator, 1);
  const invalid = get(no, { [start]: at(1), [end]: at(0) });
  missing(invalid, end); assert.equal(invalid.numerator, 0);
});

test('IVT ≤45 secondary count, direct ≤90 and transfer ≤60 EVT', () => {
  assert.match(get(2, { ivtTime: at(45 * M) }).note, /≤45 min numerator: 1/);
  assert.match(get(2, { ivtTime: at(45 * M + 1) }).note, /≤45 min numerator: 0/);
  assert.equal(get(17, { arrivalMode: 'Transfer', evtDeviceTime: at(60 * M) }).numerator, 1);
  assert.equal(get(17, { arrivalMode: 'Transfer', evtDeviceTime: at(60 * M + 1) }).numerator, 0);
  missing(get(17, { arrivalMode: '' }), 'arrivalMode');
  assert.equal(get(2, { ivtGiven: 'No', ivtTime: '' }).value, 0);
  assert.equal(get(17, { evtGiven: 'No', evtDeviceTime: '', arrivalMode: '' }).value, 0);
});

test('sICH 24/36 hour conflict, auditable evidence, unknown is not negative', () => {
  for (const [no, prefix, start] of [[3, 'ivt', 'ivtTime'], [18, 'evt', 'evtStartTime']]) {
    const later = get(no, { [start]: at(0), [`${prefix}SichTime`]: at(36 * H) });
    assert.equal(later.numerator, 0); assert.match(later.note, /≤36 h: 1/);
    assert.match(get(no, { [start]: at(0), [`${prefix}SichTime`]: at(36 * H + 1) }).note, /≤36 h: 0/);
    for (const suffix of ['NihssIncrease4', 'QualifyingImaging']) {
      for (const value of ['', 'No']) {
        const result = get(no, { [`${prefix}${suffix}`]: value });
        missing(result, `${prefix}${suffix}`); assert.equal(result.numerator, 0);
      }
    }
    const diagnosedNo = get(no, { [`${prefix}Sich`]: 'No', [`${prefix}NihssIncrease4`]: '', [`${prefix}QualifyingImaging`]: '', [`${prefix}SichTime`]: '' });
    assert.deepEqual(diagnosedNo.missing, []); assert.equal(diagnosedNo.numerator, 0);
  }
});

test('negative outcome requires explicit completed observation', () => {
  for (const [no, outcome, completed] of [
    [3, 'ivtSich', 'ivt36HourFollowupComplete'], [18, 'evtSich', 'evt36HourFollowupComplete'],
    [9, 'diedInHospital', 'inHospital7DayFollowupComplete'],
    [10, 'carotidStrokeDeath', 'carotid30DayFollowupComplete'],
    [11, 'angiographyStrokeDeath', 'angiography24HourFollowupComplete'],
    [20, 'intracranialStrokeDeath', 'intracranial30DayFollowupComplete'],
  ]) {
    for (const value of ['', 'No']) missing(get(no, { [outcome]: 'No', [completed]: value }), completed);
    assert.deepEqual(get(no, { [outcome]: 'No', [completed]: 'Yes' }).missing, []);
    // A positive event establishes the endpoint before the full window ends.
    assert.deepEqual(get(no, { [completed]: 'No' }).missing, []);
  }
});

test('90-day actual follow-up date and mRS boundaries', () => {
  assert.equal(get(7, { mrs90Days: 0 }).value, 100);
  assert.equal(get(7, { mrs90Days: 2 }).value, 100);
  assert.equal(get(7, { mrs90Days: 3 }).value, 0);
  assert.equal(get(7, { mrs90Days: 6 }).value, 0);
  for (const value of [-1, 7, 1.5, '', true]) missing(get(7, { mrs90Days: value }), 'mrs90Days');
  for (const value of ['', '2026-03-31', '2026-04-02', '2026-02-30', '2026-04-01T00:00:00+05:30']) missing(get(7, { followupDate: value }), 'followupDate');
  missing(get(7, { onsetDate: '' }), 'onsetDate');
  const early = get(7, { followup90Days: 'No', followupDate: '', mrs90Days: '' });
  assert.equal(early.denominator, 0); assert.equal(early.eligibilityPending, 1); assert.equal(early.status, 'pending');
  // Leap-year day and local calendar date (not UTC calendar date).
  assert.equal(get(7, { onsetDate: '2024-02-29', followupDate: '2024-05-29' }).value, 100);
});

test('positive pressure-ulcer stages are required and nonordinal stages preserved', () => {
  for (const id of ['pressureUlcerInitialStage', 'pressureUlcerCurrentStage']) missing(get(12, { [id]: '' }), id);
  missing(get(12, { pressureUlcer: 'No' }), 'pressureUlcer');
  missing(get(12, { pressureUlcerCurrentStage: 'No pressure ulcer' }), 'pressureUlcer');
  missing(get(12, { pressureUlcer: 'No', pressureUlcerInitialStage: 'Stage 1', pressureUlcerCurrentStage: 'Stage 2' }), 'pressureUlcer');
  assert.equal(get(12, { pressureUlcer: 'No', pressureUlcerCurrentStage: 'No pressure ulcer' }).value, 0);
  assert.equal(get(12, { pressureUlcerInitialStage: 'Unstageable', pressureUlcerCurrentStage: 'Deep tissue pressure injury' }).numerator, 1);
});

test('explicit No pressure ulcer is complete with blank or absent stages', () => {
  for (const blankStage of ['', null, undefined]) {
    const result = get(12, { pressureUlcer: 'No', pressureUlcerInitialStage: blankStage, pressureUlcerCurrentStage: blankStage });
    assert.equal(result.numerator, 0);
    assert.equal(result.value, 0);
    assert.equal(result.status, 'complete');
    assert.deepEqual(result.missing, []);
  }
  // Supplying one optional stage does not require the other stage.
  for (const changes of [
    { pressureUlcerInitialStage: 'No pressure ulcer', pressureUlcerCurrentStage: '' },
    { pressureUlcerInitialStage: '', pressureUlcerCurrentStage: 'Stage 2' },
  ]) assert.equal(get(12, { pressureUlcer: 'No', ...changes }).status, 'complete');
  missing(get(12, { pressureUlcer: 'No', pressureUlcerInitialStage: '', pressureUlcerCurrentStage: 'Invalid stage' }), 'pressureUlcerCurrentStage');
});

test('ulcer stages and final TICI use conditional capture', () => {
  for (const id of ['pressureUlcerInitialStage', 'pressureUlcerCurrentStage'])
    assert.deepEqual(kpiFields.find(f => f.id === id).showIf, { field: 'pressureUlcer', values: ['Yes'] });
  assert.deepEqual(kpiFields.find(f => f.id === 'finalTici').showIfAny, [
    { field: 'evtGiven', values: ['Yes'] },
    { field: 'iaThrombolysis', values: ['Yes'] },
  ]);
});

test('KPI 21 denominator is all ischemic cases, not only EVD cases', () => {
  const result = calculateKpis([r, { diagnosis: 'Ischemic Stroke', evd: 'No' }, { diagnosis: 'Hemorrhagic Stroke' }], monthly)[20];
  assert.equal(result.numerator, 1); assert.equal(result.denominator, 2); assert.equal(result.value, 50);
  assert.equal(get(21, { ventriculitis: 'No' }).value, 0);
  assert.equal(get(21, { evd: 'No', ventriculitis: '' }).value, 0);
  missing(get(21, { ventriculitis: '' }), 'ventriculitis');
});

test('KPI 21 explicit post-EVD outcome needs no timestamps', () => {
  assert(!kpiFields.some(f => ['evdTime', 'ventriculitisTime'].includes(f.id)));
  const result = calculateKpis([{ diagnosis: 'Ischemic Stroke', evd: 'Yes', ventriculitis: 'Yes' }], monthly)[20];
  assert.equal(result.numerator, 1);
  assert.equal(result.denominator, 1);
  assert.equal(result.value, 100);
  assert.equal(result.status, 'complete');
  assert.deepEqual(result.missing, []);
});

test('TICI threshold and IA/EVT union count patients once', () => {
  for (const grade of ['2B', '2C', '3']) assert.equal(get(22, { finalTici: grade }).value, 100);
  for (const grade of ['0', '1', '2A']) assert.equal(get(22, { finalTici: grade }).value, 0);
  assert.equal(get(22, { iaThrombolysis: 'Yes', evtGiven: '' }).denominator, 1);
  assert.equal(get(22, { iaThrombolysis: 'No', evtGiven: 'Yes' }).denominator, 1);
  assert.equal(get(22, { iaThrombolysis: 'No', evtGiven: 'No', finalTici: '' }).status, 'not-applicable');
});

test('KPI 23 ambiguity preserves 120-minute provisional denominator', () => {
  for (const [duration, denominator] of [[0, 1], [120 * M, 1], [120 * M + 1, 0], [150 * M, 0], [150 * M + 1, 0]]) {
    const result = get(23, { evtDeviceTime: at(duration) });
    assert.equal(result.denominator, denominator); assert.equal(result.status, 'clarification'); assert.equal(result.value, null);
  }
  const unknownTime = get(23, { evtDeviceTime: '' });
  assert.equal(unknownTime.denominator, 0); assert.equal(unknownTime.eligibilityPending, 1);
  missing(unknownTime, 'evtDeviceTime');
});

test('KPI 24 retains all-ischemic denominator and exact reperfusion interval', () => {
  const result = calculateKpis([r, { diagnosis: 'Ischemic Stroke', evtGiven: 'No' }], monthly)[23];
  assert.equal(result.denominator, 2); assert.equal(result.numerator, 1); assert.equal(result.status, 'clarification'); assert.equal(result.value, null);
  missing(get(24, { reperfusionTime: '' }), 'reperfusionTime');
});

test('strict ISO-offset instants; reject invalid and unzoned datetime strings', () => {
  for (const invalid of ['2026-01-01T01:00', '2026-01-01T01:00:00', '2026-02-30T01:00:00+05:30', '2026-01-01T24:00:00+05:30', '2026-01-01', 'garbage', 0, true])
    missing(get(2, { ivtTime: invalid }), 'ivtTime');
  assert.equal(get(2, { arrivalTime: '2025-12-31T18:30:00Z', ivtTime: '2026-01-01T01:00:00+05:30' }).numerator, 1);
  assert.equal(get(2, { arrivalTime: '2025-12-31T18:30:00Z', ivtTime: '2026-01-01T01:00:00.001+05:30' }).numerator, 0);
});

test('averages retain sub-minute precision and report the proper waiting baseline', () => {
  assert.equal(get(1, { firstSliceTime: at(30 * M + 1) }).numerator, (30 * M + 1) / M);
  assert.equal(get(4, { neurologicalAssessmentTime: at(10 * M + 1) }).numerator, (10 * M + 1) / M);
  const result = get(14, { arrivalTime: at(-100 * M), imagingServiceTime: at(0), imagingStartTime: at(10 * M + 1) });
  assert.equal(result.value, (10 * M + 1) / M);
  missing(get(14, { imagingStartTime: at(4 * M) }), 'imagingStartTime');
});

test('inpatient imaging recognition is provisional; inpatient door metrics clarified', () => {
  assert.equal(get(1, { presentation: 'Inpatient stroke', recognitionTime: at(5 * M) }).numerator, 15);
  missing(get(1, { presentation: 'Inpatient stroke', recognitionTime: '' }), 'recognitionTime');
  for (const no of [2, 17]) assert.equal(get(no, { presentation: 'Inpatient stroke' }).status, 'clarification');
});

test('numeric blanks, booleans, negative values and zero denominators', () => {
  for (const value of ['', null, undefined, false, -1, NaN, Infinity, '  ', '1e2', 'two', 0.5]) {
    missing(get(8, { medicationErrors: value }), 'medicationErrors');
    missing(get(16, { falls: value }), 'falls');
  }
  assert.equal(get(8, { medicationErrors: 0 }).value, 0);
  assert.equal(get(8, { medicationErrors: '0' }).value, 0);
  assert.equal(get(8, { medicationErrors: 0 }, { ...monthly, medicationOpportunities: 0 }).status, 'not-applicable');
  assert.equal(get(8, {}, { ...monthly, medicationOpportunities: 0 }).status, 'pending');
  for (const [no, id] of [[8, 'medicationOpportunities'], [12, 'strokeUnitPatientDays'], [15, 'formularyDrugs']]) {
    missing(get(no, {}, { ...monthly, [id]: '' }), id);
    assert.equal(get(no, {}, { ...monthly, [id]: 0 }).status, 'pending');
  }
});

test('no treatment inferred from timing or evidence; no automatic clinical eligibility', () => {
  assert.equal(get(2, { ivtGiven: 'No' }).numerator, 0);
  missing(get(2, { ivtGiven: '' }), 'ivtGiven');
  assert.equal(get(3, { ivtGiven: 'No' }).denominator, 0);
  assert.equal(get(3, { ivtSich: 'No' }).numerator, 0);
  assert.equal(get(17, { evtGiven: 'No' }).numerator, 0);
  missing(get(2, { ivtIndicated: '' }), 'ivtIndicated');
  assert.equal(get(2, { age: 10 }).numerator, 1);
});

test('monthly inputs are independent of case eligibility and filtered by caller', () => {
  assert.equal(calculateKpis([], monthly)[14].value, 50);
  const prior = { ...r, arrivalTime: '2020-01-01T00:00:00+05:30', admissionTime: '2020-01-01T00:00:00+05:30' };
  assert.equal(calculateKpis([r, prior], monthly)[4].denominator, 2);
  assert.throws(() => calculateKpis(null), TypeError);
  assert.throws(() => calculateKpis([], null), TypeError);
});

console.log(`PASS: ${checks} KPI schema/calculation checks; all 24 indicators, strict offset timestamps, exact boundaries, missing eligibility, follow-up completeness, and source ambiguities.`);

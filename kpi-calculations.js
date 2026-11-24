/** Pure NABH KPI calculations. No IO, clock, persistence, or period filtering.
 * Caller supplies an episode cohort: admission month, otherwise arrival month.
 * Later outcomes update that original cohort. Unknown values are never No/0.
 * Datetimes require an explicit ISO offset or Z. All intervals use instants;
 * date-only follow-up is checked against onset's supplied local calendar date.
 * Ambiguous source formulae have value:null and provisional numerator/denominator.
 */
import { kpiFields } from './kpi-schema.js';

const fields = new Map(kpiFields.map(field => [field.id, field]));
const MINUTE = 60000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const yes = 'Yes';
const titles = [
  'Time to first slice of brain imaging for acute stroke',
  'IV thrombolysis within the defined time frame',
  'Symptomatic intracranial haemorrhage within 24 hours after IVT',
  'Time to detailed initial neurological assessment of admitted patients',
  'Initial dysphagia screening documented at admission',
  'Timely physiotherapy / rehabilitation referral or assessment',
  'Favorable functional outcome at 90-day follow-up',
  'Incidence of medication errors',
  'In-hospital mortality within 7 days of admission for acute stroke',
  'Stroke or death within 30 days after carotid intervention',
  'Stroke or death within 24 hours after diagnostic cerebral angiography',
  'New / worsening hospital-associated pressure ulcer',
  'Deep venous thrombosis after admission',
  'Waiting time for imaging services',
  'Thrombolytic agent stockouts',
  'Incidence of patient falls',
  'Timely acute endovascular treatment when indicated',
  'Symptomatic intracranial haemorrhage within 24 hours after EVT',
  'Speech therapist dysphagia reassessment within 24 hours of admission',
  'Stroke or death within 30 days after intracranial angioplasty / stenting',
  'Ventriculitis after EVD among all ischemic stroke patients',
  'Post-treatment reperfusion grade TICI 2B or higher',
  'LVO mechanical reperfusion: timely first pass / device and TICI 2B or higher',
  'LVO mechanical reperfusion: TICI 2B or higher within 60 minutes of puncture',
];
const ambiguities = {
  1: 'Source multiplies a time average by 100 while targeting <30 minutes. Provisional numerator is summed minutes; multiplier requires clarification. ER uses arrival; inpatient cases provisionally use recognition.',
  3: 'Formula/title specify 24 hours; remarks specify ≤36 hours. Provisional numerator uses ≤24 hours. Qualifying sICH requires NIHSS deterioration ≥4 plus the specified imaging finding.',
  4: 'Source does not define the timing baseline. Provisional numerator uses admission to detailed initial neurological assessment in minutes.',
  6: 'Formula counts referral within an organization-defined window; narrative counts specialist assessment within 48 hours. Provisional numerator uses assessment ≤48 hours; do not certify referral compliance.',
  13: 'Source prints a numerator/denominator without a multiplier. Provisional counts are shown; rate versus percentage requires clarification.',
  16: 'Source prints falls ×1000 but omits the denominator. No patient-day denominator is assumed.',
  18: 'Formula/title specify 24 hours; remarks specify ≤36 hours. Provisional numerator uses ≤24 hours. Qualifying sICH requires NIHSS deterioration ≥4 plus the specified imaging finding.',
  23: 'Source conflicts between 120 and 150 minutes; formula denominator is timely treated LVO patients, while narrative describes LVO patients more broadly. Provisional numerator/denominator use treated LVO with device ≤120 minutes and final TICI ≥2B.',
  24: 'Formula denominator is all ischemic stroke patients; narrative describes treated LVO. Numerator formula prints =60 while narrative says ≤60 minutes. Provisional denominator remains all ischemic stroke patients; numerator uses ≤60 minutes.',
};

function blank(value) { return value === undefined || value === null || value === ''; }
function validChoice(record, id) {
  const value = record?.[id];
  return fields.get(id)?.choices?.includes(value) ? value : null;
}
function numeric(value, { integer = true, max = Infinity } = {}) {
  if (blank(value) || typeof value === 'boolean' || (typeof value !== 'number' && typeof value !== 'string')) return null;
  if (typeof value === 'string' && !/^\d+(?:\.\d+)?$/.test(value)) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= max && (!integer || Number.isSafeInteger(number)) ? number : null;
}
function timestamp(value) {
  if (typeof value !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!m) return null;
  const [, ys, mos, ds, hs, mis, ss = '0', ms = '0', zone] = m;
  const [year, month, day, hour, minute, second] = [ys, mos, ds, hs, mis, ss].map(Number);
  if (month < 1 || month > 12 || day < 1 || hour > 23 || minute > 59 || second > 59) return null;
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, Number(ms.padEnd(3, '0')));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  let offset = 0;
  if (zone !== 'Z') {
    const oh = Number(zone.slice(1, 3)), om = Number(zone.slice(4));
    if (oh > 23 || om > 59) return null;
    offset = (oh * 60 + om) * MINUTE * (zone[0] === '+' ? 1 : -1);
  }
  return date.getTime() - offset;
}
function calendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return timestamp(`${value}T00:00:00Z`);
}

// Three-valued predicates allow a known exclusion to override unrelated blanks.
// Missing criteria survive when eligibility really cannot be established.
const pred = (value, missing = []) => ({ value, missing });
const is = (record, id, values = [yes]) => {
  const value = validChoice(record, id);
  return value === null ? pred(null, [id]) : pred(values.includes(value));
};
function all(...predicates) {
  if (predicates.some(p => p.value === false)) return pred(false);
  return predicates.some(p => p.value === null) ? pred(null, predicates.flatMap(p => p.missing)) : pred(true);
}
function any(...predicates) {
  if (predicates.some(p => p.value === true)) return pred(true);
  return predicates.some(p => p.value === null) ? pred(null, predicates.flatMap(p => p.missing)) : pred(false);
}
function diagnosis(record, allowed) {
  const value = validChoice(record, 'diagnosis');
  return value === null || value === 'Undetermined' ? pred(null, ['diagnosis']) : pred(allowed.includes(value));
}
const ischemic = r => diagnosis(r, ['Ischemic Stroke']);
const stroke = r => diagnosis(r, ['Ischemic Stroke', 'Hemorrhagic Stroke']);
const admitted = r => is(r, 'admitted');
const acute = r => is(r, 'acuteStroke');
const admittedStroke = r => all(admitted(r), stroke(r));

/** @returns {Array<{no:number,title:string,numerator:number,denominator:number|null,value:number|null,status:string,missing:string[],eligibilityPending:number,note?:string,unit?:string}>} */
export function calculateKpis(records, monthlyInputs = {}) {
  if (!Array.isArray(records)) throw new TypeError('records must be an array');
  if (!monthlyInputs || typeof monthlyInputs !== 'object' || Array.isArray(monthlyInputs)) throw new TypeError('monthlyInputs must be an object');
  // Null drafts are treated as empty records, never as eligible admissions.
  records = records.map(record => record && typeof record === 'object' && !Array.isArray(record) ? record : {});
  const results = titles.map((title, index) => ({
    no: index + 1, title, numerator: 0, denominator: 0, value: null,
    status: 'not-applicable', missing: [], eligibilityPending: 0,
  }));
  const state = results.map(result => ({ result, missing: new Set(), notes: [], clarification: Boolean(ambiguities[result.no]) }));
  function miss(ctx, index, id) { ctx.missing.add(`records[${index}].${id}`); }
  function choice(ctx, r, i, id) {
    const value = validChoice(r, id);
    if (value === null) miss(ctx, i, id);
    return value;
  }
  function number(ctx, r, i, id, options) {
    const value = numeric(r[id], options);
    if (value === null) miss(ctx, i, id);
    return value;
  }
  function elapsed(ctx, r, i, startId, endId) {
    const start = timestamp(r[startId]), end = timestamp(r[endId]);
    if (start === null) miss(ctx, i, startId);
    if (end === null) miss(ctx, i, endId);
    if (start === null || end === null) return null;
    if (end < start) { miss(ctx, i, `${endId} (before ${startId})`); return null; }
    return end - start;
  }
  function cohort(no, eligible, evaluate) {
    const ctx = state[no - 1];
    records.forEach((r, i) => {
      const eligibility = eligible(r);
      if (eligibility.value === null) {
        ctx.result.eligibilityPending++;
        eligibility.missing.forEach(id => miss(ctx, i, id));
      } else if (eligibility.value) {
        ctx.result.denominator++;
        evaluate(ctx, r, i);
      }
    });
    return ctx;
  }
  function flag(ctx, r, i, id) {
    if (choice(ctx, r, i, id) === yes) ctx.result.numerator++;
  }
  function windowEvent(ctx, r, i, flagId, startId, endId, window, completeId) {
    const outcome = choice(ctx, r, i, flagId);
    if (outcome === null) return null;
    // A recorded event establishes its own endpoint. A negative must have
    // explicit complete follow-up; an early No must remain pending.
    if (outcome === 'No') {
      if (choice(ctx, r, i, completeId) !== yes) miss(ctx, i, completeId);
      return null;
    }
    const duration = elapsed(ctx, r, i, startId, endId);
    if (duration !== null && duration <= window) ctx.result.numerator++;
    return duration;
  }
  function door(ctx, r, i) {
    const presentation = choice(ctx, r, i, 'presentation');
    if (presentation === 'ER arrival') return 'arrivalTime';
    if (presentation === 'Inpatient stroke') {
      if (ctx.result.no !== 1) {
        ctx.clarification = true;
        ctx.notes.push('Source does not define a door baseline for inpatient stroke. Recognition time is provisional.');
      }
      return 'recognitionTime';
    }
    return null;
  }
  function monthly(ctx, id) {
    const value = numeric(monthlyInputs[id]);
    if (value === null) ctx.missing.add(`monthlyInputs.${id}`);
    return value;
  }

  const c1 = cohort(1, r => all(acute(r), is(r, 'brainImaging')), (ctx, r, i) => {
    const start = door(ctx, r, i);
    if (start) {
      const duration = elapsed(ctx, r, i, start, 'firstSliceTime');
      if (duration !== null) ctx.result.numerator += duration / MINUTE;
    }
  });
  c1.result.unit = 'minutes (multiplier unresolved)';

  let ivt45 = 0;
  const c2 = cohort(2, r => all(acute(r), ischemic(r), is(r, 'ivtIndicated')), (ctx, r, i) => {
    if (choice(ctx, r, i, 'ivtGiven') !== yes) return;
    const start = door(ctx, r, i);
    if (!start) return;
    const duration = elapsed(ctx, r, i, start, 'ivtTime');
    if (duration !== null && duration <= 60 * MINUTE) ctx.result.numerator++;
    if (duration !== null && duration <= 45 * MINUTE) ivt45++;
  });
  c2.notes.push(`Primary window ≤60 min; known ≤45 min numerator: ${ivt45}. Denominator follows the formula: acute ischemic cases with IVT indicated, including untreated cases. Remarks benchmark treated patients (>75%/≥75% wording differs); do not infer target compliance.`);

  for (const [no, treatment, event, start, end, complete, nihss, imaging] of [
    [3, 'ivtGiven', 'ivtSich', 'ivtTime', 'ivtSichTime', 'ivt36HourFollowupComplete', 'ivtNihssIncrease4', 'ivtQualifyingImaging'],
    [18, 'evtGiven', 'evtSich', 'evtStartTime', 'evtSichTime', 'evt36HourFollowupComplete', 'evtNihssIncrease4', 'evtQualifyingImaging'],
  ]) {
    let within36 = 0;
    const ctx = cohort(no, r => is(r, treatment), (c, r, i) => {
      if (validChoice(r, event) === yes) {
        const clinical = choice(c, r, i, nihss), image = choice(c, r, i, imaging);
        if (clinical !== yes || image !== yes) {
          if (clinical === 'No') miss(c, i, `${nihss} (conflicts with ${event})`);
          if (image === 'No') miss(c, i, `${imaging} (conflicts with ${event})`);
          return;
        }
      }
      const duration = windowEvent(c, r, i, event, start, end, DAY, complete);
      if (duration !== null && duration <= 36 * HOUR) within36++;
    });
    ctx.notes.push(`Known qualifying events within ≤36 h: ${within36}.`);
  }

  const c4 = cohort(4, admitted, (ctx, r, i) => {
    const duration = elapsed(ctx, r, i, 'admissionTime', 'neurologicalAssessmentTime');
    if (duration !== null) ctx.result.numerator += duration / MINUTE;
  });
  c4.result.unit = 'minutes (baseline unresolved)';
  cohort(5, admitted, (ctx, r, i) => flag(ctx, r, i, 'dysphagiaDocumented'));
  let knownReferrals = 0;
  const c6 = cohort(6, admittedStroke, (ctx, r, i) => {
    const referral = choice(ctx, r, i, 'rehabReferred');
    if (referral === yes && elapsed(ctx, r, i, 'admissionTime', 'rehabReferralTime') !== null) knownReferrals++;
    if (choice(ctx, r, i, 'rehabAssessed') === yes) {
      const duration = elapsed(ctx, r, i, 'admissionTime', 'rehabAssessmentTime');
      if (duration !== null && duration <= 48 * HOUR) ctx.result.numerator++;
    }
  });
  c6.notes.push(`Known referrals with a valid admission-to-referral interval: ${knownReferrals}; referral window is not defined by source.`);
  cohort(7, r => {
    // No means follow-up not yet completed, not a known clinical exclusion.
    const followed = validChoice(r, 'followup90Days') === yes ? pred(true) : pred(null, ['followup90Days']);
    const onsetDay = calendarDate(r.onsetDate);
    const visit = calendarDate(r.followupDate);
    const dateMissing = [];
    if (onsetDay === null) dateMissing.push('onsetDate');
    if (visit === null) dateMissing.push('followupDate');
    if (onsetDay !== null && visit !== null && visit - onsetDay !== 90 * DAY) dateMissing.push('followupDate (not 90 days after onset)');
    const dated = dateMissing.length ? pred(null, dateMissing) : pred(true);
    return all(stroke(r), followed, followed.value ? dated : pred(true));
  }, (ctx, r, i) => {
    const mrs = number(ctx, r, i, 'mrs90Days', { max: 6 });
    if (mrs !== null && mrs <= 2) ctx.result.numerator++;
  });

  const c8 = state[7];
  records.forEach((r, i) => {
    const count = number(c8, r, i, 'medicationErrors');
    if (count !== null) c8.result.numerator += count;
  });
  c8.result.denominator = monthly(c8, 'medicationOpportunities');
  cohort(9, r => all(acute(r), admitted(r)), (ctx, r, i) =>
    windowEvent(ctx, r, i, 'diedInHospital', 'admissionTime', 'deathTime', 7 * DAY, 'inHospital7DayFollowupComplete'));
  for (const [no, eligible, flagId, startId, endId, window, complete] of [
    [10, 'carotidProcedure', 'carotidStrokeDeath', 'carotidProcedureTime', 'carotidStrokeDeathTime', 30 * DAY, 'carotid30DayFollowupComplete'],
    [11, 'cerebralAngiography', 'angiographyStrokeDeath', 'cerebralAngiographyTime', 'angiographyStrokeDeathTime', DAY, 'angiography24HourFollowupComplete'],
    [20, 'intracranialProcedure', 'intracranialStrokeDeath', 'intracranialProcedureTime', 'intracranialStrokeDeathTime', 30 * DAY, 'intracranial30DayFollowupComplete'],
  ]) cohort(no, r => is(r, eligible), (ctx, r, i) => windowEvent(ctx, r, i, flagId, startId, endId, window, complete));

  const c12 = cohort(12, admitted, (ctx, r, i) => {
    const outcome = choice(ctx, r, i, 'pressureUlcer');
    if (outcome === null) return;
    // Stages substantiate a positive outcome. For an explicit negative they
    // are optional, but any supplied values still undergo conflict checks.
    const stage = id => outcome === yes || !blank(r[id]) ? choice(ctx, r, i, id) : null;
    const initial = stage('pressureUlcerInitialStage');
    const current = stage('pressureUlcerCurrentStage');
    if (outcome === yes && (initial === null || current === null)) return;
    const initialStage = /^Stage ([1-4])$/.exec(initial);
    const currentStage = /^Stage ([1-4])$/.exec(current);
    const increasedStage = initialStage && currentStage && Number(currentStage[1]) > Number(initialStage[1]);
    if (outcome === yes && initial === 'No pressure ulcer' && current === 'No pressure ulcer') {
      miss(ctx, i, 'pressureUlcer (positive outcome conflicts with absent ulcer stages)');
    } else if (outcome === 'No' && initial === 'No pressure ulcer' && current !== null && current !== 'No pressure ulcer') {
      miss(ctx, i, 'pressureUlcer (negative outcome conflicts with new ulcer)');
    } else if (outcome === 'No' && increasedStage) {
      miss(ctx, i, 'pressureUlcer (negative outcome conflicts with increased stage)');
    } else if (outcome === yes) ctx.result.numerator++;
    // No numeric ordering is invented for unstageable or deep tissue injuries;
    // worsening is the explicit documented clinical outcome, with both stages.
  });
  c12.result.denominator = monthly(c12, 'strokeUnitPatientDays');
  c12.result.unit = 'per 100 stroke-unit patient days';
  const c13 = cohort(13, admitted, (ctx, r, i) => flag(ctx, r, i, 'dvtAfterAdmission'));
  c13.result.unit = 'ratio or % (multiplier unresolved)';
  const c14 = cohort(14, r => is(r, 'diagnosticImaging'), (ctx, r, i) => {
    const duration = elapsed(ctx, r, i, 'imagingServiceTime', 'imagingStartTime');
    if (duration !== null) ctx.result.numerator += duration / MINUTE;
  });
  c14.result.unit = 'minutes';
  c14.notes.push('Waiting baseline is service arrival / requisition presentation, or scheduled appointment time; not hospital arrival.');
  const c15 = state[14];
  c15.result.numerator = monthly(c15, 'stockouts');
  c15.result.denominator = monthly(c15, 'formularyDrugs');
  c15.result.unit = 'stockout instances per 100 formulary thrombolytic drugs';
  const c16 = state[15];
  c16.result.denominator = null;
  c16.result.unit = 'falls ×1000 / unresolved denominator';
  records.forEach((r, i) => {
    const count = number(c16, r, i, 'falls');
    if (count !== null) c16.result.numerator += count;
  });
  cohort(17, r => all(acute(r), ischemic(r), is(r, 'evtIndicated')), (ctx, r, i) => {
    if (choice(ctx, r, i, 'evtGiven') !== yes) return;
    const mode = choice(ctx, r, i, 'arrivalMode');
    const start = door(ctx, r, i);
    if (!mode || !start) return;
    const duration = elapsed(ctx, r, i, start, 'evtDeviceTime');
    if (duration !== null && duration <= (mode === 'Transfer' ? 60 : 90) * MINUTE) ctx.result.numerator++;
  });
  cohort(19, admitted, (ctx, r, i) => {
    if (choice(ctx, r, i, 'speechReassessed') !== yes) return;
    const duration = elapsed(ctx, r, i, 'admissionTime', 'speechReassessmentTime');
    if (duration !== null && duration <= DAY) ctx.result.numerator++;
  });
  cohort(21, ischemic, (ctx, r, i) => {
    if (choice(ctx, r, i, 'evd') !== yes) return;
    // The explicit outcome means AFTER EVD; source defines no latency window.
    flag(ctx, r, i, 'ventriculitis');
  });
  function tici(ctx, r, i) {
    const grade = choice(ctx, r, i, 'finalTici');
    return grade === null ? null : ['2B', '2C', '3'].includes(grade);
  }
  cohort(22, r => all(ischemic(r), any(is(r, 'iaThrombolysis'), is(r, 'evtGiven'))), (ctx, r, i) => {
    if (tici(ctx, r, i) === true) ctx.result.numerator++;
  });
  // KPI 23's printed formula has a time-dependent denominator. Unknown timing
  // means unknown eligibility, not an eligible failure or a silent exclusion.
  const c23 = state[22];
  records.forEach((r, i) => {
    const eligibility = all(ischemic(r), is(r, 'largeVesselOcclusion'), is(r, 'evtGiven'));
    if (eligibility.value === false) return;
    if (eligibility.value === null) {
      c23.result.eligibilityPending++;
      eligibility.missing.forEach(id => miss(c23, i, id));
      return;
    }
    const duration = elapsed(c23, r, i, 'arrivalTime', 'evtDeviceTime');
    if (duration === null) { c23.result.eligibilityPending++; return; }
    if (duration <= 120 * MINUTE) {
      c23.result.denominator++;
      if (tici(c23, r, i) === true) c23.result.numerator++;
    }
  });
  cohort(24, ischemic, (ctx, r, i) => {
    const eligible = all(is(r, 'largeVesselOcclusion'), is(r, 'evtGiven'));
    if (eligible.value === false) return;
    if (eligible.value === null) { eligible.missing.forEach(id => miss(ctx, i, id)); return; }
    const reperfused = tici(ctx, r, i);
    if (reperfused !== true) return;
    const duration = elapsed(ctx, r, i, 'skinPunctureTime', 'reperfusionTime');
    if (duration !== null && duration <= 60 * MINUTE) ctx.result.numerator++;
  });

  for (const ctx of state) {
    const r = ctx.result;
    r.missing = [...ctx.missing].sort();
    const notes = [ambiguities[r.no], ...new Set(ctx.notes)].filter(Boolean);
    if (r.eligibilityPending) notes.push(`Eligibility pending for ${r.eligibilityPending} episode(s); known denominator is provisional.`);
    if (r.missing.length) notes.push('Counts are provisional until missing eligibility / outcomes / monthly inputs are resolved.');
    if (notes.length) r.note = notes.join(' ');
    r.unit ??= '%';
    if (ctx.clarification) r.status = 'clarification';
    else if (r.missing.length) r.status = 'pending';
    else if (r.denominator === 0) {
      r.status = r.numerator > 0 ? 'pending' : 'not-applicable';
      if (r.numerator > 0) {
        r.missing.push('denominator (zero with nonzero numerator)');
        r.note = [r.note, 'Nonzero numerator with zero denominator requires review.'].filter(Boolean).join(' ');
      }
    } else {
      r.status = 'complete';
      r.value = r.no === 14 ? r.numerator / r.denominator : r.numerator / r.denominator * 100;
    }
  }
  return results;
}

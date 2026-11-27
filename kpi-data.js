import { kpiFields, hospitalFields, kpiSource, kpiSchemaVersion } from './kpi-schema.js';
import { compareEntries } from './entry-order.js';
import { currentFieldValues } from './protocol-field-output.js';

const MAX_VALUE = 4000;
const own = (object, key) => Object.hasOwn(object, key);
const isMap = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = code => { throw new Error(code); };

function definitionsMap(definitions) {
  if (!Array.isArray(definitions)) fail('invalid-kpi-definitions');
  const result = new Map();
  for (const definition of definitions) {
    if (!definition || typeof definition.id !== 'string' || !definition.id
      || result.has(definition.id) || ['__proto__', 'constructor', 'prototype'].includes(definition.id)
      || !['text', 'datetime', 'date', 'number', 'choice'].includes(definition.type)) fail('invalid-kpi-definitions');
    if (definition.type === 'choice' && (!Array.isArray(definition.choices)
      || !definition.choices.length || definition.choices.some(value => typeof value !== 'string')
      || new Set(definition.choices.map(value => value.toLowerCase())).size !== definition.choices.length)) fail('invalid-kpi-definitions');
    result.set(definition.id, definition);
  }
  return result;
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return year >= 1 && month >= 1 && month <= 12 && day >= 1
    && day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

function validDatetime(value) {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match || !validDate(match[1]) || +match[2] > 23 || +match[3] > 59 || +(match[4] || 0) > 59) return false;
  const zone = match[6];
  return (zone === 'Z' || (+zone.slice(1, 3) <= 23 && +zone.slice(4) <= 59))
    && Number.isFinite(Date.parse(value));
}

/** Strict extraction/manual-edit boundary. Empty strings clear only when opted in. */
export function normalizeKpiFields(fields, definitions = kpiFields, { allowEmpty = false } = {}) {
  const allowed = definitionsMap(definitions);
  if (!Array.isArray(fields) || fields.length > allowed.size) fail('invalid-kpi-fields');
  const values = {};
  for (const field of fields) {
    if (!isMap(field) || typeof field.id !== 'string' || !allowed.has(field.id)
      || own(values, field.id) || typeof field.value !== 'string' || field.value.length > MAX_VALUE) fail('invalid-kpi-fields');
    const definition = allowed.get(field.id);
    let value = field.value.trim();
    if (!value) {
      if (!allowEmpty) fail('empty-kpi-value');
    } else if (definition.type === 'choice') {
      value = definition.choices.find(choice => choice.toLowerCase() === value.toLowerCase());
      if (value === undefined) fail('invalid-kpi-choice');
    } else if (definition.type === 'number') {
      if (!/^\d+(?:\.\d+)?$/.test(value) || !Number.isFinite(Number(value))) fail('invalid-kpi-number');
      const number = Number(value);
      const isMrs = /mrs/i.test(definition.id);
      const maximum = definition.id === 'age' ? 130 : isMrs ? 6 : Infinity;
      if (number < Math.max(0, definition.min ?? 0) || number > Math.min(maximum, definition.max ?? Infinity)
        || ((isMrs || definition.integer === true) && !Number.isInteger(number))) fail('invalid-kpi-number');
    } else if (definition.type === 'date' && !validDate(value)) fail('invalid-kpi-date');
    else if (definition.type === 'datetime' && !validDatetime(value)) fail('invalid-kpi-datetime');
    values[field.id] = value;
  }
  return values;
}

// Alias for callers which describe normalization as validation. Both return a string map.
export const validateKpiFields = normalizeKpiFields;

function mergedEntries(entries, definitions) {
  const allowed = definitionsMap(definitions), result = {};
  const ordered = Object.entries(isMap(entries) ? entries : {})
    .filter(([, entry]) => isMap(entry) && entry.source === kpiSource
      && entry.version === kpiSchemaVersion && isMap(entry.fields))
    .sort(([aId,a],[bId,b])=>compareEntries(a,b,aId,bId));
  for (const [, entry] of ordered) {
    for (const [id, value] of Object.entries(entry.fields)) {
      if (allowed.has(id) && typeof value === 'string' && value.length <= MAX_VALUE
        && (value.trim() || entry.kind === 'manual-edit')) result[id] = value;
    }
  }
  return result;
}

/** Identity only: patient data, then explicit protocol mappings, then KPI takes.
 * NIL placeholders are absent evidence; a mapped manual clear stays explicit.
 * Protocol clinical values never become KPI evidence.
 */
export function currentKpiValues(data = {}) {
  const values = {}, patient = isMap(data.patientData) ? data.patientData : {};
  const legacy = currentFieldValues(data.protocolDictations?.page1, 1);
  for (const id of ['name', 'age', 'uhid']) {
    const direct = patient[id];
    if (typeof direct === 'string' && direct.length <= MAX_VALUE && direct.trim()
      && !/^nil$/i.test(direct.trim())) values[id] = direct.trim();
    if (own(legacy, id)) {
      const mapped = legacy[id].value;
      // currentFieldValues admits a blank value only from a manual edit.
      if (typeof mapped === 'string' && mapped.length <= MAX_VALUE
        && !/^nil$/i.test(mapped.trim())) values[id] = mapped.trim();
    }
  }
  return Object.assign(values, mergedEntries(data.kpiEntries, kpiFields));
}

export function currentMonthlyValues(data = {}) {
  return mergedEntries(data.kpiMonthlyEntries, hospitalFields);
}

/** Gemini-style response schema, matching the existing protocol extraction API. */
export function kpiResponseSchema(definitions = kpiFields) {
  const allowed = definitionsMap(definitions);
  return { type: 'OBJECT', properties: {
    text: { type: 'STRING' },
    warnings: { type: 'ARRAY', items: { type: 'STRING' } },
    fields: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
      id: { type: 'STRING', enum: [...allowed.keys()] }, value: { type: 'STRING' }
    }, required: ['id', 'value'] } }
  }, required: ['text', 'fields'] };
}

export function kpiContract(definitions = kpiFields) {
  return [...definitionsMap(definitions).values()].map(definition => ({
    id: definition.id, label: definition.label, type: definition.type,
    ...(definition.choices ? { choices: [...definition.choices] } : {}),
    ...(definition.showIf ? { showIf: { field: definition.showIf.field, values: [...definition.showIf.values] } } : {}),
    ...(definition.kpis ? { kpis: [...definition.kpis] } : {}),
    instructions: [
      'Return string values of at most 4000 characters. Use only these exact field IDs. Omit unknown or unstated values; do not infer clinical facts or negatives. Do not emit empty strings or duplicate IDs.',
      definition.type === 'datetime' ? 'Use an explicit ISO 8601 datetime with timezone: YYYY-MM-DDTHH:mm:ssZ or YYYY-MM-DDTHH:mm:ss+05:30 (minutes-only and fractional seconds are accepted). Preserve the exact supplied datetime string and timezone. Never guess a timezone, convert a date-only value, or invent a time.' : '',
      definition.type === 'date' ? 'Use an actual calendar date in the exact string format YYYY-MM-DD.' : '',
      definition.type === 'choice' ? 'Use one of the exact strings in choices; do not substitute labels or codes.' : '',
      definition.type === 'number' ? `Use a finite nonnegative decimal string, without units or exponent notation.${definition.id === 'age' ? ' Age must be at most 130.' : ''}${/mrs/i.test(definition.id) ? ' Modified Rankin Scale must be an integer from 0 through 6.' : ''}` : ''
    ].filter(Boolean).join(' ')
  }));
}

/** Preserve source cohort exclusions without hiding imported cases from the workspace. */
export function isKpiReportingCase(data = {}) {
 const value=currentKpiValues(data).includeInReporting;
 return value==='Yes';
}

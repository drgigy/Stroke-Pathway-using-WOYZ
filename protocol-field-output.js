import { protocolFields, protocolFieldSource, protocolFieldVersion } from './protocol-fields.js';

export { protocolFieldSource, protocolFieldVersion };
export function fieldContract(pageNumber) {
  const fields = protocolFields[pageNumber - 1];
  if (!fields) throw new Error('page-fields-unavailable');
  return fields.map(({ id, label, kind, options }) => ({ id, label, ...(options ? { choices: options.map(option => option.value) } : {}), ...(kind === 'yesno' || kind === 'check' ? { rule: 'Use Yes or No only if explicitly dictated. Preserve uncertainty or additional details as text; do not infer from a number or printed threshold.' } : {}) }));
}
export function fieldResponseSchema(pageNumber) {
  return { type: 'OBJECT', properties: {
    text: { type: 'STRING' },
    fields: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
      id: { type: 'STRING', enum: fieldContract(pageNumber).map(field => field.id) },
      value: { type: 'STRING' }
    }, required: ['id', 'value'] } }
  }, required: ['text', 'fields'] };
}
export function validateFieldOutput(parsed, pageNumber) {
  if (!parsed || typeof parsed.text !== 'string' || !parsed.text.trim() || parsed.text.length > 60000 || !Array.isArray(parsed.fields)) throw new Error('invalid-output');
  const allowed = new Set(fieldContract(pageNumber).map(field => field.id));
  if (parsed.fields.length > allowed.size) throw new Error('invalid-fields');
  const fields = {};
  for (const field of parsed.fields) {
    if (!field || !allowed.has(field.id) || Object.hasOwn(fields, field.id) || typeof field.value !== 'string' || !field.value.trim() || field.value.length > 12000) throw new Error('invalid-fields');
    fields[field.id] = field.value.trim();
  }
  return { text: parsed.text.trim(), fields };
}
function entryTime(entry) {
  return Number.isFinite(entry.createdAt?.seconds) ? entry.createdAt.seconds : (Date.parse(entry.recordedAt || '') || 0) / 1000;
}
export function orderedDictations(dictations) {
  return Object.entries(dictations || {}).filter(([, entry]) => entry && typeof entry.text === 'string').sort((a, b) =>
    entryTime(a[1]) - entryTime(b[1])
    || (a[1].createdAt?.nanoseconds || 0) - (b[1].createdAt?.nanoseconds || 0)
    || String(a[1].recordedAt || '').localeCompare(String(b[1].recordedAt || '')) || a[0].localeCompare(b[0]));
}
export function currentFieldValues(dictations, pageNumber) {
  const allowed = new Set(fieldContract(pageNumber).map(field => field.id)), values = {};
  for (const [takeId, entry] of orderedDictations(dictations)) {
    if (entry.fieldSource !== protocolFieldSource || entry.fieldVersion !== protocolFieldVersion || entry.pageNumber !== pageNumber) continue;
    for (const [id, value] of Object.entries(entry.fields || {})) {
      if (allowed.has(id) && typeof value === 'string' && value.trim()) values[id] = { value, takeId };
    }
  }
  return values;
}

import { protocolFields, protocolFieldSource, protocolFieldVersion, protocolLegacyRevisions } from './protocol-fields.js';

export { protocolFieldSource, protocolFieldVersion };
export function fieldContract(pageNumber) {
  const fields = protocolFields[pageNumber - 1];
  if (!fields) throw new Error('page-fields-unavailable');
  return fields.map(({ id, label, kind, options }) => ({ id, label, ...(options ? { choices: options.map(option => option.value) } : {}), ...(kind === 'binary' ? { rule: 'Yes/No only: Yes if the condition or history is explicitly stated present, No if explicitly denied. Omit unknown/unstated values. Never derive a condition from measurements or treatment. Preserve qualifications in other_details and full text.' } : {}), ...(kind === 'yesno' || kind === 'check' ? { rule: id === 'reason_anticoagulation' ? 'Use Yes only when anticoagulation is explicitly dictated as a reason for non-treatment with thrombolysis; No only for an explicit denial of that reason. Medication use alone does not establish non-treatment. Omit unknown/unstated values; never infer eligibility or a contraindication.' : 'Use Yes or No only if explicitly dictated. Preserve uncertainty or additional details as text; do not infer from a number or printed threshold.' } : {}) }));
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
  const definitions = protocolFields[pageNumber - 1];
  if (parsed.fields.length > allowed.size) throw new Error('invalid-fields');
  const fields = {};
  for (const field of parsed.fields) {
    if (!field || !allowed.has(field.id) || Object.hasOwn(fields, field.id) || typeof field.value !== 'string' || !field.value.trim() || field.value.length > 12000) throw new Error('invalid-fields');
    if ((definitions.find(def => def.id === field.id).kind === 'binary' || field.id === 'reason_anticoagulation') && !/^(yes|no)$/i.test(field.value.trim())) throw new Error('invalid-binary-value');
    fields[field.id] = (definitions.find(def => def.id === field.id).kind === 'binary' || field.id === 'reason_anticoagulation') ? (/^yes$/i.test(field.value.trim()) ? 'Yes' : 'No') : field.value.trim();
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
    if (entry.pageNumber !== pageNumber) continue;
    const current=entry.fieldSource===protocolFieldSource&&entry.fieldVersion===protocolFieldVersion;
    const legacy=current?null:protocolLegacyRevisions.find(revision=>entry.fieldSource===revision.source&&entry.fieldVersion===revision.version);
    if(!current&&!legacy)continue;
    for (const [rawId, value] of Object.entries(entry.fields || {})) {
      if(legacy?.unavailableFields.includes(rawId))continue;
      const id=legacy?.fieldAliases[pageNumber]?.[rawId]||rawId;
      if (allowed.has(id) && typeof value === 'string' && (value.trim() || entry.kind === 'manual-edit')) values[id] = { value, takeId };
    }
  }
  return values;
}

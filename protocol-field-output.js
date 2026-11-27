import { protocolFields, protocolFieldSource, protocolFieldVersion, protocolLegacyRevisions } from './protocol-fields.js';

import { compareEntries } from './entry-order.js';

export { protocolFieldSource, protocolFieldVersion };
export function fieldContract(pageNumber) {
  const fields = protocolFields[pageNumber - 1];
  if (!fields) throw new Error('page-fields-unavailable');
  return fields.filter(field=>!field.calculated).map(({ id, label, kind, options }) => ({ id, label, ...(pageNumber===2&&['er_arrival','scan_start','ivt_start','first_pass','recanalisation'].includes(id)?{rule:'Event timestamp only, not a duration. If a full date and time are explicitly known, format YYYY-MM-DDTHH:mm:ss+05:30. With a clock time only, use HH:mm for explicit 24-hour time or h:mm AM/PM for an explicit meridiem. Do not assume a date, AM/PM or midnight crossing. Preserve uncertainty in the full text and other_details.'}:{}), ...(options ? { choices: options.map(option => option.value) } : {}), ...(kind === 'binary' ? { rule: 'Yes/No only: Yes if the condition or history is explicitly stated present, No if explicitly denied. Omit unknown/unstated values. Never derive a condition from measurements or treatment. Preserve qualifications in other_details and full text.' } : {}), ...(kind === 'yesno' || kind === 'check' ? { rule: id === 'reason_anticoagulation' ? 'Use Yes only when anticoagulation is explicitly dictated as a reason for non-treatment with thrombolysis; No only for an explicit denial of that reason. Medication use alone does not establish non-treatment. Omit unknown/unstated values; never infer eligibility or a contraindication.' : 'Use Yes or No only if explicitly dictated. Preserve uncertainty or additional details as text; do not infer from a number or printed threshold.' } : {}) }));
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
export function orderedDictations(dictations) {
  return Object.entries(dictations || {}).filter(([, entry]) => entry && typeof entry.text === 'string')
    .sort(([aId,a],[bId,b])=>compareEntries(a,b,aId,bId));
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
      // Retain old full transcripts in history without displaying them as consultant remarks.
      if(pageNumber===3&&rawId==='consultant_comments'&&entry.kind==='dictation'&&entry.consultantAppend===true&&entry.processingMode==='server-case-wide-v1'&&entry.consultantCommentMode!=='explicit-v1'&&typeof value==='string'&&value.trim()===entry.text.trim())continue;
      const id=legacy?.fieldAliases[pageNumber]?.[rawId]||rawId;
      if (allowed.has(id) && typeof value === 'string' && (value.trim() || entry.kind === 'manual-edit')) values[id] = { value: pageNumber===3&&id==='consultant_comments'&&entry.consultantAppend===true&&entry.kind==='dictation'&&entry.processingMode==='server-case-wide-v1'&&values[id]?.value ? values[id].value+'\n\n'+value : value, takeId };
    }
  }
  return values;
}

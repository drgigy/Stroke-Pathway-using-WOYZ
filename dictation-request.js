import { fieldContract } from './protocol-field-output.js';
import { kpiContract } from './kpi-data.js';
import { kpiFields } from './kpi-schema.js';

// Lossless factoring of repeated instructions, not removal of clinical fields.
export function compactContract(contract, ruleKey) {
  const ruleSets = [];
  const fields = contract.map(field => {
    const { [ruleKey]: rule, ...definition } = field;
    if (rule === undefined) return definition;
    let index = ruleSets.indexOf(rule);
    if (index === -1) index = ruleSets.push(rule) - 1;
    return { ...definition, ruleSet: index };
  });
  return { ruleSets, fields };
}

const formContracts = new Map(), kpiContracts = new WeakMap();
function serialize(contract, ruleKey) {
  return 'For each field, ruleSet is a ZERO-BASED index into ruleSets. Apply that shared instruction verbatim to that field. All field IDs, labels, types, choices and conditions below remain binding.\n'
    + JSON.stringify(compactContract(contract, ruleKey));
}
export function compactFormContract(page) {
  if (!formContracts.has(page)) formContracts.set(page, serialize(fieldContract(page), 'rule'));
  return formContracts.get(page);
}
export function compactKpiContract(definitions = kpiFields) {
  if (!kpiContracts.has(definitions)) kpiContracts.set(definitions, serialize(kpiContract(definitions), 'instructions'));
  return kpiContracts.get(definitions);
}

export function prepareDictationRequest(active) {
  if (active.kind === 'kpi') compactKpiContract(active.fieldDefinitions);
  else {
    compactFormContract(active.pageNumber);
    if (active.kind === 'protocol-kpi') compactKpiContract();
  }
}

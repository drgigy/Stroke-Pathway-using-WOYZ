import assert from 'node:assert/strict';
import { fieldContract } from '../protocol-field-output.js';
import { kpiContract } from '../kpi-data.js';
import { kpiFields, kpiSections } from '../kpi-schema.js';
import { compactContract, compactFormContract, compactKpiContract } from '../dictation-request.js';

function expand({ ruleSets, fields }, key) {
  return fields.map(({ ruleSet, ...field }) => ruleSet === undefined ? field : { ...field, [key]: ruleSets[ruleSet] });
}
const parse = text => JSON.parse(text.slice(text.indexOf('\n') + 1));
const kpi = kpiContract();
assert.deepEqual(expand(parse(compactKpiContract()), 'instructions'), kpi);
for (const section of kpiSections) {
  const definitions = kpiFields.filter(field => section.fields.some(item => item.id === field.id));
  assert.deepEqual(expand(parse(compactKpiContract(definitions)), 'instructions'), kpiContract(definitions));
}
const sizes = [];
for (let page = 1; page <= 9; page++) {
  const original = fieldContract(page), text = compactFormContract(page);
  assert.deepEqual(expand(parse(text), 'rule'), original);
  assert.deepEqual(expand(compactContract(original, 'rule'), 'rule'), original);
  const before = JSON.stringify(original).length + JSON.stringify(kpi).length;
  const after = text.length + compactKpiContract().length;
  assert(after < before * .65, 'Combined contracts should be at least 35% smaller without losing any definition');
  sizes.push({ page, beforeCharacters: before, afterCharacters: after, reductionPercent: Math.round((1 - after / before) * 100) });
}
assert(compactFormContract(1).includes('Never derive a condition from measurements or treatment'));
assert(compactKpiContract().includes('Never guess a timezone'));
assert(compactKpiContract().includes('Age must be at most 130'));
assert(compactKpiContract().includes('Modified Rankin Scale must be an integer from 0 through 6'));
console.log(JSON.stringify({ result: 'PASS: exact round-trip of every field, rule, label, choice, condition and KPI membership; all nine pages and every parameter section', sizes }, null, 2));

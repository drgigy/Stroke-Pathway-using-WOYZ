import assert from 'node:assert/strict';
import {kpiParameterGuide,kpiSupportingGuide,kpiLaterFieldVisible} from '../kpi-parameter-guide.js';
import {kpiDefinitions} from '../kpi-policy.js';
import {kpiFields,hospitalFields} from '../kpi-schema.js';
assert.equal(kpiParameterGuide.length,9);
const ids=[...kpiParameterGuide,kpiSupportingGuide].flatMap(g=>g.fields);assert.equal(ids.length,new Set(ids).size,'No repeated fields between the nine blocks');
for(const id of ids)assert(kpiFields.some(f=>f.id===id),id);
const needed=new Set(['includeInReporting',...kpiDefinitions.flatMap(d=>d.parameters).filter(id=>!id.startsWith('monthlyInputs.'))]);
for(const id of needed)assert(ids.includes(id),'Missing calculation field '+id);
for(const group of kpiParameterGuide){assert(group.title&&group.cue&&group.print.length);assert(group.print.every(line=>typeof line==='string'&&line.trim()));}
assert.equal(kpiParameterGuide.filter(g=>g.monthly).length,1);
for(const id of kpiDefinitions.flatMap(d=>d.parameters).filter(id=>id.startsWith('monthlyInputs.')))assert(hospitalFields.some(f=>f.id===id.slice(14)),id);
console.log('PASS: nine unique guide blocks cover every calculation operand, reporting inclusion and all shared hospital inputs.');

const field=id=>kpiFields.find(f=>f.id===id);
assert.equal(kpiLaterFieldVisible(field('ivtSichTime'),{ivtGiven:'Yes',ivtSich:'No'}),false);
assert.equal(kpiLaterFieldVisible(field('ivtSichTime'),{ivtGiven:'Yes',ivtSich:'Yes'}),true);
assert.equal(kpiLaterFieldVisible(field('ivt36HourFollowupComplete'),{ivtGiven:'Yes',ivtSich:'No'}),true);
assert.equal(kpiLaterFieldVisible(field('ivt36HourFollowupComplete'),{ivtGiven:'Yes'}),false);
assert.equal(kpiLaterFieldVisible(field('carotidStrokeDeathTime'),{carotidProcedure:'No'}),false);
assert.equal(kpiLaterFieldVisible(field('carotid30DayFollowupComplete'),{carotidProcedure:'Yes',carotidStrokeDeath:'No'}),true);
console.log('PASS: Yes/No controls reveal only applicable timestamps, scores and negative-outcome follow-up confirmation.');

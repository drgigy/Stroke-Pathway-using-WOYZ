import assert from 'node:assert/strict';import {dashboardTimings,dashboardClock,dashboardInterval} from '../dashboard-data.js';import {currentKpiValues} from '../kpi-data.js';import {protocolFieldSource,protocolFieldVersion} from '../protocol-fields.js';import {kpiSource,kpiSchemaVersion} from '../kpi-schema.js';
const entry=(fields,extra={})=>({pageNumber:2,text:'Fictional dashboard test',fields,fieldSource:protocolFieldSource,fieldVersion:protocolFieldVersion,createdAt:{seconds:1},...extra});
const data={protocolDictations:{page2:{a:entry({er_arrival:'9:15 AM',scan_start:'9:30 AM',ivt_start:'10 AM',first_pass:'10:25 AM',groin_puncture:'10:10 AM',recanalisation:'11 AM',tici:'2B'})}}},before=JSON.stringify(data),view=dashboardTimings(data);
assert(view.hasFormReference);assert.equal(dashboardClock(view.values.arrivalTime),'9:15 AM');assert.equal(dashboardInterval(view.values,'arrivalTime','firstSliceTime'),15);assert.equal(dashboardInterval(view.values,'arrivalTime','reperfusionTime'),105);assert.equal(view.values.finalTici,'2B');assert.equal(currentKpiValues(data).arrivalTime,undefined);assert.equal(JSON.stringify(data),before);
const manual={...data,kpiEntries:{a:{source:kpiSource,version:kpiSchemaVersion,kind:'manual-edit',fields:{arrivalTime:''},createdAt:{seconds:2}}}};
assert.equal(dashboardTimings(manual).values.arrivalTime,'');assert.equal(dashboardInterval(dashboardTimings(manual).values,'arrivalTime','firstSliceTime'),null);
const typed={...data,kpiEntries:{a:{source:kpiSource,version:kpiSchemaVersion,fields:{arrivalTime:'2026-11-27T09:00:00+05:30',firstSliceTime:'2026-11-27T09:45:00+05:30'},createdAt:{seconds:3}}}};
assert.equal(dashboardInterval(dashboardTimings(typed).values,'arrivalTime','firstSliceTime'),45);assert.equal(dashboardClock(dashboardTimings(typed).values.arrivalTime),'09:00:00');
assert.equal(dashboardInterval({a:'23:55',b:'00:10'},'a','b'),null);assert.equal(dashboardInterval({a:'2026-11-27T23:55:00+05:30',b:'2026-11-28T00:10:00+05:30'},'a','b'),15);assert.equal(dashboardInterval({a:'2026-11-27T09:00:00+05:30',b:'09:30'},'a','b'),null);
assert.equal(dashboardTimings({protocolDictations:{page2:{a:entry({door_imaging:'15 min',door_first_pass:'70 min'})}}}).values.firstSliceTime,'');
console.log('PASS: existing typed times, protocol-reference fallback, explicit clears, no KPI promotion, no mutations and date/midnight ambiguity safeguards.');

const mixed=dashboardTimings({...data,kpiEntries:{a:{source:kpiSource,version:kpiSchemaVersion,fields:{firstSliceTime:'2026-11-27T09:30:00+05:30'},createdAt:{seconds:4}}}});
assert.equal(dashboardInterval(mixed.values,'arrivalTime','firstSliceTime',mixed),15);
assert.equal(dashboardInterval({...mixed.values,firstSliceTime:'2026-11-27T10:30:00+05:30'},'arrivalTime','firstSliceTime',mixed),null);
assert.equal(dashboardInterval({...mixed.values,arrivalTime:''},'arrivalTime','firstSliceTime',mixed),null);
console.log('PASS: matching paired form clocks resolve mixed dashboard sources; conflicting clocks and explicit clears remain Pending.');

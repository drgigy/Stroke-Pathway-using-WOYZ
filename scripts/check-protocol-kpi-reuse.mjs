import assert from 'node:assert/strict';
import {currentKpiValues,resolveKpiValues} from '../kpi-data.js';
import {kpiFields,kpiSource,kpiSchemaVersion} from '../kpi-schema.js';
import {protocolFieldSource,protocolFieldVersion} from '../protocol-fields.js';
import {calculateKpis} from '../kpi-calculations.js';
const form=(page,fields,seconds=10,kind='dictation')=>({fieldSource:protocolFieldSource,fieldVersion:protocolFieldVersion,pageNumber:page,text:'Fictional reuse fixture',fields,createdAt:{seconds},kind});
const take=(fields,seconds=20,kind='dictation')=>({source:kpiSource,version:kpiSchemaVersion,fields,createdAt:{seconds},kind,text:'Fictional KPI fixture'});
const data={visitDate:'2026-11-27',protocolDictations:{page1:{a:form(1,{diagnosis:'Acute ischemic stroke',name:'Fictional patient',uhid:'00042',age:'56',dysphagia_1:'No',dysphagia_2:'No',dysphagia_3:'No',dysphagia_4:'No',dysphagia_5:'No',dysphagia_6:'No'})},page2:{a:form(2,{er_arrival:'2026-11-27T09:00:00+05:30',scan_start:'2026-11-27T09:15:00+05:30',scan_arrival:'2026-11-27T09:10:00+05:30',ivt_start:'2026-11-27T09:30:00+05:30',first_pass:'2026-11-27T10:00:00+05:30',groin_puncture:'2026-11-27T09:50:00+05:30',recanalisation:'2026-11-27T10:10:00+05:30',tici:'TICI 2b',onset:'27 November 2026',neuro_assessment:'2026-11-27T09:05:00+05:30'})}}};
const before=JSON.stringify(data),v=currentKpiValues(data),r=resolveKpiValues(data);
assert.equal(v.uhid,'00042');assert.equal(v.diagnosis,'Ischemic Stroke');assert.equal(v.arrivalTime,'2026-11-27T03:30:00.000Z');assert.equal(v.firstSliceTime,'2026-11-27T03:45:00.000Z');assert.equal(v.onsetDate,'2026-11-27');assert.equal(v.ivtGiven,'Yes');assert.equal(v.evtGiven,'Yes');assert.equal(v.brainImaging,'Yes');assert.equal(v.dysphagiaDocumented,'Yes');assert(r.covered.has('imagingServiceTime'));assert.equal(JSON.stringify(data),before);
for(const id of ['includeInReporting','acuteStroke','admitted','ivtIndicated','evtIndicated','largeVesselOcclusion','mrs90Days','ivtSich','evtSich','followup90Days','iaThrombolysis'])assert.equal(v[id],undefined,id+' must not be inferred');
const ambiguous={visitDate:'2026-11-27',protocolDictations:{page1:{a:form(1,{date:'2026-11-27',diagnosis:'Suspected ischemic stroke'})},page2:{a:form(2,{er_arrival:'9:00 AM',scan_start:'9:15 AM',ivt_start:'9:30 AM',first_pass:'10 AM',tici:'2A',recanalisation:'2026-11-27T10:10:00+05:30',lvo:'Yes',sich:'No'})},page3:{a:form(3,{ivt:'Yes',mt:'Yes',ia:'Yes',mrs_discharge:'2'})}}};
const a=currentKpiValues(ambiguous);for(const id of ['arrivalTime','firstSliceTime','ivtTime','evtDeviceTime','reperfusionTime','diagnosis','largeVesselOcclusion','ivtSich','evtSich','mrs90Days','iaThrombolysis'])assert.equal(a[id],undefined,id+' ambiguity');assert.equal(a.ivtGiven,'Yes','Actual start recorded; event date remains unknown');
const clear={...data,kpiEntries:{a:take({arrivalTime:''},20,'manual-edit')}};assert.equal(currentKpiValues(clear).arrivalTime,'');assert(!resolveKpiValues(clear).covered.has('arrivalTime'));
const corrected={...data,kpiEntries:{a:take({arrivalTime:'2026-11-27T08:00:00+05:30'})},protocolDictations:{...data.protocolDictations,page2:{...data.protocolDictations.page2,b:form(2,{er_arrival:'2026-11-27T09:05:00+05:30'},30,'manual-edit')}}};assert.equal(currentKpiValues(corrected).arrivalTime,'2026-11-27T03:35:00.000Z');
corrected.protocolDictations.page2.b.fields.er_arrival='';assert.equal(currentKpiValues(corrected).arrivalTime,'');
const conflict={...data,kpiEntries:{a:take({arrivalTime:'2026-11-27T08:00:00+05:30'})}};assert(resolveKpiValues(conflict).issues.arrivalTime);assert(!resolveKpiValues(conflict).covered.has('arrivalTime'));
const notSource={protocolDictations:{page2:{a:{...form(2,{er_arrival:'2026-11-27T09:00:00+05:30'}),fieldSource:'unrecognized'}}}};assert.equal(currentKpiValues(notSource).arrivalTime,undefined);
const partial={protocolDictations:{page1:{a:form(1,{dysphagia_1:'No'})}}};assert.equal(currentKpiValues(partial).dysphagiaDocumented,undefined);
// All 24 can resolve with a complete applicable case + hospital inputs. Missing
// monthly denominators remain missing even when every patient answer is filled.
const complete=Object.fromEntries(kpiFields.filter(f=>f.type==='choice'&&f.choices.includes('Yes')).map(f=>[f.id,'Yes']));
Object.assign(complete,{...v,includeInReporting:'Yes',presentation:'Inpatient stroke',recognitionTime:'2026-11-27T09:00:00+05:30',arrivalMode:'Direct',largeVesselOcclusion:'Yes',admissionTime:v.arrivalTime,strokeUnitAdmissionTime:v.arrivalTime,strokeUnitDischargeTime:'2026-11-29T09:00:00+05:30',medicationErrors:'0',falls:'0',pressureUlcerInitialStage:'No pressure ulcer',pressureUlcerCurrentStage:'Stage 2',mrs90Days:'2',rehabAssessmentTime:'2026-11-28T09:00:00+05:30',speechReassessmentTime:'2026-11-28T08:00:00+05:30'});
for(const [end,start]of [['ivtSichTime','ivtTime'],['evtSichTime','evtDeviceTime'],['deathTime','admissionTime'],['carotidStrokeDeathTime','carotidProcedureTime'],['angiographyStrokeDeathTime','cerebralAngiographyTime'],['intracranialStrokeDeathTime','intracranialProcedureTime']]){complete[start]||=v.arrivalTime;complete[end]=complete[start];}
const monthly={medicationOpportunities:'100',stockouts:'0',formularyDrugs:'2'};
assert.equal(calculateKpis([complete],monthly).length,24);for(const result of calculateKpis([complete],monthly))assert.equal(result.status,'complete','KPI '+result.no+': '+result.missing.join(','));
assert.equal(calculateKpis([complete],{})[7].status,'pending');assert.equal(calculateKpis([complete],{})[14].status,'pending');
assert.equal(calculateKpis([{...complete,followup90Days:'No',mrs90Days:''}],monthly)[6].status,'not-applicable');
console.log('PASS: validated form reuse, dates, source isolation, clinical distinctions, explicit clears/corrections, conflicts, no mutation, and all 24 KPI completion with hospital inputs.');

const nihssArrival={protocolDictations:{page9:{a:form(9,{arrival:'2026-11-27T09:00:00+05:30'})}}};assert.equal(currentKpiValues(nihssArrival).arrivalTime,'2026-11-27T03:30:00.000Z');
const latestArrival={...data,protocolDictations:{...data.protocolDictations,page9:{a:form(9,{arrival:'2026-11-27T09:05:00+05:30'},30,'manual-edit')}}};assert.equal(currentKpiValues(latestArrival).arrivalTime,'2026-11-27T03:35:00.000Z');
console.log('PASS: alternate NIHSS-sheet arrival is reused and latest duplicate-sheet manual correction is respected.');

import {currentFieldValues} from './protocol-field-output.js';
import {compareEntries} from './entry-order.js';
import {parseProtocolTime} from './protocol-timings.js';

// Explicit same-meaning facts only. No free-text clinical inference or event dates
// borrowed from a visit/header date. Calculations never consume clock-only times.
export const protocolKpiMappings=Object.freeze({
 diagnosis:{page:1,field:'diagnosis',type:'diagnosis'},
 arrivalTime:{page:2,field:'er_arrival',type:'datetime',alternatives:[{page:9,field:'arrival'}]},
 onsetDate:{page:2,field:'onset',type:'date'},
 firstSliceTime:{page:2,field:'scan_start',type:'datetime'},
 neurologicalAssessmentTime:{page:2,field:'neuro_assessment',type:'datetime'},
 imagingServiceTime:{page:2,field:'scan_arrival',type:'datetime'},
 imagingStartTime:{page:2,field:'scan_start',type:'datetime'},
 ivtTime:{page:2,field:'ivt_start',type:'datetime'},
 evtDeviceTime:{page:2,field:'first_pass',type:'datetime'},
 skinPunctureTime:{page:2,field:'groin_puncture',type:'datetime'},
 finalTici:{page:2,field:'tici',type:'tici'},
 reperfusionTime:{page:2,field:'recanalisation',type:'datetime'},
});
const isoTime=value=>{
 const parsed=parseProtocolTime(value),fraction=/:\d{2}\.(\d{1,3})(?=\s|[zZ+-]|$)/.exec(value);
 return parsed?.dated?new Date(parsed.seconds*1000+(fraction?Number('0.'+fraction[1])*1000:0)).toISOString():null;
};
function normalize(raw,type){
 if(typeof raw!=='string'||!raw.trim())return null;
 const value=raw.trim();
 if(type==='datetime')return isoTime(value);
 if(type==='date'){
  const instant=isoTime(value)||isoTime(value+' 00:00');if(!instant)return null;
  return new Date(Date.parse(instant)+330*60000).toISOString().slice(0,10);
 }
 if(type==='tici')return /^(?:TICI\s*)?(0|1|2a|2b|2c|3)$/i.exec(value)?.[1].toUpperCase()||null;
 if(type==='diagnosis')return ({'ischemic stroke':'Ischemic Stroke','ischaemic stroke':'Ischemic Stroke','acute ischemic stroke':'Ischemic Stroke','acute ischaemic stroke':'Ischemic Stroke','hemorrhagic stroke':'Hemorrhagic Stroke','haemorrhagic stroke':'Hemorrhagic Stroke','acute hemorrhagic stroke':'Hemorrhagic Stroke','acute haemorrhagic stroke':'Hemorrhagic Stroke','tia':'TIA','transient ischemic attack':'TIA','transient ischaemic attack':'TIA','stroke mimic':'Stroke mimic'})[value.toLowerCase()]||null;
 return null;
}
export function protocolKpiEvidence(data={}){
 const pages=new Map(),evidence={};
 const page=n=>{if(!pages.has(n))pages.set(n,currentFieldValues(data.protocolDictations?.['page'+n],n));return pages.get(n);};
 const set=(id,mapping,raw,value)=>{
  const entry=data.protocolDictations?.['page'+mapping.page]?.[raw.takeId];
  evidence[id]={value,raw:raw.value,page:mapping.page,field:mapping.field,entry,takeId:raw.takeId};
 };
 for(const [id,mapping]of Object.entries(protocolKpiMappings)){
  const candidates=[mapping,...(mapping.alternatives||[]).map(item=>({...item,type:mapping.type}))].map(source=>({source,raw:page(source.page)[source.field]})).filter(item=>item.raw);
  candidates.sort((a,b)=>compareEntries(data.protocolDictations?.['page'+b.source.page]?.[b.raw.takeId]||{},data.protocolDictations?.['page'+a.source.page]?.[a.raw.takeId]||{},b.raw.takeId,a.raw.takeId));
  const selected=candidates[0];if(!selected)continue;
  set(id,selected.source,selected.raw,normalize(selected.raw.value,mapping.type));
 }
 // These are documentation facts, never eligibility or clinical outcome guesses.
 for(const [id,field,value]of [['presentation','er_arrival','ER arrival'],['brainImaging','scan_start','Yes'],['diagnosticImaging','scan_arrival','Yes'],['ivtGiven','ivt_start','Yes'],['evtGiven','first_pass','Yes']]){
  const raw=page(2)[field];if(raw&&parseProtocolTime(raw.value))set(id,{page:2,field},raw,value);
 }
 // A completed screening is documentation, not a negative dysphagia finding or
 // a speech-therapy reassessment. Initial positives may stop the water screen.
 const screen=page(1),answers=[1,2,3,4].map(n=>screen['dysphagia_'+n]);
 if(answers.every(v=>['Yes','No'].includes(v?.value))&&(answers.some(v=>v.value==='Yes')||[5,6].every(n=>['Yes','No'].includes(screen['dysphagia_'+n]?.value)))){
  const raw=screen.dysphagia_1;set('dysphagiaDocumented',{page:1,field:'dysphagia_1'},raw,'Yes');
 }
 return evidence;
}
export function sameKpiFact(a,b,type){
 if(type==='datetime')return !!a&&!!b&&Number.isFinite(Date.parse(a))&&Date.parse(a)===Date.parse(b);
 return a===b;
}
export function protocolClockMatches(raw,dated){
 const a=parseProtocolTime(raw),b=parseProtocolTime(dated);if(!a||a.dated||!b?.dated)return false;
 const local=((b.seconds+330*60)%86400+86400)%86400;return a.seconds===local;
}

import {currentKpiValues} from './kpi-data.js';
import {currentFieldValues} from './protocol-field-output.js';
import {parseProtocolTime} from './protocol-timings.js';

// Display projection only. Never writes/promotes protocol values into KPI facts.
export function dashboardTimings(data={}){
 const kpi=currentKpiValues(data),form=currentFieldValues(data.protocolDictations?.page2,2),values={},sources={};
 for(const [id,field]of Object.entries({arrivalTime:'er_arrival',firstSliceTime:'scan_start',ivtTime:'ivt_start',evtDeviceTime:'first_pass',skinPunctureTime:'groin_puncture',reperfusionTime:'recanalisation',finalTici:'tici'})){
  // An explicit KPI clear must not resurrect an older form value.
  const typed=Object.hasOwn(kpi,id);values[id]=typed?kpi[id]:form[field]?.value||'';sources[id]=typed?'kpi':values[id]?'form':null;
 }
 return {values,sources,hasFormReference:Object.values(sources).includes('form')};
}
export function dashboardClock(value){
 const time=parseProtocolTime(value);if(!time)return value||'—';
 if(!time.dated)return value;
 return new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(time.seconds*1000));
}
export function dashboardInterval(values,start,end){
 const a=parseProtocolTime(values[start]),b=parseProtocolTime(values[end]);
 if(!a||!b||a.dated!==b.dated||b.seconds<a.seconds)return null;
 return (b.seconds-a.seconds)/60;
}

import { currentFieldValues } from './protocol-field-output.js';
import { kpiFields, kpiSource, kpiSchemaVersion } from './kpi-schema.js';
import { clinicalPages, protocolFieldSource, protocolFieldVersion } from './case-wide-dictation.js';
import { compareEntries } from './entry-order.js';

const mode = 'server-case-wide-v1';
function kpiVersions(note) {
  const result = {}, allowed = new Set(kpiFields.map(field => field.id));
  const entries = Object.entries(note.kpiEntries || {}).filter(([,v]) => v?.source === kpiSource && v.version === kpiSchemaVersion && v.fields)
    .sort(([aId,a],[bId,b]) => compareEntries(a,b,aId,bId));
  for (const [id, entry] of entries) for (const [field,value] of Object.entries(entry.fields)) {
    if (allowed.has(field) && typeof value === 'string' && (value.trim() || entry.kind === 'manual-edit')) result[field] = id;
  }
  return result;
}
export function captureCaseBaseline(note) {
  return { protocol: Object.fromEntries(clinicalPages.map(page => [page, Object.fromEntries(Object.entries(currentFieldValues(note.protocolDictations?.['page'+page],page)).map(([id,v])=>[id,v.takeId]))])), kpi: kpiVersions(note) };
}
function canApply(currentId, baselineId, existing, job) {
  if (currentId === baselineId) return true;
  if (!existing || existing.processingMode !== mode) return false;
  return compareEntries({processingMode:mode,effectiveAt:job.createdAt,recordedAt:job.recordedAt},existing,job.id,currentId) > 0;
}
// Narrative additions keep recording order even if workers finish out of order.
// A subsequent manual replacement/clear still overrides earlier narrative takes.
const isNarrativeAppend=entry=>entry?.consultantAppend===true&&entry.processingMode===mode&&entry.kind==='dictation';
function canAppendConsultant(dictations,currentId,baselineId,job){
 const existing=dictations?.[currentId];
 if(currentId===baselineId)return true;
 if(!isNarrativeAppend(existing))return canApply(currentId,baselineId,existing,job);
 return !Object.entries(dictations||{}).some(([id,entry])=>!isNarrativeAppend(entry)
  &&currentFieldValues({[id]:entry},3).consultant_comments
  &&compareEntries(entry,{processingMode:mode,effectiveAt:job.createdAt,recordedAt:job.recordedAt},id,job.id)>0);
}
// Pure merge plan. Cloud code applies it atomically with the job's completed state.
export function backgroundMergePlan(note, job, output, serverTime) {
  const patch = {}, skipped = [], common = { kind:'dictation',processingMode:mode,effectiveAt:job.createdAt,createdAt:serverTime,
    recordedAt:job.recordedAt,createdBy:job.createdBy,text:output.text,reviewStatus:'unreviewed' };
  for (const [page, proposed] of Object.entries(output.pages)) {
    const key='page'+page, current=currentFieldValues(note.protocolDictations?.[key],Number(page)), fields={};
    for (const [id,value] of Object.entries(proposed)) {
      const currentId=current[id]?.takeId, existing=note.protocolDictations?.[key]?.[currentId];
      if (page==='3'&&id==='consultant_comments'?canAppendConsultant(note.protocolDictations?.[key],currentId,job.baseline.protocol[page]?.[id],job):canApply(currentId,job.baseline.protocol[page]?.[id],existing,job)) fields[id]=value;
      else skipped.push({page:Number(page),field:id});
    }
    if(Object.keys(fields).length)patch[`protocolDictations.${key}.${job.id}`]={...common,pageNumber:Number(page),pageTitle:'Case-wide dictation',fieldSource:protocolFieldSource,fieldVersion:protocolFieldVersion,fields,...(page==='3'&&Object.hasOwn(fields,'consultant_comments')?{consultantAppend:true,consultantCommentMode:'explicit-v1'}:{})};
  }
  const current=kpiVersions(note), fields={};
  for(const [id,value]of Object.entries(output.kpiFields)) {
    const currentId=current[id],existing=note.kpiEntries?.[currentId];
    if(canApply(currentId,job.baseline.kpi[id],existing,job))fields[id]=value;
    else skipped.push({page:'KPI',field:id});
  }
  const warnings=[...output.warnings,...(skipped.length?['Newer corrections were preserved for '+skipped.length+' fields; review this dictation.']:[])];
  patch[`kpiEntries.${job.id}`]={...common,source:kpiSource,version:kpiSchemaVersion,sectionId:'protocolForm',sectionTitle:'Case-wide dictation',fields,warnings};
  patch.updatedBy=job.createdBy;patch.updatedAt=serverTime;
  return {patch,skipped,warnings};
}

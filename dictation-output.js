import { kpiFields } from './kpi-schema.js';
import { kpiResponseSchema, validateKpiFields } from './kpi-data.js';
import { fieldResponseSchema, validateFieldOutput } from './protocol-field-output.js';
import { compactKpiContract } from './dictation-request.js';
export function combinedResponseSchema(page){
 const schema=fieldResponseSchema(page),kpi=kpiResponseSchema(kpiFields);
 return {...schema,properties:{...schema.properties,kpiFields:kpi.properties.fields,warnings:kpi.properties.warnings},required:[...schema.required,'kpiFields']};
}
export function validateCombinedOutput(parsed,page){
 const form=validateFieldOutput(parsed,page),kpiFieldsMap=validateKpiFields(parsed.kpiFields,kpiFields);
 const warnings=Array.isArray(parsed.warnings)?parsed.warnings.filter(v=>typeof v==='string').slice(0,20).map(v=>v.slice(0,1000)):[];
 return {...form,kpiFields:kpiFieldsMap,warnings};
}
export function combinedInstruction(recordedAt){return `Also return kpiFields, an array of {id,value} strings using ONLY the separate KPI contract below. This is a second mapping of the SAME explicitly dictated facts, not facts from the blank PDF. Do not infer diagnosis, treatment indication, eligibility, follow-up completeness, normal findings, negative outcomes or numeric zeros. Omit ambiguous and undictated KPI fields and preserve uncertainty in warnings and text. Datetimes require an unambiguous full date and timezone. Hospital timezone Asia/Kolkata (+05:30); recording reference time ${recordedAt}. Resolve explicitly spoken today/yesterday against that reference only. Never assume the case date, AM/PM, midnight crossing or a date from a bare clock time. No calculation of NIHSS, durations or KPIs. Never infer complete 24/36-hour, 7/30-day or 90-day follow-up from an outcome alone. Keep fields for the PDF strictly separate from kpiFields.\nExact KPI contract:\n`+compactKpiContract();}
export const sameFields=(a,b)=>!!a&&!!b&&Object.keys(a).length===Object.keys(b).length&&Object.entries(a).every(([id,value])=>b[id]===value);
export function identityFields(fields,{fromForm=false}={}){
 const result={};for(const id of ['name','age','uhid'])if(Object.hasOwn(fields,id)){
  let value=fields[id];if(fromForm&&id==='age'&&value){const match=/^(\d+(?:\.\d+)?)\s*(?:years?|yrs?)?$/i.exec(value.trim());if(!match)continue;value=match[1];}
  try{Object.assign(result,validateKpiFields([{id,value}],undefined,{allowEmpty:true}));}catch{}
 }return result;
}

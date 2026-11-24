import { currentKpiValues } from './kpi-data.js';
export function protocolPatientData(data) {
  const patient={...(data.patientData||{})};
  if(data.noteType!=='code7')return patient;
  const fields=currentKpiValues(data);
  for(const key of ['name','age','uhid'])if(Object.hasOwn(fields,key))patient[key]=fields[key].trim();
  return patient;
}
export function protocolPatientMeta(data) {
  const patient=protocolPatientData(data),parts=[];
  if(patient.age&&patient.age!=='NIL')parts.push(/^\d+$/.test(patient.age)?patient.age+' years':patient.age);
  if(patient.uhid&&patient.uhid!=='NIL')parts.push('UHID '+patient.uhid);
  return parts.join(' · ');
}

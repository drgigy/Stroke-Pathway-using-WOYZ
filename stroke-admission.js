import {currentKpiValues} from './kpi-data.js';
import {currentFieldValues} from './protocol-field-output.js';
import {kpiLaterFieldVisible} from './kpi-parameter-guide.js';
export const strokeAdmissionSections=Object.freeze([
 {id:'patient',title:'Patient and admission',fields:['name','uhid','age','diagnosis','acuteStroke','admitted','presentation','arrivalTime','admissionTime','onsetDate','recognitionTime']},
 {id:'assessment',title:'Assessment and imaging',fields:['brainImaging','firstSliceTime','neurologicalAssessmentTime','dysphagiaDocumented','diagnosticImaging','imagingServiceTime','imagingStartTime']},
 {id:'treatment',title:'IVT / EVT - when applicable',fields:['ivtIndicated','ivtGiven','ivtTime','evtIndicated','evtGiven','arrivalMode','evtStartTime','evtDeviceTime','skinPunctureTime','reperfusionTime','iaThrombolysis','finalTici','largeVesselOcclusion']},
 {id:'stay',title:'Stroke-unit stay',fields:['strokeUnitStay','strokeUnitAdmissionTime','strokeUnitDischargeTime']},
 {id:'outcomes',title:'Inpatient outcomes and safety',fields:['ivtSich','ivtSichTime','ivtNihssIncrease4','ivtQualifyingImaging','ivt36HourFollowupComplete','evtSich','evtSichTime','evtNihssIncrease4','evtQualifyingImaging','evt36HourFollowupComplete','medicationErrors','pressureUlcer','pressureUlcerInitialStage','pressureUlcerCurrentStage','dvtAfterAdmission','falls','diedInHospital','deathTime','inHospital7DayFollowupComplete']},
 {id:'procedures',title:'Other procedures - when performed',fields:['carotidProcedure','carotidProcedureTime','carotidStrokeDeath','carotidStrokeDeathTime','carotid30DayFollowupComplete','cerebralAngiography','cerebralAngiographyTime','angiographyStrokeDeath','angiographyStrokeDeathTime','angiography24HourFollowupComplete','intracranialProcedure','intracranialProcedureTime','intracranialStrokeDeath','intracranialStrokeDeathTime','intracranial30DayFollowupComplete','evd','ventriculitis']},
 {id:'followup',title:'Rehabilitation and follow-up',fields:['rehabAssessed','rehabAssessmentTime','speechReassessed','speechReassessmentTime','followup90Days','mrs90Days']},
 {id:'reporting',title:'Reporting inclusion',fields:['includeInReporting']},
]);
export function strokeAdmissionValues(data={}){
 const values=currentKpiValues(data),age=/^(\d+(?:\.\d+)?)\s*(?:years?|yrs?)?$/i.exec(values.age||'');
 return age?{...values,age:age[1]}:values;
}
export function strokeAdmissionFieldVisible(field,values){return field.id==='pressureUlcerInitialStage'&&!!values[field.id]||kpiLaterFieldVisible(field,values);}
export function strokeAdmissionClinicalFacts(data={}){
 const definitions=[
  [1,'sex','Sex'],[1,'mobile','Mobile'],[1,'contact','Contact person'],[1,'examination','Examination'],[1,'nihss','Initial NIHSS'],
  [1,'dm','Diabetes'],[1,'dyslipidemia','Dyslipidemia'],[1,'smoking','Smoking'],[1,'alcoholism','Alcohol use'],[1,'obesity','Obesity'],[1,'osa','OSA'],[1,'ihd','IHD'],[1,'af','AF'],[1,'htn','Hypertension'],[1,'family_history','Family history'],[1,'previous_stroke','Previous stroke / TIA'],
  [2,'last_seen_normal','Last known well'],[2,'onset','Stroke onset'],[2,'er_arrival','ER arrival as recorded'],[2,'scan_start','Scan start as recorded'],[2,'ivt_start','IVT start as recorded'],[2,'first_pass','First pass as recorded'],[2,'recanalisation','Recanalization as recorded'],
  [3,'mrs_admission','Admission mRS'],[3,'mrs_discharge','Discharge mRS'],[3,'consultant_comments','Stroke consultant comments'],
 ];
 const pages=new Map(),result=[];
 for(const [page,id,label]of definitions){if(!pages.has(page))pages.set(page,currentFieldValues(data.protocolDictations?.['page'+page],page));const value=pages.get(page)[id]?.value;if(value?.trim())result.push({page,id,label,value});}
 return result;
}

// Later outcomes form: nine compact cues, with non-repeated supporting facts
// available only when unresolved. Stored schema and formulas stay unchanged.
export const kpiParameterGuide=Object.freeze([
 {id:'haemorrhage',title:'Haemorrhage after IVT / EVT',cue:'For each received treatment: sICH, 24h follow-up; if Yes, time, NIHSS and imaging.',
  fields:['ivt36HourFollowupComplete','ivtSich','ivtNihssIncrease4','ivtQualifyingImaging','ivtSichTime','evt36HourFollowupComplete','evtSich','evtNihssIncrease4','evtQualifyingImaging','evtSichTime'],
  print:['For each received treatment: sICH Yes/No/unknown. If Yes: event date/time, NIHSS rise >=4 and qualifying parenchymal / subarachnoid / intraventricular haemorrhage on imaging.','For No: confirm observation covering 24 hours is complete.']},
 {id:'rehabilitation',title:'Rehabilitation and speech therapy',cue:'Completed rehabilitation assessment and speech reassessment: Yes/No; if Yes, date/time.',
  fields:['rehabAssessed','rehabAssessmentTime','speechReassessed','speechReassessmentTime'],
  print:['Initial stroke rehabilitation specialist assessment completed? Yes/No; if Yes, date/time. Referral alone does not count under the current formula.','Speech-therapist dysphagia reassessment documented? Yes/No; if Yes, date/time, not the initial bedside-screen time.']},
 {id:'followup',title:'90-day functional outcome',cue:'Follow-up completed? If Yes, enter assessed 90-day mRS (0-6).',
  fields:['followup90Days','mrs90Days'],
  print:['90-day follow-up completed? Yes/No; if Yes, explicitly assessed 90-day mRS (0-6). Do not substitute admission or discharge mRS.']},
 {id:'safety',title:'Medication errors and falls',cue:'Enter event counts, including assisted falls; explicitly enter zero if none.',
  fields:['medicationErrors','falls'],
  print:['Enter the number of medication-error events and patient falls, including assisted falls. Explicitly enter zero if none. Unknown counts stay blank.']},
 {id:'mortality',title:'In-hospital mortality',cue:'Death: Yes/No; date/time if Yes, completed 7-day/live-discharge ascertainment if No.',
  fields:['inHospital7DayFollowupComplete','diedInHospital','deathTime'],
  print:['In-hospital death? Yes/No; if Yes, date/time. If No: ascertainment complete through seven days after admission or live discharge? Otherwise state incomplete.']},
 {id:'procedures',title:'Procedures and later outcomes',cue:'Carotid; cerebral angiography; intracranial intervention; EVD and ventriculitis.',
  fields:['carotidProcedure','carotidProcedureTime','carotid30DayFollowupComplete','carotidStrokeDeath','carotidStrokeDeathTime','cerebralAngiography','cerebralAngiographyTime','angiography24HourFollowupComplete','angiographyStrokeDeath','angiographyStrokeDeathTime','intracranialProcedure','intracranialProcedureTime','intracranial30DayFollowupComplete','intracranialStrokeDeath','intracranialStrokeDeathTime','evd','ventriculitis'],
  print:['CEA/carotid intervention, diagnostic cerebral angiography, intracranial angioplasty/stenting for atherosclerosis: performed Yes/No.','If performed: procedure date/time; stroke/death afterwards? If Yes, event date/time. If No event: completed follow-up of 30 days / 24 hours / 30 days respectively?','EVD inserted? If Yes: ventriculitis afterwards?']},
 {id:'complications',title:'Pressure ulcer and DVT',cue:'New/worse pressure ulcer: Yes/No and current stage. DVT after admission: Yes/No.',
  fields:['pressureUlcer','pressureUlcerInitialStage','pressureUlcerCurrentStage','dvtAfterAdmission'],
  print:['New/worsening pressure ulcer after admission? Yes/No; if Yes, current stage 1-4, unstageable or deep tissue injury.','DVT after admission? Yes/No/unknown.']},
 {id:'reperfusion',title:'Imaging and reperfusion gaps',cue:'Only if missing in Stroke pathway: imaging-service times, TICI and qualifying LVO details.',
  fields:['diagnosticImaging','imagingServiceTime','imagingStartTime','firstSliceTime','finalTici','largeVesselOcclusion','evtGiven','iaThrombolysis','evtDeviceTime','skinPunctureTime','reperfusionTime'],
  print:['Reuse saved scan-service arrival/start times, actual EVT/IA receipt, first pass, puncture, recanalization and TICI. Clarify only missing values.','For LVO timing: confirm qualifying ICA / ICA terminus / MCA M1/M2 / basilar occlusion. Current criterion: first pass <=150 min and final TICI >=2B.']},
 {id:'reporting',title:'Reporting and monthly totals',cue:'Reviewer: inclusion. Quality team: monthly opportunities, stockouts and formulary count.',
  fields:['includeInReporting'],monthly:true,
  print:['Reviewer: include this case in KPI reporting, Yes/No.','Quality team, once per month: medication-error opportunities; thrombolytic stockout instances; number of formulary thrombolytic drugs. Patient-days require complete stroke-unit stays or an explicit monthly total.']},
]);
export const kpiSupportingGuide=Object.freeze({id:'supporting',title:'Only missing supporting information',cue:'Resolve required form gaps here; do not repeat completed Stroke pathway details.',
 fields:['diagnosis','presentation','arrivalTime','admissionTime','recognitionTime','strokeUnitStay','strokeUnitAdmissionTime','strokeUnitDischargeTime','brainImaging','neurologicalAssessmentTime','dysphagiaDocumented','ivtIndicated','ivtGiven','ivtTime','evtIndicated','arrivalMode','evtStartTime']});
// Children become visible after an explicit answer. Completion of observation is
// required for a negative outcome, not an automatic No for unanswered follow-up.
export function kpiLaterFieldVisible(field,values,{review=false}={}){
 const match=test=>test.values.includes(values[test.field]);
 const tests=(field.showIf?(Array.isArray(field.showIf)?field.showIf:[field.showIf]):[]).filter(test=>test.field!=='admitted');
 if(!tests.every(match)||field.showIfAny&&!field.showIfAny.some(match))return false;
 const negativeFollowups={ivt36HourFollowupComplete:'ivtSich',evt36HourFollowupComplete:'evtSich',inHospital7DayFollowupComplete:'diedInHospital',carotid30DayFollowupComplete:'carotidStrokeDeath',angiography24HourFollowupComplete:'angiographyStrokeDeath',intracranial30DayFollowupComplete:'intracranialStrokeDeath'};
 if(negativeFollowups[field.id]&&values[negativeFollowups[field.id]]!=='No')return false;
 if(field.id==='evtStartTime'&&(values.evtDeviceTime||values.skinPunctureTime))return false;
 if(field.id==='imagingStartTime'&&values.firstSliceTime&&!values.imagingStartTime)return false;
 if(field.id==='brainImaging'&&values.firstSliceTime&&values.brainImaging!=='No')return false;
 if(field.id==='ivtIndicated'&&values.ivtGiven==='Yes')return false;
 return true;
}

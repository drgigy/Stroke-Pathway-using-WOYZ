"""Checked field placements in PDF points, top-left origin. Does not edit the PDF."""
import json,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[1];pages=[[] for _ in range(9)]
def field(p,id,label,x=None,y=None,w=None,h=11,kind='text',**kw):
 d=dict(id=id,label=label,kind=kind,**kw)
 if x is not None:d['box']=[x,y,w,h]
 pages[p-1].append(d)
def yesno(p,id,label,x,y,no):field(p,id,label,x,y,10,10,'yesno',noX=no,choices=['Yes','No'])
def check(p,id,label,x,y):field(p,id,label,x,y,10,10,'check',choices=['Yes','No'])
def identity(p,x,y,w,h):field(p,'patient_label','Patient label (dictated name / UHID / age only)',x,y,w,h)
# 1: patient details, risk cells, order and dysphagia checkboxes, labs and nurse.
identity(1,412,67,139,18)
for id,label,x,w in [('name','Name',70,64),('age','Age',158,37),('sex','Sex',219,32),('uhid','UHID No.',297,70),('mobile','Mobile',404,65),('date','Date',497,57)]:field(1,id,label,x,104,w,13)
field(1,'contact','Contact Person Name (Relation) & No.',205,121,348,13)
field(1,'diagnosis','Diagnosis',85,138,198,14);field(1,'examination','On Examination',359,138,195,14)
for id,label,x,w in [('dm','DM',42,39),('dyslipidemia','Dyslipidemia',86,105),('smoking','Smoking',195,75),('alcoholism','Alcoholism',275,116),('obesity','Obesity',395,91),('osa','OSA',490,63)]:field(1,id,label,x,178,w,16,'binary',choices=['Yes','No'])
for id,label,x,w in [('ihd','IHD',42,39),('af','AF',86,105),('htn','HTN',195,75),('family_history','Family History',275,116),('previous_stroke','Previous Stroke/TIA',395,158)]:field(1,id,label,x,216,w,16,'binary',choices=['Yes','No'])
for id,label,y in [('blood_sugar_check','Finger-stick blood sugar check completed',258),('ecg_bp_check','ECG & BP Check completed',273),('oxygen_order','Oxygen order carried out (not a recommendation)',287.2),('iv_access','IV access order carried out',301.5),('saline','IV fluid normal saline order carried out',316.5)]:check(1,id,label,280.5,y)
for id,label,y in [('cardiac_monitor','Continuous cardiac monitoring connected',246),('avoid_ng','Nasogastric tube avoided',260.2),('npo_screen','NPO until swallowing screen',275.2),('dysphagia_npo','NPO because dysphagia present',289.5),('avoid_catheter','Bladder catheterization avoided',303.7),('distended_bladder','Distended bladder catheterized before IVTPA',318.7)]:check(1,id,label,546,y)
for id,label,y,w in [('bp','BP',355,48),('heart_rate','Heart rate',371,170),('rhythm','Cardiac rhythm',386,170),('spo2','SpO2',402,48)]:field(1,id,label,148,y,w,13)
for i,(label,y) in enumerate([('Glasgow Coma Scale less than 13?',441.7),('Facial asymmetry/weakness?',456.7),('Tongue asymmetry/weakness?',471.7),('Palatal asymmetry/weakness?',486.7),('Speech therapist referral needed?',552),('Aspiration during 3 oz water test?',567)],1):yesno(1,f'dysphagia_{i}',label,387,y,426)
for id,label,x,y in [('cbc','Complete blood count and platelet count drawn',221.2,618.7),('pt_inr','PT / INR drawn',89.2,635.2),('urea_creatinine','Blood urea / Creatinine drawn',247.5,635.2),('electrolytes','Serum electrolytes drawn',131.2,651.7),('viral_markers','Viral markers (CARD test) drawn',275.2,651.7),('troponin','Trop I drawn',77.2,668.2)]:check(1,id,label,x,y)
field(1,'nihss','NIHS Score (explicit total only)',191,683,125,15)
field(1,'stroke_severity','Stroke Severity (explicit label only; never derive from NIHSS)',333.7,639,10,10,'choice',options=[{'value':'No stroke symptoms','box':[333.7,639,10,10]},{'value':'Minor stroke','box':[333.7,655.5,10,10]},{'value':'Moderate stroke','box':[333.7,672.7,10,10]},{'value':'Moderate to severe stroke','box':[333.7,690,10,10]},{'value':'Severe stroke','box':[333.7,707.2,10,10]}])
field(1,'nurse_name','Stroke Nurse Name',129,759,102,13);field(1,'nurse_datetime','Time & Date',454,759,100,13)
# Keep typed vitals in genuine white space, clear of the printed instruction and rhythm choices.
for f in pages[0]:
 if f['id']=='bp': f['box']=[72,355,65,13]
 if f['id']=='rhythm': f['box']=[210,386,108,13]
 if f['id']=='spo2': f['box']=[90,402,47,13]
# 2: timings. No derived intervals.
for id,label,x,y in [('last_seen_normal','Last Seen Normal',157,85),('onset','Stroke Onset/Noticed Time',198,147),('er_arrival','ER Arrival Time',145,178),('code7','Code 7 Activated Time',178,209),('neuro_assessment','Complete Neurological Assessment Time',264,241),('scan_arrival','MRI/CT Scan Arrival Time',194,272),('scan_start','MRI/CT Scan Start Time',187,303),('door_imaging','Door to Imaging Time',174,334),('ivt_start','IVT Start Time',140,365),('door_needle','Door to Needle',144,397),('delay_reason','Door to Needle reason for delay',332,428),('cath_arrival','Cath Lab Arrival Time',174,490),('groin_puncture','Groin Puncture Time',170,521),('door_first_pass','Door to First pass',157,553),('tici','Mechanical Thrombectomy Outcome (TICI) Score',304,584),('door_recanalisation','Door to Recanalisation',180,718)]:field(2,id,label,x,y,554-x,13)
field(2,'wake_unknown','Wake up/unknown (only explicitly dictated)',310,115,154,14)
yesno(2,'lvo','Large Vessel Occlusion',192,462,235.5)
field(2,'ct_24h','24 Hour CT Scan',164,750,95,14);yesno(2,'sich','SICH',274.5,752.2,318)
yesno(2,'craniectomy','Decompressive Craniectomy',216.7,783.7,260.2)
# 3: radiologist and consultant.
field(3,'radiologist_opinion','Radiologist Opinion',40,100,514,48)
for id,label,x,w in [('insular_ribbon','Insular Ribbon Sign',42,127),('dense_mca','Dense MCA',173,81),('mca_dot','MCA Dot Sign',258,94),('grey_white','Grey White',356,76),('sulcal','Sulcal Effacement',436,117)]:field(3,id,label,x,180,w,29)
field(3,'angiogram','CT/MR Angiogram',130,223,424,44)
field(3,'radiologist','Radiologist',105,273,187,14);field(3,'time','Time',320,273,100,14);field(3,'date','Date',464,273,90,14)
field(3,'consultant_comments','STROKE CONSULTANT COMMENTS',40,324,514,240)
for id,label,x,w in [('ivt','Decision: IVT',42,71),('ia','Decision: IA',118,54),('ivt_mt','Decision: IVT + MT',177,149),('mt','Decision: MT',331,67),('medical','Decision: Medical Management',404,149)]:field(3,id,label,x,625,w,20)
field(3,'mrs_admission','mRS Score at Admission',286,662,99,14);field(3,'mrs_discharge','mRS Score at Discharge',457,662,97,14)
field(3,'nihss','NIHSS Score',112,683,440,14);field(3,'consultant_name',"Stroke Consultant's Name",171,730,185,14);field(3,'datetime','Time & Date',104,761,449,14)
# 4: scores and checkboxes. Figures stay untouched.
for id,label,x,w in [('mrs_before','mRS Total (0-6) before illness',101,42),('mrs_admission','mRS Total (0-6) at admission',148,55),('mrs_discharge','mRS Total (0-6) at discharge',209,49)]:field(4,id,label,x,79,w,16)
for id,label,y in [('c','C - Caudate',63.7),('i','I - Insular ribbon',75),('ic','IC - Internal Capsule',86.2),('l','L - Lentiform nucleus',97.5),('m1','M1 - Anterior MCA cortex',109.5),('m2','M2 - MCA lateral to insular ribbon',120.7),('m3','M3 - Posterior MCA cortex',132),('m4','M4 - Anterior MCA superior territory',143.2),('m5','M5 - Lateral MCA superior territory',155.2),('m6','M6 - Posterior MCA superior territory',166.5)]:check(4,'aspects_'+id,'ASPECTS region explicitly marked: '+label,372,y)
field(4,'aspects_total','ASPECTS Score /10 (dictated only)',417,194,29,14)
# No blank in collateral legend: retain explicitly dictated score in additional details.
field(4,'collateral_grade','CT collateral score / grade (explicitly dictated only)')
# 5: counselling.
field(5,'name','Name',73,82,298,13);field(5,'uhid','UHID No.',428,82,126,13);field(5,'diagnosis','Diagnosis',91,103,463,14)
field(5,'treatment','Treatment',40,487,514,96);field(5,'outcome','Expected Outcome and Complications',40,609,514,80)
field(5,'surrogate',"Surrogate's name",138,701,159,14);field(5,'relationship','Relationship with patient',403,701,151,14)
field(5,'surrogate_date','Surrogate date',342,729,212,14);field(5,'doctor','Dr.',57,757,195,14);field(5,'doctor_date','Doctor date',456,757,98,14)
# 6: exact criterion rows from the supplied PDF; record yes/no, not eligibility.
absrows=[('hemorrhage','Hemorrhagic stroke, mass effect or edema on baseline CT, or history of intracranial hemorrhage',77.7),('sah','Suspicion of subarachnoid hemorrhage',93.4),('neoplasm','Intracranial neoplasm, arteriovenous malformation or aneurysm',109.9),('prior_infarct','Previous cerebral infarction or head trauma within past 3 months',125.7),('hypertension','Sustained or uncontrolled hypertension (systolic>185 or diastolic>110 after attempt to treat)',142.2),('onset','Onset more than 4.5 hours prior to treatment',157.9),('surgery','Major surgery within 14 days prior',174.4),('platelets','Platelet count below 100000',190.2),('inr','INR>1.7',206.7),('glucose','Blood glucose below 50 mg/dL',222.4),('anticoagulants','Warfarin / Heparin / LMWH within 48 hours and PTT not in normal range',238.9),('doac','Direct thrombin or factor Xa inhibitors within 48 hours',266.7),('severe_deficit','Severe neurological deficits at discretion of Neurologist',283.2),('puncture','Arterial puncture at non-compressible site within 7 days',298.9),('complicated','Severe complicated conditions such as AIDS or Cancer',315.4),('age','Age <18 years',331.2)]
warnrows=[('bleeding','Known bleeding disorder or high risk; GI/GU bleeding within 21 days',370.9),('mi','Acute myocardial infarction within 1 month',399.4),('seizure','Seizure at onset',415.2),('improving','Rapidly improving neurologic deficit',431.7),('minimal','Sensory loss, ataxia, dysarthria alone or minimal weakness',447.4),('preexisting','Pre-existing neurologic / psychiatric / other illness',463.9),('pregnancy','Positive blood or urine pregnancy test',479.7),('lp','Lumbar puncture within 7 days',496.2),('trauma','Serious trauma within 14 days',511.9),('endocarditis','Pericarditis, bacterial endocarditis',539.7),('organ','Significant liver or kidney dysfunction',556.2),('retinopathy','Diabetic hemorrhagic retinopathy',571.9)]
for prefix,rows in [('exclusion',absrows),('warning',warnrows)]:
 for id,label,y in rows:yesno(6,prefix+'_'+id,prefix.title()+': '+label,43,y-1,68)
for id,label,y in [('age','Age >80 years',539.7),('anticoagulants','Oral anticoagulants regardless of INR',556.2),('nihss','NIHSS>25',571.9),('stroke_dm','Combination of previous stroke and diabetes mellitus',588.4)]:yesno(6,'expanded_'+id,'Expanded Treatment (3-4.5 hrs): '+label,266,y-1,291)
for id,label,x,y in [('time','Time',47,630.4),('refused','Patient/family Refused',303,630.4),('hypertension','Uncontrolled Hypertension',47,646.2),('no_iv','No IV access',303,646.2),('ct','CT finding',47,662.7),('platelets','Platelet count less than 100000',303,662.7),('severity','Stroke severity',47,678.4),('coagulation','Abnormal aPTT, PT/INR',303,678.4),('glucose','Blood glucose less than 50',47,694.9),('bleeding','Active internal bleeding previous 21 days',303,694.9),('recent_ic','Recent IC surgery (3 mo), Head trauma/Stroke',47,710.7),('anticoagulation','Patient on anticoagulation',315,710.7)]:check(6,'reason_'+id,'Reason for non-treatment: '+label,x,y)
# 7 / 8 consent: text entries only, never fabricate a signature or infer agreement.
identity(7,412,77,139,16);field(7,'comments','Additional comments if any (dictated explanation / consent status / refusal)',40,301,514,30)
field(7,'explaining_doctor','Doctor explaining',57,337,235,14);field(7,'consent_doctor','Dr. has explained the above (doctor name only)',57,602,262,14)
field(7,'guardian',"Patient / Family Member / Guardian's name",309,646,244,14);field(7,'relationship','Relationship with Patient',309,674,244,14);field(7,'witness',"Witness's Name (not signature)",309,732,244,14);field(7,'date','Date',72,761,481,14)
identity(8,412,77,139,16)
for id,label,x,y,w in [('name','ശ്രീ./ശ്രീമതി. Patient name',101,186,167),('uhid','UHID No.',324,186,71),('age','വയസ്സ് Age',406,186,32),('doctor','Explaining doctor',40,224,168),('guardian','രോഗി / കുടുംബാംഗം / രക്ഷകർത്താവ് പേര് (Patient / guardian name)',298,645,255),('specialist','സ്ട്രോക്ക് സ്പെഷ്യലിസ്റ്റ് പേര് (Stroke specialist name)',298,712,255),('date','തീയതി Date',88,780,465)]:field(8,id,label,x,y,w,16)
field(8,'sex','സ്ത്രീ/പുരുഷൻ Sex (dictated only)');field(8,'consent_details','Explicitly dictated explanation, questions, consent or refusal; do not copy printed boilerplate')
# 9: every scoring column and side, dates, totals. Never derive from descriptions.
identity(9,423,63,128,16)
for id,label,x,y,w,h in [('arrival','Arrival date & time',156,92,146,17),('initial_date','Initial NIHSS score date & time',418,92,134,17),('procedures_date','Other procedures date & time',156,113,146,10),('hospital_discharge_date','Date of discharge',418,113,134,10)]:field(9,id,label,x,y,w,h)
rows=[('date','Date/Time',175,12),('loc','1a. LOC',194,30),('loc_questions','1b. LOC Questions',232,23),('loc_commands','1c. LOC Commands',263,23),('gaze','2. Best Gaze',294,31),('visual','3. Visual fields',334,30),('facial','4. Facial Palsy',373,30),('arm_left','5. Motor Arm Left',440,10),('arm_right','5. Motor Arm Right',465,10),('leg_left','6. Motor Leg Left',505,10),('leg_right','6. Motor Leg Right',530,8),('ataxia','7. Limb Ataxia',545,21),('sensory','8. Sensory',576,37),('language','9. Best Language',624,37),('dysarthria','10. Dysarthria',672,21),('extinction','11. Extinction & Inattention',703,29),('total','TOTAL SCORE (dictated only)',738,10),('initials','Initials',752,11)]
for period,x in [('baseline',421),('24h',467),('discharge',512)]:
 for id,label,y,h in rows:field(9,period+'_'+id,{'baseline':'Baseline','24h':'24 Hrs Post TPA','discharge':'Discharge'}[period]+': '+label,x,y,41,h)
field(9,'untestable','UN / untestable explanation and side / timepoint (explicit only)')
# All unmatched details, uncertainties and clinical details without a printable blank remain accessible.
for n in range(1,10):field(n,'other_details','Other dictated details with no matching blank; also preserve units / findings / uncertainties that cannot fit a checkbox. Never omit them.')
sha=hashlib.sha256((root/'protocol/stroke-protocol.pdf').read_bytes()).hexdigest()
for page in pages:
 assert len(set(f['id'] for f in page))==len(page)
 for f in page:
  if 'box' in f:
   x,y,w,h=f['box'];assert x>=0 and y>=0 and w>0 and h>0 and x+w<595 and y+h<842,f
manifest=json.loads((root/'protocol/source-manifest.json').read_text())
version=manifest.get('templateRevision',1)
legacy=[{'source':manifest['originalSourcePdfSha256'],'version':1,'fieldAliases':{'1':{'urea_creatinine_tsh':'urea_creatinine'}},'unavailableFields':['urea_creatinine','reason_anticoagulation']}] if version==2 else []
(root/'protocol-fields.js').write_text('// Field placements checked against Stroke_Protocol_Form.pdf, PDF-point coordinates.\nexport const protocolFieldSource = '+json.dumps(sha)+';\nexport const protocolFieldVersion = '+str(version)+';\nexport const protocolLegacyRevisions = '+json.dumps(legacy,indent=2)+';\nexport const protocolFields = '+json.dumps(pages,ensure_ascii=False,indent=2)+';\n')
print('Fields per page:',[len(p) for p in pages])

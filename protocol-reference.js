// Field labels checked against the supplied Stroke_Protocol_Form.pdf. These describe the
// blank form, not patient facts or treatment recommendations. No form default is
// to be copied into a dictation, and no score, timing or consent may be inferred.
export const protocolReferences = [
  `Page 1 — STROKE PROTOCOL FORM
Patient label; Name; Age; Sex; UHID No.; Mobile; Date; Contact Person Name (Relation) & No.; Diagnosis; On Examination.
Risk-factor table: DM; Dyslipidemia; Smoking; Alcoholism; Obesity; OSA; IHD; AF; HTN; Family History; Previous Stroke/TIA.
Initial-order completion checkboxes: finger-stick blood sugar; ECG & BP check; oxygen/nasal cannula/SpO2; IV access including gauge and side; IV fluid normal saline/rate; continuous cardiac monitoring; nasogastric tube; NPO/swallowing screen; dysphagia; bladder catheterization/distension and timing.
Vital signs to be monitored Stroke Nurse: BP and any stated treatment; Heart rate; Cardiac rhythm (Normal / AF); SpO2.
Dysphagia Screen: 1. Glasgow Coma Scale LESS than 13? 2. Facial Asymmetry/Weakness? 3. Tongue Asymmetry/Weakness? 4. Palatal Asymmetry/Weakness? 5. Needed reference to Speech Therapist? 6. Signs of aspiration during the 3 oz water test? Record dictated Yes/No only. Record any dictated swallowing test observations.
Laboratory studies: Complete blood count and platelet count; PT / INR; Blood urea / Creatinine; Serum electrolytes; Viral markers (CARD test); Trop I.
NIHS Score (to be done by Doctor); NIH Stroke Scale Score; Stroke Severity. Record only the score/severity explicitly dictated, without calculating or applying the printed classification.
Transfer to CT scan; Stroke Nurse Name; Signature; Time & Date.`,
  `Page 2 — QUALITY ASSESSMENT TIMINGS
1. Last Seen Normal; Wake up/unknown.
2. Stroke Onset/Noticed Time.
3. ER Arrival Time.
4. Code 7 Activated Time.
5. Complete Neurological Assessment Time.
6. MRI/CT Scan Arrival Time.
7. MRI/CT Scan Start Time.
8. Door to Imaging Time.
9. IVT Start Time.
10. Door to Needle; a) <45 mts; b) <60 mts; c) >60 mts; reason for delay. These are printed labels, not observed intervals.
11. Large Vessel Occlusion: Yes / No.
12. Cath Lab Arrival Time.
13. Groin Puncture Time.
14. First Pass Time (event timestamp).
15. Door to First Pass (application-calculated).
16. Mechanical Thrombectomy Outcome (TICI) Score; TICI Grade; Modified TICI With 2c. Record dictated grade/reperfusion description only.
17. Recanalization Time (event timestamp).
18. Door to Recanalization (application-calculated).
19. 24 Hour CT Scan; SICH Yes / No.
20. Decompressive Craniectomy: Yes / No.
Preserve dates, times and intervals exactly as dictated; do not calculate missing intervals or infer delays.`,
  `Page 3 — RADIOLOGY FORM
Patient label; Radiologist Opinion.
Imaging-sign table: Insular Ribbon Sign; Dense MCA; MCA Dot Sign; Grey White; Sulcal Effacement.
CT/MR Angiogram; Radiologist; Time; Date.
STROKE CONSULTANT COMMENTS.
Decision table: IVT; IA; IVT + MT; MT; Medical Management.
Modified Rankin Scale (mRS) Score: at Admission; at Discharge.
NIHSS Score; Stroke Consultant's Name; Sign; Time & Date.
Record only findings and decisions explicitly dictated.`,
  `Page 4 — mRS / ASPECTS and collaterals
Score table: Before illness; At admission; At discharge; Total (0-6).
ASPECTS Score: C - Caudate; I - Insular ribbon; IC - Internal Capsule; L - Lentiform nucleus; M1 - Anterior MCA cortex; M2 - MCA cortex lateral to the insular ribbon; M3 - Posterior MCA cortex; M4 - Anterior MCA superior territory; M5 - Lateral MCA superior territory; M6 - Posterior MCA superior territory. ASPECTS Score = /10.
CT collateral reference figure: Site of Occlusion; Phase 1; Phase 2; Phase 3; Good collaterals; Intermediate collaterals; Poor collaterals.
Collateral score table: Good (5, 4); Intermediate (3, 2); Poor (1, 0).
The image/score descriptions are references only. Do not interpret a scan, assign a region, compute a score or infer a collateral grade; record only what is dictated.`,
  `Page 5 — COUNSELLING FORM
Name; UHID No.; Diagnosis.
Diagram reference labels: Middle cerebral artery; Vertebral artery; Common carotid artery; Arch of aorta. Body outline for reference.
Treatment.
Expected Outcome and Complications.
Surrogate's name; Relationship with patient; Signature; Date.
Dr.; Signature; Date.
Do not assume counselling, understanding, consent or a signature from the blank form.`,
  `Page 6 — THROMBOLYTIC CHECKLIST FOR STROKE
Yes / No columns for ABSOLUTE EXCLUSION CRITERIA: hemorrhagic stroke/mass effect/edema on baseline CT or history of intracranial hemorrhage; suspicion of subarachnoid hemorrhage; intracranial neoplasm/arteriovenous malformation/aneurysm; previous cerebral infarction or head trauma; sustained or uncontrolled hypertension; symptom-onset timing; major surgery; platelet count; INR; blood glucose; warfarin/Heparin/LMWH and PTT; direct thrombin or direct factor Xa inhibitors; severe neurological deficits; non-compressible arterial puncture; severe complicated conditions; age.
Cautions / Warnings Yes / No: bleeding disorder or high bleeding risk/GI or GU bleeding; recent acute myocardial infarction; seizure at onset; rapidly improving neurologic deficit; sensory loss/ataxia/dysarthria/minimal weakness; pre-existing neurologic/psychiatric/other illness; positive pregnancy test; lumbar puncture; serious trauma; pericarditis/bacterial endocarditis; significant liver or kidney dysfunction; diabetic hemorrhagic retinopathy.
Expanded Treatment (3-4.5 hrs) Criteria: All of the above EXCEPT ABSOLUTE CONTRAINDICATIONS; Age >80 years; oral anticoagulants regardless of INR; NIHSS >25; combination of previous stroke and diabetes mellitus. These are blank-form labels, not patient conditions.
REASONS FOR NON-TREATMENT WITH THROMBOLYTICS: Time; Patient/family Refused; Uncontrolled Hypertension; No IV access; CT finding; Platelet count; Stroke severity; Abnormal aPTT/PT/INR; Blood Glucose; Active internal bleeding; Recent IC surgery/Head trauma/Stroke; Patient on anticoagulation. Mark the anticoagulation non-treatment reason only when explicitly dictated as a reason for withholding thrombolysis; medication use alone does not establish that reason.
Preserve every dictated number, unit, date, time, yes/no/unknown and explanation. Do not decide eligibility or apply any printed cutoff to the patient.`,
  `Page 7 — INFORMED CONSENT FOR INTRAVENOUS THROMBOLYSIS: ALTEPLASE / TENECTEPLASE
PATIENT LABEL.
Explanation to patient/family member/guardian: condition, procedure, expected benefits, alternatives, risks/complications. Additional comments if any.
Doctor explaining; patient/family/guardian understanding and consent, only if explicitly dictated.
Risk discussion fields: Death/stroke/permanent neurological injury (Paralysis, coma, etc.); Bleeding in other parts of the body; Allergic reaction to medications; Need for blood transfusions to replace clotting factors; Other unexpected complications. The source repeats the death/stroke/injury box; do not invent a second event or assume any event occurred.
Dr. has explained the above; Patient / Family Member / Guardian's name; Relationship with Patient; Patient / Family Member / Guardian's Signature; Witness's Name & Signature; Date.
Never insert boilerplate confirmation that consent was obtained, a procedure was explained, questions were answered or someone signed. Such statements must be clearly dictated.`,
  `Page 8 — Malayalam INFORMED CONSENT FOR INTRAVENOUS THROMBOLYSIS: ALTEPLASE / TENECTEPLASE
PATIENT LABEL; ശ്രീ./ശ്രീമതി.; UHID No.; വയസ്സ്; സ്ത്രീ/പുരുഷൻ; explaining doctor.
Fields for dictated explanation of the diagnosis/procedure, available treatments, benefits, risks and complications, discussion and questions, and any explicit consent or refusal.
രോഗി / കുടുംബാംഗം / രക്ഷകർത്താവ് പേര്; രോഗി / കുടുംബാംഗം / രക്ഷകർത്താവ് ഒപ്പ്; സ്ട്രോക്ക് സ്പെഷ്യലിസ്റ്റ് പേര്; സ്ട്രോക്ക് സ്പെഷ്യലിസ്റ്റ് ഒപ്പ്; തീയതി.
The original Malayalam page is a blank consent reference. Translate only clearly dictated Malayalam/English/Manglish into faithful professional clinical English. Never copy consent/legal boilerplate or infer agreement, understanding, discussion, signatures or authorization. Preserve any refusal, uncertainty and relationships exactly.`,
  `Page 9 — National Institutes of Health Stroke Scale (NIHSS) Score Performed for Ischemic Stroke Patients
PATIENT LABEL; Arrival date & time; Initial NIHSS score date & time; Other procedures date & time; Date of discharge.
Scoring columns: Baseline; 24 Hrs Post TPA; Discharge; Date/Time.
1a. LOC; 1b. LOC Questions (month and age); 1c. LOC Commands.
2. Best Gaze; 3. Visual fields; 4. Facial Palsy.
5. Motor Arm: Left / Right; 6. Motor Leg: Left / Right.
7. Limb Ataxia; 8. Sensory; 9. Best Language; 10. Dysarthria; 11. Extinction & Inattention.
UN/untestable with explanation where dictated; Initials; TOTAL SCORE; Physician Signature.
Record each explicitly dictated item score, side, timepoint, observation and total separately. Do not calculate totals, infer normal/zero values, convert findings into scores or interpret the printed scoring definitions.`
];

import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { protocolFields, protocolFieldSource, protocolFieldVersion, protocolLegacyRevisions } from '../protocol-fields.js';
import { fieldContract, validateFieldOutput, currentFieldValues } from '../protocol-field-output.js';
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../protocol/stroke-protocol.pdf',import.meta.url))).digest('hex'),protocolFieldSource);
assert.equal(protocolFields.length,9);
for(const [index,fields] of protocolFields.entries()){
 assert.equal(new Set(fields.map(f=>f.id)).size,fields.length);
 assert(fields.some(f=>f.id==='other_details'));
 for(const field of fields){
  if(!field.box)continue;
  const [x,y,w,h]=field.box;assert(x>=0&&y>=0&&w>0&&h>0&&x+w<=594.96&&y+h<=841.92);
  if(field.kind==='yesno')assert(field.noX>=0&&field.noX+w<594.96);
 }
 const id=fields[0].id;
 assert.deepEqual(validateFieldOutput({text:' Patient details ',fields:[{id,value:' explicit only '}]},index+1),{text:'Patient details',fields:{[id]:'explicit only'}});
 for(const invalid of [null,{text:'',fields:[]},{text:'x',fields:[{id:'not_a_form_field',value:'x'}]},{text:'x',fields:[{id,value:'x'},{id,value:'y'}]},{text:'x',fields:[{id,value:4}]}])assert.throws(()=>validateFieldOutput(invalid,index+1));
 assert.equal(fieldContract(index+1).length,fields.length);
}
assert.throws(()=>validateFieldOutput({text:'No page leakage',fields:[{id:'baseline_loc',value:'2'}]},1));
const make=(value,time,extra={})=>({text:'Dictated',pageNumber:1,fields:{name:value},fieldSource:protocolFieldSource,fieldVersion:protocolFieldVersion,createdAt:{seconds:time},...extra});
const original={old:make('Earlier',1),new:make('Later',2),legacy:{text:'Legacy text'},wrongPage:make('Wrong page',3,{pageNumber:2}),wrongSource:make('Wrong PDF',4,{fieldSource:'other'}),unknown:make('Later',5,{fields:{not_a_form_field:'no'}})};
assert.equal(currentFieldValues(original,1).name.value,'Later');
assert.equal(original.old.fields.name,'Earlier');
console.log('All nine PDF field maps, strict output validation, page/source isolation and chronological merge checks passed.');

const risks=protocolFields[0].filter(f=>f.kind==='binary');
assert.equal(risks.length,11);
for(const f of risks){
 assert.equal(validateFieldOutput({text:'Explicit denial',fields:[{id:f.id,value:'no'}]},1).fields[f.id],'No');
 assert.throws(()=>validateFieldOutput({text:'Unknown',fields:[{id:f.id,value:'unknown'}]},1));
}
assert.equal(currentFieldValues({...original,clear:make('',6,{kind:'manual-edit'})},1).name.value,'');
const {protocolPatientData,protocolPatientMeta}=await import('../protocol-patient.js');
const patient={noteType:'code7',protocolDictations:{page1:{a:make('Test Patient',10,{fields:{name:'Test Patient',age:'56',uhid:'00123'}})}}};
assert.deepEqual(protocolPatientData(patient),{name:'Test Patient',age:'56',uhid:'00123'});
assert.equal(protocolPatientMeta(patient),'56 years · UHID 00123');
console.log('Risk factors, explicit clearing and patient sidebar identity passed.');

// The approved v2 revision preserves old records without rewriting them.
const oldSource=protocolLegacyRevisions.find(revision=>revision.version===1).source;
const old={text:'Historical saved dictation',pageNumber:1,fieldSource:oldSource,fieldVersion:1,fields:{name:'Existing patient',age:'56',uhid:'00042',urea_creatinine_tsh:'Yes'},createdAt:{seconds:1}};
const originalJson=JSON.stringify(old);
assert.equal(currentFieldValues({old},1).urea_creatinine.value,'Yes');
assert.equal(currentFieldValues({old},1).name.value,'Existing patient');
assert.equal(currentFieldValues({old},1).uhid.value,'00042');
assert.equal(JSON.stringify(old),originalJson);
assert.equal(currentFieldValues({old:{...old,fields:{urea_creatinine:'Yes'}}},1).urea_creatinine,undefined);
assert.equal(currentFieldValues({old:{...old,pageNumber:6,fields:{reason_anticoagulation:'Yes'}}},6).reason_anticoagulation,undefined);
assert.equal(currentFieldValues({old:{...old,fieldVersion:999}},1).name,undefined);
assert.equal(currentFieldValues({old,clear:make('',2,{fields:{urea_creatinine:''},kind:'manual-edit'})},1).urea_creatinine.value,'');
assert.equal(protocolFields[0].find(f=>f.id==='urea_creatinine').label,'Blood urea / Creatinine drawn');
assert(!protocolFields[0].some(f=>f.id==='urea_creatinine_tsh'||f.label.includes('TSH')));
assert.equal(protocolFields[5].find(f=>f.id==='reason_anticoagulation').box[0],315);
assert.equal(validateFieldOutput({text:'Explicit non-treatment reason',fields:[{id:'reason_anticoagulation',value:'yes'}]},6).fields.reason_anticoagulation,'Yes');
assert.throws(()=>validateFieldOutput({text:'Uncertain',fields:[{id:'reason_anticoagulation',value:'unknown'}]},6));
assert.equal(validateFieldOutput({text:'Medication reported; no reason stated',fields:[]},6).fields.reason_anticoagulation,undefined);
assert.deepEqual(protocolPatientData({noteType:'code7',protocolDictations:{page1:{old}}}),{name:'Existing patient',age:'56',uhid:'00042'});
console.log('V2 laboratory rename, new anticoagulation reason, historical values, identity, explicit clears and revision isolation passed.');

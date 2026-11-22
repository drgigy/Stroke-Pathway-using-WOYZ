import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { protocolFields, protocolFieldSource, protocolFieldVersion } from '../protocol-fields.js';
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

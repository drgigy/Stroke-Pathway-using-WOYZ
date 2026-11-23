import { protocolFields } from './protocol-fields.js';
import { currentFieldValues } from './protocol-field-output.js';
import { isReviewPage } from './page-mode.js';
import { draftProtocolField, saveProtocolField, isProtocolFieldDirty } from './protocol-form-editor.js';

function binaryValue(value) {
  if (/^(yes|present|positive)$/i.test(value)) return 'Yes';
  if (/^(no|absent|negative)$/i.test(value)) return 'No';
  return '';
}
function place(control, box) {
  const [x,y,w,h]=box;
  Object.assign(control.style,{left:`${x/594.95996*100}%`,top:`${y/841.91998*100}%`,width:`${w/594.95996*100}%`,height:`${h/841.91998*100}%`});
  control.dataset.pdfWidth=w;control.dataset.pdfHeight=h;
}
function fit(control) {
  const width=Number(control.dataset.pdfWidth),height=Number(control.dataset.pdfHeight);let size=8.5;
  if(control.type==='checkbox')size=11;
  else if(height<=16){const ctx=document.createElement('canvas').getContext('2d');if(ctx){ctx.font='600 8.5px Arial';size=Math.max(6,Math.min(8.5,(width-2)/Math.max(1,ctx.measureText(control.value||'Yes').width)*8.5));}}
  control.style.fontSize=`${size/594.95996*100}cqw`;
}
function makeControl(field,box,option) {
  const checkbox=['yesno','check','choice'].includes(field.kind);
  const control=document.createElement(checkbox?'input':field.kind==='binary'&&isReviewPage?'select':box[3]>16?'textarea':'input');
  if(checkbox){control.type='checkbox';control.dataset.option=option;control.classList.add('protocol-field-check');}
  else if(control.tagName==='SELECT')for(const value of ['', 'Yes','No']){const item=document.createElement('option');item.value=value;item.textContent=value||'—';control.append(item);}
  else if(control.tagName==='INPUT')control.type='text';
  control.classList.add('protocol-filled-field');control.dataset.fieldId=field.id;
  control.setAttribute('aria-label',field.label+(checkbox?' — '+option:''));
  control.autocomplete='off';control.spellcheck=false;
  if(!isReviewPage){if(checkbox)control.disabled=true;else control.readOnly=true;}
  else{
    control.classList.add('protocol-editable-field');
    const value=()=>checkbox?(control.checked?option:''):control.value;
    if(!checkbox)control.addEventListener('input',()=>{draftProtocolField(field.id,value());fit(control);});
    control.addEventListener('change',()=>{
      if(checkbox)for(const sibling of control.parentElement.querySelectorAll('input[type="checkbox"]'))if(sibling.dataset.fieldId===field.id&&sibling!==control)sibling.checked=false;
      draftProtocolField(field.id,value());saveProtocolField(field.id,value());
    });
    if(!checkbox)control.addEventListener('blur',()=>{if(isProtocolFieldDirty(field.id))saveProtocolField(field.id,value());});
    if(control.tagName==='INPUT'&&!checkbox)control.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();control.blur();}});
  }
  place(control,box);return control;
}
export function renderFilledProtocolForm(sheet,pageNumber,dictations) {
  sheet.querySelector('.protocol-field-review')?.remove();
  const canvas=sheet.querySelector('.protocol-form-canvas'),fields=protocolFields[pageNumber-1].filter(field=>field.box);
  let layer=sheet.querySelector('.protocol-field-layer');
  if(!layer){
    layer=document.createElement('div');layer.className='protocol-field-layer';layer.setAttribute('aria-label',isReviewPage?'Editable protocol form':'Filled protocol form');
    for(const field of fields){
      if(field.kind==='yesno'){layer.append(makeControl(field,field.box,'Yes'),makeControl(field,[field.noX,...field.box.slice(1)],'No'));}
      else if(field.kind==='choice')for(const option of field.options)layer.append(makeControl(field,option.box,option.value));
      else layer.append(makeControl(field,field.box,field.kind==='check'?'Yes':undefined));
    }
    canvas.append(layer);
  }
  const values=currentFieldValues(dictations,pageNumber),byId=new Map(fields.map(field=>[field.id,field]));
  for(const control of layer.children){
    const field=byId.get(control.dataset.fieldId),stored=values[field.id]?.value||'';
    if(isReviewPage&&(document.activeElement===control||isProtocolFieldDirty(field.id)))continue;
    const value=field.kind==='binary'?binaryValue(stored):stored;
    control.dataset.takeId=values[field.id]?.takeId||'';
    control.title=field.label+(stored?': '+stored:'');
    if(control.type==='checkbox')control.checked=value===control.dataset.option;
    else control.value=value;
    control.hidden=!isReviewPage&&!value;
    if(control.type==='checkbox'&&!isReviewPage)control.hidden=!control.checked;
    fit(control);
  }
}

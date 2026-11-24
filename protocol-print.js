import { isReviewPage } from './page-mode.js';
import { protocolPages } from './protocol-pages.js';
import { protocolFields } from './protocol-fields.js';
import { renderFilledProtocolForm } from './protocol-form-overlay.js';
let prepared;
export function cancelProtocolPrint(){
 prepared?.remove();prepared=null;document.body.classList.remove('printing-filled-protocol');
}
window.addEventListener('afterprint',cancelProtocolPrint);
function tick(){
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 16 16');svg.setAttribute('aria-label','Checked');
 const path=document.createElementNS(svg.namespaceURI,'path');for(const [key,value]of Object.entries({d:'M2 8l4 4L14 3',fill:'none',stroke:'#000','stroke-width':'2.5','stroke-linecap':'round','stroke-linejoin':'round'}))path.setAttribute(key,value);svg.append(path);return svg;
}
function flattenValues(sheet,pageNumber,overflow){
 const definitions=protocolFields[pageNumber-1];
 for(const control of sheet.querySelectorAll('.protocol-filled-field')){
  if(control.hidden||control.type==='checkbox'&&!control.checked){control.remove();continue;}
  const value=document.createElement('div');value.className='protocol-print-value';value.style.cssText=control.style.cssText;value.dataset.fieldId=control.dataset.fieldId;
  if(control.type==='checkbox'){value.classList.add('protocol-print-tick');value.append(tick());}
  else{value.textContent=control.value;if(control.tagName==='SELECT')value.style.textAlign='center';}
  control.replaceWith(value);
  if(value.classList.contains('protocol-print-tick'))continue;
  let font=parseFloat(getComputedStyle(value).fontSize);const minimum=8;
  const clipped=()=>value.scrollHeight>value.clientHeight+1||value.scrollWidth>value.clientWidth+1;
  while(clipped()&&font>minimum){font=Math.max(minimum,font-.5);value.style.fontSize=font+'px';}
  if(clipped()){
   const marker='C'+(overflow.length+1),label=definitions.find(field=>field.id===value.dataset.fieldId)?.label||'Field';
   overflow.push({marker,pageNumber,label,text:value.textContent});value.textContent='['+marker+']';value.dataset.continuation=marker;
  }
 }
}
export async function printFilledProtocol({dictations={},isCurrent=()=>true}={}){
 if(!isReviewPage)throw new Error('review-page-required');
 cancelProtocolPrint();
 const root=document.createElement('main');root.id='protocolPrintRoot';root.setAttribute('aria-hidden','true');prepared=root;document.body.append(root);
 try{
  const images=[],sheets=[];
  for(const page of protocolPages){
   const sheet=document.createElement('section');sheet.className='protocol-print-page';sheet.dataset.pageNumber=String(page.number);sheet.setAttribute('aria-label',page.title);
   const canvas=document.createElement('div');canvas.className='protocol-form-canvas';
   const image=document.createElement('img');image.className='protocol-print-image';image.src=new URL(page.src,import.meta.url).href;image.alt=page.title;image.width=page.width;image.height=page.height;image.decoding='sync';
   canvas.append(image);sheet.append(canvas);root.append(sheet);sheets.push(sheet);images.push(image);
   renderFilledProtocolForm(sheet,page.number,dictations['page'+page.number],{readOnly:true});
  }
  await Promise.all(images.map(image=>image.decode()));await document.fonts?.ready;
  if(prepared!==root||!isCurrent())throw new Error('print-case-changed');
  const overflow=[];for(const [index,sheet]of sheets.entries())flattenValues(sheet,index+1,overflow);
  if(overflow.length){
   const continuation=document.createElement('section');continuation.className='protocol-print-continuations';
   const heading=document.createElement('h1');heading.textContent='Continuation - full field values';continuation.append(heading);
   for(const field of overflow){const item=document.createElement('article'),title=document.createElement('h2'),text=document.createElement('p');title.textContent=`[${field.marker}] Page ${field.pageNumber} - ${field.label}`;text.textContent=field.text;item.append(title,text);continuation.append(item);}
   root.append(continuation);
  }
  if(prepared!==root||!isCurrent())throw new Error('print-case-changed');
  root.removeAttribute('aria-hidden');document.body.classList.add('printing-filled-protocol');window.print();
 }catch(error){if(prepared===root)cancelProtocolPrint();throw error;}
}

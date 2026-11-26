import { caseWideInstruction, caseWideResponseSchema, validateCaseWideOutput } from './shared/case-wide-dictation.js';
import { failure } from './service.js';
export async function transcribeCase({audio,mimeType,recordedAt,key}) {
 const payload={systemInstruction:{parts:[{text:caseWideInstruction(recordedAt)}]},contents:[{role:'user',parts:[{text:'Transcribe and map only explicitly dictated facts for the fixed shared patient case.'},{inlineData:{mimeType,data:audio.toString('base64')}}]}],generationConfig:{temperature:0,maxOutputTokens:16384,responseMimeType:'application/json',responseSchema:caseWideResponseSchema()}};
 for(const model of ['gemini-2.5-flash','gemini-flash-latest']){
  const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify(payload),signal:AbortSignal.timeout(180000)});
  if(!response.ok){if([404,408,429,500,502,503,504].includes(response.status)&&model==='gemini-2.5-flash')continue;throw failure('processing-unavailable');}
  const result=await response.json();
  try{if(result.candidates?.[0]?.finishReason!=='STOP')throw new Error('incomplete');return validateCaseWideOutput(JSON.parse(result.candidates[0].content.parts.filter(p=>!p.thought).map(p=>p.text||'').join('')));}catch{throw failure('invalid-output');}
 }
 throw failure('processing-unavailable');
}

import { onProtocolDictationChange, protocolDictationState, pauseProtocolDictation, finishProtocolDictation, startProtocolDictation } from './protocol-dictation.js';
import { isReviewPage } from './page-mode.js';
let panel,canvas,ctx,source,analyser,samples,stream,frame,elapsed=0,recordingSince=null,takeId,caseScope=null,dismissedNotice='',position=null,drag=null;
function releaseAudio(){source?.disconnect();source=null;analyser=null;samples=null;stream=null;if(ctx){ctx.close().catch(()=>{});ctx=null;}}
function unlockAudio(){
 try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;if(!ctx||ctx.state==='closed')ctx=new Audio();ctx.resume().catch(()=>{});}catch{}
}
function attachAudio(value){
 if(stream===value)return;
 source?.disconnect();source=null;analyser=null;stream=value;
 if(!value)return;
 try{unlockAudio();if(!ctx)return;source=ctx.createMediaStreamSource(value);analyser=ctx.createAnalyser();analyser.fftSize=1024;analyser.smoothingTimeConstant=0;samples=new Float32Array(analyser.fftSize);source.connect(analyser);}catch{analyser=null;}
}
function draw(now){
 const state=protocolDictationState();
 const duration=elapsed+(recordingSince===null?0:Math.max(0,performance.now()-recordingSince));
 panel.querySelector('.dictation-timer').textContent=String(Math.floor(duration/60000)).padStart(2,'0')+':'+String(Math.floor(duration/1000)%60).padStart(2,'0');
 const width=Math.max(1,canvas.clientWidth),height=Math.max(1,canvas.clientHeight),dpr=Math.min(2,devicePixelRatio||1);
 if(canvas.width!==Math.round(width*dpr)||canvas.height!==height*dpr){canvas.width=Math.round(width*dpr);canvas.height=height*dpr;}
 const paint=canvas.getContext('2d');paint.setTransform(dpr,0,0,dpr,0,0);paint.clearRect(0,0,width,height);
 let data=null,rms=0;
 if(state.phase==='recording'&&analyser){data=samples;analyser.getFloatTimeDomainData(data);rms=Math.sqrt(data.reduce((sum,value)=>sum+value*value,0)/data.length);}
 const voiced=rms>=0.008;
 canvas.dataset.signal=state.phase==='paused'?'paused':state.phase==='recording'&&!analyser?'unavailable':voiced?'voice':'silent';
 canvas.setAttribute('aria-label',state.phase==='recording'&&!analyser?'Audio visualization unavailable':voiced?'Microphone signal detected':'No active microphone signal');
 paint.strokeStyle='#ff4b57';paint.lineWidth=2;paint.lineCap='round';paint.beginPath();
 for(let x=0;x<width;x++){const sample=voiced?data[Math.floor(x/width*data.length)]:0;const y=height/2+Math.max(-1,Math.min(1,sample*3))*height*.42;if(x===0)paint.moveTo(x,y);else paint.lineTo(x,y);}
 paint.stroke();
 if(!panel.hidden)frame=requestAnimationFrame(draw);else frame=null;
}
function hide(){panel.hidden=true;}
function reveal(){panel.hidden=false;if(position)placePanel(position);if(!frame)frame=requestAnimationFrame(draw);}
function placePanel(value){
 const viewport=window.visualViewport,rect=panel.getBoundingClientRect(),left=(viewport?.offsetLeft||0)+8,top=(viewport?.offsetTop||0)+8,right=left+(viewport?.width||innerWidth)-16,bottom=top+(viewport?.height||innerHeight)-16;
 position={x:Math.max(left,Math.min(value.x,Math.max(left,right-rect.width))),y:Math.max(top,Math.min(value.y,Math.max(top,bottom-rect.height)))};
 Object.assign(panel.style,{left:position.x+'px',top:position.y+'px',bottom:'auto',transform:'none'});
}
function mountDrag(handle){
 handle.addEventListener('pointerdown',event=>{if(!event.isPrimary||event.button!==0)return;const rect=panel.getBoundingClientRect();drag={id:event.pointerId,x:event.clientX-rect.left,y:event.clientY-rect.top};placePanel({x:rect.left,y:rect.top});handle.setPointerCapture(event.pointerId);handle.classList.add('is-dragging');event.preventDefault();});
 handle.addEventListener('pointermove',event=>{if(drag?.id!==event.pointerId)return;placePanel({x:event.clientX-drag.x,y:event.clientY-drag.y});event.preventDefault();});
 const end=event=>{if(drag?.id!==event.pointerId)return;if(handle.hasPointerCapture(event.pointerId))handle.releasePointerCapture(event.pointerId);drag=null;handle.classList.remove('is-dragging');};
 handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);
 handle.addEventListener('keydown',event=>{if(event.key==='Home'){position=null;for(const key of ['left','top','bottom','transform'])panel.style[key]='';event.preventDefault();return;}const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];if(!delta)return;const rect=panel.getBoundingClientRect(),step=event.shiftKey?30:10;placePanel({x:rect.left+delta[0]*step,y:rect.top+delta[1]*step});event.preventDefault();});
 const clamp=()=>{if(position&&!panel.hidden)placePanel(position);};window.addEventListener('resize',clamp);window.visualViewport?.addEventListener('resize',clamp);window.visualViewport?.addEventListener('scroll',clamp);new ResizeObserver(clamp).observe(panel);
}
function update(){
 const state=protocolDictationState();
 if(state.takeId&&takeId!==state.takeId){takeId=state.takeId;elapsed=0;recordingSince=null;}
 if(state.phase==='recording'&&recordingSince===null)recordingSince=performance.now();
 if(state.phase!=='recording'&&recordingSince!==null){elapsed+=Math.max(0,performance.now()-recordingSince);recordingSince=null;}
 if(['recording','paused'].includes(state.phase)&&state.stream)attachAudio(state.stream);else if(state.phase!=='requesting')releaseAudio();
 panel.dataset.state=state.phase;
 const labels={saved:'Saved',requesting:'Opening microphone…',recording:'Recording',paused:'Paused',transcribing:'Transcribing…',saving:'Saving…','save-error':'Save failed','transcribe-error':'Retry needed'};
 panel.querySelector('.dictation-panel-status').textContent=state.phase==='recording'&&state.stream&&!analyser?'Recording · waveform unavailable':labels[state.phase]||'Dictation';
 const start=panel.querySelector('.dictation-panel-start');start.hidden=state.busy;start.disabled=!state.canStart||state.caseId!==caseScope;
 panel.classList.toggle('is-idle',!state.busy);panel.querySelector('.dictation-wave-area').hidden=!state.busy;
 const pause=panel.querySelector('.dictation-panel-pause'),stop=panel.querySelector('.dictation-panel-stop');
 pause.hidden=!state.busy;pause.disabled=!['recording','paused'].includes(state.phase);pause.textContent=state.phase==='paused'?'▶ Resume':'Ⅱ Pause';
 stop.hidden=!state.busy;stop.disabled=['requesting','transcribing','saving'].includes(state.phase);stop.textContent=state.phase==='save-error'?'Retry save':state.phase==='transcribe-error'?'Retry':stop.disabled?'…':'■ Stop';stop.setAttribute('aria-label',state.phase==='save-error'?'Retry save':state.phase==='transcribe-error'?'Retry transcription':'Stop and transcribe');stop.title='Stop recording and transcribe';
 if(!state.message)dismissedNotice='';
 const notice=state.phase+'|'+state.message,showMessage=!!state.message&&notice!==dismissedNotice;
 panel.querySelector('.dictation-panel-dismiss').hidden=state.busy||!showMessage;
 const detail=panel.querySelector('.dictation-panel-message');detail.textContent=state.message;detail.hidden=!showMessage;
 panel.classList.toggle('has-message',showMessage);
 if(caseScope)reveal();else hide();

}
export function setDictationPanelCase(id){
 const next=id||null;if(next!==caseScope){position=null;dismissedNotice='';if(panel)for(const key of ['left','top','bottom','transform'])panel.style[key]='';}
 caseScope=next;if(panel)update();
}
export function mountDictationPanel(host){
 if(isReviewPage||panel||!host)return;
 document.body.classList.add('floating-dictation-enabled');
 panel=document.createElement('section');panel.className='dictation-panel';panel.id='dictationRecorder';panel.hidden=true;panel.setAttribute('role','region');panel.setAttribute('aria-label','Dictation recorder');
 panel.innerHTML='<button type="button" class="dictation-panel-start">Start</button><span class="dictation-panel-status" role="status" aria-live="polite"></span><button type="button" class="dictation-panel-pause">Ⅱ Pause</button><div class="dictation-wave-area" tabindex="0" role="group" aria-label="Move recorder: drag here or use arrow keys. Home resets its position."><time class="dictation-timer">00:00</time><canvas class="dictation-waveform" role="img" aria-label="Microphone waveform"></canvas></div><button type="button" class="dictation-panel-stop" aria-label="Stop and transcribe">■ Stop</button><button type="button" class="dictation-panel-dismiss" aria-label="Dismiss recorder message" hidden>×</button><p class="dictation-panel-message" role="status" hidden></p>';
 canvas=panel.querySelector('.dictation-waveform');
 panel.querySelector('.dictation-panel-dismiss').addEventListener('click',()=>{const state=protocolDictationState();dismissedNotice=state.phase+'|'+state.message;update();});
 panel.querySelector('.dictation-panel-start').addEventListener('click',()=>{unlockAudio();startProtocolDictation();});
 panel.querySelector('.dictation-panel-pause').addEventListener('click',()=>{unlockAudio();pauseProtocolDictation();});
 panel.querySelector('.dictation-panel-stop').addEventListener('click',finishProtocolDictation);
 document.body.append(panel);mountDrag(panel.querySelector('.dictation-wave-area'));
 document.addEventListener('click',event=>{if(event.target.closest('.protocol-record-start'))unlockAudio();},true);
 onProtocolDictationChange(update);update();
 window.addEventListener('pagehide',releaseAudio);
}

import { onProtocolDictationChange, protocolDictationState, pauseProtocolDictation, finishProtocolDictation } from './protocol-dictation.js';
import { isReviewPage } from './page-mode.js';
let panel,canvas,ctx,source,analyser,samples,stream,frame,elapsed=0,recordingSince=null,takeId,lastBusy=false,lastNotice='';
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
 const width=Math.max(1,canvas.clientWidth),height=64,dpr=Math.min(2,devicePixelRatio||1);
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
function reveal(){panel.hidden=false;if(!frame)frame=requestAnimationFrame(draw);}
function update(){
 const state=protocolDictationState();
 if(state.takeId&&takeId!==state.takeId){takeId=state.takeId;elapsed=0;recordingSince=null;}
 if(state.phase==='recording'&&recordingSince===null)recordingSince=performance.now();
 if(state.phase!=='recording'&&recordingSince!==null){elapsed+=Math.max(0,performance.now()-recordingSince);recordingSince=null;}
 if(['recording','paused'].includes(state.phase)&&state.stream)attachAudio(state.stream);else if(state.phase!=='requesting')releaseAudio();
 panel.dataset.state=state.phase;
 panel.querySelector('.dictation-panel-close').setAttribute('aria-label',state.phase==='recording'?'Minimize dictation panel; recording continues':'Minimize dictation panel');
 const labels={saved:'Saved',requesting:'Opening microphone…',recording:'Recording',paused:'Paused',transcribing:'Transcribing…',saving:'Saving…','save-error':'Save failed','transcribe-error':'Retry needed'};
 panel.querySelector('.dictation-panel-status').textContent=state.phase==='recording'&&state.stream&&!analyser?'Recording · waveform unavailable':labels[state.phase]||'Dictation';
 const pause=panel.querySelector('.dictation-panel-pause'),stop=panel.querySelector('.dictation-panel-stop');
 pause.hidden=!['recording','paused'].includes(state.phase);pause.textContent=state.phase==='paused'?'▶ Resume':'Ⅱ Pause';
 stop.hidden=!state.busy;stop.disabled=['requesting','transcribing','saving'].includes(state.phase);stop.textContent=state.phase==='save-error'?'Retry save':state.phase==='transcribe-error'?'Retry transcription':'■ Stop & transcribe';
 const detail=panel.querySelector('.dictation-panel-message');detail.textContent=state.message;detail.hidden=!state.message;
 const open=document.querySelector('.dictation-panel-open');open.hidden=!state.busy;open.textContent=labels[state.phase]||'Dictation';
 if(state.busy&&!lastBusy)reveal();
 if(!state.busy&&state.message){const notice=state.phase+'|'+state.message;if(lastNotice!==notice){lastNotice=notice;reveal();}}
 if(!state.message)lastNotice='';
 if(!state.busy&&!state.message)panel.hidden=true;
 lastBusy=state.busy;
}
export function mountDictationPanel(host){
 if(isReviewPage||panel||!host)return;
 document.body.classList.add('floating-dictation-enabled');
 const open=document.createElement('button');open.type='button';open.className='dictation-panel-open';open.hidden=true;open.addEventListener('click',reveal);host.append(open);
 panel=document.createElement('section');panel.className='dictation-panel';panel.hidden=true;panel.setAttribute('role','region');panel.setAttribute('aria-label','Dictation recorder');
 panel.innerHTML='<header><strong>Dictation</strong><span class="dictation-panel-status" role="status" aria-live="polite"></span><button type="button" class="dictation-panel-close" aria-label="Minimize dictation panel; recording continues">×</button></header><canvas class="dictation-waveform" role="img" aria-label="Microphone waveform"></canvas><time class="dictation-timer">00:00</time><div class="dictation-panel-actions"><button type="button" class="dictation-panel-pause">Ⅱ Pause</button><button type="button" class="dictation-panel-stop">■ Stop &amp; transcribe</button></div><p class="dictation-panel-message" role="status" hidden></p>';
 canvas=panel.querySelector('.dictation-waveform');
 panel.querySelector('.dictation-panel-close').addEventListener('click',()=>{panel.hidden=true;});
 panel.querySelector('.dictation-panel-pause').addEventListener('click',()=>{unlockAudio();pauseProtocolDictation();});
 panel.querySelector('.dictation-panel-stop').addEventListener('click',finishProtocolDictation);
 document.body.append(panel);
 document.addEventListener('click',event=>{if(event.target.closest('.protocol-record-start'))unlockAudio();},true);
 onProtocolDictationChange(update);update();
 window.addEventListener('pagehide',releaseAudio);
}

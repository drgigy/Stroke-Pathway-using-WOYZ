import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync("app/components/documents.ts", "utf8");
const transformed = source.replace(/export const (mobileDocument|desktopDocument)=/g, "exports.$1=");
const sandbox = { exports: {} };
vm.runInNewContext(transformed, sandbox, { filename: "documents.ts" });

const { mobileDocument, desktopDocument } = sandbox.exports;
if (typeof mobileDocument !== "string" || typeof desktopDocument !== "string") {
  throw new Error("Could not extract embedded WOYZ documents");
}

function standaloneDocument(value) {
  return value.replace("__CODEX_VISUALIZATION_WIDGET_STATE__", "{}");
}

function scriptString(value) {
  return JSON.stringify(value).replace(/<\/(script)/gi, "<\\/$1");
}

const sharedCaseControls = `<script>
(()=> {
  const root=document.querySelector('#stroke-mobile-home,#stroke-review');
  if(!root)return;
  let caseId='ST-024';
  let cases=[];
  let selectedStageIndex=null;
  let selectedStageName='';
  const voiceStages=['Registration','Initial Assessment','Scan','NIH Stroke Scale','Decision','Checklist','IVT','Thrombectomy','Timings','Inpatient review','Discharge','Follow-up'];
  const esc=value=>String(value??'').replace(/[&<>"']/g,match=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[match]));
  function post(message){parent.postMessage({channel:'woyz-case-v1',...message},'*');}
  const voiceState={recorder:null,stream:null,context:null,analyser:null,source:null,chunks:[],bars:[],raf:0,remaining:300,timer:0,recording:false,paused:false,dock:null,status:null,start:null,pause:null,resume:null,extend:null,stop:null,level:null};
  function ensureVoicePlugin(){
    if(document.querySelector('#registrationVoiceDock'))return;
    const style=document.createElement('style');
    style.textContent='.registration-voice-dock{display:none;position:fixed;left:18px;bottom:22px;z-index:999;width:min(9cm,calc(100vw - 28px));min-height:5.7cm;padding:13px 16px;border-radius:18px;background:#1b1b1d;color:#f7f7fb;box-shadow:0 20px 46px rgba(16,24,43,.28);touch-action:none}.registration-voice-dock.visible{display:grid;grid-template-rows:auto 1fr;gap:8px}.registration-voice-head{display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:grab}.registration-voice-title{display:inline-flex;align-items:center;gap:8px;color:#ff514a;font-size:13px;font-weight:800}.registration-voice-title:before{content:"";width:7px;height:7px;border-radius:999px;background:#ff514a;box-shadow:0 0 0 4px rgba(255,81,74,.1)}.registration-voice-close{width:28px;height:28px;border:0;border-radius:8px;background:#2f2f32;color:#f7f7fb;font-size:18px;line-height:1}.registration-voice-body{display:grid;grid-template-rows:auto auto auto auto;justify-items:center;align-content:center;gap:12px}.registration-voice-level{width:76%;height:34px;display:grid;grid-template-columns:repeat(28,1fr);gap:3px;align-items:end}.registration-voice-level span{height:4px;border-radius:999px 999px 3px 3px;background:rgba(255,81,74,.18);opacity:.45;transition:height .06s linear,background .06s linear,opacity .06s linear}.registration-voice-level span.active{background:#ff514a;opacity:1}.registration-voice-timer{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:34px;line-height:1;font-weight:800;letter-spacing:0}.registration-voice-actions{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap}.registration-voice-action{min-height:38px;border:0;border-radius:999px;color:#fff;background:#2f2f32;padding:0 13px;display:grid;place-items:center;box-shadow:0 12px 26px rgba(0,0,0,.22);font-weight:900;font-size:12px;white-space:nowrap}.registration-voice-action.start{background:#ff514a}.registration-voice-action.stop{background:#ff514a;color:#fff;min-width:132px}.registration-voice-action:disabled{opacity:.38;cursor:not-allowed}.registration-voice-status{width:100%;min-height:18px;color:#c9c9cf;text-align:center;font-size:12px;font-weight:750}';
    document.head.append(style);
    const dock=document.createElement('div');
    dock.id='registrationVoiceDock';
    dock.className='registration-voice-dock';
    dock.setAttribute('aria-live','polite');
    dock.innerHTML='<div class="registration-voice-head" id="registrationVoiceHead"><div class="registration-voice-title">Patient registration</div><button class="registration-voice-close" id="registrationVoiceClose" aria-label="Close voice panel" type="button">&times;</button></div><div class="registration-voice-body"><div class="registration-voice-level" id="registrationVoiceLevel" aria-label="Voice activity"></div><div class="registration-voice-timer" id="registrationVoiceTimer">05:00</div><div class="registration-voice-actions"><button class="registration-voice-action start" id="registrationVoiceStart" type="button">Start</button><button class="registration-voice-action" id="registrationVoicePause" type="button" disabled>Pause</button><button class="registration-voice-action" id="registrationVoiceResume" type="button" disabled>Resume</button><button class="registration-voice-action" id="registrationVoiceExtend" type="button">+5 min</button><button class="registration-voice-action stop" id="registrationVoiceStop" type="button" disabled>Stop & transcribe</button></div><div class="registration-voice-status" id="registrationVoiceStatus">Open, then start recording registration</div></div>';
    document.body.append(dock);
    voiceState.dock=dock;voiceState.status=dock.querySelector('#registrationVoiceStatus');voiceState.start=dock.querySelector('#registrationVoiceStart');voiceState.pause=dock.querySelector('#registrationVoicePause');voiceState.resume=dock.querySelector('#registrationVoiceResume');voiceState.extend=dock.querySelector('#registrationVoiceExtend');voiceState.stop=dock.querySelector('#registrationVoiceStop');voiceState.level=dock.querySelector('#registrationVoiceLevel');
    voiceState.bars=Array.from({length:28},()=>{const bar=document.createElement('span');voiceState.level.append(bar);return bar;});
    dock.querySelector('#registrationVoiceClose').addEventListener('click',()=>dock.classList.remove('visible'));
    voiceState.start.addEventListener('click',startVoiceRecording);
    voiceState.pause.addEventListener('click',pauseVoiceRecording);
    voiceState.resume.addEventListener('click',resumeVoiceRecording);
    voiceState.extend.addEventListener('click',extendVoiceRecording);
    voiceState.stop.addEventListener('click',finishVoiceRecording);
    makeVoiceDockMovable(dock,dock.querySelector('#registrationVoiceHead'));
    drawVoiceBars();
  }
  function openVoiceDockForStage(){
    ensureVoicePlugin();
    const stage=currentStageFromContent();
    if(!stage){setVoiceStatus('Select a pathway section first');return;}
    selectedStageIndex=stage.index;
    selectedStageName=stage.name;
    const title=voiceState.dock?.querySelector('.registration-voice-title');
    if(title)title.textContent=selectedStageName;
    voiceState.dock?.classList.add('visible');
    setVoiceStatus('Ready for '+selectedStageName);
  }
  function setVoiceStatus(text){if(voiceState.status)voiceState.status.textContent=text;}
  function setVoiceTimer(){
    const timer=voiceState.dock?.querySelector('#registrationVoiceTimer');
    if(!timer)return;
    const minutes=String(Math.floor(voiceState.remaining/60)).padStart(2,'0');
    const seconds=String(voiceState.remaining%60).padStart(2,'0');
    timer.textContent=minutes+':'+seconds;
  }
  function updateVoiceButtons(){
    if(!voiceState.start)return;
    voiceState.start.disabled=voiceState.recording;
    voiceState.pause.disabled=!voiceState.recording||voiceState.paused;
    voiceState.resume.disabled=!voiceState.recording||!voiceState.paused;
    voiceState.stop.disabled=!voiceState.recording;
  }
  function nilVoiceBars(){voiceState.bars.forEach(bar=>{bar.classList.remove('active');bar.style.height='4px';});}
  function drawVoiceBars(){
    if(!voiceState.analyser||!voiceState.recording||voiceState.paused){nilVoiceBars();voiceState.raf=requestAnimationFrame(drawVoiceBars);return;}
    const freq=new Uint8Array(voiceState.analyser.frequencyBinCount);
    voiceState.analyser.getByteFrequencyData(freq);
    const avg=freq.reduce((sum,value)=>sum+value,0)/(freq.length*255);
    if(avg<0.018){nilVoiceBars();voiceState.raf=requestAnimationFrame(drawVoiceBars);return;}
    voiceState.bars.forEach((bar,index)=>{
      const sample=freq[Math.min(freq.length-1,Math.floor(index/voiceState.bars.length*freq.length))]/255;
      const height=Math.max(4,Math.round(4+sample*30));
      bar.classList.toggle('active',sample>0.04);
      bar.style.height=height+'px';
    });
    voiceState.raf=requestAnimationFrame(drawVoiceBars);
  }
  async function startVoiceRecording(){
    if(voiceState.recording)return;
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){setVoiceStatus('Microphone recording is not available in this browser');return;}
    try{
      voiceState.stream=await navigator.mediaDevices.getUserMedia({audio:true});
      voiceState.context=new (window.AudioContext||window.webkitAudioContext)();
      voiceState.analyser=voiceState.context.createAnalyser();
      voiceState.analyser.fftSize=256;
      voiceState.source=voiceState.context.createMediaStreamSource(voiceState.stream);
      voiceState.source.connect(voiceState.analyser);
      voiceState.chunks=[];
      voiceState.recorder=new MediaRecorder(voiceState.stream);
      voiceState.recorder.ondataavailable=event=>{if(event.data?.size)voiceState.chunks.push(event.data);};
      voiceState.recorder.onstop=sendVoiceRecording;
      voiceState.recorder.start();
      voiceState.recording=true;voiceState.paused=false;voiceState.remaining=300;
      updateVoiceButtons();
      clearInterval(voiceState.timer);
      voiceState.timer=setInterval(()=>{if(!voiceState.paused){voiceState.remaining=Math.max(0,voiceState.remaining-1);setVoiceTimer();if(voiceState.remaining===0)finishVoiceRecording();}},1000);
      setVoiceTimer();
      setVoiceStatus('Recording registration');
    }catch(error){setVoiceStatus(error.message||'Microphone permission was not granted');}
  }
  function pauseVoiceRecording(){
    if(!voiceState.recording||voiceState.recorder?.state!=='recording')return;
    voiceState.recorder.pause();
    voiceState.paused=true;
    updateVoiceButtons();
    setVoiceStatus('Paused');
  }
  function resumeVoiceRecording(){
    if(!voiceState.recording||voiceState.recorder?.state!=='paused')return;
    voiceState.recorder.resume();
    voiceState.paused=false;
    updateVoiceButtons();
    setVoiceStatus('Recording registration');
  }
  function extendVoiceRecording(){
    voiceState.remaining+=300;
    setVoiceTimer();
    setVoiceStatus('Extended by 5 minutes');
  }
  function finishVoiceRecording(){
    if(!voiceState.recording){setVoiceStatus('No registration recording to finish');return;}
    setVoiceStatus('Stopping and preparing transcription…');
    if(voiceState.recorder&&voiceState.recorder.state!=='inactive')voiceState.recorder.stop();
  }
  function stopVoiceTracks(){
    clearInterval(voiceState.timer);
    voiceState.stream?.getTracks?.().forEach(track=>track.stop());
    voiceState.context?.close?.();
    voiceState.recording=false;voiceState.paused=false;voiceState.remaining=300;setVoiceTimer();updateVoiceButtons();
    voiceState.stream=null;voiceState.context=null;voiceState.analyser=null;voiceState.source=null;nilVoiceBars();
  }
  function sendVoiceRecording(){
    const blob=new Blob(voiceState.chunks,{type:voiceState.recorder?.mimeType||'audio/webm'});
    stopVoiceTracks();
    if(!blob.size){setVoiceStatus('No voice was captured');return;}
    const reader=new FileReader();
    reader.onload=()=>{const data=String(reader.result||'').split(',')[1]||'';post({type:'voiceRegistration',caseId,audioData:data,mimeType:blob.type,mutationId:crypto.randomUUID(),stageIndex:selectedStageIndex,stageName:selectedStageName});setVoiceStatus('Sending '+(selectedStageName||'selected section')+' audio to Gemini…');};
    reader.onerror=()=>setVoiceStatus('Could not read the recording');
    reader.readAsDataURL(blob);
  }
  function makeVoiceDockMovable(dock,handle){
    let drag=null;
    handle.addEventListener('pointerdown',event=>{drag={x:event.clientX,y:event.clientY,left:dock.offsetLeft,top:dock.offsetTop};handle.setPointerCapture(event.pointerId);});
    handle.addEventListener('pointermove',event=>{if(!drag)return;dock.style.left=Math.max(8,drag.left+event.clientX-drag.x)+'px';dock.style.top=Math.max(8,drag.top+event.clientY-drag.y)+'px';dock.style.bottom='auto';});
    handle.addEventListener('pointerup',()=>{drag=null;});
    handle.addEventListener('pointercancel',()=>{drag=null;});
  }
  function ensureMobileControls(){
    const list=root.querySelector('#mh-patients');
    ensureVoicePlugin();
    if(!list||root.querySelector('#mh-new-firestore'))return;
    const button=document.createElement('button');
    button.id='mh-new-firestore';
    button.type='button';
    button.textContent='New patient';
    button.style.cssText='width:100%;margin:10px 0 4px;padding:12px;border:0;border-radius:8px;background:#0f8a5f;color:white;font-weight:800';
    list.before(button);
  }
  function currentStageFromContent(){
    const heading=root.querySelector('#mh-content h2')?.textContent?.trim()||'';
    const index=voiceStages.indexOf(heading);
    return index>=0?{index,name:voiceStages[index]}:null;
  }
  function updateVoiceAvailability(){
    ensureVoicePlugin();
    const stage=currentStageFromContent();
    if(stage){
      selectedStageIndex=stage.index;
      selectedStageName=stage.name;
      const title=root.querySelector('.registration-voice-title');
      if(title)title.textContent=stage.name;
      return;
    }
    selectedStageIndex=null;
    selectedStageName='';
    voiceState.dock?.classList.remove('visible');
  }
  function renderMobileCases(){
    ensureMobileControls();
    const list=root.querySelector('#mh-patients');
    if(!list)return;
    const visible=cases.length?cases:[{id:caseId,name:'Unknown patient',uhid:'No UHID'}];
    list.innerHTML=visible.map(item=>{
      const selected=item.id===caseId;
      return '<div class="patient-row"'+(selected?' style="border-left:4px solid #0f8a5f;padding-left:10px"':'')+'><button type="button" data-firestore-case="'+esc(item.id)+'"><strong>'+esc(item.name||'Unknown patient')+'</strong><br><small>'+esc(item.id)+' · '+esc(item.uhid||'No UHID')+'</small></button></div>';
    }).join('');
  }
  function renderDesktopCases(){
    const rows=root.querySelector('#sr-list tbody');
    if(!rows||!cases.length)return;
    rows.innerHTML=cases.map(item=>'<tr><td>'+esc(item.name||'Unknown patient')+' · '+esc(item.id)+'</td><td>'+esc(item.uhid||'No UHID')+'</td><td>Shared</td><td>v'+Number(item.version||0)+'</td></tr>').join('');
  }
  function renderCaseIdentity(){
    const active=cases.find(item=>item.id===caseId);
    const mobileId=root.querySelector('#mh-id');
    if(mobileId)mobileId.textContent='Episode '+caseId+' · UHID '+(active?.uhid&&active.uhid!=='No UHID'?active.uhid:'missing');
    const dock=root.querySelector('.dock-target');
    if(dock&&active)dock.textContent=(active.name||'Unknown patient')+' · '+caseId;
  }
  function replaceRecorderCopy(){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let node;
    while((node=walker.nextNode())){
      if(node.nodeValue.includes('Recorder controls are simulated in this mockup.')){
        node.nodeValue=node.nodeValue.replace('Recorder controls are simulated in this mockup.','Registration voice records locally and sends to Gemini only when Stop & transcribe is clicked.');
      }
    }
  }
  root.addEventListener('click',event=>{
    const recorder=event.target.closest?.('#mh-record');
    if(recorder){event.preventDefault();event.stopImmediatePropagation();setTimeout(openVoiceDockForStage,0);return;}
    const create=event.target.closest?.('#mh-new-firestore');
    if(create){event.preventDefault();event.stopImmediatePropagation();post({type:'createCase'});return;}
    const select=event.target.closest?.('[data-firestore-case]');
    if(select){event.preventDefault();event.stopImmediatePropagation();post({type:'selectCase',caseId:select.getAttribute('data-firestore-case')});const drawer=root.querySelector('#mh-drawer');if(drawer)drawer.hidden=true;}
    setTimeout(()=>{renderCaseIdentity();updateVoiceAvailability();},0);
    setTimeout(()=>{renderCaseIdentity();updateVoiceAvailability();},120);
  },true);
  window.addEventListener('message',event=>{
    if(event.source!==parent||event.data?.channel!=='woyz-case-v1')return;
    if(event.data.caseId)caseId=event.data.caseId;
    if(Array.isArray(event.data.cases))cases=event.data.cases;
    if(event.data.type==='created'){
      const drawer=root.querySelector('#mh-drawer');
      if(drawer)drawer.hidden=true;
      root.querySelector('#mh-home')?.click?.();
      setVoiceStatus('New Firestore patient opened: '+caseId);
    }
    if(event.data.type==='voiceRegistrationSaved')setVoiceStatus('Registration saved to Firestore');
    if(event.data.type==='voiceRegistrationError')setVoiceStatus(event.data.error||'Voice registration failed');
    setTimeout(()=>{renderMobileCases();renderDesktopCases();renderCaseIdentity();replaceRecorderCopy();updateVoiceAvailability();},0);
  });
  ensureMobileControls();
  ensureVoicePlugin();
  renderCaseIdentity();
  replaceRecorderCopy();
  updateVoiceAvailability();
  setInterval(()=>{renderCaseIdentity();replaceRecorderCopy();updateVoiceAvailability();},1000);
})();
</script>`;

function enhanceDocument(value) {
  return standaloneDocument(value).replace("</body>", `${sharedCaseControls}</body>`);
}

const standaloneMobileDocument = enhanceDocument(mobileDocument);
const standaloneDesktopDocument = enhanceDocument(desktopDocument);

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>WOYZ Stroke · Shared workspace</title>
<meta name="description" content="Shared mobile and desktop stroke documentation workspace.">
<style>
  :root{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#14231a;background:#f4f7f5}
  *{box-sizing:border-box}
  html,body,#app{margin:0;min-height:100vh}
  button{font:inherit;cursor:pointer}
  .shell{min-height:100vh;background:#f4f7f5}
  .bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:9px 16px;background:#215f51;color:white}
  .bar strong{font-weight:800}
  .bar button{min-height:30px;border:1px solid rgb(255 255 255 / .28);border-radius:7px;background:rgb(255 255 255 / .94);color:#183b32;padding:4px 10px;font-size:13px;font-weight:750;text-decoration:none;line-height:1}
  .bar button.active{background:#0f8a5f;color:white;box-shadow:inset 0 0 0 1px rgb(255 255 255 / .36)}
  .bar .spacer{flex:1 1 auto}
  .bar .settings{width:32px;padding:4px 0}
  .status{font-size:12px;opacity:.78;white-space:nowrap}
  .notice{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:8px 18px;font-size:12px;color:#52695e;border-bottom:1px solid #dce8df}
  .notice .error{color:#b42318;font-weight:750}
  iframe{width:100%;height:calc(100vh - 91px);border:0;display:block;background:white}
  dialog{border:0;border-radius:10px;box-shadow:0 24px 80px rgb(0 0 0 / .28);padding:0}
  dialog::backdrop{background:rgb(20 35 26 / .38)}
  .settings-panel{width:min(440px,calc(100vw - 32px));display:grid;gap:14px;padding:18px;background:white}
  .settings-panel header{display:flex;align-items:center;justify-content:space-between;gap:12px}
  .settings-panel h2{margin:0;font-size:20px}
  .settings-panel label{display:grid;gap:6px;font-size:13px;font-weight:750;color:#52695e}
  .settings-panel input{width:100%;border:1px solid #cfe0d5;border-radius:7px;padding:9px 10px;font:inherit;color:#14231a}
  .settings-panel menu{display:flex;justify-content:flex-end;gap:8px;margin:0;padding:0}
  .settings-panel button{border:1px solid #cfe0d5;border-radius:7px;background:white;color:#14231a;padding:8px 12px;font-weight:750}
  .settings-panel .primary{border-color:#0f8a5f;background:#0f8a5f;color:white}
  @media(max-width:720px){.bar{gap:6px;padding:7px 9px}.bar strong{font-size:14px}.bar button,.bar a{min-height:28px;padding:3px 8px;font-size:12px}.bar .settings{width:30px}.notice{padding:7px 10px}iframe{height:calc(100vh - 112px)}}
</style>
</head>
<body>
<div class="shell">
  <div class="bar">
    <strong id="caseTitle">WOYZ · Shared case ST-024</strong>
    <button id="mobileBtn" class="active" type="button">Mobile</button>
    <button id="desktopBtn" type="button">Desktop / Admin</button>
    <span id="status" class="status" role="status">Connecting…</span>
    <span class="spacer"></span>
    <button id="settingsBtn" class="settings" type="button" aria-label="Settings">⚙</button>
  </div>
  <div class="notice">
    <span>Private prototype · Saved fields sync across devices in this workspace. Verify clinical entries before use.</span>
    <span id="syncNote"></span>
  </div>
  <iframe id="workspaceFrame" title="mobile stroke workspace" sandbox="allow-scripts" allow="microphone" referrerpolicy="no-referrer"></iframe>
</div>
<dialog id="settingsDialog">
  <form method="dialog" class="settings-panel">
    <header>
      <h2>Settings</h2>
      <button value="cancel" type="submit" aria-label="Close">×</button>
    </header>
    <label>Current Firestore case ID
      <input id="caseDocId" value="ST-024" autocomplete="off">
    </label>
    <label>Workspace code
      <input id="workspaceCode" autocomplete="off" spellcheck="false">
    </label>
    <label>Gemini API key
      <input id="geminiKey" type="password" autocomplete="off" placeholder="Optional for later transcription work">
    </label>
    <p style="margin:0;color:#52695e;font-size:13px;line-height:1.4">Firestore project: <strong>minutes-woyz-3</strong>. Data is stored in workspace-scoped <code>strokeCases</code> documents.</p>
    <menu>
      <button id="clearGeminiBtn" type="button">Clear key</button>
      <button class="primary" value="save" type="submit">Done</button>
    </menu>
  </form>
</dialog>
<script type="module">
import {initializeApp} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {getAuth,onAuthStateChanged,signInAnonymously} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {getFirestore,collection,doc,onSnapshot,runTransaction,serverTimestamp} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const mobileDocument=${scriptString(standaloneMobileDocument)};
const desktopDocument=${scriptString(standaloneDesktopDocument)};
const firebaseConfig={projectId:"minutes-woyz-3",appId:"1:25423577451:web:a98bbfd85be9a804d34c2e",storageBucket:"minutes-woyz-3.firebasestorage.app",apiKey:"AIzaSyCHZTh_chvcWJqX97b2rfvTVevLQhPVmBY",authDomain:"minutes-woyz-3.firebaseapp.com",messagingSenderId:"25423577451"};
const app=initializeApp(firebaseConfig);
const auth=getAuth(app);
const db=getFirestore(app);
const frame=document.getElementById("workspaceFrame");
const statusEl=document.getElementById("status");
const syncNote=document.getElementById("syncNote");
const mobileBtn=document.getElementById("mobileBtn");
const desktopBtn=document.getElementById("desktopBtn");
const settingsDialog=document.getElementById("settingsDialog");
const caseDocId=document.getElementById("caseDocId");
const workspaceCodeInput=document.getElementById("workspaceCode");
const geminiKeyInput=document.getElementById("geminiKey");
const geminiStoreKey="woyz-stroke-gemini-key";
let mode=location.pathname.endsWith("/admin")||location.hash==="#admin"?"desktop":"mobile";
let caseId="ST-024";
let workspaceId=initialWorkspaceId();
let currentUser=null;
let unsubscribeCase=null;
let unsubscribeList=null;
let cases=[];
let snapshot={data:{},version:0,updatedAt:null,updatedAtText:null};
let saving=false;

function nowText(){return new Date().toLocaleTimeString();}
function randomId(prefix){const bytes=new Uint8Array(12);crypto.getRandomValues(bytes);return prefix+Array.from(bytes,b=>b.toString(36).padStart(2,"0")).join("").slice(0,22);}
function cleanId(value,fallback){return String(value||fallback).replace(/[^A-Za-z0-9_-]/g,"-").slice(0,64);}
function initialWorkspaceId(){const url=new URL(location.href);let id=cleanId(url.searchParams.get("w"),"");if(id.length<16){id=randomId("WS-");url.searchParams.set("w",id);history.replaceState(null,"",url.pathname+"?"+url.searchParams.toString()+url.hash);}return id;}
function caseCollection(){return collection(db,"strokeWorkspaces",workspaceId,"strokeCases");}
function ref(){return doc(db,"strokeWorkspaces",workspaceId,"strokeCases",caseId);}
function cleanSnapshot(raw){return {data:{...(raw?.data||{})},version:Number(raw?.version||0),updatedAt:raw?.updatedAt||null,updatedAtText:raw?.updatedAtText||null};}
function writeSnapshot(next){snapshot=cleanSnapshot(next);}
function setStatus(text,isError=false,note=""){statusEl.textContent=text;statusEl.style.color="inherit";syncNote.textContent=note;syncNote.className=isError?"error":"";}
function post(message){frame.contentWindow?.postMessage({channel:"woyz-case-v1",...message},"*");}
function caseLabel(item){const name=item.data?.name||"Unknown patient";const uhid=item.data?.uhid||"No UHID";return {id:item.id,name,uhid,version:item.version||0};}
function sendSnapshot(type="snapshot",extra={}){post({type,workspaceId,caseId,cases:cases.map(caseLabel),...snapshot,...extra});}
function renderFrame(){frame.srcdoc=mode==="desktop"?desktopDocument:mobileDocument;frame.title=mode==="desktop"?"desktop stroke workspace":"mobile stroke workspace";mobileBtn.classList.toggle("active",mode==="mobile");desktopBtn.classList.toggle("active",mode==="desktop");}
function switchMode(next){if(next===mode)return;if(!confirm("Switch views? Save any open draft first. Unsaved text will be discarded."))return;mode=next;history.replaceState(null,"",next==="desktop"?"#admin":"#mobile");renderFrame();setTimeout(()=>sendSnapshot(),150);}
function newCaseId(){const stamp=new Date().toISOString().replace(/[-:TZ.]/g,"").slice(0,14);return "ST-"+stamp+"-"+Math.random().toString(36).slice(2,6).toUpperCase();}
function connect(){if(unsubscribeCase){unsubscribeCase();unsubscribeCase=null;}document.getElementById("caseTitle").textContent="WOYZ · Case "+caseId;if(!currentUser){setStatus("Creating user…");sendSnapshot();return;}setStatus("Connecting…");unsubscribeCase=onSnapshot(ref(),docSnap=>{if(docSnap.exists()){writeSnapshot(docSnap.data());setStatus(snapshot.version?"Synced · v"+snapshot.version:"Firestore ready");}else{writeSnapshot({data:{},version:0,updatedAt:null});setStatus("Firestore ready");}sendSnapshot();},error=>{setStatus("Firestore unavailable",true,error.code||error.message);sendSnapshot();});}
function connectList(){if(unsubscribeList){unsubscribeList();unsubscribeList=null;}if(!currentUser)return;unsubscribeList=onSnapshot(caseCollection(),listSnap=>{cases=listSnap.docs.map(item=>({id:item.id,...cleanSnapshot(item.data())})).sort((a,b)=>String(b.updatedAtText||"").localeCompare(String(a.updatedAtText||"")));if(cases.length&&!cases.some(item=>item.id===caseId)){caseId=cases[0].id;connect();}sendSnapshot();},error=>{setStatus("Case list unavailable",true,error.code||error.message);sendSnapshot();});}
async function createCase(){if(!currentUser){post({type:"error",error:"Firestore user is not ready yet. Retry in a moment."});return;}if(saving)return;const nextId=newCaseId();saving=true;setStatus("Creating patient…");try{await runTransaction(db,async tx=>{tx.set(doc(db,"strokeWorkspaces",workspaceId,"strokeCases",nextId),{sharedApp:"woyz-stroke",createdByUid:currentUser.uid,updatedByUid:currentUser.uid,episode:nextId,data:{},version:0,createdAt:serverTimestamp(),updatedAt:serverTimestamp(),updatedAtText:new Date().toISOString(),mutationId:crypto.randomUUID()});});caseId=nextId;writeSnapshot({data:{},version:0,updatedAt:null,updatedAtText:new Date().toISOString()});connect();sendSnapshot("created");}catch(error){setStatus("Not created",true,error.code||error.message);post({type:"error",error:error.message||"Create patient failed"});}finally{saving=false;}}
function selectCase(nextId){const cleaned=String(nextId||"").replace(/[^A-Za-z0-9_-]/g,"-");if(!cleaned||cleaned===caseId)return;caseId=cleaned;writeSnapshot({data:{},version:0,updatedAt:null});connect();}
async function saveField(message){if(!currentUser){setStatus("Creating user…",true,"Firestore user is not ready yet");post({type:"error",error:"Firestore user is not ready yet. Retry in a moment."});return;}if(saving)return;saving=true;setStatus("Saving…");try{let result=null;await runTransaction(db,async tx=>{const snap=await tx.get(ref());const current=snap.exists()?cleanSnapshot(snap.data()):{data:{},version:0};if(current.version!==message.version){result={conflict:true,...current};return;}const next={sharedApp:"woyz-stroke",data:{...current.data,[message.key]:message.value},version:current.version+1,createdByUid:snap.data()?.createdByUid||currentUser.uid,updatedByUid:currentUser.uid,episode:caseId,updatedAt:serverTimestamp(),updatedAtText:new Date().toISOString(),mutationId:message.mutationId};tx.set(ref(),next,{merge:true});result={conflict:false,...next,updatedAt:null};});if(result?.conflict){writeSnapshot(result);setStatus("Conflict",true,"Review retained draft");post({type:"conflict",key:message.key,error:"Another device saved changes. Your draft is retained; compare it with the latest value before saving again.",...snapshot});}else{writeSnapshot(result);setStatus("Synced · v"+snapshot.version);post({type:"saved",key:message.key,...snapshot,caseId,cases:cases.map(caseLabel)});}}catch(error){setStatus("Not saved",true,error.code||error.message);post({type:"error",error:error.message||"Save failed"});}finally{saving=false;}}
async function savePatch(patch,mutationId){if(!currentUser){post({type:"voiceRegistrationError",error:"Firestore user is not ready yet. Retry in a moment."});return;}if(saving){post({type:"voiceRegistrationError",error:"Another save is running. Retry in a moment."});return;}saving=true;setStatus("Saving registration…");try{let result=null;await runTransaction(db,async tx=>{const snap=await tx.get(ref());const current=snap.exists()?cleanSnapshot(snap.data()):{data:{},version:0};const next={sharedApp:"woyz-stroke",data:{...current.data,...patch},version:current.version+1,createdByUid:snap.data()?.createdByUid||currentUser.uid,updatedByUid:currentUser.uid,episode:caseId,updatedAt:serverTimestamp(),updatedAtText:new Date().toISOString(),mutationId};tx.set(ref(),next,{merge:true});result={...next,updatedAt:null};});writeSnapshot(result);setStatus("Synced · v"+snapshot.version);post({type:"voiceRegistrationSaved",patch,...snapshot,caseId,cases:cases.map(caseLabel)});}catch(error){setStatus("Registration not saved",true,error.code||error.message);post({type:"voiceRegistrationError",error:error.message||"Registration save failed"});}finally{saving=false;}}
function cleanGeminiText(value){const fence=String.fromCharCode(96)+String.fromCharCode(96)+String.fromCharCode(96);return String(value??"").replace(new RegExp("^"+fence+"(?:json)?","i"),"").replace(new RegExp(fence+"$"),"").trim();}
function fieldValue(value){const text=String(value??"").trim();return text||"NIL";}
async function generateRegistrationFromAudio(message){
  const apiKey=localStorage.getItem(geminiStoreKey)||"";
  if(!apiKey.trim()){post({type:"voiceRegistrationError",error:"Add Gemini API key in Settings first."});document.getElementById("settingsBtn").click();return;}
  if(!message.audioData){post({type:"voiceRegistrationError",error:"No audio was received from the voice plugin."});return;}
  const stageIndex=Number.isInteger(message.stageIndex)?message.stageIndex:0;
  const stageName=String(message.stageName||"Registration");
  setStatus("Gemini · "+stageName);
  try{
    const registrationMode=stageIndex===0;
    const schema=registrationMode?{type:"object",properties:{name:{type:"string"},uhid:{type:"string"},age:{type:"string"},sex:{type:"string"},mobile:{type:"string"},contact:{type:"string"},diagnosis:{type:"string"},registrationNote:{type:"string"}},required:["name","uhid","age","sex","mobile","contact","diagnosis","registrationNote"]}:{type:"object",properties:{stageNote:{type:"string"}},required:["stageNote"]};
    const prompt=registrationMode?"You are WOYZ Stroke registration extraction assistant. Listen to the audio and return strict JSON only for these registration columns: name, uhid, age, sex, mobile, contact, diagnosis, registrationNote. Extract only explicitly stated information; never invent, infer or complete missing demographics. Use NIL for any column that is not supported by the audio. Keep each column concise and clinically usable. registrationNote should be a short registration-stage note containing presenting complaint, onset or last-known-well if stated, examination findings, provisional diagnosis, and any scan/decision/IVT/thrombectomy-relevant statement only when the speaker says it. Do not include advice, explanations, markdown or extra keys.":"You are WOYZ Stroke pathway extraction assistant. The selected section is "+stageName+". Listen to the audio and return strict JSON only with stageNote. Generate the note for this selected pathway section only. Include explicit times, findings, decisions, reasons, drugs, scores and outcomes only if stated. Use NIL if the audio does not contain information for this section. Keep it concise, clinically usable, and do not add advice, markdown or extra keys.";
    const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key="+encodeURIComponent(apiKey.trim()),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt},{inline_data:{mime_type:message.mimeType||"audio/webm",data:message.audioData}}]}],generationConfig:{temperature:0,responseMimeType:"application/json",responseSchema:schema}})});
    if(!response.ok)throw new Error("Gemini request failed: "+response.status+" "+await response.text());
    const data=await response.json();
    const text=cleanGeminiText((data.candidates?.[0]?.content?.parts||[]).map(part=>part.text||"").join(""));
    const parsed=JSON.parse(text);
    const patch=registrationMode?{name:fieldValue(parsed.name),uhid:fieldValue(parsed.uhid),age:fieldValue(parsed.age),sex:fieldValue(parsed.sex),mobile:fieldValue(parsed.mobile),contact:fieldValue(parsed.contact),diagnosis:fieldValue(parsed.diagnosis),stage_0:fieldValue(parsed.registrationNote)}:{["stage_"+stageIndex]:fieldValue(parsed.stageNote)};
    await savePatch(patch,message.mutationId||crypto.randomUUID());
  }catch(error){setStatus("Gemini failed",true,error.message||String(error));post({type:"voiceRegistrationError",error:error.message||"Gemini registration failed"});}
}
window.addEventListener("message",event=>{if(event.source!==frame.contentWindow||event.data?.channel!=="woyz-case-v1")return;const message=event.data;if(message.type==="ready")sendSnapshot();if(message.type==="save")saveField(message);if(message.type==="createCase")createCase();if(message.type==="selectCase")selectCase(message.caseId);if(message.type==="voiceRegistration")generateRegistrationFromAudio(message);});
mobileBtn.addEventListener("click",()=>switchMode("mobile"));
desktopBtn.addEventListener("click",()=>switchMode("desktop"));
document.getElementById("settingsBtn").addEventListener("click",()=>{caseDocId.value=caseId;workspaceCodeInput.value=workspaceId;geminiKeyInput.value=localStorage.getItem(geminiStoreKey)||"";settingsDialog.showModal();});
settingsDialog.addEventListener("close",()=>{if(settingsDialog.returnValue!=="save")return;caseId=cleanId(caseDocId.value.trim(),"ST-024");const nextWorkspace=cleanId(workspaceCodeInput.value.trim(),workspaceId);if(nextWorkspace.length>=16&&nextWorkspace!==workspaceId){workspaceId=nextWorkspace;const url=new URL(location.href);url.searchParams.set("w",workspaceId);history.replaceState(null,"",url.pathname+"?"+url.searchParams.toString()+url.hash);cases=[];writeSnapshot({data:{},version:0,updatedAt:null});connectList();}localStorage.setItem(geminiStoreKey,geminiKeyInput.value.trim());connect();});
document.getElementById("clearGeminiBtn").addEventListener("click",()=>{geminiKeyInput.value="";localStorage.removeItem(geminiStoreKey);});
onAuthStateChanged(auth,user=>{currentUser=user;if(user){connectList();connect();return;}setStatus("Creating user…");signInAnonymously(auth).catch(error=>{setStatus("Auth setup needed",true,error.code||error.message);sendSnapshot();});});
renderFrame();
</script>
</body>
</html>
`;

fs.writeFileSync("index.html", page);
console.log(`Wrote index.html with ${standaloneMobileDocument.length} mobile chars and ${standaloneDesktopDocument.length} desktop chars.`);

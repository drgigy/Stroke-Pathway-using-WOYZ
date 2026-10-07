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

function removeDesktopOnlyChrome(value) {
  return value.replace(
    "</style>",
    "#stroke-review>header,#stroke-review .dictation-dock{display:none!important}</style>",
  );
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
  let caseData={};
  let selectedStageIndex=null;
  let selectedStageName='';
  let selectedVoiceKind='stage';
  let openedDefaultList=false;
  let selectedDateISO=new Date().toISOString().slice(0,10);
  const voiceStages=['Registration','Initial Assessment','Scan','NIH Stroke Scale','Decision','Checklist','IVT','Thrombectomy','Timings','Inpatient review','Discharge','Follow-up'];
  const esc=value=>String(value??'').replace(/[&<>"']/g,match=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[match]));
  function post(message){parent.postMessage({channel:'woyz-case-v1',...message},'*');}
  const voiceState={recorder:null,stream:null,context:null,analyser:null,source:null,chunks:[],bars:[],raf:0,remaining:300,timer:0,recording:false,paused:false,dock:null,status:null,start:null,pause:null,resume:null,extend:null,stop:null,level:null,inline:null};
  function todayDisplay(){return new Date(selectedDateISO+'T00:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});}
  function ensureMobileHeaderControls(){
    if(root.id!=='stroke-mobile-home'||root.querySelector('#woyzMobileHeaderControls'))return;
    const header=root.querySelector('header');
    if(!header)return;
    const controls=document.createElement('div');
    controls.id='woyzMobileHeaderControls';
    controls.className='woyz-mobile-header-controls';
    controls.innerHTML='<input id="woyzMobileDate" aria-label="Select pathway date" type="date"><button id="woyzMobileSignOut" type="button">Sign out</button><button id="woyzMobileSettings" type="button" aria-label="Settings">⚙</button>';
    header.append(controls);
    const input=controls.querySelector('#woyzMobileDate');
    input.value=selectedDateISO;
    input.addEventListener('change',()=>{selectedDateISO=input.value||new Date().toISOString().slice(0,10);updateVisibleDates();post({type:'setSelectedDate',selectedDateISO});});
    controls.querySelector('#woyzMobileSignOut').addEventListener('click',()=>post({type:'requestSignOut'}));
    controls.querySelector('#woyzMobileSettings').addEventListener('click',()=>post({type:'requestSettings'}));
  }
  function applyMobileReferenceLayout(){
    if(root.id!=='stroke-mobile-home'||document.querySelector('#woyzMobileReferenceStyle'))return;
    const style=document.createElement('style');
    style.id='woyzMobileReferenceStyle';
    style.textContent=[
      'html,body{height:100%;overflow:hidden!important}',
      '#stroke-mobile-home{height:100vh!important;max-height:100vh!important;width:calc(100% - 12px)!important;max-width:none!important;margin:0 6px!important;overflow:hidden!important;border-radius:18px!important}',
      '#stroke-mobile-home .shared-editor{display:none!important}',
      '#stroke-mobile-home header{padding:13px 12px!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important}',
      '#stroke-mobile-home .woyz-mobile-header-controls{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:6px!important;flex:0 0 auto!important}',
      '#stroke-mobile-home .woyz-mobile-header-controls input{width:124px!important;min-height:38px!important;border:1px solid rgb(255 255 255 / .28)!important;border-radius:10px!important;background:rgb(255 255 255 / .95)!important;color:#183b32!important;padding:6px 6px!important;font:700 13px system-ui!important}',
      '#stroke-mobile-home .woyz-mobile-header-controls button{min-height:38px!important;border:1px solid rgb(255 255 255 / .28)!important;border-radius:10px!important;background:rgb(255 255 255 / .95)!important;color:#183b32!important;padding:6px 8px!important;font:800 13px system-ui!important;white-space:nowrap!important}',
      '#stroke-mobile-home .woyz-mobile-header-controls button[aria-label="Settings"]{width:38px!important;padding:6px 0!important}',
      '#stroke-mobile-home .top{padding:12px 14px!important}',
      '#stroke-mobile-home .body{height:calc(100vh - 214px)!important;min-height:0!important;overflow:hidden!important;display:flex!important;flex-direction:column!important;padding:12px 10px!important}',
      '#stroke-mobile-home .patient{flex:0 0 auto!important}',
      '#stroke-mobile-home #mh-status{flex:0 0 auto!important}',
      '#stroke-mobile-home #mh-content{flex:1 1 auto!important;min-height:0!important;overflow-y:auto!important;overscroll-behavior:contain!important;scrollbar-gutter:stable!important;padding-bottom:18px!important}',
      '#stroke-mobile-home #mh-content:has(.stages){display:flex!important;flex-direction:column!important;padding-bottom:0!important}',
      '#stroke-mobile-home #mh-content .stages{padding-bottom:10px!important;margin-top:12px!important;gap:8px!important}',
      '#stroke-mobile-home #mh-content .stage{padding:12px 14px!important}',
      '#stroke-mobile-home #mh-content:has(.stages)>button[data-open-kpi]{flex:0 0 auto!important;margin-top:auto!important;margin-bottom:0!important}',
      '#stroke-mobile-home #mh-content:has(.dictation-guide),#stroke-mobile-home #mh-content:has(.kpi-register){overflow:hidden!important;display:flex!important;flex-direction:column!important;padding-bottom:0!important}',
      '#stroke-mobile-home #mh-content:has(.dictation-guide)>h2,#stroke-mobile-home #mh-content:has(.dictation-guide)>p,#stroke-mobile-home #mh-content:has(.kpi-register)>h2,#stroke-mobile-home #mh-content:has(.kpi-register)>p{flex:0 0 auto!important}',
      '#stroke-mobile-home #mh-content:has(.dictation-guide) .dictation-guide,#stroke-mobile-home #mh-content:has(.kpi-register) .kpi-register{flex:1 1 auto!important;min-height:0!important;height:auto!important;max-height:none!important;overflow-y:auto!important;overscroll-behavior:contain!important;scrollbar-gutter:stable!important;padding:24px 28px!important;margin:10px 0 12px!important}',
      '#stroke-mobile-home #mh-content:has(.dictation-guide) .assessment-list{overflow:visible!important}',
      '#stroke-mobile-home #mh-content:has(.dictation-guide) .stage-navigation,#stroke-mobile-home #mh-content:has(.kpi-register) #mh-kpi-recorder,#stroke-mobile-home #mh-content:has(.kpi-register)>button[data-back]{flex:0 0 auto!important;display:flex!important;position:static!important;margin:0!important;padding:0!important;background:#f5f7f5!important;z-index:1!important}',
      '#stroke-mobile-home #mh-content:has(.dictation-guide) .stage-navigation{gap:8px!important}',
      '#stroke-mobile-home #mh-content:has(.dictation-guide) .stage-navigation button,#stroke-mobile-home #mh-content:has(.kpi-register)>button[data-back]{min-height:58px!important}',
      '#stroke-mobile-home #mh-content:has(.kpi-register) .kpi-note,#stroke-mobile-home #mh-content:has(.kpi-register) #mh-kpi-entry{flex:0 0 auto!important}',
      '#stroke-mobile-home #mh-content:has(.kpi-register) #mh-kpi-recorder{padding:10px 0 8px!important;justify-content:center!important}',
      '.woyz-inline-recorder{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:8px!important;flex-wrap:nowrap!important}',
      '.woyz-recording-label{display:none;color:#b42318;font-weight:900;font-size:15px;white-space:nowrap}',
      '.woyz-inline-recorder.recording .woyz-recording-label{display:inline-flex}',
      '.woyz-inline-recorder button{min-height:40px!important;border-radius:12px!important;font-size:14px!important;font-weight:850!important}',
      '.woyz-inline-recorder.recording #mh-record{display:none!important}',
      '.woyz-inline-recorder:not(.recording) .woyz-record-pause,.woyz-inline-recorder:not(.recording) .woyz-record-resume,.woyz-inline-recorder:not(.recording) .woyz-record-stop{display:none!important}',
      '.woyz-inline-recorder.recording .woyz-record-pause,.woyz-inline-recorder.recording .woyz-record-stop{display:inline-flex!important}',
      '.woyz-inline-recorder.paused .woyz-record-pause{display:none!important}',
      '.woyz-inline-recorder.paused .woyz-record-resume{display:inline-flex!important}',
      '.woyz-record-status{font-size:13px;color:#60746b;font-weight:800;white-space:nowrap}',
      '.woyz-record-stop{background:#ff514a!important;color:white!important;border-color:#ff514a!important}'
    ].join('');
    document.head.append(style);
    ensureMobileHeaderControls();
  }
  function updateVisibleDates(){
    const today=todayDisplay();
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let node;
    while((node=walker.nextNode())){
      if(/\\b\\d{2}\\s+[A-Z][a-z]{2}\\s+20\\d{2}\\b/.test(node.nodeValue)){
        node.nodeValue=node.nodeValue.replace(/\\b\\d{2}\\s+[A-Z][a-z]{2}\\s+20\\d{2}\\b/g,today);
      }
    }
    const headerDate=root.querySelector('#woyzMobileDate');
    if(headerDate&&headerDate.value!==selectedDateISO)headerDate.value=selectedDateISO;
  }
  function ensureVoicePlugin(){
    if(document.querySelector('#registrationVoiceDock'))return;
    root.style.position='relative';
    const style=document.createElement('style');
    style.textContent='.registration-voice-dock{display:none;position:absolute;left:14px;top:14px;z-index:999;width:calc(100% - 28px);max-width:none;min-height:232px;padding:22px 24px 28px;border-radius:26px;background:#1b1b1d;color:#f7f7fb;box-shadow:0 24px 56px rgba(16,24,43,.24);touch-action:none}.registration-voice-dock.visible{display:grid;grid-template-rows:auto 1fr;gap:12px}.registration-voice-head{display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:grab}.registration-voice-title{display:inline-flex;align-items:center;gap:12px;color:#ff514a;font-size:22px;font-weight:900;letter-spacing:0}.registration-voice-title:before{content:"";width:12px;height:12px;border-radius:999px;background:#ff514a;box-shadow:0 0 0 8px rgba(255,81,74,.12)}.registration-voice-close{width:28px;height:28px;border:0;border-radius:999px;background:transparent;color:#76767d;font-size:18px;line-height:1;cursor:pointer}.registration-voice-close:hover{background:#2f2f32;color:#fff}.registration-voice-body{display:grid;grid-template-rows:auto auto auto auto;justify-items:center;align-content:center;gap:14px}.registration-voice-level{width:78%;height:28px;display:grid;grid-template-columns:repeat(28,1fr);gap:6px;align-items:end}.registration-voice-level span{height:7px;border-radius:999px 999px 3px 3px;background:rgba(255,81,74,.18);opacity:.75;transition:height .06s linear,background .06s linear,opacity .06s linear}.registration-voice-level span.active{background:#ff514a;opacity:1}.registration-voice-timer{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:56px;line-height:1;font-weight:900;letter-spacing:0;color:#f7f7fb}.registration-voice-actions{display:flex;align-items:center;justify-content:center;gap:20px;flex-wrap:nowrap}.registration-voice-action{width:86px;height:86px;border:0;border-radius:999px;color:#fff;background:#303033;padding:0;display:none;place-items:center;box-shadow:0 18px 36px rgba(0,0,0,.24);font-weight:900;font-size:28px;white-space:nowrap}.registration-voice-action.start{display:grid;width:92px;height:92px;background:#ff514a;color:white;font-size:0}.registration-voice-action.start:before{content:"";font-size:42px;line-height:1}.registration-voice-action.pause,.registration-voice-action.resume{background:#f7f7fb;color:#1b1b1d;font-size:0}.registration-voice-action.pause:before{content:"Ⅱ";font-size:38px;letter-spacing:-8px}.registration-voice-action.resume:before{content:"▶";font-size:34px}.registration-voice-action.extend{background:#303033;color:#f7f7fb}.registration-voice-action.stop{background:#303033;color:#ff514a;font-size:0}.registration-voice-action.stop:before{content:"■";font-size:34px;line-height:1}.registration-voice-dock.recording .registration-voice-action.start{display:none}.registration-voice-dock.recording .registration-voice-action.pause,.registration-voice-dock.recording .registration-voice-action.extend,.registration-voice-dock.recording .registration-voice-action.stop{display:grid}.registration-voice-dock.paused .registration-voice-action.pause{display:none}.registration-voice-dock.paused .registration-voice-action.resume{display:grid}.registration-voice-action:disabled{opacity:.45;cursor:not-allowed}#registrationVoiceDock .registration-voice-close{width:26px!important;height:26px!important;padding:0!important;border:0!important;border-radius:999px!important;background:rgba(255,255,255,.05)!important;color:#777!important;box-shadow:none!important;font-size:18px!important;display:grid!important;place-items:center!important}#registrationVoiceDock .registration-voice-action{box-sizing:border-box!important;border:0!important;padding:0!important;margin:0!important;border-radius:999px!important;text-align:center!important;text-decoration:none!important;font-family:system-ui,-apple-system,sans-serif!important}#registrationVoiceDock .registration-voice-action.start{position:relative!important;display:grid!important;width:92px!important;height:92px!important;background:#ff514a!important;color:transparent!important;font-size:0!important;box-shadow:0 18px 38px rgba(255,81,74,.18),0 18px 36px rgba(0,0,0,.24)!important}#registrationVoiceDock .registration-voice-action.start:before{content:""!important;position:absolute!important;left:50%!important;top:23px!important;width:20px!important;height:30px!important;transform:translateX(-50%)!important;border:5px solid #fff!important;border-radius:999px!important;box-sizing:border-box!important;background:transparent!important}#registrationVoiceDock .registration-voice-action.start:after{content:""!important;position:absolute!important;left:50%!important;top:48px!important;width:34px!important;height:22px!important;transform:translateX(-50%)!important;border:5px solid #fff!important;border-top:0!important;border-radius:0 0 18px 18px!important;box-sizing:border-box!important;box-shadow:0 12px 0 -3px #fff!important}.registration-voice-status{width:100%;min-height:22px;color:#d7d7dd;text-align:center;font-size:20px;font-weight:850}.dictation-guide{height:auto!important;max-height:none!important;overflow:visible!important;padding:20px 20px!important}.guide-fields{gap:20px 22px!important}.guide-field{line-height:1.25;font-size:17px!important}.guide-blank{height:22px!important;margin-top:8px!important}.woyz-guide-value{display:block;margin-top:10px;color:#10271f;font-size:18px;font-weight:900;overflow-wrap:anywhere}.woyz-line-value{display:block;margin:6px 0 2px;padding:8px 10px;border-left:3px solid #0f8a5f;border-radius:6px;background:#edf6f0;color:#183b32;font-size:16px!important;font-weight:750!important;line-height:1.25!important;overflow-wrap:anywhere;white-space:pre-wrap}.woyz-guide-value.empty{display:none}.woyz-registration-values,.shared-stage-display,.woyz-stage-fill{display:none!important}';
    style.textContent+='#registrationVoiceDock.registration-voice-dock{position:fixed!important;top:auto!important;bottom:24px!important;width:min(330px,calc(100% - 36px))!important;max-width:calc(100% - 36px)!important;min-height:0!important;padding:14px 14px 16px!important;border-radius:16px!important;background:#1b1b1d!important;overflow:hidden!important;box-sizing:border-box!important;box-shadow:0 18px 46px rgba(0,0,0,.22)!important}#registrationVoiceDock.visible{gap:8px!important}#registrationVoiceDock .registration-voice-head{min-height:26px!important;align-items:center!important}#registrationVoiceDock .registration-voice-title{font-size:14px!important;gap:7px!important;line-height:1!important}#registrationVoiceDock .registration-voice-title:before{width:7px!important;height:7px!important;box-shadow:0 0 0 4px rgba(255,81,74,.18)!important}#registrationVoiceDock .registration-voice-close{width:26px!important;height:26px!important;border-radius:8px!important;background:#2b2b2f!important;color:#9e9ea5!important;font-size:18px!important;display:grid!important;place-items:center!important}#registrationVoiceDock .registration-voice-body{gap:8px!important;align-content:center!important}#registrationVoiceDock .registration-voice-level{width:min(76%,230px)!important;height:16px!important;gap:4px!important}#registrationVoiceDock .registration-voice-level span{height:4px!important}.registration-voice-level span.active{background:#ff514a!important}#registrationVoiceDock .registration-voice-timer{font-size:clamp(32px,9vw,42px)!important;letter-spacing:0!important}#registrationVoiceDock .registration-voice-actions{width:100%!important;gap:12px!important;overflow:hidden!important}#registrationVoiceDock .registration-voice-action{position:relative!important;display:none!important;width:58px!important;height:58px!important;min-width:0!important;flex:0 0 auto!important;overflow:hidden!important;color:transparent!important;font-size:0!important;line-height:1!important;box-shadow:0 10px 24px rgba(0,0,0,.2)!important}#registrationVoiceDock:not(.recording) .registration-voice-action.start{display:grid!important;width:56px!important;height:56px!important}#registrationVoiceDock.recording .registration-voice-action.start{display:none!important}#registrationVoiceDock.recording .registration-voice-action.pause,#registrationVoiceDock.recording .registration-voice-action.extend,#registrationVoiceDock.recording .registration-voice-action.stop{display:grid!important}#registrationVoiceDock.paused .registration-voice-action.pause{display:none!important}#registrationVoiceDock.paused .registration-voice-action.resume{display:grid!important}#registrationVoiceDock .registration-voice-action.start:before{top:12px!important;width:14px!important;height:22px!important;border-width:4px!important}#registrationVoiceDock .registration-voice-action.start:after{top:31px!important;width:24px!important;height:16px!important;border-width:4px!important;border-top:0!important;box-shadow:0 9px 0 -2px #fff!important}#registrationVoiceDock .registration-voice-action.pause,#registrationVoiceDock .registration-voice-action.resume{background:#f7f7fb!important;color:transparent!important}#registrationVoiceDock .registration-voice-action.pause:before{font-size:25px!important;letter-spacing:-5px!important}#registrationVoiceDock .registration-voice-action.extend{background:#303033!important;color:#f7f7fb!important;font-size:18px!important}#registrationVoiceDock .registration-voice-action.stop{background:#303033!important;color:transparent!important;font-size:0!important}#registrationVoiceDock .registration-voice-action.stop:before{content:""!important;position:absolute!important;left:50%!important;top:50%!important;width:14px!important;height:14px!important;transform:translate(-50%,-50%)!important;border:0!important;border-radius:2px!important;background:#ff514a!important;box-shadow:none!important}#registrationVoiceDock .registration-voice-status{font-size:12px!important;line-height:1.2!important;min-height:14px!important}';
    document.head.append(style);
    const dock=document.createElement('div');
    dock.id='registrationVoiceDock';
    dock.className='registration-voice-dock';
    dock.setAttribute('aria-live','polite');
    dock.innerHTML='<div class="registration-voice-head" id="registrationVoiceHead"><div class="registration-voice-title">Voice note draft</div><button class="registration-voice-close" id="registrationVoiceClose" aria-label="Close voice panel" type="button">&times;</button></div><div class="registration-voice-body"><div class="registration-voice-level" id="registrationVoiceLevel" aria-label="Voice activity"></div><div class="registration-voice-timer" id="registrationVoiceTimer">05:00</div><div class="registration-voice-actions"><button class="registration-voice-action start" id="registrationVoiceStart" aria-label="Start recording" type="button">Start</button><button class="registration-voice-action pause" id="registrationVoicePause" aria-label="Pause recording" type="button" disabled>Pause</button><button class="registration-voice-action resume" id="registrationVoiceResume" aria-label="Resume recording" type="button" disabled>Resume</button><button class="registration-voice-action extend" id="registrationVoiceExtend" aria-label="Extend five minutes" type="button">+5</button><button class="registration-voice-action stop" id="registrationVoiceStop" aria-label="Stop and transcribe" type="button" disabled>Stop & transcribe</button></div><div class="registration-voice-status" id="registrationVoiceStatus">Ready to record new voice note</div></div>';
    root.append(dock);
    voiceState.dock=dock;voiceState.status=dock.querySelector('#registrationVoiceStatus');voiceState.start=dock.querySelector('#registrationVoiceStart');voiceState.pause=dock.querySelector('#registrationVoicePause');voiceState.resume=dock.querySelector('#registrationVoiceResume');voiceState.extend=dock.querySelector('#registrationVoiceExtend');voiceState.stop=dock.querySelector('#registrationVoiceStop');voiceState.level=dock.querySelector('#registrationVoiceLevel');
    voiceState.bars=Array.from({length:28},()=>{const bar=document.createElement('span');voiceState.level.append(bar);return bar;});
    dock.querySelector('#registrationVoiceClose').addEventListener('pointerdown',event=>{event.preventDefault();event.stopPropagation();closeVoiceDock();});
    dock.querySelector('#registrationVoiceClose').addEventListener('click',event=>{event.preventDefault();event.stopPropagation();closeVoiceDock();});
    document.addEventListener('click',event=>{if(event.target.closest?.('#registrationVoiceClose')){event.preventDefault();event.stopPropagation();closeVoiceDock();}},true);
    voiceState.start.addEventListener('click',startVoiceRecording);
    voiceState.pause.addEventListener('click',pauseVoiceRecording);
    voiceState.resume.addEventListener('click',resumeVoiceRecording);
    voiceState.extend.addEventListener('click',extendVoiceRecording);
    voiceState.stop.addEventListener('click',finishVoiceRecording);
    makeVoiceDockMovable(dock,dock.querySelector('#registrationVoiceHead'));
    window.addEventListener('resize',positionVoiceDockInsideMobile);
    drawVoiceBars();
  }
  function openVoiceDockForStage(){
    ensureVoicePlugin();
    const stage=currentStageFromContent();
    if(!stage){setVoiceStatus('Select a pathway section first');return;}
    selectedStageIndex=stage.index;
    selectedStageName=stage.name;
    selectedVoiceKind=stage.kind||'stage';
    const title=voiceState.dock?.querySelector('.registration-voice-title');
    if(title)title.textContent='Voice note draft';
    voiceState.dock?.classList.add('visible');
    requestAnimationFrame(positionVoiceDockInsideMobile);
    setVoiceStatus('Ready to record new voice note');
  }
  function closeVoiceDock(){
    if(voiceState.recording&&voiceState.recorder&&voiceState.recorder.state!=='inactive'){
      voiceState.recorder.onstop=null;
      voiceState.recorder.stop();
    }
    stopVoiceTracks();
    voiceState.dock?.classList.remove('visible');
  }
  function setVoiceStatus(text){
    if(voiceState.status)voiceState.status.textContent=text;
    const inlineStatus=root.querySelector('.woyz-record-status');
    if(inlineStatus)inlineStatus.textContent=text;
  }
  function setVoiceTimer(){
    const timer=voiceState.dock?.querySelector('#registrationVoiceTimer');
    if(!timer)return;
    const minutes=String(Math.floor(voiceState.remaining/60)).padStart(2,'0');
    const seconds=String(voiceState.remaining%60).padStart(2,'0');
    timer.textContent=minutes+':'+seconds;
  }
  function updateVoiceButtons(){
    if(!voiceState.start)return;
    voiceState.dock?.classList.toggle('recording',voiceState.recording);
    voiceState.dock?.classList.toggle('paused',voiceState.recording&&voiceState.paused);
    voiceState.inline?.classList.toggle('recording',voiceState.recording);
    voiceState.inline?.classList.toggle('paused',voiceState.recording&&voiceState.paused);
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
      setVoiceStatus('Recording in progress...');
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
    setVoiceStatus('Recording in progress...');
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
    reader.onload=()=>{const data=String(reader.result||'').split(',')[1]||'';post({type:'voiceRegistration',caseId,audioData:data,mimeType:blob.type,mutationId:crypto.randomUUID(),stageIndex:selectedStageIndex,stageName:selectedStageName,voiceKind:selectedVoiceKind});setVoiceStatus('Sending '+(selectedStageName||'selected section')+' audio to Gemini…');};
    reader.onerror=()=>setVoiceStatus('Could not read the recording');
    reader.readAsDataURL(blob);
  }
  function makeVoiceDockMovable(dock,handle){
    let drag=null;
    handle.addEventListener('pointerdown',event=>{if(event.target.closest?.('button'))return;drag={x:event.clientX,y:event.clientY,left:dock.offsetLeft,top:dock.offsetTop};handle.setPointerCapture(event.pointerId);});
    handle.addEventListener('pointermove',event=>{if(!drag)return;const nextLeft=drag.left+event.clientX-drag.x;const nextTop=drag.top+event.clientY-drag.y;dock.style.left=Math.min(Math.max(8,nextLeft),root.clientWidth-dock.offsetWidth-8)+'px';dock.style.top=Math.min(Math.max(8,nextTop),window.innerHeight-dock.offsetHeight-8)+'px';dock.style.bottom='auto';});
    handle.addEventListener('pointerup',()=>{drag=null;});
    handle.addEventListener('pointercancel',()=>{drag=null;});
  }
  function positionVoiceDockInsideMobile(){
    const dock=voiceState.dock;
    if(!dock||!dock.classList.contains('visible'))return;
    const width=Math.max(292,Math.min(root.clientWidth-36,330));
    dock.style.width=width+'px';
    dock.style.left=Math.max(18,Math.round((root.clientWidth-width)/2))+'px';
    dock.style.top='auto';
    dock.style.bottom='24px';
  }
  function ensureMobileControls(){
    const list=root.querySelector('#mh-patients');
    applyMobileReferenceLayout();
    ensureInlineRecorder();
    if(!list||root.querySelector('#mh-new-firestore'))return;
    const button=document.createElement('button');
    button.id='mh-new-firestore';
    button.type='button';
    button.textContent='New patient';
    button.style.cssText='width:100%;margin:10px 0 4px;padding:12px;border:0;border-radius:8px;background:#0f8a5f;color:white;font-weight:800';
    list.before(button);
  }
  function ensureInlineRecorder(){
    if(root.id!=='stroke-mobile-home')return;
    const start=root.querySelector('#mh-record');
    if(!start||start.dataset.inlineRecorder==='true')return;
    start.dataset.inlineRecorder='true';
    start.textContent='Start';
    const holder=start.parentElement;
    holder.classList.add('woyz-inline-recorder');
    const label=document.createElement('span');
    label.className='woyz-recording-label';
    label.textContent='Recording';
    const pause=document.createElement('button');
    pause.type='button';pause.className='woyz-record-pause';pause.textContent='Pause';
    const resume=document.createElement('button');
    resume.type='button';resume.className='woyz-record-resume';resume.textContent='Resume';
    const stop=document.createElement('button');
    stop.type='button';stop.className='woyz-record-stop';stop.textContent='Stop & transcribe';
    const status=document.createElement('span');
    status.className='woyz-record-status';
    status.textContent='Ready';
    holder.prepend(label);
    start.after(pause,resume,stop,status);
    voiceState.inline=holder;
    voiceState.status=status;
    voiceState.start=start;
    voiceState.pause=pause;
    voiceState.resume=resume;
    voiceState.extend={disabled:false};
    voiceState.stop=stop;
    start.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();const stage=currentStageFromContent();if(stage){selectedStageIndex=stage.index;selectedStageName=stage.name;selectedVoiceKind=stage.kind||'stage';}startVoiceRecording();});
    pause.addEventListener('click',pauseVoiceRecording);
    resume.addEventListener('click',resumeVoiceRecording);
    stop.addEventListener('click',finishVoiceRecording);
    updateVoiceButtons();
  }
  function openPatientListByDefault(){
    if(openedDefaultList)return;
    const button=root.querySelector('#mh-list');
    if(!button)return;
    openedDefaultList=true;
    button.click();
  }
  function currentStageFromContent(){
    const heading=root.querySelector('#mh-content h2')?.textContent?.trim()||'';
    if(heading==='All 24 KPIs')return {index:100,name:'KPI missing details',kind:'kpi'};
    const index=voiceStages.indexOf(heading);
    return index>=0?{index,name:voiceStages[index],kind:'stage'}:null;
  }
  function updateVoiceAvailability(){
    ensureInlineRecorder();
    const stage=currentStageFromContent();
    if(stage){
      selectedStageIndex=stage.index;
      selectedStageName=stage.name;
      selectedVoiceKind=stage.kind||'stage';
      const title=root.querySelector('.registration-voice-title');
      if(title)title.textContent='Voice note draft';
      return;
    }
    selectedStageIndex=null;
    selectedStageName='';
    selectedVoiceKind='stage';
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
  function renderDesktopClinicalNote(){
    if(root.id!=='stroke-review')return;
    const note=root.querySelector('#sr-note');
    if(!note)return;
    const name=caseData.name||'Patient name missing';
    const registration=[
      ['Name',caseData.name],['UHID',caseData.uhid],['Age',caseData.age],['Sex',caseData.sex],['Mobile',caseData.mobile],['Diagnosis',caseData.diagnosis],['Contact',caseData.contact]
    ].filter(([,value])=>value&&value!=='NIL');
    const stageMarkup=voiceStages.slice(1).map((stage,offset)=>{
      const index=offset+1;
      const raw=caseData['stage_'+index];
      const parsed=stageStructuredValue(raw||'');
      const fields=parsed.fields||[];
      const summary=parsed.summary&&parsed.summary!=='NIL'?parsed.summary:(raw&&raw!=='NIL'?raw:'Not yet recorded');
      const fieldRows=fields.length?'<dl class="woyz-note-fields">'+fields.map(item=>'<div><dt>'+esc(item.label)+'</dt><dd>'+esc(item.value)+'</dd></div>').join('')+'</dl>':'';
      return '<div class="event"><div class="time">'+(index+1)+'</div><div><h3>'+esc(stage)+'</h3><p class="saved-value">'+esc(summary)+'</p>'+fieldRows+'</div></div>';
    }).join('');
    note.innerHTML='<div class="note-title"><h2>Chronological clinical note</h2><small>'+esc(name)+' · '+esc(caseId)+' · '+todayDisplay()+'</small></div><div class="event"><div class="time">1</div><div><h3>Registration</h3>'+(registration.length?'<dl class="woyz-note-fields">'+registration.map(([label,value])=>'<div><dt>'+esc(label)+'</dt><dd>'+esc(value)+'</dd></div>').join('')+'</dl>':'<p class="saved-value">Not yet recorded</p>')+'</div></div>'+stageMarkup+'<h3>Consultant comments</h3><p class="saved-value">'+esc(caseData.consultant||'Missing')+'</p><h3>Diagnosis and treatment summary</h3><p class="saved-value">'+esc(caseData.discharge||caseData.diagnosis||'Missing')+'</p>';
    if(!document.querySelector('#woyzDesktopNoteStyle')){
      const style=document.createElement('style');
      style.id='woyzDesktopNoteStyle';
      style.textContent='.woyz-note-fields{display:grid;gap:8px;margin:8px 0 0}.woyz-note-fields div{display:grid;grid-template-columns:minmax(150px,220px) 1fr;gap:12px;border-top:1px solid #dce8df;padding-top:8px}.woyz-note-fields dt{font-weight:850;color:#1f5f51}.woyz-note-fields dd{margin:0;color:#203c33;white-space:pre-wrap}@media(max-width:760px){.woyz-note-fields div{grid-template-columns:1fr}}';
      document.head.append(style);
    }
  }
  function renderCaseIdentity(){
    const active=cases.find(item=>item.id===caseId);
    const mobileId=root.querySelector('#mh-id');
    const uhid=caseData.uhid||active?.uhid;
    if(mobileId)mobileId.textContent='Episode '+caseId+' · UHID '+(uhid&&uhid!=='No UHID'&&uhid!=='NIL'?uhid:'missing');
    const dock=root.querySelector('.dock-target');
    if(dock)dock.textContent=(caseData.name||active?.name||'Patient name missing')+' · '+caseId;
  }
  function renderRegistrationValues(){
    const heading=root.querySelector('#mh-content h2')?.textContent?.trim();
    const content=root.querySelector('#mh-content');
    if(!content)return;
    content.querySelectorAll('.shared-stage-display').forEach(item=>{item.hidden=true;});
    content.querySelector('.woyz-stage-fill')?.remove();
    content.querySelectorAll('.woyz-line-value').forEach(item=>item.remove());
    if(root.id==='stroke-mobile-home')return;
    if(heading!=='Registration')return renderStageFill(heading,content);
    hydrateRegistrationGuide();
    let box=content.querySelector('.woyz-registration-values');
    if(box)box.remove();
  }
  function renderStageFill(heading,content){
    const index=voiceStages.indexOf(heading);
    if(index<0)return;
    const value=caseData['stage_'+index];
    if(!value||value==='NIL')return;
    const parsed=stageStructuredValue(value);
    if(parsed.summary){
      const firstGroup=content.querySelector('.line.group,.assessment-list li.group');
      const summary=document.createElement('span');
      summary.className='woyz-line-value';
      summary.textContent=trimDisplayValue(parsed.summary,360);
      (firstGroup||content).append(summary);
    }
    const rows=Array.from(content.querySelectorAll('.line,.assessment-list li')).filter(row=>!row.classList.contains('group'));
    rows.forEach(row=>{
      const match=stageLineValue(row.textContent,parsed);
      if(!match)return;
      const span=document.createElement('span');
      span.className='woyz-line-value';
      span.textContent=trimDisplayValue(match,220);
      row.append(span);
    });
  }
  function stageStructuredValue(note){
    const text=String(note||'');
    try{
      const parsed=JSON.parse(text);
      if(parsed&&typeof parsed==='object'){
        return {summary:String(parsed.summary||''),fields:Array.isArray(parsed.fields)?parsed.fields.map(item=>({label:String(item.label||''),value:String(item.value||'')})).filter(item=>item.label&&item.value&&item.value!=='NIL'):[],raw:text};
      }
    }catch{}
    return {summary:'',fields:[],raw:text};
  }
  function trimDisplayValue(value,max){
    const text=String(value||'').replace(/\\s+/g,' ').trim();
    return text.length>max?text.slice(0,max-1).trim()+'…':text;
  }
  function stageLineValue(label,structured){
    const text=structured.raw||'';
    const clean=String(label||'').replace(/\\s+/g,' ').trim().toLowerCase();
    const fields=structured.fields||[];
    const field=fields.find(item=>labelMatch(clean,item.label));
    if(field)return field.value;
    const direct=[
      [/stroke onset|onset/,/(?:stroke\\s*)?onset\\s*(?:at|:)?\\s*([^.,;]+)/i],
      [/last seen normal|last known well/,/last\\s*(?:seen\\s*)?(?:normal|well)\\s*(?:at|:)?\\s*([^.,;]+)/i],
      [/stroke noted|symptom noted/,/(?:stroke|symptom)\\s*noted\\s*(?:at|:)?\\s*([^.,;]+)/i],
      [/ed arrival|arrival/,/(?:ed\\s*)?arrival\\s*(?:at|:)?\\s*([^.,;]+)/i],
      [/code 7|code stroke/,/(?:code\\s*(?:7|stroke)\\s*(?:activated)?)(?:\\s*at|:)?\\s*([^.,;]+)/i]
    ];
    for(const [labelPattern,valuePattern] of direct){if(labelPattern.test(clean)){const found=text.match(valuePattern);if(found)return found[1].trim();}}
    return '';
  }
  function labelMatch(row,label){
    const a=String(row||'').toLowerCase();
    const b=String(label||'').replace(/\\s+/g,' ').trim().toLowerCase();
    if(!a||!b)return false;
    if(a.includes(b)||b.includes(a))return true;
    const words=b.split(/[^a-z0-9]+/).filter(word=>word.length>3);
    return words.length>0&&words.every(word=>a.includes(word));
  }
  function hydrateRegistrationGuide(){
    const values={'Name':caseData.name,'Age (years)':caseData.age,'UHID No.':caseData.uhid,'Mobile No.':caseData.mobile,'Diagnosis':caseData.diagnosis,'Contact person & number':caseData.contact};
    root.querySelectorAll('.guide-field').forEach(field=>{
      const label=Object.keys(values).find(key=>field.textContent.trim().startsWith(key));
      if(!label)return;
      field.querySelector('.woyz-guide-value')?.remove();
      const value=values[label];
      const span=document.createElement('span');
      span.className='woyz-guide-value'+(!value||value==='NIL'?' empty':'');
      span.textContent=value&&value!=='NIL'?value:'';
      field.append(span);
    });
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
    if(recorder){event.preventDefault();event.stopImmediatePropagation();const stage=currentStageFromContent();if(stage){selectedStageIndex=stage.index;selectedStageName=stage.name;selectedVoiceKind=stage.kind||'stage';}startVoiceRecording();return;}
    const create=event.target.closest?.('#mh-new-firestore');
    if(create){event.preventDefault();event.stopImmediatePropagation();post({type:'createCase'});return;}
    const select=event.target.closest?.('[data-firestore-case]');
    if(select){event.preventDefault();event.stopImmediatePropagation();post({type:'selectCase',caseId:select.getAttribute('data-firestore-case')});const drawer=root.querySelector('#mh-drawer');if(drawer)drawer.hidden=true;root.querySelector('#mh-home')?.click?.();}
    setTimeout(()=>{renderMobileCases();renderCaseIdentity();renderRegistrationValues();updateVoiceAvailability();},0);
    setTimeout(()=>{renderMobileCases();renderCaseIdentity();renderRegistrationValues();updateVoiceAvailability();},120);
    setTimeout(()=>{renderMobileCases();renderCaseIdentity();renderRegistrationValues();updateVoiceAvailability();},600);
  },true);
  window.addEventListener('message',event=>{
    if(event.source!==parent||event.data?.channel!=='woyz-case-v1')return;
    if(event.data.selectedDateISO)selectedDateISO=String(event.data.selectedDateISO);
    if(event.data.caseId)caseId=event.data.caseId;
    if(event.data.data&&typeof event.data.data==='object')caseData=event.data.data;
    if(Array.isArray(event.data.cases))cases=event.data.cases;
    if(event.data.type==='created'){
      const drawer=root.querySelector('#mh-drawer');
      if(drawer)drawer.hidden=true;
      root.querySelector('#mh-home')?.click?.();
      setVoiceStatus('New Firestore patient opened: '+caseId);
    }
    if(event.data.type==='voiceRegistrationSaved'){setVoiceStatus('Saved to Firestore');setTimeout(closeVoiceDock,450);}
    if(event.data.type==='voiceRegistrationError')setVoiceStatus(event.data.error||'Voice registration failed');
    setTimeout(()=>{renderMobileCases();renderDesktopCases();renderDesktopClinicalNote();renderCaseIdentity();renderRegistrationValues();replaceRecorderCopy();updateVisibleDates();updateVoiceAvailability();},0);
    setTimeout(openPatientListByDefault,80);
  });
  applyMobileReferenceLayout();
  ensureMobileHeaderControls();
  ensureMobileControls();
  renderCaseIdentity();
  replaceRecorderCopy();
  updateVisibleDates();
  updateVoiceAvailability();
  setTimeout(openPatientListByDefault,250);
  setInterval(()=>{renderMobileCases();renderDesktopClinicalNote();renderCaseIdentity();renderRegistrationValues();replaceRecorderCopy();updateVisibleDates();updateVoiceAvailability();},1000);
})();
</script>`;

function enhanceDocument(value) {
  return standaloneDocument(value).replace("</body>", `${sharedCaseControls}</body>`);
}

const standaloneMobileDocument = enhanceDocument(mobileDocument);
const standaloneDesktopDocument = enhanceDocument(removeDesktopOnlyChrome(desktopDocument));

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
  .bar{display:flex;gap:8px;align-items:center;justify-content:flex-end;flex-wrap:wrap;padding:9px 16px;background:#215f51;color:white}
  .bar strong{font-weight:800}
  .bar button{min-height:30px;border:1px solid rgb(255 255 255 / .28);border-radius:7px;background:rgb(255 255 255 / .94);color:#183b32;padding:4px 10px;font-size:13px;font-weight:750;text-decoration:none;line-height:1}
  .bar button.active{background:#0f8a5f;color:white;box-shadow:inset 0 0 0 1px rgb(255 255 255 / .36)}
  .bar .spacer{flex:1 1 auto}
  .bar .today-date{width:132px;min-height:30px;border:1px solid rgb(255 255 255 / .28);border-radius:7px;background:rgb(255 255 255 / .94);color:#183b32;padding:4px 8px;font:750 13px system-ui;line-height:1}
  .bar .settings{width:32px;padding:4px 0}
  .bar .link{display:inline-grid;place-items:center;min-height:30px;border:1px solid rgb(255 255 255 / .28);border-radius:7px;background:rgb(255 255 255 / .94);color:#183b32;padding:4px 10px;font-size:13px;font-weight:750;text-decoration:none;line-height:1}
  .status{display:none;font-size:12px;opacity:.78;white-space:nowrap}
  .notice{display:none;justify-content:space-between;gap:12px;align-items:center;padding:8px 18px;font-size:12px;color:#52695e;border-bottom:1px solid #dce8df}
  .notice .error{color:#b42318;font-weight:750}
  iframe{width:100%;height:calc(100vh - 48px);border:0;display:block;background:white}
  .auth-screen{position:fixed;inset:0;z-index:20;display:grid;place-items:center;background:#f4f7f5;padding:20px}
  .auth-screen[hidden]{display:none}
  .auth-card{width:min(420px,100%);display:grid;gap:14px;padding:24px;border:1px solid #cfe0d5;border-radius:12px;background:white;box-shadow:0 18px 60px rgb(0 0 0 / .12)}
  .auth-card h1{margin:0;color:#16372d;font-size:28px;line-height:1.1}
  .auth-card p{margin:0;color:#5e7067}
  .auth-card label{display:grid;gap:6px;color:#52695e;font-size:13px;font-weight:750}
  .auth-card input{width:100%;border:1px solid #cfe0d5;border-radius:7px;padding:11px 12px;font:inherit;color:#14231a}
  .auth-card button{border:0;border-radius:8px;background:#0f8a5f;color:white;padding:12px 14px;font-weight:850}
  .auth-error{min-height:18px;color:#b42318;font-weight:750;font-size:13px}
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
  @media(max-width:1100px){.bar{display:none}.notice{display:none}iframe{height:100vh}}
  @media(min-width:1101px) and (max-width:1400px){.bar{gap:6px;padding:7px 9px}.bar strong{font-size:14px}.bar button,.bar a{min-height:28px;padding:3px 8px;font-size:12px}.bar .settings{width:30px}.notice{padding:7px 10px}iframe{height:calc(100vh - 42px)}}
</style>
</head>
<body>
<div class="shell">
  <div class="bar">
    <strong id="caseTitle" hidden>WOYZ · Shared case ST-024</strong>
    <span id="status" class="status" role="status">Connecting…</span>
    <span class="spacer"></span>
    <input id="todayDate" class="today-date" aria-label="Select pathway date" type="date">
    <button id="signOutBtn" type="button" hidden>Sign out</button>
    <button id="settingsBtn" class="settings" type="button" aria-label="Settings">⚙</button>
  </div>
  <div class="notice">
    <span>Private prototype · Saved fields sync across devices in this workspace. Verify clinical entries before use.</span>
    <span id="syncNote"></span>
  </div>
  <iframe id="workspaceFrame" title="mobile stroke workspace" sandbox="allow-scripts allow-same-origin" allow="microphone" referrerpolicy="no-referrer"></iframe>
</div>
<section id="authScreen" class="auth-screen">
  <form id="loginForm" class="auth-card">
    <h1>WOYZ Stroke</h1>
    <p>Sign in to access the shared stroke workspace.</p>
    <label>Email
      <input id="loginEmail" type="email" autocomplete="username" required>
    </label>
    <label>Password
      <input id="loginPassword" type="password" autocomplete="current-password" required>
    <button type="submit">Sign in</button>
    <div id="loginError" class="auth-error" role="alert"></div>
  </form>
</section>
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
import {getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
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
const authScreen=document.getElementById("authScreen");
const loginForm=document.getElementById("loginForm");
const loginEmail=document.getElementById("loginEmail");
const loginPassword=document.getElementById("loginPassword");
const loginError=document.getElementById("loginError");
const signOutBtn=document.getElementById("signOutBtn");
const todayDate=document.getElementById("todayDate");
const settingsDialog=document.getElementById("settingsDialog");
const caseDocId=document.getElementById("caseDocId");
const workspaceCodeInput=document.getElementById("workspaceCode");
const geminiKeyInput=document.getElementById("geminiKey");
const geminiStoreKey="woyz-stroke-gemini-key";
const defaultWorkspaceId="WOYZ-STROKE-SHARED";
const responsiveModeQuery=window.matchMedia("(max-width:1100px)");
let mode=initialMode();
let workspaceId=initialWorkspaceId();
let caseId=initialCaseId();
let selectedDateISO=new Date().toISOString().slice(0,10);
let currentUser=null;
let unsubscribeCase=null;
let unsubscribeList=null;
let cases=[];
let snapshot={data:{},version:0,updatedAt:null,updatedAtText:null};
let saving=false;

function nowText(){return new Date().toLocaleTimeString();}
function todayDisplay(){return new Date(selectedDateISO+"T00:00:00").toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});}
function randomId(prefix){const bytes=new Uint8Array(12);crypto.getRandomValues(bytes);return prefix+Array.from(bytes,b=>b.toString(36).padStart(2,"0")).join("").slice(0,22);}
function cleanId(value,fallback){return String(value||fallback).replace(/[^A-Za-z0-9_-]/g,"-").slice(0,64);}
function initialMode(){return responsiveModeQuery.matches?"mobile":"desktop";}
function writeUrlState(){const url=new URL(location.href);url.searchParams.set("w",defaultWorkspaceId);url.searchParams.set("c",caseId);history.replaceState(null,"",url.pathname+"?"+url.searchParams.toString()+url.hash);}
function initialWorkspaceId(){const url=new URL(location.href);if(url.searchParams.get("w")!==defaultWorkspaceId){url.searchParams.set("w",defaultWorkspaceId);history.replaceState(null,"",url.pathname+"?"+url.searchParams.toString()+url.hash);}return defaultWorkspaceId;}
function initialCaseId(){const url=new URL(location.href);const id=cleanId(url.searchParams.get("c"),"ST-024");return id.startsWith("ST-")?id:"ST-024";}
function caseCollection(){return collection(db,"strokeWorkspaces",workspaceId,"strokeCases");}
function ref(){return doc(db,"strokeWorkspaces",workspaceId,"strokeCases",caseId);}
function cleanSnapshot(raw){return {data:{...(raw?.data||{})},version:Number(raw?.version||0),updatedAt:raw?.updatedAt||null,updatedAtText:raw?.updatedAtText||null};}
function writeSnapshot(next){snapshot=cleanSnapshot(next);}
function setStatus(text,isError=false,note=""){statusEl.textContent=text;statusEl.style.color="inherit";syncNote.textContent=note;syncNote.className=isError?"error":"";}
function post(message){frame.contentWindow?.postMessage({channel:"woyz-case-v1",...message},"*");}
function caseLabel(item){const name=item.data?.name||"Patient name missing";const uhid=item.data?.uhid||"No UHID";return {id:item.id,name,uhid,version:item.version||0};}
function visibleCaseLabels(){const current={id:caseId,...snapshot};const merged=[current,...cases.filter(item=>item.id!==caseId)];return merged.map(caseLabel);}
function rememberCurrentCase(){cases=[{id:caseId,...snapshot},...cases.filter(item=>item.id!==caseId)];}
function sendSnapshot(type="snapshot",extra={}){post({type,workspaceId,caseId,selectedDateISO,cases:visibleCaseLabels(),...snapshot,...extra});}
function renderFrame(){frame.srcdoc=mode==="desktop"?desktopDocument:mobileDocument;frame.title=mode==="desktop"?"desktop stroke workspace":"mobile stroke workspace";}
function syncResponsiveMode(){const next=initialMode();if(next===mode)return;mode=next;renderFrame();setTimeout(()=>sendSnapshot(),150);}
function newCaseId(){const stamp=new Date().toISOString().replace(/[-:TZ.]/g,"").slice(0,14);return "ST-"+stamp+"-"+Math.random().toString(36).slice(2,6).toUpperCase();}
function connect(){if(unsubscribeCase){unsubscribeCase();unsubscribeCase=null;}document.getElementById("caseTitle").textContent="WOYZ · Case "+caseId;if(!currentUser){setStatus("Sign in required");sendSnapshot();return;}setStatus("Connecting…");unsubscribeCase=onSnapshot(ref(),docSnap=>{if(docSnap.exists()){writeSnapshot(docSnap.data());setStatus(snapshot.version?"Synced · v"+snapshot.version:"Firestore ready");}else{writeSnapshot({data:{},version:0,updatedAt:null});setStatus("Firestore ready");}sendSnapshot();},error=>{setStatus("Firestore unavailable",true,error.code||error.message);sendSnapshot();});}
function connectList(){if(unsubscribeList){unsubscribeList();unsubscribeList=null;}if(!currentUser)return;unsubscribeList=onSnapshot(caseCollection(),listSnap=>{cases=listSnap.docs.map(item=>({id:item.id,...cleanSnapshot(item.data())})).sort((a,b)=>String(b.updatedAtText||"").localeCompare(String(a.updatedAtText||"")));if(cases.length&&!cases.some(item=>item.id===caseId)){caseId=cases[0].id;writeUrlState();connect();}sendSnapshot();},error=>{setStatus("Case list unavailable",true,error.code||error.message);sendSnapshot();});}
async function createCase(){if(!currentUser){post({type:"error",error:"Firestore user is not ready yet. Retry in a moment."});return;}if(saving)return;const nextId=newCaseId();saving=true;setStatus("Creating patient…");try{await runTransaction(db,async tx=>{tx.set(doc(db,"strokeWorkspaces",workspaceId,"strokeCases",nextId),{sharedApp:"woyz-stroke",createdByUid:currentUser.uid,updatedByUid:currentUser.uid,episode:nextId,data:{},version:0,createdAt:serverTimestamp(),updatedAt:serverTimestamp(),updatedAtText:new Date().toISOString(),mutationId:crypto.randomUUID()});});caseId=nextId;writeUrlState();writeSnapshot({data:{},version:0,updatedAt:null,updatedAtText:new Date().toISOString()});rememberCurrentCase();connect();sendSnapshot("created");}catch(error){setStatus("Not created",true,error.code||error.message);post({type:"error",error:error.message||"Create patient failed"});}finally{saving=false;}}
function selectCase(nextId){const cleaned=String(nextId||"").replace(/[^A-Za-z0-9_-]/g,"-");if(!cleaned||cleaned===caseId)return;caseId=cleaned;writeUrlState();writeSnapshot({data:{},version:0,updatedAt:null});connect();}
async function saveField(message){if(!currentUser){setStatus("Creating user…",true,"Firestore user is not ready yet");post({type:"error",error:"Firestore user is not ready yet. Retry in a moment."});return;}if(saving)return;saving=true;setStatus("Saving…");try{let result=null;await runTransaction(db,async tx=>{const snap=await tx.get(ref());const current=snap.exists()?cleanSnapshot(snap.data()):{data:{},version:0};if(current.version!==message.version){result={conflict:true,...current};return;}const next={sharedApp:"woyz-stroke",data:{...current.data,[message.key]:message.value},version:current.version+1,createdByUid:snap.data()?.createdByUid||currentUser.uid,updatedByUid:currentUser.uid,episode:caseId,updatedAt:serverTimestamp(),updatedAtText:new Date().toISOString(),mutationId:message.mutationId};tx.set(ref(),next,{merge:true});result={conflict:false,...next,updatedAt:null};});if(result?.conflict){writeSnapshot(result);setStatus("Conflict",true,"Review retained draft");post({type:"conflict",key:message.key,error:"Another device saved changes. Your draft is retained; compare it with the latest value before saving again.",...snapshot});}else{writeSnapshot(result);rememberCurrentCase();setStatus("Synced · v"+snapshot.version);post({type:"saved",key:message.key,...snapshot,caseId,cases:visibleCaseLabels()});}}catch(error){setStatus("Not saved",true,error.code||error.message);post({type:"error",error:error.message||"Save failed"});}finally{saving=false;}}
async function savePatch(patch,mutationId){if(!currentUser){post({type:"voiceRegistrationError",error:"Firestore user is not ready yet. Retry in a moment."});return;}if(saving){post({type:"voiceRegistrationError",error:"Another save is running. Retry in a moment."});return;}saving=true;setStatus("Saving registration…");try{let result=null;await runTransaction(db,async tx=>{const snap=await tx.get(ref());const current=snap.exists()?cleanSnapshot(snap.data()):{data:{},version:0};const next={sharedApp:"woyz-stroke",data:{...current.data,...patch},version:current.version+1,createdByUid:snap.data()?.createdByUid||currentUser.uid,updatedByUid:currentUser.uid,episode:caseId,updatedAt:serverTimestamp(),updatedAtText:new Date().toISOString(),mutationId};tx.set(ref(),next,{merge:true});result={...next,updatedAt:null};});writeSnapshot(result);rememberCurrentCase();setStatus("Synced · v"+snapshot.version);post({type:"voiceRegistrationSaved",patch,...snapshot,caseId,cases:visibleCaseLabels()});}catch(error){setStatus("Registration not saved",true,error.code||error.message);post({type:"voiceRegistrationError",error:error.message||"Registration save failed"});}finally{saving=false;}}
function cleanGeminiText(value){const fence=String.fromCharCode(96)+String.fromCharCode(96)+String.fromCharCode(96);return String(value??"").replace(new RegExp("^"+fence+"(?:json)?","i"),"").replace(new RegExp(fence+"$"),"").trim();}
function fieldValue(value){const text=String(value??"").trim();return text||"NIL";}
const stageGeminiPrompts=[
"Registration: extract patient registration columns. Return all stated demographics and identifiers. Treat UHID, U H I D, hospital number, MRD, medical record number, registration number, episode number, and case number as uhid. Treat phone, mobile, contact number and attendant phone as mobile/contact as appropriate. Capture name, age, sex, mobile, contact person/number, diagnosis, presenting complaint, onset or last-known-well, examination and provisional diagnosis. Use NIL only when not stated.",
"Initial Assessment: extract presentation, onset or last-known-well, mode of arrival, baseline function, symptoms, examination, vitals if stated, vascular risk factors, medications including anticoagulants/antiplatelets, glucose/BP concerns, contraindications mentioned, and initial impression. Use concise clinical prose.",
"Scan: extract imaging workflow and results. Include CT/MRI/CTA/CTP times if stated, ASPECTS, haemorrhage/no haemorrhage, early ischemic change, vessel occlusion site, collaterals, perfusion mismatch/core/penumbra if stated, imaging delays and reasons.",
"NIH Stroke Scale: extract NIHSS score and item deficits if stated. Include consciousness, gaze, visual fields, facial palsy, arm/leg weakness, ataxia, sensory, language, dysarthria, neglect and total score. Use NIL if no NIHSS information.",
"Decision: extract treatment decision reasoning. Include thrombolysis eligibility, thrombectomy eligibility, contraindications, consent, BP/glucose correction, stroke mimic concerns, neurology/interventional discussion, final decision and reasons for no treatment if stated.",
"Checklist: extract thrombolysis checklist items. Include inclusion/exclusion criteria, anticoagulant use, recent surgery/bleed/stroke, BP, glucose, platelet/INR if stated, consent and risk discussion. Use only stated facts.",
"IVT: extract IV thrombolysis treatment details. Include drug, dose, bolus time, infusion time, door-to-needle timing, BP before/after, complications, monitoring instructions, reasons delayed or not given.",
"Thrombectomy: extract EVT/thrombectomy details. Include indication, transfer/cath lab activation, puncture time, passes/device if stated, reperfusion time, TICI grade, complications, anaesthesia, reasons delayed or not performed.",
"Timings: extract all date/time events. Include onset, last-known-well, symptom noticed, ED arrival, code stroke activation, scan arrival/start/finish, first image, IVT bolus, cath lab, puncture, reperfusion, admission/disposition and delay reasons.",
"Inpatient review: extract 24/48 hour and inpatient review details. Include neurological status, repeat imaging, swallow, DVT prophylaxis, antithrombotics/statin, BP/diabetes management, rehab referrals, complications and plan.",
"Discharge: extract discharge diagnosis and treatment summary. Include final diagnosis, etiology/TOAST if stated, hospital course, procedures, medications, secondary prevention, deficits at discharge, mRS/NIHSS if stated, destination and follow-up plan.",
"Follow-up: extract follow-up outcomes. Include clinic date, recurrent events, medication adherence, mRS/functional status, rehab progress, complications, 90-day outcome, death/readmission if stated and ongoing plan."
];
const stageFieldLabels=[
["Name","Age (years)","UHID No.","Mobile No.","Diagnosis","Contact person & number"],
["Stroke onset / wake-up / unknown","Last seen normal","Stroke noted","ED arrival","Code 7 activated","Presenting complaint / examination / allergies","DM / dyslipidaemia / smoking","Alcohol history / obesity / OSA","IHD / AF / HTN","Family history / previous stroke / TIA","NIHSS score / assessor","Baseline function / premorbid mRS","BP / glucose / contraindications","IV access / normal saline / cardiac monitoring","NPO / swallow screen / dysphagia plan","Bladder / catheter need","CBC & platelet count","PT / INR","Blood urea / creatinine / TSH","Serum electrolytes","Viral markers","Troponin I"],
["CT/MRI arrival or start time","First image acquisition","CT/MRI finish time","Plain CT result","ASPECTS","CTA / vessel occlusion","CTP / mismatch / core / penumbra","Collaterals","Imaging delay reason"],
["NIHSS total score","Level of consciousness","Gaze / visual fields","Facial palsy","Arm motor","Leg motor","Ataxia","Sensory","Language","Dysarthria","Neglect"],
["IVT eligibility decision","Thrombectomy eligibility decision","Contraindications","Consent / discussion","BP or glucose correction","Final treatment decision","Reason if no treatment"],
["Inclusion criteria","Exclusion criteria","Anticoagulant / antiplatelet status","Recent surgery / bleed / stroke","BP","Glucose","Platelet / INR","Consent and risk discussion"],
["Drug and dose","Bolus time","Infusion time","Door-to-needle timing","BP before / after","Complications","Monitoring instructions","Delay or not-given reason"],
["Indication","Transfer / cath lab activation","Puncture time","Device / passes","Reperfusion time","TICI grade","Complications","Anaesthesia","Delay or not-performed reason"],
["Stroke onset","Last-known-well","Symptom noticed","ED arrival","Code stroke activation","Scan arrival / start / finish","First image","IVT bolus","Cath lab","Puncture","Reperfusion","Admission / disposition","Delay reasons"],
["Neurological status","Repeat imaging","Swallow","DVT prophylaxis","Antithrombotics / statin","BP / diabetes management","Rehab referrals","Complications","Plan"],
["Final diagnosis","Etiology / TOAST","Hospital course","Procedures","Medications","Secondary prevention","Deficits at discharge","mRS / NIHSS","Destination","Follow-up plan"],
["Clinic date","Recurrent events","Medication adherence","mRS / functional status","Rehab progress","Complications","90-day outcome","Death / readmission","Ongoing plan"]
];
async function generateRegistrationFromAudio(message){
  const apiKey=localStorage.getItem(geminiStoreKey)||"";
  if(!apiKey.trim()){post({type:"voiceRegistrationError",error:"Add Gemini API key in Settings first."});document.getElementById("settingsBtn").click();return;}
  if(!message.audioData){post({type:"voiceRegistrationError",error:"No audio was received from the voice plugin."});return;}
  const stageIndex=Number.isInteger(message.stageIndex)?message.stageIndex:0;
  const stageName=String(message.stageName||"Registration");
  setStatus("Gemini · "+stageName);
  try{
    const kpiMode=message.voiceKind==="kpi";
    const registrationMode=!kpiMode&&stageIndex===0;
    const stageLabels=stageFieldLabels[stageIndex]||[];
    const schema=registrationMode?{type:"object",properties:{name:{type:"string"},uhid:{type:"string"},age:{type:"string"},sex:{type:"string"},mobile:{type:"string"},contact:{type:"string"},diagnosis:{type:"string"},registrationNote:{type:"string"}},required:["name","uhid","age","sex","mobile","contact","diagnosis","registrationNote"]}:kpiMode?{type:"object",properties:{stageNote:{type:"string"}},required:["stageNote"]}:{type:"object",properties:{summary:{type:"string"},fields:{type:"array",items:{type:"object",properties:{label:{type:"string"},value:{type:"string"}},required:["label","value"]}}},required:["summary","fields"]};
    const sectionInstruction=kpiMode?"KPI missing details: extract missing KPI details from the audio. Include the KPI number/name if stated, relevant dates/times, whether achieved/missed/not applicable, reasons for delay or non-applicability, outcomes and evidence source. Use only stated facts.":stageGeminiPrompts[stageIndex]||("Selected section: "+stageName+". Extract the dictated information for this field only.");
    const prompt=registrationMode?"You are WOYZ Stroke registration extraction assistant. Listen to the audio and return strict JSON only for these keys: name, uhid, age, sex, mobile, contact, diagnosis, registrationNote. "+sectionInstruction+" Never invent. Do not leave a stated field in NIL. Do not include markdown or extra keys.":kpiMode?("You are WOYZ Stroke KPI extraction assistant. "+sectionInstruction+" Return strict JSON only with stageNote. Keep it concise and clinically usable."):("You are WOYZ Stroke pathway extraction assistant. Section: "+stageName+". "+sectionInstruction+" The visible form labels for this section are: "+stageLabels.join(" | ")+". Return strict JSON only with summary and fields. fields must contain only labels from this list and short values for information clearly stated in the audio. Do not invent values. Do not return a long narrative inside a field. Put overall narrative only in summary, maximum 60 words. If no matching information is stated, return summary as NIL and fields as an empty array.");
    const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key="+encodeURIComponent(apiKey.trim()),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt},{inline_data:{mime_type:message.mimeType||"audio/webm",data:message.audioData}}]}],generationConfig:{temperature:0,responseMimeType:"application/json",responseSchema:schema}})});
    if(!response.ok)throw new Error("Gemini request failed: "+response.status+" "+await response.text());
    const data=await response.json();
    const text=cleanGeminiText((data.candidates?.[0]?.content?.parts||[]).map(part=>part.text||"").join(""));
    const parsed=JSON.parse(text);
    const patch=registrationMode?{name:fieldValue(parsed.name),uhid:fieldValue(parsed.uhid),age:fieldValue(parsed.age),sex:fieldValue(parsed.sex),mobile:fieldValue(parsed.mobile),contact:fieldValue(parsed.contact),diagnosis:fieldValue(parsed.diagnosis),stage_0:fieldValue(parsed.registrationNote)}:kpiMode?{kpi_missing_details:fieldValue(parsed.stageNote)}:{["stage_"+stageIndex]:JSON.stringify({summary:fieldValue(parsed.summary),fields:Array.isArray(parsed.fields)?parsed.fields.map(item=>({label:fieldValue(item.label),value:fieldValue(item.value)})).filter(item=>item.label!=="NIL"&&item.value!=="NIL"):[]})};
    await savePatch(patch,message.mutationId||crypto.randomUUID());
  }catch(error){setStatus("Gemini failed",true,error.message||String(error));post({type:"voiceRegistrationError",error:error.message||"Gemini registration failed"});}
}
window.addEventListener("message",event=>{if(event.source!==frame.contentWindow||event.data?.channel!=="woyz-case-v1")return;const message=event.data;if(message.type==="ready")sendSnapshot();if(message.type==="save")saveField(message);if(message.type==="createCase")createCase();if(message.type==="selectCase")selectCase(message.caseId);if(message.type==="voiceRegistration")generateRegistrationFromAudio(message);if(message.type==="requestSignOut")signOut(auth);if(message.type==="requestSettings")document.getElementById("settingsBtn").click();if(message.type==="setSelectedDate"){selectedDateISO=String(message.selectedDateISO||selectedDateISO);todayDate.value=selectedDateISO;sendSnapshot();}});
document.getElementById("settingsBtn").addEventListener("click",()=>{caseDocId.value=caseId;workspaceCodeInput.value=defaultWorkspaceId;geminiKeyInput.value=localStorage.getItem(geminiStoreKey)||"";settingsDialog.showModal();});
settingsDialog.addEventListener("close",()=>{if(settingsDialog.returnValue!=="save")return;caseId=cleanId(caseDocId.value.trim(),"ST-024");workspaceId=defaultWorkspaceId;workspaceCodeInput.value=defaultWorkspaceId;writeUrlState();localStorage.setItem(geminiStoreKey,geminiKeyInput.value.trim());connectList();connect();});
document.getElementById("clearGeminiBtn").addEventListener("click",()=>{geminiKeyInput.value="";localStorage.removeItem(geminiStoreKey);});
loginForm.addEventListener("submit",async event=>{event.preventDefault();loginError.textContent="";setStatus("Signing in…");try{await signInWithEmailAndPassword(auth,loginEmail.value.trim(),loginPassword.value);}catch(error){loginError.textContent=error.message||"Sign in failed";setStatus("Sign in failed",true,error.code||error.message);}});
signOutBtn.addEventListener("click",()=>signOut(auth));
responsiveModeQuery.addEventListener("change",syncResponsiveMode);
todayDate.value=selectedDateISO;
todayDate.addEventListener("change",()=>{selectedDateISO=todayDate.value||new Date().toISOString().slice(0,10);sendSnapshot();});
onAuthStateChanged(auth,user=>{currentUser=user;if(user){authScreen.hidden=true;signOutBtn.hidden=false;connectList();connect();renderFrame();return;}authScreen.hidden=false;signOutBtn.hidden=true;if(unsubscribeCase){unsubscribeCase();unsubscribeCase=null;}if(unsubscribeList){unsubscribeList();unsubscribeList=null;}setStatus("Sign in required");sendSnapshot();});
renderFrame();
</script>
</body>
</html>
`;

const adminPage = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>WOYZ Stroke · User Admin</title>
<style>
  :root{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#14231a;background:#f4f7f5}
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;background:#f4f7f5}
  .bar{display:flex;align-items:center;gap:10px;padding:12px 18px;background:#215f51;color:white}
  .bar strong{font-size:18px}
  .bar a,.bar button{border:1px solid rgb(255 255 255 / .28);border-radius:7px;background:rgb(255 255 255 / .94);color:#183b32;padding:7px 11px;font:inherit;font-weight:800;text-decoration:none}
  .bar .spacer{flex:1}
  main{width:min(760px,calc(100% - 32px));margin:28px auto;display:grid;gap:18px}
  section{background:white;border:1px solid #cfe0d5;border-radius:12px;padding:18px;box-shadow:0 16px 40px rgb(0 0 0 / .08)}
  h1,h2{margin:0 0 12px;color:#16372d}
  form{display:grid;gap:12px}
  label{display:grid;gap:6px;color:#52695e;font-size:13px;font-weight:800}
  input,select{width:100%;border:1px solid #cfe0d5;border-radius:8px;padding:11px 12px;font:inherit;color:#14231a;background:white}
  button.primary{border:0;border-radius:8px;background:#0f8a5f;color:white;padding:12px 14px;font:inherit;font-weight:900}
  .row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .status{min-height:20px;font-weight:800;color:#52695e}
  .error{color:#b42318}
  .ok{color:#0f8a5f}
  table{width:100%;border-collapse:collapse;font-size:14px}
  th,td{text-align:left;border-bottom:1px solid #dce8df;padding:9px 6px}
  @media(max-width:640px){.row{grid-template-columns:1fr}.bar{flex-wrap:wrap}}
</style>
</head>
<body>
<div class="bar">
  <strong>WOYZ Stroke · User Admin</strong>
  <span id="adminStatus">Sign in required</span>
  <span class="spacer"></span>
  <a href="index.html">Open app</a>
  <button id="signOutBtn" type="button" hidden>Sign out</button>
</div>
<main>
  <section id="loginPanel">
    <h1>Admin sign in</h1>
    <form id="loginForm">
      <label>Email <input id="loginEmail" type="email" autocomplete="username" required></label>
      <label>Password <input id="loginPassword" type="password" autocomplete="current-password" required></label>
      <button class="primary" type="submit">Sign in</button>
      <div id="loginMessage" class="status error"></div>
    </form>
  </section>
  <section id="createPanel" hidden>
    <h2>Create user</h2>
    <form id="createForm">
      <div class="row">
        <label>Email <input id="newEmail" type="email" autocomplete="off" required></label>
        <label>Password <input id="newPassword" type="password" minlength="6" autocomplete="new-password" required></label>
      </div>
      <label>Name <input id="newName" autocomplete="off" placeholder="Optional"></label>
      <button class="primary" type="submit">Create Firebase user</button>
      <div id="createMessage" class="status"></div>
    </form>
  </section>
  <section id="usersPanel" hidden>
    <h2>Access model</h2>
    <p style="margin:0;color:#52695e;line-height:1.5">Users are created in Firebase Authentication. Any signed-in user can access the shared stroke cases in this prototype.</p>
  </section>
</main>
<script type="module">
import {initializeApp} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut,createUserWithEmailAndPassword} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const firebaseConfig={projectId:"minutes-woyz-3",appId:"1:25423577451:web:a98bbfd85be9a804d34c2e",storageBucket:"minutes-woyz-3.firebasestorage.app",apiKey:"AIzaSyCHZTh_chvcWJqX97b2rfvTVevLQhPVmBY",authDomain:"minutes-woyz-3.firebaseapp.com",messagingSenderId:"25423577451"};
const app=initializeApp(firebaseConfig);
const auth=getAuth(app);
let secondaryAuth=null;
const adminUids=new Set(["sigghUtd6RTdgEEghn5bH0I1Zq72"]);
const adminStatus=document.getElementById("adminStatus");
const loginPanel=document.getElementById("loginPanel");
const createPanel=document.getElementById("createPanel");
const usersPanel=document.getElementById("usersPanel");
const createMessage=document.getElementById("createMessage");
const loginMessage=document.getElementById("loginMessage");
const signOutBtn=document.getElementById("signOutBtn");

function esc(value){return String(value??"").replace(/[&<>"']/g,match=>({"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;","'":"&#39;"}[match]));}
function setCreateMessage(text,ok=false){createMessage.textContent=text;createMessage.className=ok?"status ok":"status error";}

document.getElementById("loginForm").addEventListener("submit",async event=>{event.preventDefault();loginMessage.textContent="";try{await signInWithEmailAndPassword(auth,document.getElementById("loginEmail").value.trim(),document.getElementById("loginPassword").value);}catch(error){loginMessage.textContent=error.message||"Sign in failed";}});
signOutBtn.addEventListener("click",()=>signOut(auth));
document.getElementById("createForm").addEventListener("submit",async event=>{
  event.preventDefault();
  if(!auth.currentUser||!adminUids.has(auth.currentUser.uid)){setCreateMessage("This account is not allowed to create users.");return;}
  setCreateMessage("Creating user…",true);
  try{
    if(!secondaryAuth){
      const secondaryApp=initializeApp(firebaseConfig,"user-create-"+Date.now());
      secondaryAuth=getAuth(secondaryApp);
    }
    const email=document.getElementById("newEmail").value.trim();
    const password=document.getElementById("newPassword").value;
    const name=document.getElementById("newName").value.trim();
    const credential=await createUserWithEmailAndPassword(secondaryAuth,email,password);
    await signOut(secondaryAuth);
    event.target.reset();
    setCreateMessage("Created "+email+(name?" ("+name+")":""),true);
  }catch(error){
    setCreateMessage(error.message||"Could not create user");
  }
});

onAuthStateChanged(auth,user=>{
  if(!user){
    adminStatus.textContent="Sign in required";
    loginPanel.hidden=false;createPanel.hidden=true;usersPanel.hidden=true;signOutBtn.hidden=true;
    return;
  }
  const allowed=adminUids.has(user.uid);
  adminStatus.textContent=allowed?(user.email||"Signed in"):"Not authorized";
  loginPanel.hidden=true;createPanel.hidden=!allowed;usersPanel.hidden=false;signOutBtn.hidden=false;
  if(!allowed)usersPanel.querySelector("p").textContent="Signed in, but this account is not configured as a WOYZ user administrator.";
});
</script>
</body>
</html>
`;

fs.writeFileSync("index.html", page);
fs.writeFileSync("admin.html", adminPage);
console.log(`Wrote index.html and admin.html with ${standaloneMobileDocument.length} mobile chars and ${standaloneDesktopDocument.length} desktop chars.`);

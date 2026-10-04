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

const standaloneMobileDocument = standaloneDocument(mobileDocument);
const standaloneDesktopDocument = standaloneDocument(desktopDocument);

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
  .bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 18px;background:#215f51;color:white}
  .bar strong{font-weight:800}
  .bar button,.bar a{border:0;border-radius:7px;background:white;color:#183b32;padding:7px 12px;font-weight:750;text-decoration:none}
  .bar button.active{background:#0f8a5f;color:white;box-shadow:inset 0 0 0 1px rgb(255 255 255 / .36)}
  .bar .spacer{flex:1 1 auto}
  .bar .settings{width:38px;padding:7px 0}
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
  @media(max-width:720px){.bar{padding:8px 10px}.notice{padding:7px 10px}iframe{height:calc(100vh - 112px)}}
</style>
</head>
<body>
<div class="shell">
  <div class="bar">
    <strong id="caseTitle">WOYZ · Shared case ST-024</strong>
    <button id="mobileBtn" class="active" type="button">Mobile</button>
    <button id="desktopBtn" type="button">Desktop / Admin</button>
    <span id="status" class="status" role="status">Local draft</span>
    <span class="spacer"></span>
    <button id="authBtn" type="button">Sign in</button>
    <button id="settingsBtn" class="settings" type="button" aria-label="Settings">⚙</button>
    <a href="https://github.com/drgigy/Stroke-Pathway-using-WOYZ">GitHub</a>
  </div>
  <div class="notice">
    <span>Private prototype · Saved fields sync across devices in this account. Recording remains simulated; verify clinical entries before use.</span>
    <span id="syncNote"></span>
  </div>
  <iframe id="workspaceFrame" title="mobile stroke workspace" sandbox="allow-scripts" referrerpolicy="no-referrer"></iframe>
</div>
<dialog id="settingsDialog">
  <form method="dialog" class="settings-panel">
    <header>
      <h2>Settings</h2>
      <button value="cancel" type="submit" aria-label="Close">×</button>
    </header>
    <label>Firestore document ID
      <input id="caseDocId" value="ST-024" autocomplete="off">
    </label>
    <label>Gemini API key
      <input id="geminiKey" type="password" autocomplete="off" placeholder="Optional for later transcription work">
    </label>
    <p style="margin:0;color:#52695e;font-size:13px;line-height:1.4">Firestore project: <strong>minutes-woyz-3</strong>. Data is stored in owner-scoped <code>strokeCases</code> documents.</p>
    <menu>
      <button id="clearGeminiBtn" type="button">Clear key</button>
      <button class="primary" value="save" type="submit">Done</button>
    </menu>
  </form>
</dialog>
<script type="module">
import {initializeApp} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {getAuth,GoogleAuthProvider,onAuthStateChanged,signInWithPopup,signOut} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {getFirestore,doc,onSnapshot,runTransaction,serverTimestamp} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const mobileDocument=${scriptString(standaloneMobileDocument)};
const desktopDocument=${scriptString(standaloneDesktopDocument)};
const firebaseConfig={projectId:"minutes-woyz-3",appId:"1:25423577451:web:a98bbfd85be9a804d34c2e",storageBucket:"minutes-woyz-3.firebasestorage.app",apiKey:"AIzaSyCHZTh_chvcWJqX97b2rfvTVevLQhPVmBY",authDomain:"minutes-woyz-3.firebaseapp.com",messagingSenderId:"25423577451"};
const app=initializeApp(firebaseConfig);
const auth=getAuth(app);
const provider=new GoogleAuthProvider();
const db=getFirestore(app);
const frame=document.getElementById("workspaceFrame");
const statusEl=document.getElementById("status");
const syncNote=document.getElementById("syncNote");
const authBtn=document.getElementById("authBtn");
const mobileBtn=document.getElementById("mobileBtn");
const desktopBtn=document.getElementById("desktopBtn");
const settingsDialog=document.getElementById("settingsDialog");
const caseDocId=document.getElementById("caseDocId");
const geminiKeyInput=document.getElementById("geminiKey");
const localStoreKey="woyz-stroke-v3-local-snapshot";
const caseIdKey="woyz-stroke-v3-case-id";
const geminiStoreKey="woyz-stroke-gemini-key";
let mode=location.pathname.endsWith("/admin")||location.hash==="#admin"?"desktop":"mobile";
let caseId=localStorage.getItem(caseIdKey)||"ST-024";
let currentUser=null;
let unsubscribe=null;
let snapshot=readLocal();
let saving=false;

function nowText(){return new Date().toLocaleTimeString();}
function ref(){return doc(db,"strokeCases",caseId);}
function cleanSnapshot(raw){return {data:{...(raw?.data||{})},version:Number(raw?.version||0),updatedAt:raw?.updatedAt||null,updatedAtText:raw?.updatedAtText||null};}
function readLocal(){try{return cleanSnapshot(JSON.parse(localStorage.getItem(localStoreKey)||"{}"));}catch{return {data:{},version:0,updatedAt:null};}}
function writeLocal(next){snapshot=cleanSnapshot(next);localStorage.setItem(localStoreKey,JSON.stringify(snapshot));}
function setStatus(text,isError=false){statusEl.textContent=text;statusEl.style.color="inherit";syncNote.textContent=isError?"Local draft retained":"";syncNote.className=isError?"error":"";}
function post(message){frame.contentWindow?.postMessage({channel:"woyz-case-v1",...message},"*");}
function sendSnapshot(type="snapshot",extra={}){post({type,...snapshot,...extra});}
function renderFrame(){frame.srcdoc=mode==="desktop"?desktopDocument:mobileDocument;frame.title=mode==="desktop"?"desktop stroke workspace":"mobile stroke workspace";mobileBtn.classList.toggle("active",mode==="mobile");desktopBtn.classList.toggle("active",mode==="desktop");}
function switchMode(next){if(next===mode)return;if(!confirm("Switch views? Save any open draft first. Unsaved text will be discarded."))return;mode=next;history.replaceState(null,"",next==="desktop"?"#admin":"#mobile");renderFrame();setTimeout(()=>sendSnapshot(),150);}
function connect(){if(unsubscribe){unsubscribe();unsubscribe=null;}document.getElementById("caseTitle").textContent="WOYZ · Shared case "+caseId;if(!currentUser){setStatus("Local draft");sendSnapshot();return;}setStatus("Connecting…");unsubscribe=onSnapshot(ref(),docSnap=>{if(docSnap.exists()){writeLocal(docSnap.data());setStatus(snapshot.version?"Synced · v"+snapshot.version:"Shared case ready");}else{writeLocal({data:{},version:0,updatedAt:null});setStatus("Shared case ready");}sendSnapshot();},error=>{setStatus("Firestore unavailable: "+(error.code||error.message),true);sendSnapshot();});}
async function saveField(message){if(!currentUser){setStatus("Local draft",true);post({type:"error",error:"Sign in required before saving to Firestore"});return;}if(saving)return;saving=true;setStatus("Saving…");try{let result=null;await runTransaction(db,async tx=>{const snap=await tx.get(ref());const current=snap.exists()?cleanSnapshot(snap.data()):{data:{},version:0};if(current.version!==message.version){result={conflict:true,...current};return;}const next={data:{...current.data,[message.key]:message.value},version:current.version+1,ownerUid:currentUser.uid,episode:caseId,updatedAt:serverTimestamp(),updatedAtText:new Date().toISOString(),mutationId:message.mutationId};tx.set(ref(),next,{merge:true});result={conflict:false,...next,updatedAt:null};});if(result?.conflict){writeLocal(result);setStatus("Conflict",true);post({type:"conflict",key:message.key,error:"Another device saved changes. Your draft is retained; compare it with the latest value before saving again.",...snapshot});}else{writeLocal(result);setStatus("Synced · v"+snapshot.version);post({type:"saved",key:message.key,...snapshot});}}catch(error){setStatus("Not saved",true);post({type:"error",error:error.message||"Save failed"});}finally{saving=false;}}
window.addEventListener("message",event=>{if(event.source!==frame.contentWindow||event.data?.channel!=="woyz-case-v1")return;const message=event.data;if(message.type==="ready")sendSnapshot();if(message.type==="save")saveField(message);});
mobileBtn.addEventListener("click",()=>switchMode("mobile"));
desktopBtn.addEventListener("click",()=>switchMode("desktop"));
authBtn.addEventListener("click",()=>currentUser?signOut(auth):signInWithPopup(auth,provider));
document.getElementById("settingsBtn").addEventListener("click",()=>{caseDocId.value=caseId;geminiKeyInput.value=localStorage.getItem(geminiStoreKey)||"";settingsDialog.showModal();});
settingsDialog.addEventListener("close",()=>{if(settingsDialog.returnValue!=="save")return;caseId=(caseDocId.value.trim()||"ST-024").replace(/[^A-Za-z0-9_-]/g,"-");localStorage.setItem(caseIdKey,caseId);localStorage.setItem(geminiStoreKey,geminiKeyInput.value.trim());connect();});
document.getElementById("clearGeminiBtn").addEventListener("click",()=>{geminiKeyInput.value="";localStorage.removeItem(geminiStoreKey);});
onAuthStateChanged(auth,user=>{currentUser=user;authBtn.textContent=user?"Sign out":"Sign in";connect();});
renderFrame();
</script>
</body>
</html>
`;

fs.writeFileSync("index.html", page);
console.log(`Wrote index.html with ${standaloneMobileDocument.length} mobile chars and ${standaloneDesktopDocument.length} desktop chars.`);

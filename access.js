// Compatibility for older cached shells. Device approval has been retired.
import { mountDashboardAccess } from './dashboard-access.js';
import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
export function mountDeviceAccess({auth,db,onAccess}) {
 const screen=document.getElementById('loginScreen');
 screen.innerHTML='<form class="login-card" id="loginForm"><h1>Rajagiri Stroke Code</h1><h2>Sign in</h2><p>Use your approved account. Your sign-in is remembered on this browser.</p><label for="loginEmail">Email address</label><input id="loginEmail" type="email" autocomplete="username" required><label for="loginPassword">Password</label><input id="loginPassword" type="password" autocomplete="current-password" required><button type="submit" id="loginSubmit" class="primary-cta">Sign in</button><p id="loginError" role="alert"></p></form>';
 const form=screen.querySelector('form'),button=screen.querySelector('button'),error=screen.querySelector('#loginError');
 form.addEventListener('submit',async event=>{event.preventDefault();button.disabled=true;error.textContent='';try{await signInWithEmailAndPassword(auth,screen.querySelector('#loginEmail').value.trim(),screen.querySelector('#loginPassword').value);screen.querySelector('#loginPassword').value='';}catch{error.textContent='Unable to sign in. Check your email and password.';}finally{button.disabled=false;}});
 mountDashboardAccess({auth,db,onAccess,onLocked:message=>onAccess(null,{accessLockReason:message})});
}
// Older master-admin shells may still import this symbol; no device panel is shown.
export function mountDeviceManager() {}

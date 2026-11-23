import { isMasterAdmin } from './roles.js';
import { onAuthStateChanged, signInAnonymously, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { collection, doc, getDocFromServer, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

export function mountDeviceAccess({ auth, db, onAccess }) {
  const screen = document.getElementById('loginScreen');
  screen.innerHTML = `<div class="login-card">
    <div class="login-brand">WOYZ Stroke</div>
    <form id="deviceForm"><h1 class="login-title">Device access</h1>
    <label class="login-label" for="deviceName">Name</label><input class="login-input" id="deviceName" required maxlength="100" autocomplete="name">
    <label class="login-label" for="deviceDepartment">Department</label><input class="login-input" id="deviceDepartment" required maxlength="100">
    <label class="login-label" for="deviceLabel">Device label (optional)</label><input class="login-input" id="deviceLabel" maxlength="100">
    <button class="btn login-submit" type="submit">Request access</button></form>
    <p id="deviceCode" class="device-code"></p><p id="deviceStatus" role="status">Connecting...</p>
    <details class="account-login" id="accountLogin"><summary>User sign in</summary>
      <form id="accountForm"><label class="login-label" for="accountEmail">Email</label><input class="login-input" id="accountEmail" type="email" autocomplete="username" required>
      <label class="login-label" for="accountPassword">Password</label><input class="login-input" id="accountPassword" type="password" autocomplete="current-password" required>
      <button class="btn login-submit" type="submit">Sign in</button><button class="btn" type="button" id="useDeviceAccess">Use device access</button></form>
    </details><p><a href="./index.html">Admin case page</a></p>
  </div>`;
  const form = document.getElementById('deviceForm');
  const fields = ['deviceName', 'deviceDepartment', 'deviceLabel'].map(id => document.getElementById(id));
  const status = document.getElementById('deviceStatus');
  const code = document.getElementById('deviceCode');
  const submit = form.querySelector('button');
  submit.disabled = true;
  let unsubscribe, user, accessRecord, generation = 0;
  let approved = false;
  const lock = message => {
    approved = false;
    onAccess(null);
    screen.classList.remove('hidden');
    status.textContent = message;
  };
  const display = record => {
    accessRecord = record;
    code.textContent = record?.deviceCode || '';
    if (record) fields.forEach((field, i) => { if (document.activeElement !== field) field.value = record[['name', 'department', 'deviceLabel'][i]] || ''; });
    const state = record?.status;
    submit.disabled = state === 'blocked';
    submit.textContent = record ? 'Update request details' : 'Request access';
    status.textContent = state === 'blocked' ? 'Access blocked. Contact your administrator.' : state === 'pending' ? 'Awaiting approval. Share this device code with your administrator.' : 'Enter your details to request access.';
  };
  const accountPanel = document.getElementById('accountLogin');
  const accountForm = document.getElementById('accountForm');
  accountForm.addEventListener('submit', async event => {
    event.preventDefault(); const button = accountForm.querySelector('button'); button.disabled = true;
    try {
      await signInWithEmailAndPassword(auth, document.getElementById('accountEmail').value.trim(), document.getElementById('accountPassword').value);
      document.getElementById('accountPassword').value = '';
    } catch { status.textContent = 'Unable to sign in. Check the email and password.'; }
    finally { button.disabled = false; }
  });
  document.getElementById('useDeviceAccess').addEventListener('click', () => signOut(auth));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!user) return;
    submit.disabled = true;
    try {
      const details = { name: fields[0].value.trim(), department: fields[1].value.trim(), deviceLabel: fields[2].value.trim(), lastSeenAt: serverTimestamp() };
      if (!details.name || !details.department) throw new Error('Enter your name and department.');
      const ref = doc(db, 'deviceApprovals', user.uid);
      if (accessRecord) await updateDoc(ref, details);
      else {
        const random = crypto.getRandomValues(new Uint8Array(4));
        const deviceCode = 'WOYZ-' + [...random].map(n => n.toString(16).padStart(2, '0')).join('').toUpperCase();
        await setDoc(ref, { ...details, deviceCode, status: 'pending', createdAt: serverTimestamp() });
      }
    } catch (error) { status.textContent = error.message || 'Unable to request access.'; }
    finally { submit.disabled = accessRecord?.status === 'blocked'; }
  });
  async function verifyUser(nextUser) {
    const current = ++generation;
    unsubscribe?.(); unsubscribe = null; user = nextUser; accessRecord = null;
    submit.disabled = true; form.hidden = false; lock('Connecting...');
    if (!nextUser) {
      try { await signInAnonymously(auth); }
      catch { status.textContent = 'Unable to connect. Reconnect and try again.'; }
      return;
    }
    try {
      const token = await nextUser.getIdTokenResult(true);
      if (current !== generation) return;
      const accountDetails = { name: nextUser.email || 'User', department: '', deviceLabel: 'Account sign in' };
      if (isMasterAdmin(nextUser, token)) {
        approved = true; screen.classList.add('hidden'); onAccess(nextUser, accountDetails); return;
      }
      if (token.claims.firebase?.sign_in_provider === 'password') {
        form.hidden = true; accountPanel.open = true; code.textContent = '';
        document.getElementById('accountEmail').value = nextUser.email || '';
        const ref = doc(db, 'dashboardApprovals', nextUser.uid);
        const initial = await getDocFromServer(ref);
        if (current !== generation) return;
        if (!initial.exists()) {
          try { await setDoc(ref, { email: nextUser.email, status: 'pending', createdAt: serverTimestamp() }); }
          catch (error) { if (!(await getDocFromServer(ref)).exists()) throw error; }
        }
        if (current !== generation) return;
        status.textContent = 'Awaiting approval. Ask drgigy to approve your user in Master admin.';
        unsubscribe = onSnapshot(ref, { includeMetadataChanges: true }, snapshot => {
          if (current !== generation) return;
          if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) { if (!approved) status.textContent = 'Waiting for server confirmation...'; return; }
          if (snapshot.data()?.status === 'approved') {
            if (!approved) { approved = true; screen.classList.add('hidden'); onAccess(nextUser, accountDetails); }
          } else lock(snapshot.data()?.status === 'blocked' ? 'User access revoked. Contact drgigy.' : 'Awaiting approval. Ask drgigy to approve your user in Master admin.');
        }, () => lock('User access could not be verified. Reconnect and try again.'));
        return;
      }
      unsubscribe = onSnapshot(doc(db, 'deviceApprovals', nextUser.uid), { includeMetadataChanges: true }, snapshot => {
        if (current !== generation) return;
        if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) { if (!approved) status.textContent = 'Waiting for server confirmation...'; return; }
        display(snapshot.data());
        if (accessRecord?.status === 'approved') {
          if (!approved) {
            approved = true; screen.classList.add('hidden'); onAccess(nextUser, accessRecord);
            updateDoc(snapshot.ref, { lastSeenAt: serverTimestamp() }).catch(() => {});
          }
        } else lock(status.textContent);
      }, () => lock('Access could not be verified. Reconnect and try again.'));
    } catch { if (current === generation) lock('Access could not be verified. Reconnect and try again.'); }
  }
  onAuthStateChanged(auth, verifyUser);
  window.addEventListener('offline', () => { ++generation; unsubscribe?.(); unsubscribe = null; lock('Offline. Reconnect to verify access.'); });
  window.addEventListener('online', () => verifyUser(auth.currentUser));

}

export function mountDeviceManager({ auth, db, host }) {
  let unsubscribe;
  let filter = 'pending';
  const dialog = document.createElement('dialog');
  dialog.className = 'device-dialog';
  dialog.innerHTML = `<header><h2>Device access</h2><button class="btn" data-close aria-label="Close device access">Close</button></header>
    <nav aria-label="Device status"><button class="btn" data-filter="pending">Pending</button><button class="btn" data-filter="approved">Approved</button><button class="btn" data-filter="blocked">Blocked</button></nav>
    <p role="status" id="deviceManagerStatus"></p><div id="deviceList"></div>`;
  document.body.append(dialog);
  const button = document.createElement('button');
  button.className = 'btn'; button.textContent = 'Devices'; button.id = 'devicesBtn';
  if (host) host.append(button);
  else document.getElementById('adminSettingsBtn').parentElement.before(button);
  const list = dialog.querySelector('#deviceList');
  const status = dialog.querySelector('#deviceManagerStatus');
  let devices = [];
  const render = () => {
    list.replaceChildren();
    const visible = devices.filter(d => d.status === filter).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    status.textContent = `${visible.length} ${filter} device${visible.length === 1 ? '' : 's'}`;
    dialog.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === filter)));
    for (const device of visible) {
      const row = document.createElement('section'); row.className = 'device-row';
      const title = document.createElement('strong'); title.textContent = device.name;
      const detail = document.createElement('p'); detail.textContent = `${device.department} · ${device.deviceLabel || 'Unlabelled device'} · ${device.deviceCode}`;
      const actions = document.createElement('div'); actions.className = 'device-actions';
      for (const [label, value] of device.status === 'blocked' ? [['Unblock', 'pending']] : device.status === 'pending' ? [['Approve', 'approved'], ['Block', 'blocked']] : [['Revoke', 'blocked']]) {
        const control = document.createElement('button'); control.className = 'btn'; control.textContent = label; control.dataset.action = value;
        control.addEventListener('click', async () => {
          control.disabled = true;
          try { await updateDoc(doc(db, 'deviceApprovals', device.id), { status: value, reviewedBy: auth.currentUser.uid, reviewedAt: serverTimestamp() }); }
          catch (error) { status.textContent = `Unable to update access: ${error.message}`; control.disabled = false; }
        });
        actions.append(control);
      }
      row.append(title, detail, actions); list.append(row);
    }
  };
  button.addEventListener('click', () => {
    dialog.showModal();
    unsubscribe?.();
    unsubscribe = onSnapshot(collection(db, 'deviceApprovals'), snapshot => { devices = snapshot.docs.map(d => ({ ...d.data(), id: d.id })); render(); }, error => { status.textContent = error.message; });
  });
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.querySelectorAll('[data-filter]').forEach(b => b.addEventListener('click', () => { filter = b.dataset.filter; render(); }));
  dialog.addEventListener('close', () => unsubscribe?.());
  onAuthStateChanged(auth, () => { unsubscribe?.(); if (dialog.open) dialog.close(); list.replaceChildren(); devices = []; });
}

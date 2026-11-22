import { onAuthStateChanged, signInAnonymously, signOut } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { collection, doc, getDocFromServer, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

export function mountDeviceAccess({ auth, db, onAccess }) {
  const screen = document.getElementById('loginScreen');
  screen.innerHTML = `<form class="login-card" id="deviceForm">
    <div class="login-brand">WOYZ Notes</div><h1 class="login-title">Device access</h1>
    <label class="login-label" for="deviceName">Name</label><input class="login-input" id="deviceName" required maxlength="100" autocomplete="name">
    <label class="login-label" for="deviceDepartment">Department</label><input class="login-input" id="deviceDepartment" required maxlength="100">
    <label class="login-label" for="deviceLabel">Device label (optional)</label><input class="login-input" id="deviceLabel" maxlength="100">
    <button class="btn login-submit" type="submit">Request access</button>
    <p id="deviceCode" class="device-code"></p><p id="deviceStatus" role="status">Connecting...</p>
    <a href="./index.html">Administrator sign in</a>
  </form>`;
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
  onAuthStateChanged(auth, async nextUser => {
    const current = ++generation;
    unsubscribe?.();
    user = nextUser;
    accessRecord = null;
    submit.disabled = true;
    lock('Connecting...');
    if (!nextUser) {
      try { await signInAnonymously(auth); }
      catch (error) { status.textContent = `Unable to connect: ${error.message}`; }
      return;
    }
    unsubscribe = onSnapshot(doc(db, 'deviceApprovals', nextUser.uid), { includeMetadataChanges: true }, snapshot => {
      if (current !== generation) return;
      if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) { if (!approved) status.textContent = 'Waiting for server confirmation...'; return; }
      display(snapshot.data());
      if (accessRecord?.status === 'approved') {
        if (!approved) {
          approved = true;
          screen.classList.add('hidden');
          onAccess(nextUser, accessRecord);
          updateDoc(snapshot.ref, { lastSeenAt: serverTimestamp() }).catch(() => {});
        }
      } else lock(status.textContent);
    }, () => lock('Access could not be verified. Reconnect and try again.'));
  });
  window.addEventListener('offline', () => lock('Offline. Reconnect to verify device access.'));
  window.addEventListener('online', async () => {
    if (!user) return;
    try {
      const snapshot = await getDocFromServer(doc(db, 'deviceApprovals', user.uid));
      if (snapshot.data()?.status === 'approved' && !approved) {
        approved = true;
        screen.classList.add('hidden');
        onAccess(user, snapshot.data());
      }
    } catch { lock('Access could not be verified.'); }
  });
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
        const control = document.createElement('button'); control.className = 'btn'; control.textContent = label;
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

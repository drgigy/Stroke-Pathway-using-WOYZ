import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { collection, doc, getDocFromServer, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

// Never open clinical subscriptions based on sign-in or cached approval alone.
export function mountDashboardAccess({ auth, db, onAccess, onLocked }) {
  let generation = 0, unsubscribe, user, granted = false;
  const lock = message => { granted = false; onLocked(message); };
  const stop = () => { unsubscribe?.(); unsubscribe = null; };
  async function verify(nextUser) {
    const current = ++generation;
    stop();
    user = nextUser;
    lock('');
    if (!user) return;
    try {
      const token = await user.getIdTokenResult(true);
      if (current !== generation) return;
      if (token.claims.admin === true) { granted = true; onAccess(user); return; }
      if (token.claims.firebase?.sign_in_provider !== 'password') {
        lock('Sign in with your dashboard email and password.'); return;
      }
      const ref = doc(db, 'dashboardApprovals', user.uid);
      const snapshot = await getDocFromServer(ref);
      if (current !== generation) return;
      if (!snapshot.exists()) {
        try { await setDoc(ref, { email: user.email, status: 'pending', createdAt: serverTimestamp() }); }
        catch (error) {
          // Another tab may have submitted the same request; never overwrite it.
          if (!(await getDocFromServer(ref)).exists()) throw error;
        }
      }
      if (current !== generation) return;
      lock('Awaiting administrator approval. Your dashboard request has been submitted.');
      unsubscribe = onSnapshot(ref, { includeMetadataChanges: true }, result => {
        if (current !== generation) return;
        if (result.metadata.fromCache || result.metadata.hasPendingWrites) {
          lock('Waiting for server confirmation of dashboard access.'); return;
        }
        const status = result.data()?.status;
        if (status === 'approved') {
          if (!granted) { granted = true; onAccess(nextUser); }
        } else lock(status === 'blocked'
          ? 'Dashboard access has been revoked. Contact your administrator.'
          : 'Awaiting administrator approval. Your dashboard request has been submitted.');
      }, () => lock('Dashboard access could not be verified. Reconnect and try again.'));
    } catch { if (current === generation) lock('Dashboard access could not be verified. Reconnect and try again.'); }
  }
  onAuthStateChanged(auth, verify);
  window.addEventListener('offline', () => { ++generation; stop(); lock('Offline. Reconnect to verify dashboard access.'); });
  window.addEventListener('online', () => verify(auth.currentUser));
}

export function mountDashboardManager({ auth, db }) {
  let unsubscribe, records = [], filter = 'pending';
  const dialog = document.createElement('dialog');
  dialog.className = 'device-dialog';
  dialog.innerHTML = `<header><h2>Dashboard users</h2><button class="btn" data-close>Close</button></header>
    <p>Users appear here after signing in to the dashboard. Only approved users can access shared cases.</p>
    <nav aria-label="Dashboard approval status"><button class="btn" data-filter="pending">Pending</button><button class="btn" data-filter="approved">Approved</button><button class="btn" data-filter="blocked">Blocked</button></nav>
    <p role="status" data-status></p><div data-users></div>`;
  document.body.append(dialog);
  const button = document.createElement('button');
  button.className = 'btn'; button.id = 'dashboardUsersBtn'; button.textContent = 'Dashboard users';
  document.querySelector('.sidebar').append(button);
  const status = dialog.querySelector('[data-status]'), list = dialog.querySelector('[data-users]');
  function render() {
    list.replaceChildren();
    const visible = records.filter(record => record.status === filter).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    status.textContent = `${visible.length} ${filter} user${visible.length === 1 ? '' : 's'}`;
    dialog.querySelectorAll('[data-filter]').forEach(control => control.setAttribute('aria-pressed', String(control.dataset.filter === filter)));
    for (const record of visible) {
      const row = document.createElement('section'); row.className = 'device-row';
      const email = document.createElement('strong'); email.textContent = record.email;
      const actions = document.createElement('div'); actions.className = 'device-actions';
      const choices = record.status === 'pending' ? [['Approve', 'approved'], ['Block', 'blocked']]
        : record.status === 'approved' ? [['Revoke', 'blocked']] : [['Return to pending', 'pending']];
      for (const [label, value] of choices) {
        const control = document.createElement('button'); control.className = 'btn'; control.textContent = label;
        control.addEventListener('click', async () => {
          actions.querySelectorAll('button').forEach(button => { button.disabled = true; });
          try {
            await updateDoc(doc(db, 'dashboardApprovals', record.id), { status: value, reviewedBy: auth.currentUser.uid, reviewedAt: serverTimestamp() });
          } catch { status.textContent = 'Unable to update dashboard approval. Try again.'; actions.querySelectorAll('button').forEach(button => { button.disabled = false; }); }
        });
        actions.append(control);
      }
      row.append(email, actions); list.append(row);
    }
  }
  button.addEventListener('click', () => {
    dialog.showModal(); unsubscribe?.(); list.replaceChildren(); status.textContent = 'Loading dashboard users...';
    unsubscribe = onSnapshot(collection(db, 'dashboardApprovals'), snapshot => {
      records = snapshot.docs.map(result => ({ ...result.data(), id: result.id })); render();
    }, () => { list.replaceChildren(); status.textContent = 'Unable to load dashboard users.'; });
  });
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.querySelectorAll('[data-filter]').forEach(control => control.addEventListener('click', () => { filter = control.dataset.filter; render(); }));
  dialog.addEventListener('close', () => { unsubscribe?.(); unsubscribe = null; records = []; list.replaceChildren(); });
  onAuthStateChanged(auth, () => { if (dialog.open) dialog.close(); });
}

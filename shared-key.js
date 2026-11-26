import { isMasterAdmin } from './roles.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { doc, getDocFromServer, onSnapshot, serverTimestamp, setDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const KEY = 'stroke_notes_gemini_key', MANAGED = 'stroke_notes_managed_key';
let configured = false, config, generation = 0, stopApproval, stopKey;
let keyGeneration = 0;
let approved = false, admin = false, currentUid = '', managedKey = '', settled = false;
const waiting = new Set();
let adminForm, statusElement;
const read = name => { try { return localStorage.getItem(name); } catch { return null; } };
const remove = name => { try { localStorage.removeItem(name); } catch {} };
function clearManaged() {
  managedKey = '';
  if (read(MANAGED)) { remove(KEY); remove(MANAGED); }
}
function notify(message, state = '') {
  if (statusElement) {
    statusElement.dataset.state = state;
    const management = statusElement.parentElement?.hasAttribute('data-key-management');
    statusElement.textContent = management && state === 'unconfigured' ? 'No shared key configured' : management && state === 'ready' ? 'Shared key is active' : message;
  }
  window.dispatchEvent(new Event('woyz-key-status'));
}
function resolveReady() { settled = true; for (const resolve of waiting) resolve(); waiting.clear(); }
function lock(message = 'Sign in with an approved account to enable dictation.') {
  approved = false; ++keyGeneration; clearManaged(); stopKey?.(); stopKey = null;
  notify(message); resolveReady();
}
function stop() { ++keyGeneration; stopApproval?.(); stopKey?.(); stopApproval = stopKey = null; }
function installAdminForm() {
  const menu = document.getElementById('adminSettingsMenu');
  if (!menu?.hasAttribute('data-key-management') || adminForm) return;
  adminForm = document.createElement('form'); adminForm.className = 'protocol-key-form shared-key-form';
  adminForm.innerHTML = '<label>Gemini API key<input type="password" autocomplete="new-password" aria-label="Shared Gemini key" maxlength="256" placeholder="Paste your Gemini API key"></label><button type="submit" class="btn">Save shared key</button><div class="shared-key-actions"><button type="button" class="btn" data-use-local title="Use the key already saved in this browser">Use saved key</button><button type="button" class="btn" data-disable>Disable key</button></div><p>Approved accounts receive key updates automatically. The key is stored locally on their devices.</p><span role="status"></span>';
  adminForm.addEventListener('click', event => event.stopPropagation());
  async function save(value, enabled) {
    if (!admin || !config.auth.currentUser || config.auth.currentUser.uid !== currentUid) return;
    const status = adminForm.querySelector('[role="status"]');
    status.dataset.state = ''; status.textContent = '';
    if (enabled && (!value || value.length < 20 || value.length > 256 || /\s/.test(value))) { status.dataset.state = 'error'; status.textContent = 'Enter a valid Gemini API key.'; return; }
    adminForm.querySelectorAll('button').forEach(button => { button.disabled = true; });
    const uid = currentUid;
    try {
      await setDoc(doc(config.db, 'runtimeSecrets', 'gemini'), { key: enabled ? value : '', enabled, version: crypto.randomUUID(), updatedBy: uid, updatedAt: serverTimestamp() });
      if (!admin || currentUid !== uid) return;
      adminForm.querySelector('input').value = '';
      status.dataset.state = 'success';
      status.textContent = enabled ? 'Shared key saved. Approved accounts receive it automatically.' : 'Shared key disabled. Managed copies are cleared when accounts reconnect.';
    } catch { status.dataset.state = 'error'; status.textContent = 'Unable to save the shared key. Check administrator access and connection.'; }
    finally { adminForm.querySelectorAll('button').forEach(button => { button.disabled = false; }); }
  }
  adminForm.addEventListener('submit', event => { event.preventDefault(); event.stopPropagation(); save(adminForm.querySelector('input').value.trim(), true); });
  adminForm.querySelector('[data-use-local]').addEventListener('click', () => save(read(KEY) || '', true));
  adminForm.querySelector('[data-disable]').addEventListener('click', () => save('', false));
  menu.append(adminForm);
}
function receiveKey(snapshot, epoch) {
  if (epoch !== generation || !approved) return;
  if (snapshot.metadata?.fromCache || snapshot.metadata?.hasPendingWrites) return;
  const record = snapshot.data();
  if (!record?.enabled || typeof record.key !== 'string' || !record.key) {
    clearManaged(); notify('Shared key not configured. An administrator can set it in Master admin.', 'unconfigured'); resolveReady(); return;
  }
  managedKey = record.key;
  try { localStorage.setItem(MANAGED, JSON.stringify({ uid: currentUid, version: record.version })); localStorage.setItem(KEY, record.key); }
  catch { notify('Shared key ready for this session. Browser storage is unavailable.'); resolveReady(); return; }
  notify('Dictation key supplied by administrator.', 'ready'); resolveReady();
}
function subscribeKey(epoch) {
  stopKey?.(); const keyEpoch = ++keyGeneration;
  stopKey = onSnapshot(doc(config.db, 'runtimeSecrets', 'gemini'), { includeMetadataChanges: true }, snapshot => { if (keyEpoch === keyGeneration) receiveKey(snapshot, epoch); }, () => {
    if (epoch !== generation || keyEpoch !== keyGeneration) return;
    clearManaged(); notify('Shared key unavailable. Reconnect to verify access.'); resolveReady();
  });
}
async function verify(user) {
  const epoch = ++generation;
  stop(); approved = admin = false; currentUid = user?.uid || ''; settled = false; clearManaged();
  if (adminForm) { adminForm.remove(); adminForm = null; }
  if (!user || !navigator.onLine) { lock(user ? 'Reconnect to verify account access.' : 'Sign in to receive the dictation key.'); return; }
  notify('Verifying dictation access…', 'loading');
  try {
    const token = await user.getIdTokenResult();
    if (epoch !== generation) return;
    admin = isMasterAdmin(user, token);
    if (admin) { approved = true; installAdminForm(); subscribeKey(epoch); return; }
    if(token.claims.firebase?.sign_in_provider!=='password'){lock('Sign in with your approved email and password.');return;}
    const approval = doc(config.db, 'dashboardApprovals', user.uid);
    // Confirm approval with the server before opening the secret subscription.
    const snapshot = await getDocFromServer(approval);
    if (epoch !== generation) return;
    function update(result) {
      if (epoch !== generation || result.metadata?.fromCache || result.metadata?.hasPendingWrites) return;
      if (result.data()?.status === 'approved') {
        if (!approved) { approved = true; subscribeKey(epoch); }
      } else lock('Dictation key requires administrator approval.');
    }
    update(snapshot);
    stopApproval = onSnapshot(approval, { includeMetadataChanges: true }, update, () => { if (epoch === generation) lock('Unable to verify dictation access.'); });
  } catch { if (epoch === generation) lock('Unable to verify dictation access. Reconnect and try again.'); }
}
export function configureSharedKey(options) {
  if (configured) return;
  configured = true; config = options; clearManaged();
  const menu = document.getElementById('adminSettingsMenu') || document.getElementById('settingsMenu');
  if (menu) { statusElement = document.createElement('p'); statusElement.className = 'shared-key-status'; statusElement.setAttribute('role', 'status'); menu.append(statusElement); }
  onAuthStateChanged(config.auth, verify);
  window.addEventListener('offline', () => { ++generation; stop(); lock('Reconnect to verify account access.'); });
  window.addEventListener('online', () => verify(config.auth.currentUser));
}
export async function getDictationKey() {
  if (!configured) return read(KEY) || '';
  if (!settled) await new Promise(resolve => {
    const done = () => { clearTimeout(timeout); waiting.delete(done); resolve(); };
    const timeout = setTimeout(done, 10000); waiting.add(done);
  });
  if (!approved || !navigator.onLine || !config.auth.currentUser || config.auth.currentUser.uid !== currentUid) return '';
  return managedKey || read(KEY) || '';
}

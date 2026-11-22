import { initializeApp, deleteApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAuth, setPersistence, inMemoryPersistence, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { doc, serverTimestamp, setDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';
import { isMasterAdmin } from './roles.js';

export function mountAccountProvisioning({ auth, db, host }) {
  const form = document.createElement('form'); form.className = 'account-create-form';
  form.innerHTML = '<label>Email<input type="email" autocomplete="off" required maxlength="254" aria-label="New user email"></label><label>Initial password<input type="password" autocomplete="new-password" required minlength="8" aria-label="New user password"></label><button class="btn" type="submit">Create user</button><p role="status"></p>';
  host.append(form);
  const [email, password] = form.querySelectorAll('input'), button = form.querySelector('button'), status = form.querySelector('[role="status"]');
  onAuthStateChanged(auth, () => { password.value = ''; status.textContent = ''; });
  form.addEventListener('submit', async event => {
    event.preventDefault(); button.disabled = true; status.textContent = '';
    const owner = auth.currentUser; let secondaryApp, secondaryAuth, created = false;
    try {
      const token = await owner?.getIdTokenResult(true);
      if (!isMasterAdmin(owner, token) || auth.currentUser?.uid !== owner.uid) throw new Error('master-required');
      const address = email.value.trim();
      // A separate, memory-only Auth session preserves the master's signed-in session.
      secondaryApp = initializeApp(firebaseConfig, 'create-user-' + crypto.randomUUID());
      secondaryAuth = getAuth(secondaryApp); await setPersistence(secondaryAuth, inMemoryPersistence);
      const result = await createUserWithEmailAndPassword(secondaryAuth, address, password.value);
      created = true; password.value = '';
      if (auth.currentUser?.uid !== owner.uid) throw new Error('master-required');
      await setDoc(doc(db, 'dashboardApprovals', result.user.uid), {
        email: result.user.email, status: 'approved', createdBy: owner.uid,
        createdAt: serverTimestamp(), reviewedBy: owner.uid, reviewedAt: serverTimestamp()
      });
      status.textContent = 'User created. They can sign in immediately on the user, admin and dashboard pages.';
      email.value = '';
    } catch (error) {
      status.textContent = created ? 'Account created, but access setup did not finish. Ask the user to sign in, then enable them under Users.'
        : error.code === 'auth/email-already-in-use' ? 'This email already has an account. Enable it under Users if needed.'
        : error.code === 'auth/weak-password' ? 'Use a stronger initial password.'
        : 'Unable to create this user. Check master-admin access, the email and the connection.';
    } finally {
      if (secondaryAuth) await signOut(secondaryAuth).catch(() => {});
      if (secondaryApp) await deleteApp(secondaryApp).catch(() => {});
      button.disabled = false;
    }
  });
}

import { signOut } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';

// Only a logout notification is shared here; Firebase manages all credentials.
const key = 'woyz-stroke-account-logout';
export function watchAccountLogout(auth) {
  const receive = event => {
    if (event.key === key && event.newValue && auth.currentUser) signOut(auth).catch(() => {});
  };
  window.addEventListener('storage', receive);
  return () => window.removeEventListener('storage', receive);
}
export async function logoutAccount(auth) {
  await signOut(auth);
  try { localStorage.setItem(key, `${Date.now()}-${Math.random()}`); } catch {}
}

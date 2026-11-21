import fs from 'node:fs/promises';
const root = new URL('../', import.meta.url);
let html = await fs.readFile(new URL('index.html', root), 'utf8');
function replace(from, to) {
  if (!html.includes(from)) throw new Error(`Missing dashboard source marker: ${from}`);
  html = html.replace(from, to);
}
replace('    <p class="login-sub">Administrator sign in</p>', '    <p class="login-sub">Dashboard sign in</p>');
replace('      <a class="btn" href="./user.html">Workspace</a>\n', '');
replace("import { mountDeviceManager } from './access.js';\n", '');
replace("import { mountDashboardManager } from './dashboard-access.js';", "import { mountDashboardAccess } from './dashboard-access.js';");
const start = html.indexOf('let adminAuthGeneration = 0;');
const end = html.indexOf("adminPreviousDateBtn.addEventListener", start);
if (start < 0 || end < 0) throw new Error('Missing dashboard authentication markers');
html = html.slice(0, start) + `mountDashboardAccess({ auth, db,
  onLocked(message) {
    currentAdminUid = null;
    notesUnsubscribe?.(); profilesUnsubscribe?.(); clearScopedSubscriptions();
    notesUnsubscribe = null; profilesUnsubscribe = null;
    users = []; selectedUserId = null; selectedNoteId = null; selectedTimelineEntryId = 'all';
    hideProtocolViewer({reset:true});
    appShell.classList.remove('authenticated');
    loginScreen.classList.remove('hidden');
    for (const element of [mainScroll, entryList, userRail, topbarTitle, topbarMeta, adminTimelineMenu]) element.replaceChildren();
    userEmail.textContent = '';
    loginError.textContent = message;
  },
  onAccess(user) {
    currentAdminUid = user.uid;
    loginScreen.classList.add('hidden');
    appShell.classList.add('authenticated');
    loginError.textContent = '';
    userEmail.textContent = user.email || 'Dashboard';
    selectedVisitDate = new Date(); adminDateTouched = true;
    updateDateNavigation();
    subscribeToUserProfiles(); subscribeToAllNotes();
  }
});

` + html.slice(end);
await fs.writeFile(new URL('dashboard.html', root), html);
console.log('Built dashboard.html from index.html without Workspace or Devices controls.');

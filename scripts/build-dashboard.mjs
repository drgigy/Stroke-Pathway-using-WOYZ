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
replace('mountDeviceManager({auth,db});\n', '');
replace("    if (token.claims.admin !== true) { loginError.textContent = 'Administrator access required.'; return; }", "    if (token.claims.admin !== true && token.claims.firebase?.sign_in_provider !== 'password') { loginError.textContent = 'Sign in with your dashboard email and password.'; return; }");
await fs.writeFile(new URL('dashboard.html', root), html);
console.log('Built dashboard.html from index.html without Workspace or Devices controls.');

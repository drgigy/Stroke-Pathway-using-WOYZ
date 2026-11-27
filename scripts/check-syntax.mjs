import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const root = new URL('../', import.meta.url);
for (const file of ['dashboard-data.js','kpi-policy.js','protocol-timings.js','account-session.js','background-config.js','background-upload.js','entry-order.js','case-wide-dictation.js','background-merge.js','offline.html', 'master-admin.html', 'index.html', 'dashboard.html', 'user.html', 'access.js', 'dashboard-access.js', 'protocol-dictation.js','dictation-panel.js','dictation-output.js','dictation-request.js', 'protocol-reference.js', 'sidebar-controls.js', 'protocol-print.js','protocol-viewer.js', 'protocol-zoom.js', 'kpi-workspace.js', 'admin-review.js', 'workspace-shell.js', 'kpi-schema.js', 'kpi-calculations.js', 'kpi-data.js', 'kpi-store.js', 'account-provisioning.js', 'roles.js', 'shared-key.js', 'pwa.js', 'page-mode.js', 'master-admin-ui.js', 'protocol-pages.js', 'protocol-fields.js', 'protocol-field-output.js', 'protocol-form-overlay.js', 'protocol-form-editor.js', 'protocol-patient.js', 'firebase-config.js', 'sw.js']) {
  const text = await fs.readFile(new URL(file, root), 'utf8');
  const scripts = file.endsWith('.html') ? [...text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(match => !match[1].includes('src=')).map(match => match[2]) : [text];
  for (const source of scripts) {
    const check = spawnSync('node', ['--input-type=module', '--check'], { input: source, encoding: 'utf8' });
    if (check.status) throw new Error(`${file}: ${check.stderr}`);
  }
  console.log(`${file}: syntax passed`);
}

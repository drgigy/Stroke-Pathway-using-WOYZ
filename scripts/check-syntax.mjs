import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const root = new URL('../', import.meta.url);
for (const file of ['index.html', 'dashboard.html', 'user.html', 'access.js', 'dashboard-access.js', 'protocol-dictation.js', 'sidebar-controls.js', 'protocol-viewer.js', 'protocol-pages.js', 'firebase-config.js', 'sw.js']) {
  const text = await fs.readFile(new URL(file, root), 'utf8');
  const scripts = file.endsWith('.html') ? [...text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(match => !match[1].includes('src=')).map(match => match[2]) : [text];
  for (const source of scripts) {
    const check = spawnSync('node', ['--input-type=module', '--check'], { input: source, encoding: 'utf8' });
    if (check.status) throw new Error(`${file}: ${check.stderr}`);
  }
  console.log(`${file}: syntax passed`);
}

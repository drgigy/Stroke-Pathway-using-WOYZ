import { isReviewPage } from './page-mode.js';
import { onProtocolDictationChange, protocolDictationBusy } from './protocol-dictation.js';
let mounted = false, installPrompt;
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
window.addEventListener('beforeinstallprompt', event => { if (isReviewPage) return; event.preventDefault(); installPrompt = event; });
export function mountPwa() {
  if (mounted) return; mounted = true;
  const controls = document.querySelector('.sidebar-controls');
  if (!isReviewPage) {
    const install = document.createElement('button'); install.type = 'button'; install.className = 'btn pwa-install'; install.textContent = 'Install app'; install.hidden = standalone();
    controls?.append(install);
    const help = document.createElement('dialog'); help.className = 'device-dialog pwa-help';
    help.innerHTML = '<header><h2>Install WOYZ Stroke</h2><button type="button" class="btn" data-close>Close</button></header><p><strong>iPhone / iPad:</strong> Open this page in Safari, tap Share, choose Add to Home Screen, then Add.</p><p><strong>Android:</strong> Open this page in Chrome, open the browser menu, then choose Install app or Add to Home screen.</p><p>Open the installed app and request device approval if prompted. The installed app may have its own device identity. Dictation and shared cases require an internet connection.</p>';
    document.body.append(help); help.querySelector('[data-close]').addEventListener('click', () => help.close());
    install.addEventListener('click', async () => {
      if (installPrompt) { const prompt = installPrompt; installPrompt = null; await prompt.prompt(); await prompt.userChoice; }
      else help.showModal();
    });
    window.addEventListener('appinstalled', () => { install.hidden = true; installPrompt = null; });
  }
  if (!('serviceWorker' in navigator)) return;
  const hadController = !!navigator.serviceWorker.controller;
  const update = document.createElement('button'); update.type = 'button'; update.className = 'btn pwa-update'; update.textContent = 'Update app'; update.hidden = true; controls?.append(update);
  update.addEventListener('click', () => { if (!protocolDictationBusy()) window.location.reload(); });
  onProtocolDictationChange(() => { update.disabled = protocolDictationBusy(); });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) { update.hidden = false; update.disabled = protocolDictationBusy(); }
  });
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(registration => registration.update()).catch(() => {});
}

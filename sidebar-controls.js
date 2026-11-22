import { mountPwa } from './pwa.js';
export function mountSidebarControls({ settings, logout, back, additional = [] }) {
  const sidebar = document.querySelector('.sidebar');
  const controls = document.createElement('nav');
  controls.className = 'sidebar-controls';
  controls.setAttribute('aria-label', 'Case list controls');
  controls.append(...additional);
  if (back) {
    back.textContent = 'Back';
    back.setAttribute('aria-label', 'Back to case');
    back.className = 'btn sidebar-back';
    controls.append(back);
  }
  const settingsButton = settings.querySelector('button');
  if (settingsButton.id === 'settingsBtn') settingsButton.append(document.createTextNode('Settings'));
  controls.append(settings);
  const logoutButton = document.createElement('button');
  logoutButton.type = 'button';
  logoutButton.className = 'btn sidebar-logout';
  logoutButton.textContent = 'Logout';
  logoutButton.addEventListener('click', () => logout.click());
  controls.append(logoutButton);
  sidebar.append(controls);
  mountPwa();
}

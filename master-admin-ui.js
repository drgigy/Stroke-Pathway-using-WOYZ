// Presentation only: existing authentication, actions and data listeners stay in their modules.
const icons = {
  access: '<rect x="3" y="4" width="13" height="11" rx="2"/><path d="M7 19h5m-2.5-4v4M19 8h2v12h-6v-3"/>',
  user: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m17-13v6m-3-3h6"/><circle cx="9" cy="7" r="4"/>',
  key: '<circle cx="8" cy="15" r="5"/><path d="m11.5 11.5 9-9m-2 2 3 3m-6 0 3 3"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  logout: '<path d="M9 5H5v14h4m5-12 5 5-5 5m-5-5h10"/>',
  check: '<path d="m5 12 4 4L19 6"/>'
};
function icon(name) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.arrow}</svg>`; }
export function mountMasterAdminDesign() {
  document.querySelectorAll('[data-icon]').forEach(element => { element.innerHTML = icon(element.dataset.icon); });
  const decorate = () => {
    for (const [id, name, symbol, description] of [
      ['dashboardUsersBtn', 'Users', 'user', 'Manage team access to shared cases.']
    ]) {
      const button = document.getElementById(id);
      if (!button || button.hasAttribute('data-designed')) continue;
      button.dataset.designed = ''; button.classList.add('access-tile'); button.setAttribute('aria-label', name);
      button.innerHTML = `<span class="tile-icon">${icon(symbol)}</span><span class="tile-copy"><strong>${name}</strong><span>${description}</span></span><span class="tile-arrow">${icon('arrow')}</span>`;
    }
    const email = document.querySelector('.account-create-form input[type="email"]');
    const password = document.querySelector('.account-create-form input[type="password"]');
    if (email) email.placeholder = 'name@hospital.com';
    if (password) password.placeholder = 'At least 8 characters';
  };
  new MutationObserver(decorate).observe(document.getElementById('masterWorkspace'), { childList: true, subtree: true });
  decorate();
  const sections = [...document.querySelectorAll('.master-content > section[id], .settings-grid > section[id]')];
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top)[0];
      if (!visible) return;
      for (const link of document.querySelectorAll('.section-nav a')) {
        const active = link.hash === '#'+visible.target.id;
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current','location'); else link.removeAttribute('aria-current');
      }
    }, { rootMargin: '-100px 0px -45% 0px' });
    sections.forEach(section => observer.observe(section));
  }
}

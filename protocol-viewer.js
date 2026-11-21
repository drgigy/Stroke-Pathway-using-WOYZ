import { protocolPages } from './protocol-pages.js';

let toolbar;
let container;
let currentCase = null;
let currentPage = 0;
let expanded = false;
const pageTitles = [
  'Stroke Protocol Form',
  'Quality Assessment Timings',
  'Radiology Form',
  'mRS / ASPECTS',
  'Counselling Form',
  'Thrombolytic Checklist',
  'Thrombolysis Consent (English)',
  'Thrombolysis Consent (Malayalam)',
  'NIHSS'
];
const titleElements = [];
const headingRows = [];
const stepButtons = [];

function stepButton(direction, suffix) {
  const button = document.createElement('button');
  const label = direction === -1 ? 'Previous page' : 'Next page';
  button.id = `protocol${direction === -1 ? 'Previous' : 'Next'}Btn-${suffix}`;
  button.type = 'button';
  button.className = 'protocol-step-button';
  button.textContent = direction === -1 ? '\u2039' : '\u203a';
  button.title = label;
  button.setAttribute('aria-label', label);
  button.addEventListener('click', () => {
    const next = Math.max(0, Math.min(protocolPages.length - 1, currentPage + direction));
    if (next !== currentPage) { currentPage = next; renderPage(); }
  });
  stepButtons.push({ button, direction });
  return button;
}

function ensureToolbar() {
  if (toolbar) return;
  toolbar = document.createElement('nav');
  toolbar.id = 'protocolToolbar';
  toolbar.className = 'protocol-toolbar';
  toolbar.setAttribute('aria-label', 'Stroke protocol page navigation');
  const pages = document.createElement('div');
  pages.id = 'protocolPageButtons';
  pages.className = 'protocol-page-buttons';
  pages.setAttribute('role', 'group');
  pages.setAttribute('aria-label', 'Choose a protocol page');
  for (const [index, page] of protocolPages.entries()) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'protocol-page-button';
    button.textContent = String(page.number);
    button.dataset.protocolPage = String(page.number);
    button.setAttribute('aria-label', `Protocol page ${page.number}`);
    button.addEventListener('click', () => {
      currentPage = index;
      expanded = false;
      renderPage();
      toggle.focus({ preventScroll: true });
    });
    pages.append(button);
  }
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.id = 'protocolExpandBtn';
  toggle.className = 'protocol-expand-button';
  toggle.setAttribute('aria-controls', pages.id);
  toggle.addEventListener('click', () => {
    expanded = !expanded;
    updateToolbar();
    if (expanded) pages.querySelector('[aria-current="page"]')?.focus({ preventScroll: true });
  });
  toolbar.addEventListener('keydown', event => {
    if (event.key === 'Escape' && expanded) {
      expanded = false;
      updateToolbar();
      toggle.focus({ preventScroll: true });
      event.preventDefault();
    }
  });
  document.addEventListener('pointerdown', event => {
    if (expanded && !toolbar.hidden && !toolbar.contains(event.target)) {
      expanded = false;
      updateToolbar();
    }
  });
  toolbar.append(pages, toggle);
  const topbar = document.querySelector('.main-topbar');
  const mobileRow = topbar.querySelector('.mobile-visit-row');
  for (const [target, suffix] of [[topbar, mobileRow ? 'desktop' : 'primary'], ...(mobileRow ? [[mobileRow, 'mobile']] : [])]) {
    const title = document.createElement('span');
    title.className = 'protocol-current-title';
    title.setAttribute('aria-live', 'polite');
    const row = document.createElement('div');
    row.className = `protocol-heading-row protocol-heading-${suffix}`;
    const navigation = document.createElement('div');
    navigation.className = 'protocol-heading-nav';
    navigation.append(stepButton(-1, suffix), title, stepButton(1, suffix));
    row.append(navigation);
    target.append(row);
    headingRows.push(row);
    titleElements.push(title);
  }
  topbar.parentElement.classList.add('protocol-viewer-host');
  topbar.parentElement.append(toolbar);
}

function updateToolbar() {
  for (const title of titleElements) {
    title.textContent = pageTitles[currentPage] || `Page ${currentPage + 1}`;
    title.hidden = false;
  }
  for (const row of headingRows) row.hidden = false;
  for (const { button, direction } of stepButtons) button.disabled = direction === -1 ? currentPage === 0 : currentPage === protocolPages.length - 1;
  toolbar.querySelector('#protocolPageButtons').hidden = !expanded;
  const toggle = toolbar.querySelector('#protocolExpandBtn');
  toggle.textContent = expanded ? '\u00d7' : String(currentPage + 1);
  toggle.title = expanded ? 'Close page picker' : `Choose page (${currentPage + 1} of ${protocolPages.length})`;
  toggle.setAttribute('aria-label', toggle.title);
  toggle.setAttribute('aria-expanded', String(expanded));
  for (const [index, button] of [...toolbar.querySelectorAll('[data-protocol-page]')].entries()) {
    if (index === currentPage) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
}

function renderPage() {
  const page = protocolPages[currentPage];
  const image = document.createElement('img');
  image.id = 'protocolPageImage';
  image.src = new URL(page.src, import.meta.url).href;
  image.width = page.width;
  image.height = page.height;
  image.alt = `Rajagiri Hospital stroke protocol page ${page.number} of ${protocolPages.length}`;
  image.dataset.pageNumber = String(page.number);
  image.decoding = 'async';
  const sheet = document.createElement('section');
  sheet.className = 'protocol-page-sheet';
  sheet.setAttribute('aria-label', `Protocol page ${page.number}`);
  sheet.append(image);
  container.replaceChildren(sheet);
  container.scrollTop = 0;
  updateToolbar();
}

export function showProtocolCase(target, caseId) {
  ensureToolbar();
  if (currentCase !== caseId) { currentPage = 0; expanded = false; }
  currentCase = caseId;
  toolbar.dataset.caseId = caseId;
  container = target;
  container.classList.add('protocol-scroll');
  toolbar.hidden = false;
  renderPage();
}

export function hideProtocolViewer({ reset = false } = {}) {
  if (toolbar) toolbar.hidden = true;
  expanded = false;
  for (const title of titleElements) title.hidden = true;
  for (const row of headingRows) row.hidden = true;
  container?.classList.remove('protocol-scroll');
  if (reset) { currentCase = null; currentPage = 0; expanded = false; }
}

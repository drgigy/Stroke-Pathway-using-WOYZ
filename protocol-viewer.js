import { isReviewPage } from './page-mode.js';
import { protocolPages } from './protocol-pages.js';
import { mountProtocolZoom } from './protocol-zoom.js';
import { renderFilledProtocolForm } from './protocol-form-overlay.js';
import { cancelProtocolFormEditing, mountProtocolFormEditStatus, onProtocolFormEditChange, protocolFormEditingBusy, setProtocolFormEditContext } from './protocol-form-editor.js';
import { cancelProtocolDictation, mountProtocolDictationControls, onProtocolDictationChange, protocolDictationBusy, setProtocolDictationContext } from './protocol-dictation.js';

let toolbar;
let container;
let currentCase = null;
let currentPage = 0;
let expanded = false;
let caseDictations = {};
let disposeZoom;
let archiveOnly=false;
const pageTitles = protocolPages.map(page => page.title);
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
    if (!(protocolDictationBusy() || protocolFormEditingBusy()) && next !== currentPage) { currentPage = next; renderPage(); }
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
    const number = document.createElement('span');
    number.className = 'protocol-page-number'; number.textContent = String(page.number);
    const name = document.createElement('span'); name.textContent = pageTitles[index];
    button.append(number, name);
    button.dataset.protocolPage = String(page.number);
    button.setAttribute('aria-label', `Protocol page ${page.number}`);
    button.addEventListener('click', () => {
      if ((protocolDictationBusy() || protocolFormEditingBusy())) return;
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
  toolbar.append(toggle, pages);
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
    if (!isReviewPage) mountProtocolDictationControls(row);
    else mountProtocolFormEditStatus(row);
    target.append(row);
    headingRows.push(row);
    titleElements.push(title);
  }
  topbar.parentElement.classList.add('protocol-viewer-host');
  topbar.parentElement.append(toolbar);
  const positionPicker = () => topbar.parentElement.style.setProperty('--protocol-top', `${topbar.getBoundingClientRect().bottom-topbar.parentElement.getBoundingClientRect().top}px`);
  new ResizeObserver(positionPicker).observe(topbar);
  positionPicker();
  onProtocolDictationChange(() => { if (!toolbar.hidden) updateToolbar(); });
  onProtocolFormEditChange(() => { if (!toolbar.hidden) updateToolbar(); });
}

function updateToolbar() {
  for (const title of titleElements) {
    title.textContent = pageTitles[currentPage] || `Page ${currentPage + 1}`;
    title.hidden = false;
  }
  for (const row of headingRows) { row.hidden = false; for(const control of row.querySelectorAll('.protocol-dictation,.protocol-edit-status'))control.hidden=archiveOnly; }
  for (const { button, direction } of stepButtons) button.disabled = (protocolDictationBusy() || protocolFormEditingBusy()) || (direction === -1 ? currentPage === 0 : currentPage === protocolPages.length - 1);
  for (const row of headingRows) row.classList.toggle('protocol-dictation-active', protocolDictationBusy());
  toolbar.querySelector('#protocolPageButtons').hidden = !expanded;
  const toggle = toolbar.querySelector('#protocolExpandBtn');
  toggle.textContent = expanded ? '\u00d7' : String(currentPage + 1);
  toggle.title = expanded ? 'Close page picker' : `Choose page (${currentPage + 1} of ${protocolPages.length})`;
  toggle.setAttribute('aria-label', toggle.title);
  toggle.setAttribute('aria-expanded', String(expanded));
  for (const [index, button] of [...toolbar.querySelectorAll('[data-protocol-page]')].entries()) {
    button.disabled = (protocolDictationBusy() || protocolFormEditingBusy());
    if (index === currentPage) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
}

function renderPage() {
  disposeZoom?.();
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
  const canvas = document.createElement('div'); canvas.className = 'protocol-form-canvas';
  canvas.append(image); sheet.append(canvas);
  container.replaceChildren(sheet);
  container.scrollTop = 0;
  container.scrollLeft = 0;
  disposeZoom = mountProtocolZoom(container, sheet);
  updateToolbar();
  renderSavedDictations(sheet);
  const caseId = currentCase, pageNumber = currentPage + 1;
  const setContext = isReviewPage ? setProtocolFormEditContext : setProtocolDictationContext;
  if(!archiveOnly)setContext({ caseId, pageNumber, title: pageTitles[currentPage], imageSrc: page.src,
    onSaved(id, entry) {
      if (currentCase !== caseId) return;
      const key = `page${pageNumber}`;
      caseDictations = { ...caseDictations, [key]: { ...caseDictations[key], [id]: entry } };
      const activeSheet = container.querySelector('.protocol-page-sheet');
      if (activeSheet) renderSavedDictations(activeSheet);
    }
  });
}

function renderSavedDictations(sheet) {
  sheet.querySelector('.protocol-saved-dictations')?.remove();
  renderFilledProtocolForm(sheet, currentPage + 1, caseDictations[`page${currentPage + 1}`],{readOnly:archiveOnly});

}

export function showProtocolCase(target, caseId, options = {}) {
  archiveOnly=options.readOnly===true;
  ensureToolbar();
  if (currentCase === caseId && container === target && target.querySelector('.protocol-page-sheet')) {
    toolbar.hidden = false;
    container.classList.add('protocol-scroll');
    updateToolbar();
    caseDictations = options.dictations || {};
    renderSavedDictations(target.querySelector('.protocol-page-sheet'));
    return;
  }
  if (currentCase !== caseId) {
    if ((protocolDictationBusy() || protocolFormEditingBusy())) { toolbar.hidden = false; return; }
    currentPage = 0; expanded = false;
  }
  currentCase = caseId;
  caseDictations = options.dictations || {};
  toolbar.dataset.caseId = caseId;
  container = target;
  container.classList.add('protocol-scroll');
  toolbar.hidden = false;
  renderPage();
}

export function hideProtocolViewer({ reset = false } = {}) {
  if (reset) { disposeZoom?.(); disposeZoom = null; cancelProtocolFormEditing(); cancelProtocolDictation(); caseDictations = {}; }
  if (toolbar) toolbar.hidden = true;
  expanded = false;
  for (const title of titleElements) title.hidden = true;
  for (const row of headingRows) row.hidden = true;
  container?.classList.remove('protocol-scroll');
  if (reset) { currentCase = null; currentPage = 0; expanded = false; }
}

import { protocolFields } from './protocol-fields.js';
import { currentFieldValues } from './protocol-field-output.js';

// Values are DOM text, never SVG/HTML markup supplied by Gemini or a saved note.
export function renderFilledProtocolForm(sheet, pageNumber, dictations) {
  sheet.querySelector('.protocol-field-layer')?.remove();
  sheet.querySelector('.protocol-field-review')?.remove();
  const canvas = sheet.querySelector('.protocol-form-canvas');
  const values = currentFieldValues(dictations, pageNumber);
  const fields = protocolFields[pageNumber - 1].filter(field => values[field.id]);
  if (!fields.length) return;
  const layer = document.createElement('div'); layer.className = 'protocol-field-layer';
  layer.setAttribute('aria-label', 'Dictated form values — clinical review required');
  const review = document.createElement('details'); review.className = 'protocol-field-review';
  const summary = document.createElement('summary'); summary.textContent = 'Filled values · clinical review required'; review.append(summary);
  const note = document.createElement('p'); note.textContent = 'Tap a filled value to read the full entry. The latest dictation for each field is shown; earlier takes remain below. Dictation does not sign this form.'; review.append(note);
  const list = document.createElement('dl'); review.append(list);
  for (const field of fields) {
    const { value, takeId } = values[field.id];
    const row = document.createElement('div'); row.dataset.fieldReview = field.id;
    const label = document.createElement('dt'); label.textContent = field.label;
    const text = document.createElement('dd'); text.textContent = value; row.append(label, text); list.append(row);
    // No blank exists for these details on the printed reference; always show them below it.
    if (!field.box) { review.open = true; continue; }
    let [x, y, width, height] = field.box, display = value;
    if (field.kind === 'choice') {
      const option = field.options.find(option => option.value.toLowerCase() === value.toLowerCase());
      if (!option) { review.open = true; continue; }
      [x, y, width, height] = option.box; display = '✓';
    } else if (field.kind === 'yesno') {
      if (!/^(yes|no)$/i.test(value)) { review.open = true; continue; }
      if (value.toLowerCase() === 'no') x = field.noX;
      display = '✓';
    } else if (field.kind === 'check') {
      // A completion box is marked only by explicit affirmative dictation.
      if (!/^yes$/i.test(value)) { review.open = true; continue; }
      display = '✓';
    }
    const button = document.createElement('button'); button.type = 'button';
    button.className = 'protocol-filled-field' + (display === '✓' ? ' protocol-field-check' : '');
    button.dataset.fieldId = field.id; button.dataset.takeId = takeId;
    const content = document.createElement('span'); content.textContent = display;
    button.append(content); button.title = field.label + ': ' + value;
    button.setAttribute('aria-label', button.title);
    let font = display === '✓' ? 11 : 8.5;
    if (display !== '✓' && height <= 16) {
      const measure = document.createElement('canvas').getContext('2d');
      if (measure) { measure.font = '600 8.5px Arial'; font = Math.max(6, Math.min(8.5, (width - 2) / Math.max(1, measure.measureText(value).width) * 8.5)); }
      Object.assign(content.style, { display: 'block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' });
    } else if (display !== '✓') {
      Object.assign(content.style, { display: '-webkit-box', webkitBoxOrient: 'vertical', webkitLineClamp: String(Math.max(1, Math.floor((height - 1) / (font * 1.1)))), overflow: 'hidden' });
    }
    Object.assign(button.style, { left: `${x / 594.95996 * 100}%`, top: `${y / 841.91998 * 100}%`, width: `${width / 594.95996 * 100}%`, height: `${height / 841.91998 * 100}%`, fontSize: `${font / 594.95996 * 100}cqw` });
    button.addEventListener('click', () => { review.open = true; row.tabIndex = -1; row.focus({ preventScroll: true }); row.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
    layer.append(button);
  }
  canvas.append(layer); sheet.append(review);
}

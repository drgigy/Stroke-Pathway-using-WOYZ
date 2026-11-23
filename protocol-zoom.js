// Resize the actual sheet, rather than visually scaling a clipped app viewport.
// Single-finger panning stays native; two fingers zoom around their midpoint.
export function mountProtocolZoom(scroller, sheet) {
  const events = new AbortController();
  let scale = 1, pinch = null;
  const baseWidth = () => Math.min(scroller.clientWidth, 1100);
  function resize() {
    sheet.style.width = `${baseWidth() * scale}px`;
    sheet.style.maxWidth = 'none';
    sheet.style.marginInline = scale === 1 ? 'auto' : '0';
  }
  const midpoint = touches => {
    const rect = scroller.getBoundingClientRect();
    return { x: (touches[0].clientX + touches[1].clientX) / 2 - rect.left,
      y: (touches[0].clientY + touches[1].clientY) / 2 - rect.top };
  };
  const distance = touches => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
  scroller.addEventListener('touchstart', event => {
    if (event.touches.length !== 2 || !sheet.isConnected || !scroller.classList.contains('protocol-scroll')) return;
    event.preventDefault();
    const middle = midpoint(event.touches), rect = sheet.getBoundingClientRect(), viewport = scroller.getBoundingClientRect();
    pinch = { distance: Math.max(1, distance(event.touches)), scale,
      x: (middle.x - (rect.left - viewport.left)) / scale,
      y: (middle.y - (rect.top - viewport.top)) / scale };
  }, { passive: false, signal: events.signal });
  scroller.addEventListener('touchmove', event => {
    if (!pinch || event.touches.length !== 2) return;
    event.preventDefault();
    const middle = midpoint(event.touches);
    scale = Math.max(1, Math.min(4, pinch.scale * distance(event.touches) / pinch.distance));
    resize();
    const left = scale === 1 ? Math.max(0, (scroller.clientWidth - baseWidth()) / 2) : 0;
    scroller.scrollLeft = left + pinch.x * scale - middle.x;
    scroller.scrollTop = pinch.y * scale - middle.y;
  }, { passive: false, signal: events.signal });
  const end = event => { if (event.touches.length < 2) pinch = null; };
  scroller.addEventListener('touchend', end, { signal: events.signal });
  scroller.addEventListener('touchcancel', end, { signal: events.signal });
  const observer = new ResizeObserver(resize);
  observer.observe(scroller);
  resize();
  return () => { events.abort(); observer.disconnect(); };
}

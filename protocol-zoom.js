// Resize the actual sheet, rather than visually scaling a clipped app viewport.
// Single-finger panning stays native; two fingers zoom around their midpoint.
export function mountProtocolZoom(scroller, sheet, { onSwipe } = {}) {
  const events = new AbortController();
  let scale = 1, pinch = null, swipe = null;
  const unzoomed=()=>scale<=1.001&&(window.visualViewport?.scale||1)<=1.01;
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
    swipe=null;
    if(event.touches.length===1&&unzoomed()&&onSwipe&&sheet.isConnected&&scroller.classList.contains('protocol-scroll')
      &&!event.target.closest('button,a,select,[contenteditable="true"],input:not([readonly]):not([disabled]),textarea:not([readonly])')){
      const touch=event.touches[0];swipe={id:touch.identifier,x:touch.clientX,y:touch.clientY,time:performance.now()};
    }
    if (event.touches.length !== 2 || !sheet.isConnected || !scroller.classList.contains('protocol-scroll')) return;
    event.preventDefault();
    const middle = midpoint(event.touches), rect = sheet.getBoundingClientRect(), viewport = scroller.getBoundingClientRect();
    pinch = { distance: Math.max(1, distance(event.touches)), scale,
      x: (middle.x - (rect.left - viewport.left)) / scale,
      y: (middle.y - (rect.top - viewport.top)) / scale };
  }, { passive: false, signal: events.signal });
  scroller.addEventListener('touchmove', event => {
    if(swipe&&event.touches.length===1&&unzoomed()){
      const touch=event.touches[0],dx=touch.clientX-swipe.x,dy=touch.clientY-swipe.y;
      if(Math.abs(dx)>12&&Math.abs(dx)>Math.abs(dy)*1.5&&event.cancelable)event.preventDefault();
    }
    if (!pinch || event.touches.length !== 2) return;
    event.preventDefault();
    const middle = midpoint(event.touches);
    scale = Math.max(1, Math.min(4, pinch.scale * distance(event.touches) / pinch.distance));
    resize();
    const left = scale === 1 ? Math.max(0, (scroller.clientWidth - baseWidth()) / 2) : 0;
    scroller.scrollLeft = left + pinch.x * scale - middle.x;
    scroller.scrollTop = pinch.y * scale - middle.y;
  }, { passive: false, signal: events.signal });
  const end = event => {
    const gesture=swipe;swipe=null;
    if (event.touches.length < 2) pinch = null;
    if(event.type!=='touchend'||!gesture||event.touches.length||!unzoomed())return;
    const touch=Array.from(event.changedTouches).find(touch=>touch.identifier===gesture.id);if(!touch)return;
    const dx=touch.clientX-gesture.x,dy=touch.clientY-gesture.y;
    if(performance.now()-gesture.time<=1000&&Math.abs(dx)>=60&&Math.abs(dx)>Math.abs(dy)*1.5)onSwipe?.(dx<0?1:-1);
  };
  scroller.addEventListener('touchend', end, { signal: events.signal });
  scroller.addEventListener('touchcancel', end, { signal: events.signal });
  const observer = new ResizeObserver(resize);
  observer.observe(scroller);
  resize();
  return () => { events.abort(); observer.disconnect(); };
}

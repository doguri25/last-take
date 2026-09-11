/** Uniformly fit only the founding screen; the management desk keeps normal scrolling. */
export function fitStartScale(viewWidth, viewHeight, contentWidth, contentHeight) {
  const dimensions = [viewWidth, viewHeight, contentWidth, contentHeight];
  if (dimensions.some(value => !Number.isFinite(value) || value <= 0)) return 1;
  return Math.min(1, viewWidth / contentWidth, viewHeight / contentHeight);
}

export function createStartScreenFitter() {
  let viewport = null;
  let page = null;
  let observer = null;
  let frame = 0;
  let removeListeners = [];

  function fit() {
    frame = 0;
    if (!viewport?.isConnected || !page?.isConnected) return;
    const visual = window.visualViewport;
    // Do not undo the user's pinch-to-zoom (or the browser's input magnification).
    if (visual && Math.abs(visual.scale - 1) > 0.02) return;
    const width = visual?.width || document.documentElement.clientWidth || window.innerWidth;
    const height = visual?.height || window.innerHeight;
    if (width <= 0 || height <= 0) return;
    viewport.style.width = `${width}px`;
    viewport.style.height = `${height}px`;
    viewport.style.left = `${visual?.offsetLeft || 0}px`;
    viewport.style.top = `${visual?.offsetTop || 0}px`;

    const insets = getComputedStyle(viewport);
    const availableWidth = Math.max(1, width - parseFloat(insets.paddingLeft) - parseFloat(insets.paddingRight));
    const availableHeight = Math.max(1, height - parseFloat(insets.paddingTop) - parseFloat(insets.paddingBottom));
    const landscape = width >= 480 && width > height && height < 600;
    viewport.dataset.startLayout = landscape ? 'landscape' : 'default';
    viewport.toggleAttribute('data-start-compact', height < 800);
    // A small minimum canvas width prevents narrow embedded windows from crushing the form.
    page.style.width = `${Math.max(landscape ? 720 : 320, Math.min(1180, availableWidth))}px`;

    // offset/scroll dimensions are untransformed. Measuring the scaled rect would oscillate.
    const contentWidth = Math.max(page.offsetWidth, page.scrollWidth);
    const contentHeight = Math.max(page.offsetHeight, page.scrollHeight);
    const scale = fitStartScale(availableWidth, availableHeight, contentWidth, contentHeight);
    page.style.setProperty('--start-scale', String(scale));
    viewport.dataset.startReady = 'true';
  }

  function schedule() {
    if (!frame && page) frame = requestAnimationFrame(fit);
  }

  function listen(target, name) {
    if (!target?.addEventListener) return;
    target.addEventListener(name, schedule, {passive: true});
    removeListeners.push(() => target.removeEventListener(name, schedule));
  }

  function dispose() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    observer?.disconnect();
    observer = null;
    for (const remove of removeListeners) remove();
    removeListeners = [];
    viewport = null;
    page = null;
    document.documentElement.classList.remove('start-screen');
  }

  function sync() {
    const nextViewport = document.querySelector('.start-viewport');
    if (nextViewport === viewport) return;
    dispose();
    if (!nextViewport) return;
    viewport = nextViewport;
    page = viewport.querySelector('.start-page');
    if (!page) return dispose();
    document.documentElement.classList.add('start-screen');
    window.scrollTo({top: 0, left: 0, behavior: 'instant'});
    // Fit before the first paint, then remeasure if fonts, text, viewport or orientation change.
    fit();
    if (typeof ResizeObserver === 'function') {
      observer = new ResizeObserver(schedule);
      observer.observe(page);
      observer.observe(viewport);
    }
    listen(window, 'resize');
    listen(window, 'orientationchange');
    listen(window, 'pageshow');
    listen(window.visualViewport, 'resize');
    listen(window.visualViewport, 'scroll');
    listen(document.fonts, 'loadingdone');
    document.fonts?.ready.then(schedule);
  }

  return {sync, dispose};
}

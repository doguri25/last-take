/** Copy navigation data only. Rendering helpers (functions, DOM nodes, class
 * instances) are transient and must never enter structured-clone/history state.
 * Circular references are ignored; simulation/save data never uses this codec.
 */
export function cloneNavigationState(value, ancestors = new WeakSet()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'object') return undefined;
  const array = Array.isArray(value), prototype = Object.getPrototypeOf(value);
  if (!array && prototype !== Object.prototype && prototype !== null) return undefined;
  if (ancestors.has(value)) return undefined;
  ancestors.add(value);
  try {
    if (array) return value.map(item => cloneNavigationState(item, ancestors) ?? null);
    const copy = {};
    for (const [key, item] of Object.entries(value)) {
      // Never restore a prototype setter from a history entry.
      if (key === '__proto__') continue;
      const data = cloneNavigationState(item, ancestors);
      if (data !== undefined) copy[key] = data;
    }
    return copy;
  } finally { ancestors.delete(value); }
}

/** Navigation stores screens, never the simulation. Back/forward cannot undo money or time.
 * Uses pushState/replaceState + popstate; the initial home entry remains a normal exit boundary.
 */
export function screenKey(s) {
  const m = s.modal, v = s.home ? 'home' : s.view;
  const tab = v === 'market' ? s.state?.market : v === 'talents' ? s.state?.people?.role : '';
  return JSON.stringify([v, tab || '', m?.type || '', m?.id ?? '', m?.metric ?? '',
    m?.type === 'wizard' ? s.state?.step : '',
    m?.type === 'picker' ? [s.state?.picker?.role, s.state?.picker?.index] : '',
    m?.type === 'film' ? s.state?.filmTab : '', m?.type === 'business' ? s.state?.businessTab : '']);
}

export function createNavigation({read, restore, home, window: win = globalThis.window}) {
  const MARK = 'lasttake-navigation-v1';
  let started = false, available = true, queued = false, restoring = false, travelling = false;
  let session = '', index = 0, parentIndex = null, current = null, pending = null;
  const entries = new Map();
  const copy = cloneNavigationState;
  const modalIdentity = screen => screen?.modal ? JSON.stringify([screen.home, screen.view, screen.modal.type, screen.modal.id ?? '']) : null;
  const matches = value => value?.app === MARK && typeof value.session === 'string' &&
    Number.isInteger(value.index) && value.index >= 0 && value.screen && typeof value.screen.view === 'string';
  function write(method, screen) {
    current = copy(screen); entries.set(index, current);
    if (!available) return;
    try { win.history[method]({app: MARK, session, index, parentIndex, screen: current}, ''); }
    catch { available = false; } // Sandboxed previews may prohibit the History API.
  }
  function remember() {
    if (!started || restoring || travelling) return;
    const next = read();
    if (current && screenKey(current) === screenKey(next)) write('replaceState', next);
  }
  function apply(screen) {
    restoring = true;
    try { restore(copy(screen)); write('replaceState', read()); }
    finally { restoring = false; }
  }
  function push(screen) {
    for (const key of entries.keys()) if (key > index) entries.delete(key);
    parentIndex = screen.modal ? (modalIdentity(screen) === modalIdentity(current) ? parentIndex : index) : null;
    index += 1; write('pushState', screen);
  }
  function move(to, override = null) {
    if (travelling || to < 0 || to === index) return false;
    pending = override;
    if (!available) {
      const target = entries.get(to); if (!target) return false;
      index = to; apply(override || target); pending = null; return true;
    }
    travelling = true;
    win.history.go(to - index);
    return true;
  }
  function flush() {
    queued = false;
    if (!started || restoring || travelling) return;
    const next = read();
    if (screenKey(next) === screenKey(current)) { write('replaceState', next); return; }
    // A completed/cancelled action closes its modal instead of adding a duplicate desk.
    const returning = next.modal?.type === 'negotiation' && !next.modal.id && ['picker','negotiation'].includes(current.modal?.type) || !next.modal && current.modal || (next.state?.peekStack?.length ?? 0) < (current.state?.peekStack?.length ?? 0) || next.modal?.type === 'wizard' && current.modal?.type === 'wizard' && next.state.step < current.state.step;
    if (returning && next.home === current.home && next.view === current.view) {
      for (let i = index - 1; i >= 0; i--) {
        if (entries.has(i) && screenKey(entries.get(i)) === screenKey(next)) { move(i, next); return; }
      }
    }
    push(next);
  }
  function schedule() {
    if (!started || queued || restoring || travelling) return;
    queued = true; queueMicrotask(flush);
  }
  function back() {
    if (!started || travelling || index <= 0) return travelling;
    remember(); return move(index - 1);
  }
  function closeModal() {
    if (!started || !current?.modal) return false;
    if (travelling) return true;
    remember();
    if (Number.isInteger(parentIndex) && parentIndex < index) return move(parentIndex);
    for (let i = index - 1; i >= 0; i--) {
      if (entries.has(i) && modalIdentity(entries.get(i)) !== modalIdentity(current)) return move(i);
    }
    return back();
  }
  function start() {
    if (started) return;
    const initial = read(), saved = win.history.state;
    started = true;
    if (matches(saved)) {
      session = saved.session; index = saved.index; parentIndex = saved.parentIndex ?? null; current = saved.screen;
      apply(saved.screen);
    } else {
      session = `${Date.now()}-${Math.random().toString(36).slice(2)}`; index = 0;
      const root = home(); write('replaceState', root);
      const base = {...initial, modal: null};
      if (screenKey(base) !== screenKey(root)) push(base);
      if (initial.modal) push(initial);
    }
  }
  function reset() {
    travelling = false; pending = null; parentIndex = null; entries.clear();
    session = `${Date.now()}-${Math.random().toString(36).slice(2)}`; index = 0;
    write('replaceState', home());
  }
  function onPop(event) {
    if (!started) return;
    const saved = event.state;
    if (!matches(saved)) return;
    travelling = false;
    if (saved.session !== session) {
      // Old screens from a deleted company must never recreate that company or a contract.
      index = 0; parentIndex = null; entries.clear(); pending = null; apply(home()); return;
    }
    index = saved.index; parentIndex = saved.parentIndex ?? null;
    const next = pending || saved.screen; pending = null;
    apply(next);
  }
  win.addEventListener('popstate', onPop);
  return {start, schedule, remember, back, closeModal, reset,
    get travelling() { return travelling; },
    dispose() { started = false; win.removeEventListener('popstate', onPop); }};
}

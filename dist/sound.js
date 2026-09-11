/** Original, quiet UI cues synthesized locally. No recordings or external audio. */
export function createSound() {
  let enabled = true, context = null;
  try { enabled = localStorage.getItem('last-take-sound') !== 'off'; } catch {}
  function unlock() {
    if (!enabled) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      context ??= new Audio();
      if (context.state === 'suspended') context.resume().catch(() => {});
    } catch { /* Sound must never block a game action. */ }
  }
  const cues = { click: [[540, 0, .035]], success: [[523, 0, .10], [659, .09, .12], [784, .18, .16]],
    error: [[230, 0, .12], [180, .10, .14]], notify: [[880, 0, .075], [1175, .12, .13]],
    week: [[392, 0, .08], [523, .13, .11]], complete: [[523, 0, .12], [659, .12, .12], [784, .24, .12], [1046, .36, .23]] };
  function play(name = 'click') {
    if (!enabled || document.hidden) return;
    unlock(); if (!context || context.state !== 'running') return;
    try {
      for (const [frequency, delay, duration] of cues[name] ?? cues.click) {
        const osc = context.createOscillator(), gain = context.createGain(), t = context.currentTime + delay;
        osc.type = 'sine'; osc.frequency.value = frequency;
        gain.gain.setValueAtTime(.0001, t); gain.gain.exponentialRampToValueAtTime(name === 'click' ? .025 : .055, t + .008);
        gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
        osc.connect(gain); gain.connect(context.destination); osc.start(t); osc.stop(t + duration + .02);
        osc.onended = () => { osc.disconnect(); gain.disconnect(); };
      }
    } catch {}
  }
  return { get enabled() { return enabled; }, unlock, play,
    toggle() { enabled = !enabled; try { localStorage.setItem('last-take-sound', enabled ? 'on' : 'off'); } catch {} if (enabled) play('success'); return enabled; } };
}

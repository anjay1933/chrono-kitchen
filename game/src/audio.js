// All kitchen sound effects are synthesised with WebAudio oscillators and noise,
// so the game ships no audio files and stays fully offline. The context is
// created lazily on the first user gesture; silent failure keeps headless runs
// (and screenshots) free of console errors.
export class KitchenAudio {
  constructor() {
    this.context = null;
    this.muted = false;
  }

  ensureContext() {
    if (this.context) return this.context;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return null;
      this.context = new AudioContext();
    } catch {
      this.context = null;
    }
    return this.context;
  }

  unlock() {
    const ctx = this.ensureContext();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  tone(frequency, durationSeconds, type = 'sine', gainValue = 0.12) {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(gainValue, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSeconds);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + durationSeconds);
    } catch {
      /* audio is decoration; never break the game */
    }
  }

  chop() {
    this.tone(180, 0.08, 'square', 0.08);
    setTimeout(() => this.tone(140, 0.08, 'square', 0.08), 90);
  }

  sizzle() {
    this.tone(1200, 0.25, 'sawtooth', 0.03);
  }

  ding() {
    this.tone(880, 0.18, 'sine', 0.12);
    setTimeout(() => this.tone(1320, 0.3, 'sine', 0.1), 120);
  }

  serveFanfare() {
    [523, 659, 784].forEach((f, i) => setTimeout(() => this.tone(f, 0.22, 'triangle', 0.12), i * 110));
  }

  errorBuzz() {
    this.tone(110, 0.2, 'sawtooth', 0.08);
  }

  tickTock() {
    this.tone(980, 0.05, 'sine', 0.05);
  }
}

// Synthesised sound: every effect is built with the Web Audio API, so the
// game ships no audio files and makes no network request. The context is
// created lazily on the first user gesture; screenshot staging never
// touches it, so headless renders stay silent.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.alarmNodes = null;
  }

  ensure() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  unlock() {
    this.ensure();
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  tone(freq, seconds, type, volume, slideTo) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + seconds);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + seconds + 0.02);
  }

  /** Short click when a coin is thrown. */
  coinThrow() {
    this.tone(1400, 0.08, 'square', 0.12, 900);
  }

  /** Bright clink when a coin lands. */
  coinLand() {
    this.tone(2400, 0.12, 'sine', 0.18, 1800);
    this.tone(3200, 0.1, 'sine', 0.1, 2600);
  }

  /** Warm chime when bonus loot is lifted. */
  pickup() {
    this.tone(660, 0.12, 'sine', 0.2);
    this.tone(990, 0.18, 'sine', 0.16);
  }

  /** Rising crack when the Sapphire case opens. */
  crack() {
    this.tone(420, 0.3, 'triangle', 0.22, 1250);
    this.tone(840, 0.25, 'sine', 0.12, 1600);
  }

  /** Harsh buzz when the EMP fires. */
  emp() {
    this.tone(180, 0.35, 'sawtooth', 0.2, 60);
  }

  /** Soft thud when the thief is spotted. */
  spotted() {
    this.tone(220, 0.15, 'square', 0.16, 110);
  }

  /** Low sting for the caught screen. */
  caught() {
    this.tone(196, 0.5, 'sawtooth', 0.22, 98);
    this.tone(147, 0.7, 'sawtooth', 0.18, 73);
  }

  /** Little fanfare for a cleared level. */
  win() {
    [523, 659, 784, 1047].forEach((freq, i) => {
      setTimeout(() => this.tone(freq, 0.22, 'triangle', 0.2), i * 110);
    });
  }

  /** Two-tone alarm loop while the meter is high; call with the level 0-100. */
  alarm(level) {
    if (!this.ctx || this.muted) return;
    if (level < 55) {
      this.stopAlarm();
      return;
    }
    if (this.alarmNodes) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 620;
    lfo.type = 'sine';
    lfo.frequency.value = 2.2;
    lfoGain.gain.value = 180;
    gain.gain.value = 0.045;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start();
    lfo.start();
    this.alarmNodes = { osc, gain, lfo };
  }

  stopAlarm() {
    if (!this.alarmNodes) return;
    try {
      this.alarmNodes.osc.stop();
      this.alarmNodes.lfo.stop();
    } catch {
      // Already stopped.
    }
    this.alarmNodes = null;
  }
}

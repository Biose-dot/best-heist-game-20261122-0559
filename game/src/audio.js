// Velvet Vault — synthesized sound.
// One clear job: every sound the game makes, built with WebAudio
// oscillators and filtered noise. No audio files, no network, and the
// whole board stays silent until the player first presses a key.

export function createSoundBoard() {
  let ctx = null;
  let muted = false;
  let alarmOsc = null;
  let alarmGain = null;

  function ensureContext() {
    if (ctx) return ctx;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    ctx = new AudioContext();
    return ctx;
  }

  function tone(freq, dur, type, gainValue, slideTo) {
    if (muted) return;
    const ac = ensureContext();
    if (!ac) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + dur);
    gain.gain.setValueAtTime(gainValue, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + dur + 0.02);
  }

  function noiseBurst(dur, gainValue, filterFreq) {
    if (muted) return;
    const ac = ensureContext();
    if (!ac) return;
    const len = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buffer = ac.createBuffer(1, len, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    src.buffer = buffer;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(gainValue, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    src.connect(filter).connect(gain).connect(ac.destination);
    src.start();
  }

  return {
    unlock() {
      const ac = ensureContext();
      if (ac && ac.state === 'suspended') ac.resume();
    },
    toggleMute() {
      muted = !muted;
      if (muted) this.setAlarmLevel(0);
      return muted;
    },
    isMuted() {
      return muted;
    },
    footstep() {
      noiseBurst(0.05, 0.05, 900);
    },
    coinClink() {
      tone(2400, 0.09, 'sine', 0.12);
      setTimeout(() => tone(3100, 0.12, 'sine', 0.1), 70);
    },
    pickup() {
      tone(660, 0.1, 'triangle', 0.14);
      setTimeout(() => tone(990, 0.14, 'triangle', 0.14), 80);
    },
    sapphire() {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'sine', 0.14), i * 90));
    },
    emp() {
      tone(1200, 0.4, 'sawtooth', 0.07, 120);
      noiseBurst(0.25, 0.08, 2400);
    },
    spotted() {
      tone(880, 0.16, 'square', 0.08, 1320);
    },
    caught() {
      [392, 311, 233, 175].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'sawtooth', 0.11), i * 140));
    },
    win() {
      [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => tone(f, 0.28, 'triangle', 0.13), i * 110));
    },
    levelClear() {
      [784, 988, 1175].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'triangle', 0.12), i * 100));
    },
    // A quiet pulsing tone that tracks the alarm meter; call every frame.
    setAlarmLevel(level01) {
      const ac = ctx;
      if (!ac) return;
      if (muted || level01 <= 0.02) {
        if (alarmOsc) {
          try { alarmOsc.stop(); } catch { /* already stopped */ }
          alarmOsc = null;
          alarmGain = null;
        }
        return;
      }
      if (!alarmOsc) {
        alarmOsc = ac.createOscillator();
        alarmGain = ac.createGain();
        alarmOsc.type = 'sine';
        alarmOsc.connect(alarmGain).connect(ac.destination);
        alarmOsc.start();
      }
      const freq = 220 + level01 * 440;
      alarmOsc.frequency.setTargetAtTime(freq, ac.currentTime, 0.08);
      alarmGain.gain.setTargetAtTime(0.015 + level01 * 0.05, ac.currentTime, 0.1);
    },
  };
}

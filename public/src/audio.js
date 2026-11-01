// GRIMGE Prototype — Zero-Asset Web Audio API Synthesizer
export class SoundManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.initialized = false;
    this.noiseCache = new Map(); // noise buffers are built once per kind and reused (no 20 KB buffer per sound)
    this.voiceTimes = [];
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  ensureContext() {
    if (!this.initialized) this.init();
    // Resume at most every 2 s (each blocked resume() left a rejected promise and a console warning behind).
    const now = performance.now();
    if (this.ctx && this.ctx.state === 'suspended' && now - (this.lastResume ?? -1e9) > 2000) {
      this.lastResume = now;
      this.ctx.resume()?.catch?.(() => {});
    }
  }

  // A sound is only built while the context actually plays (bug, 1 Nov 2026: with a suspended context — tab in the
  // background, autoplay blocked — every sound left its nodes and a fresh noise buffer behind, the memory grew until
  // the tab could crash and reload into the hub). At most 40 voices per second.
  canPlay() {
    if (!this.ctx || this.ctx.state !== 'running') return false;
    const now = this.ctx.currentTime; while (this.voiceTimes.length && now - this.voiceTimes[0] > 1) this.voiceTimes.shift();
    if (this.voiceTimes.length >= 40) return false;
    this.voiceTimes.push(now); return true;
  }
  noise(key, size, fill) {
    let b = this.noiseCache.get(key + size); if (b) return b;
    b = this.ctx.createBuffer(1, size, this.ctx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < size; i++) d[i] = fill(i, size);
    this.noiseCache.set(key + size, b); return b;
  }

  // Melee slash swoosh
  playSlash(pitch = 1.0) {
    this.ensureContext();
    if (!this.canPlay()) return;
    const t = this.ctx.currentTime;

    // Noise buffer for swoosh texture
    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.noise('slash', Math.round(bufferSize), (i, n) => (Math.random() * 2 - 1) * Math.exp(-i / (n * 0.4)));

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400 * pitch, t);
    filter.frequency.exponentialRampToValueAtTime(300, t + 0.12);
    filter.Q.setValueAtTime(2, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
  }

  // Heavy Melee impact
  playImpact(isCrit = false) {
    this.ensureContext();
    if (!this.canPlay()) return;
    const t = this.ctx.currentTime;

    // Low sub-thud
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isCrit ? 160 : 120, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + (isCrit ? 0.25 : 0.18));

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(isCrit ? 0.9 : 0.7, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + (isCrit ? 0.25 : 0.18));

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.3);

    // Crunch noise
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
    const buffer = this.noise('impact', Math.round(bufferSize), () => (Math.random() * 2 - 1) * 0.8);
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.frequency.linearRampToValueAtTime(100, t + 0.08);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(isCrit ? 0.7 : 0.4, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(t);
  }

  // Jump / Dash whoosh
  playJump() {
    this.ensureContext();
    if (!this.canPlay()) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(450, t + 0.12);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.13);
  }

  playDash() {
    this.ensureContext();
    if (!this.canPlay()) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.18);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.19);
  }

  // Rune drawing ethereal bell / point chime
  playRuneChime(freq = 520) {
    this.ensureContext();
    if (!this.canPlay()) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  // Rune successfully recognized: triumphant harmonic chord
  playRuneSuccess() {
    this.ensureContext();
    if (!this.canPlay()) return;
    const t = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.50]; // C Major arpeggio
    freqs.forEach((f, i) => {
      const st = t + i * 0.05;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, st);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25, st);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(st);
      osc.stop(st + 0.45);
    });
  }

  // Rune failed recognition: low muted buzz
  playRuneFail() {
    this.ensureContext();
    if (!this.canPlay()) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.linearRampToValueAtTime(80, t + 0.2);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  // Spell cast audio by type
  playSpell(spellType) {
    this.ensureContext();
    if (!this.canPlay()) return;
    const t = this.ctx.currentTime;

    switch (spellType) {
      case 'fireball':
      case 'ignis': {
        // Boom + fiery hiss
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(45, t + 0.35);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.7, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.36);
        break;
      }
      case 'ventus':
      case 'gale': {
        // High-velocity wind burst
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.3);
        const buffer = this.noise('spell', Math.round(bufferSize), () => Math.random() * 2 - 1);

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(600, t);
        filter.frequency.exponentialRampToValueAtTime(1800, t + 0.15);
        filter.frequency.exponentialRampToValueAtTime(300, t + 0.3);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        noise.start(t);
        break;
      }
      case 'fulgur':
      case 'lightning': {
        // Electric crackle snap
        const osc = this.ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, t);
        osc.frequency.setValueAtTime(220, t + 0.04);
        osc.frequency.setValueAtTime(660, t + 0.08);
        osc.frequency.exponentialRampToValueAtTime(60, t + 0.25);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.6, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.26);
        break;
      }
      case 'firestorm':
      case 'meteor':
      case 'cataclysm': {
        // Deep cataclysmic explosion + thunder
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(25, t + 0.6);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.9, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.65);
        break;
      }
      default: {
        this.playSlash(1.2);
        break;
      }
    }
  }

  // Tower Laser shot
  playTowerShot() {
    this.ensureContext();
    if (!this.canPlay()) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.15);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.16);
  }
}

export const audio = new SoundManager();

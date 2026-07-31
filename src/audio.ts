/* Moteur audio : musique d'ambiance + effets sonores générés via Web Audio API */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicGain!: GainNode;
  private sfxGain!: GainNode;
  private musicTimer: number | null = null;
  private tick = 0;
  musicOn = true;
  sfxOn = true;

  private ensure(): AudioContext | null {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.9;
        this.master.connect(this.ctx.destination);
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.22;
        this.musicGain.connect(this.master);
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.5;
        this.sfxGain.connect(this.master);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  /** À appeler lors de la première interaction utilisateur */
  unlock() {
    const ctx = this.ensure();
    if (ctx && this.musicOn && this.musicTimer === null) this.startMusic();
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    dest: GainNode,
    when = 0,
    slideTo?: number
  ) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(dest);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  private noise(dur: number, filterFreq: number, gain: number, when = 0) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    src.start(t0);
  }

  /* ---------- Effets sonores ---------- */

  select() {
    if (!this.sfxOn) return;
    this.tone(740, 0.08, 'triangle', 0.25, this.sfxGain);
    this.tone(1480, 0.06, 'sine', 0.1, this.sfxGain, 0.01);
  }

  deselect() {
    if (!this.sfxOn) return;
    this.tone(520, 0.07, 'triangle', 0.18, this.sfxGain);
  }

  match() {
    if (!this.sfxOn) return;
    this.tone(660, 0.14, 'triangle', 0.3, this.sfxGain);
    this.tone(880, 0.16, 'triangle', 0.28, this.sfxGain, 0.07);
    this.tone(1320, 0.2, 'sine', 0.18, this.sfxGain, 0.14);
    this.noise(0.12, 4500, 0.12, 0.02);
  }

  error() {
    if (!this.sfxOn) return;
    this.tone(180, 0.16, 'sawtooth', 0.12, this.sfxGain);
    this.tone(140, 0.18, 'square', 0.07, this.sfxGain, 0.03);
  }

  locked() {
    if (!this.sfxOn) return;
    this.tone(160, 0.08, 'square', 0.08, this.sfxGain);
  }

  shuffle() {
    if (!this.sfxOn) return;
    this.noise(0.35, 1800, 0.25);
    this.noise(0.3, 2600, 0.18, 0.12);
    this.tone(420, 0.25, 'sine', 0.1, this.sfxGain, 0.05, 640);
  }

  hint() {
    if (!this.sfxOn) return;
    [880, 1108.7, 1318.5].forEach((f, i) => this.tone(f, 0.18, 'sine', 0.16, this.sfxGain, i * 0.08));
  }

  undo() {
    if (!this.sfxOn) return;
    this.tone(600, 0.12, 'triangle', 0.16, this.sfxGain, 0, 380);
  }

  win() {
    if (!this.sfxOn) return;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
    notes.forEach((f, i) => {
      this.tone(f, 0.5, 'triangle', 0.25, this.sfxGain, i * 0.12);
      this.tone(f / 2, 0.6, 'sine', 0.12, this.sfxGain, i * 0.12);
    });
    this.noise(0.5, 6000, 0.1, 0.7);
  }

  /* ---------- Musique d'ambiance ---------- */

  private musicStep() {
    const ctx = this.ensure();
    if (!ctx || !this.musicOn) return;
    // Gamme pentatonique chinoise (Gong) en ré
    const scale = [293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25];
    this.tick++;

    // Pincements de guzheng (1 à 2 notes douces)
    const n = Math.random() < 0.35 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const f = scale[Math.floor(Math.random() * scale.length)];
      const delay = i * (0.3 + Math.random() * 0.4);
      this.tone(f, 1.6, 'triangle', 0.12, this.musicGain, delay);
      this.tone(f * 2, 1.1, 'sine', 0.04, this.musicGain, delay + 0.01);
    }

    // Nappe grave périodique
    if (this.tick % 4 === 1) {
      this.tone(73.42, 5.5, 'sine', 0.09, this.musicGain);
      this.tone(110, 5.0, 'sine', 0.05, this.musicGain, 0.4);
    }
    // Petite cloche occasionnelle
    if (this.tick % 7 === 3) {
      this.tone(1174.66, 2.2, 'sine', 0.05, this.musicGain, 0.6);
    }
  }

  startMusic() {
    if (this.musicTimer !== null) return;
    this.musicStep();
    this.musicTimer = window.setInterval(() => this.musicStep(), 2100);
  }

  stopMusic() {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  setMusic(on: boolean) {
    this.musicOn = on;
    if (on) {
      this.ensure();
      this.startMusic();
    } else {
      this.stopMusic();
    }
  }

  setSfx(on: boolean) {
    this.sfxOn = on;
  }
}

export const audio = new AudioEngine();

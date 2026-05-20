// audio.js — синтезированные звуковые эффекты через Web Audio API
// Никаких файлов — всё генерируется в браузере.

const Audio = {
  ctx: null,
  enabled: true,
  masterGain: null,

  init() {
    // Загружаем состояние mute
    try {
      const saved = localStorage.getItem('sttm_audio_enabled');
      if (saved === 'false') this.enabled = false;
    } catch (e) {}
  },

  // Ленивая инициализация контекста (после первого user gesture, чтобы iOS не ругался)
  ensureCtx() {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.3;
        this.masterGain.connect(this.ctx.destination);
      } catch (e) {
        console.warn('Web Audio API not supported');
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  toggle() {
    this.enabled = !this.enabled;
    try { localStorage.setItem('sttm_audio_enabled', String(this.enabled)); } catch (e) {}
    return this.enabled;
  },

  isEnabled() {
    return this.enabled;
  },

  // Базовый блип
  _beep(freq, duration, type = 'sine', volume = 1) {
    if (!this.enabled) return;
    this.ensureCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + duration);
  },

  // Слайд частоты (для лазерных эффектов)
  _sweep(freqStart, freqEnd, duration, type = 'sawtooth', volume = 1) {
    if (!this.enabled) return;
    this.ensureCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freqEnd, this.ctx.currentTime + duration);
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + duration);
  },

  // Шумовой эффект (для взрывов, ударов)
  _noise(duration, volume = 1, filterFreq = 1000) {
    if (!this.enabled) return;
    this.ensureCtx();
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;

    const gain = this.ctx.createGain();
    gain.gain.value = volume;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    source.start(this.ctx.currentTime);
  },

  // === Игровые звуки ===

  // Сбор объекта (короткий приятный блип)
  collect() {
    this._beep(800, 0.08, 'sine', 0.4);
    setTimeout(() => this._beep(1200, 0.08, 'sine', 0.3), 40);
  },

  // Сбор крупного объекта (спутник, +10)
  collectBig() {
    this._beep(600, 0.06, 'sine', 0.4);
    setTimeout(() => this._beep(900, 0.06, 'sine', 0.4), 30);
    setTimeout(() => this._beep(1400, 0.1, 'sine', 0.4), 60);
  },

  // Метеорит заблокирован щитом
  shieldBlock() {
    this._noise(0.15, 0.3, 500);
    this._beep(180, 0.1, 'square', 0.2);
  },

  // Спутник получил урон
  damage() {
    this._sweep(400, 80, 0.3, 'sawtooth', 0.4);
  },

  // Щит сломан
  shieldBroken() {
    this._sweep(300, 60, 0.5, 'square', 0.5);
    setTimeout(() => this._noise(0.3, 0.4, 800), 100);
  },

  // Запчасть подобрана (ремонт)
  repair() {
    this._beep(500, 0.06, 'triangle', 0.3);
    setTimeout(() => this._beep(700, 0.06, 'triangle', 0.3), 50);
    setTimeout(() => this._beep(1000, 0.08, 'triangle', 0.3), 100);
  },

  // Новая волна
  waveStart() {
    this._beep(300, 0.1, 'sine', 0.3);
    setTimeout(() => this._beep(450, 0.1, 'sine', 0.3), 100);
    setTimeout(() => this._beep(600, 0.15, 'sine', 0.3), 200);
  },

  // Победа
  victory() {
    const notes = [523, 659, 784, 1047]; // C E G C
    notes.forEach((freq, i) => {
      setTimeout(() => this._beep(freq, 0.2, 'sine', 0.4), i * 120);
    });
  },

  // Game Over
  gameOver() {
    const notes = [400, 320, 250, 180];
    notes.forEach((freq, i) => {
      setTimeout(() => this._beep(freq, 0.25, 'sawtooth', 0.35), i * 150);
    });
  },

  // Клик кнопки
  click() {
    this._beep(800, 0.04, 'square', 0.15);
  },
};

Audio.init();

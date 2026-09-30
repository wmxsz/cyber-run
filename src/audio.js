export default class SoundEngine {
    constructor() {
      this.ctx = null;
      this.muted = false;
      this.bgmTimer = null;
      this.bgmStep = 0;
      this.isPlayingBgm = false;
    }

    init() {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    toggleMute() {
      this.muted = !this.muted;
      if (this.muted && this.ctx) {
        this.ctx.suspend();
      } else if (!this.muted && this.ctx) {
        this.ctx.resume();
      }
      return this.muted;
    }

    // 아이템 수집 사운드 (영롱한 아르페지오 신스음)
    playCollect() {
      if (this.muted || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.08); // A5
      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.16); // D6

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.26);
    }

    // 쉴드 / 파워업 획득음
    playPowerup() {
      if (this.muted || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.35);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    }

    // 점프 사운드
    playJump() {
      if (this.muted || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.18);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    }

    // 충돌 사운드 (노이즈 + 저주파 디스토션)
    playHit() {
      if (this.muted || !this.ctx) return;
      const now = this.ctx.currentTime;

      // 화이트 노이즈 버스트
      const bufferSize = this.ctx.sampleRate * 0.2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(80, now + 0.2);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);

      // 저음 임팩트
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sawtooth';
      subOsc.frequency.setValueAtTime(140, now);
      subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.25);
      subGain.gain.setValueAtTime(0.4, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.25);
    }

    // 게임 오버 사운드
    playGameOver() {
      if (this.muted || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.7);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.8);
    }

    // 신스웨이브 BGM 시퀀서 (루프)
    startBGM() {
      if (this.isPlayingBgm) return;
      this.isPlayingBgm = true;
      this.bgmStep = 0;

      // 80년대 스타일 신스웨이브 16단계 베이스 시퀀스
      const bassNotes = [65.41, 65.41, 65.41, 77.78, 65.41, 65.41, 87.31, 77.78, 65.41, 65.41, 65.41, 77.78, 58.27, 58.27, 87.31, 98.00];

      const intervalMs = 135; // 약 110 BPM 16비트
      this.bgmTimer = setInterval(() => {
        if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
        const now = this.ctx.currentTime;

        // 베이스 신스 펄스
        const freq = bassNotes[this.bgmStep % bassNotes.length];
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, now);
        filter.frequency.exponentialRampToValueAtTime(140, now + 0.12);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.13);

        // 하이햇 비트 (매 짝수 비트)
        if (this.bgmStep % 2 === 1) {
          const hihatOsc = this.ctx.createOscillator();
          const hihatGain = this.ctx.createGain();
          hihatOsc.type = 'triangle';
          hihatOsc.frequency.setValueAtTime(7000, now);
          hihatGain.gain.setValueAtTime(0.015, now);
          hihatGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
          hihatOsc.connect(hihatGain);
          hihatGain.connect(this.ctx.destination);
          hihatOsc.start(now);
          hihatOsc.stop(now + 0.05);
        }

        this.bgmStep++;
      }, intervalMs);
    }

    stopBGM() {
      if (this.bgmTimer) {
        clearInterval(this.bgmTimer);
        this.bgmTimer = null;
      }
      this.isPlayingBgm = false;
    }
  }

  
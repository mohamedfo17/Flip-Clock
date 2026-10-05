// Web Audio API Procedural Sound Engine
// Generates authentic mechanical flip clacks, ambient soundscapes, and zen bells 100% offline.

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.isMuted = false;
    this.flapVolume = 0.5;
    this.tickVolume = 0.3;
    this.chimeVolume = 0.6;
    this.tickEnabled = false;

    // Ambient channels: { active, volume, nodes }
    this.ambientTracks = {
      rain: { active: false, volume: 0.4, nodes: null },
      whitenoise: { active: false, volume: 0.3, nodes: null },
      brownnoise: { active: false, volume: 0.4, nodes: null },
      campfire: { active: false, volume: 0.35, nodes: null },
      waves: { active: false, volume: 0.4, nodes: null }
    };
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
  }

  ensureContext() {
    this.init();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 1.0, this.ctx.currentTime, 0.05);
    }
  }

  setFlapVolume(val) {
    this.flapVolume = Math.max(0, Math.min(1, val));
  }

  setTickVolume(val) {
    this.tickVolume = Math.max(0, Math.min(1, val));
  }

  setTickEnabled(enabled) {
    this.tickEnabled = enabled;
  }

  // Authentic tactile mechanical split-flap snap sound
  playFlap() {
    if (this.isMuted || this.flapVolume <= 0) return;
    try {
      this.ensureContext();
      const now = this.ctx.currentTime;

      // 1. Noise burst for card impact
      const bufferSize = this.ctx.sampleRate * 0.04; // 40ms
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400 + Math.random() * 200, now);
      filter.Q.setValueAtTime(2.5, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(this.flapVolume * 0.7, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      noiseSource.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      // 2. Low mechanical snap thud
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.045);

      oscGain.gain.setValueAtTime(this.flapVolume * 0.6, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      osc.connect(oscGain);
      oscGain.connect(this.masterGain);

      noiseSource.start(now);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch (err) {
      console.warn('Audio playback error:', err);
    }
  }

  // Ticking sound for timer
  playTick() {
    if (this.isMuted || !this.tickEnabled || this.tickVolume <= 0) return;
    try {
      this.ensureContext();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.015);

      gain.gain.setValueAtTime(this.tickVolume * 0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.02);
    } catch (e) {}
  }

  // Harmonic Zen singing bowl chime for timer end
  playChime() {
    if (this.isMuted) return;
    try {
      this.ensureContext();
      const now = this.ctx.currentTime;
      const baseFreq = 440; // A4 harmonic root
      const harmonics = [1, 2.01, 2.76, 3.82];
      const gains = [0.4, 0.25, 0.15, 0.08];

      harmonics.forEach((h, idx) => {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq * h, now);

        const initialGain = this.chimeVolume * gains[idx];
        g.gain.setValueAtTime(initialGain, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);

        osc.connect(g);
        g.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 3.3);
      });
    } catch (e) {}
  }

  // --- Ambient Generators ---

  setAmbientTrack(trackName, active, volume) {
    if (!this.ambientTracks[trackName]) return;
    this.ambientTracks[trackName].volume = volume !== undefined ? volume : this.ambientTracks[trackName].volume;
    
    if (active) {
      this.ensureContext();
      if (!this.ambientTracks[trackName].active) {
        this.ambientTracks[trackName].active = true;
        this.startAmbientSound(trackName);
      } else if (this.ambientTracks[trackName].nodes?.gainNode) {
        this.ambientTracks[trackName].nodes.gainNode.gain.setTargetAtTime(
          this.ambientTracks[trackName].volume,
          this.ctx.currentTime,
          0.1
        );
      }
    } else {
      if (this.ambientTracks[trackName].active) {
        this.ambientTracks[trackName].active = false;
        this.stopAmbientSound(trackName);
      }
    }
  }

  startAmbientSound(trackName) {
    const track = this.ambientTracks[trackName];
    const now = this.ctx.currentTime;

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(track.volume, now + 0.6);
    gainNode.connect(this.masterGain);

    if (trackName === 'whitenoise') {
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(gainNode);
      source.start();
      track.nodes = { source, gainNode };
    } else if (trackName === 'brownnoise') {
      // Brownian / red noise: integrated white noise
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5; // Gain compensation
      }
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(650, now);

      source.connect(lp);
      lp.connect(gainNode);
      source.start();
      track.nodes = { source, gainNode };
    } else if (trackName === 'rain') {
      // Rain: filtered pink noise + slight randomized modulation
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, now);

      source.connect(filter);
      filter.connect(gainNode);
      source.start();
      track.nodes = { source, gainNode };
    } else if (trackName === 'campfire') {
      // Low rumble + crackle generator
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        // base noise
        let val = (Math.random() * 2 - 1) * 0.15;
        // random crackle spikes
        if (Math.random() < 0.0018) {
          val += (Math.random() > 0.5 ? 1 : -1) * (0.6 + Math.random() * 0.4);
        }
        data[i] = val;
      }
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(900, now);
      filter.Q.setValueAtTime(1.2, now);

      source.connect(filter);
      filter.connect(gainNode);
      source.start();
      track.nodes = { source, gainNode };
    } else if (trackName === 'waves') {
      // Modulated ocean surf
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (last + (0.05 * white)) / 1.05;
        last = data[i];
      }
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, now);

      // LFO for surf swells (every ~8 seconds)
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(0.12, now);
      lfoGain.gain.setValueAtTime(350, now);

      lfo.connect(filter.frequency);
      lfo.start();

      source.connect(filter);
      filter.connect(gainNode);
      source.start();
      track.nodes = { source, gainNode, lfo };
    }
  }

  stopAmbientSound(trackName) {
    const track = this.ambientTracks[trackName];
    if (!track.nodes) return;
    try {
      const now = this.ctx.currentTime;
      track.nodes.gainNode.gain.linearRampToValueAtTime(0.0001, now + 0.4);
      setTimeout(() => {
        if (track.nodes) {
          if (track.nodes.source) track.nodes.source.stop();
          if (track.nodes.lfo) track.nodes.lfo.stop();
          track.nodes = null;
        }
      }, 500);
    } catch (e) {
      track.nodes = null;
    }
  }

  stopAllAmbient() {
    Object.keys(this.ambientTracks).forEach(track => {
      this.setAmbientTrack(track, false);
    });
  }
}

export const soundEngine = new SoundEngine();

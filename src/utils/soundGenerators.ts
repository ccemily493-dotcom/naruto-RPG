// Procedural Ambience and SFX Sound Generators using the Web Audio API
// Provides zero-external-dependency, instant, rich procedural audio for all environments and ninja techniques

interface AmbienceSession {
  id: string;
  environment: string;
  gainNode: GainNode;
  stopCallbacks: Array<() => void>;
  dripInterval?: any;
}

class SoundGeneratorManager {
  private ctx: AudioContext | null = null;
  private ambienceGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private activeAmbienceSessions: AmbienceSession[] = [];
  private currentEnvironment = 'forest';
  private ambienceVolume = 0.4;
  private sfxVolume = 0.75;
  private isAmbienceMuted = false;
  private isSfxMuted = false;

  public init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.ambienceGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();

        this.ambienceGain.gain.setValueAtTime(
          this.isAmbienceMuted ? 0 : this.ambienceVolume,
          this.ctx.currentTime,
        );
        this.sfxGain.gain.setValueAtTime(
          this.isSfxMuted ? 0 : this.sfxVolume,
          this.ctx.currentTime,
        );

        this.ambienceGain.connect(this.ctx.destination);
        this.sfxGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public getContext(): AudioContext | null {
    this.init();
    return this.ctx;
  }

  public setAmbienceVolume(val: number) {
    this.ambienceVolume = Math.max(0, Math.min(1, val));
    if (this.ctx && this.ambienceGain && !this.isAmbienceMuted) {
      this.ambienceGain.gain.setTargetAtTime(this.ambienceVolume, this.ctx.currentTime, 0.05);
    }
  }

  public setSfxVolume(val: number) {
    this.sfxVolume = Math.max(0, Math.min(1, val));
    if (this.ctx && this.sfxGain && !this.isSfxMuted) {
      this.sfxGain.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.05);
    }
  }

  public toggleAmbienceMute(): boolean {
    this.isAmbienceMuted = !this.isAmbienceMuted;
    if (this.ctx && this.ambienceGain) {
      const target = this.isAmbienceMuted ? 0 : this.ambienceVolume;
      this.ambienceGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
    }
    return this.isAmbienceMuted;
  }

  public toggleSfxMute(): boolean {
    this.isSfxMuted = !this.isSfxMuted;
    if (this.ctx && this.sfxGain) {
      const target = this.isSfxMuted ? 0 : this.sfxVolume;
      this.sfxGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
    }
    return this.isSfxMuted;
  }

  public getCurrentEnvironment(): string {
    return this.currentEnvironment;
  }

  // --- AMBIENCE CONTINUOUS SOUNDSCAPE & INDEPENDENT CROSSFADING ---

  public startAmbience(environment: string, intensity = 0.4, crossfadeDuration = 2.0) {
    this.crossfadeAmbience(environment, intensity, crossfadeDuration);
  }

  public crossfadeAmbience(environment: string, intensity = 0.4, crossfadeDuration = 2.0) {
    this.init();
    if (!this.ctx || !this.ambienceGain) return;

    // If already running this environment and has an active session, just adjust volume
    if (
      this.currentEnvironment === environment &&
      this.activeAmbienceSessions.some((s) => s.environment === environment)
    ) {
      this.setAmbienceVolume(intensity);
      return;
    }

    const now = this.ctx.currentTime;
    const fadeTime = Math.max(0.5, crossfadeDuration);

    // Fade out existing sessions smoothly
    const outgoingSessions = [...this.activeAmbienceSessions];
    outgoingSessions.forEach((session) => {
      try {
        session.gainNode.gain.cancelScheduledValues(now);
        session.gainNode.gain.setValueAtTime(session.gainNode.gain.value, now);
        session.gainNode.gain.linearRampToValueAtTime(0.0001, now + fadeTime);
      } catch (err) {
        console.warn('Error fading out ambience session:', err);
      }

      setTimeout(
        () => {
          if (session.dripInterval) {
            clearTimeout(session.dripInterval);
          }
          session.stopCallbacks.forEach((stopFn) => {
            try {
              stopFn();
            } catch {}
          });
          try {
            session.gainNode.disconnect();
          } catch {}
          this.activeAmbienceSessions = this.activeAmbienceSessions.filter(
            (s) => s.id !== session.id,
          );
        },
        fadeTime * 1000 + 100,
      );
    });

    this.currentEnvironment = environment;
    this.setAmbienceVolume(intensity);

    if (environment === 'silence') {
      return;
    }

    // Create a new dedicated channel gain node for the incoming environment
    const channelGain = this.ctx.createGain();
    channelGain.gain.setValueAtTime(0, now);
    channelGain.gain.linearRampToValueAtTime(1.0, now + fadeTime);
    channelGain.connect(this.ambienceGain);

    const newSession: AmbienceSession = {
      id: 'amb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      environment,
      gainNode: channelGain,
      stopCallbacks: [],
    };

    this.activeAmbienceSessions.push(newSession);

    // Launch continuous loop sound generators for this session
    switch (environment) {
      case 'rain':
        this.createRainAmbience(newSession);
        break;
      case 'cave':
        this.createCaveAmbience(newSession);
        break;
      case 'village':
        this.createVillageAmbience(newSession);
        break;
      case 'forest_night':
        this.createForestNightAmbience(newSession);
        break;
      case 'ruins':
        this.createRuinsAmbience(newSession);
        break;
      case 'forest':
      default:
        this.createForestAmbience(newSession);
        break;
    }
  }

  public stopAmbience(fadeDuration = 1.0) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.activeAmbienceSessions.forEach((session) => {
      if (session.dripInterval) {
        clearTimeout(session.dripInterval);
      }
      try {
        session.gainNode.gain.cancelScheduledValues(now);
        session.gainNode.gain.setValueAtTime(session.gainNode.gain.value, now);
        session.gainNode.gain.linearRampToValueAtTime(0.0001, now + fadeDuration);
      } catch {}
      setTimeout(
        () => {
          session.stopCallbacks.forEach((stopFn) => {
            try {
              stopFn();
            } catch {}
          });
          try {
            session.gainNode.disconnect();
          } catch {}
        },
        fadeDuration * 1000 + 50,
      );
    });
    this.activeAmbienceSessions = [];
  }

  // Helper to create pink/brown continuous noise buffer
  private createNoiseBuffer(duration = 6, type: 'pink' | 'white' | 'brown' = 'pink'): AudioBuffer {
    const ctx = this.ctx!;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0;
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      if (type === 'white') {
        data[i] = white * 0.1;
      } else if (type === 'pink') {
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
        b6 = white * 0.115926;
      } else {
        // Brown noise
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 0.3;
      }
    }
    return buffer;
  }

  // --- CONTINUOUS FOREST LOOP GENERATOR ---
  private createForestAmbience(session: AmbienceSession) {
    const ctx = this.ctx!;

    // 1. Gentle wind through canopy (Pink noise + modulated lowpass)
    const windNoise = ctx.createBufferSource();
    windNoise.buffer = this.createNoiseBuffer(8, 'pink');
    windNoise.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 480;
    windFilter.Q.value = 1.2;

    const windGain = ctx.createGain();
    windGain.gain.value = 0.38;

    // Slow breeze sway LFO
    const breezeLfo = ctx.createOscillator();
    breezeLfo.frequency.value = 0.12;
    const breezeLfoGain = ctx.createGain();
    breezeLfoGain.gain.value = 180;
    breezeLfo.connect(breezeLfoGain);
    breezeLfoGain.connect(windFilter.frequency);

    windNoise.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(session.gainNode);

    windNoise.start();
    breezeLfo.start();

    // 2. Subtle rustling leaves layer (Brown noise + bandpass)
    const leavesNoise = ctx.createBufferSource();
    leavesNoise.buffer = this.createNoiseBuffer(6, 'brown');
    leavesNoise.loop = true;

    const leavesFilter = ctx.createBiquadFilter();
    leavesFilter.type = 'bandpass';
    leavesFilter.frequency.value = 1200;
    leavesFilter.Q.value = 0.8;

    const leavesGain = ctx.createGain();
    leavesGain.gain.value = 0.12;

    leavesNoise.connect(leavesFilter);
    leavesFilter.connect(leavesGain);
    leavesGain.connect(session.gainNode);

    leavesNoise.start();

    // 3. Periodic woodland bird chirps
    const playBirdChirp = () => {
      if (!this.ctx || this.isAmbienceMuted) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const baseFreq = 2200 + Math.random() * 800;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.4, now + 0.05);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, now + 0.12);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

      osc.connect(gain);
      gain.connect(session.gainNode);

      osc.start(now);
      osc.stop(now + 0.14);
    };

    const scheduleBirds = () => {
      session.dripInterval = setTimeout(
        () => {
          playBirdChirp();
          if (Math.random() > 0.4) {
            setTimeout(playBirdChirp, 160);
          }
          scheduleBirds();
        },
        2200 + Math.random() * 3000,
      ) as unknown as number;
    };
    scheduleBirds();

    session.stopCallbacks.push(() => {
      try {
        if (session.dripInterval) clearTimeout(session.dripInterval);
        windNoise.stop();
        breezeLfo.stop();
        leavesNoise.stop();
        windNoise.disconnect();
        breezeLfo.disconnect();
        windFilter.disconnect();
        windGain.disconnect();
        breezeLfoGain.disconnect();
        leavesNoise.disconnect();
        leavesFilter.disconnect();
        leavesGain.disconnect();
      } catch {}
    });
  }

  // --- CONTINUOUS CAVE / SUBTERRANEAN LOOP GENERATOR ---
  private createCaveAmbience(session: AmbienceSession) {
    const ctx = this.ctx!;

    // 1. Resonant hollow cavern wind (Pink noise + sharp resonant bandpass)
    const cavernNoise = ctx.createBufferSource();
    cavernNoise.buffer = this.createNoiseBuffer(8, 'pink');
    cavernNoise.loop = true;

    const cavernFilter = ctx.createBiquadFilter();
    cavernFilter.type = 'bandpass';
    cavernFilter.frequency.value = 210;
    cavernFilter.Q.value = 3.8; // High resonance creates deep cavernous acoustics

    const cavernGain = ctx.createGain();
    cavernGain.gain.value = 0.42;

    // Cavern resonance breath modulation
    const draftLfo = ctx.createOscillator();
    draftLfo.frequency.value = 0.08;
    const draftLfoGain = ctx.createGain();
    draftLfoGain.gain.value = 45;
    draftLfo.connect(draftLfoGain);
    draftLfoGain.connect(cavernFilter.frequency);

    cavernNoise.connect(cavernFilter);
    cavernFilter.connect(cavernGain);
    cavernGain.connect(session.gainNode);

    cavernNoise.start();
    draftLfo.start();

    // 2. Subterranean sub-bass pressure drone (48Hz deep resonance)
    const subDrone = ctx.createOscillator();
    subDrone.type = 'sine';
    subDrone.frequency.value = 48;

    const subGain = ctx.createGain();
    subGain.gain.value = 0.15;

    subDrone.connect(subGain);
    subGain.connect(session.gainNode);
    subDrone.start();

    // 3. Periodic water droplets dripping into the cavern with echo
    const scheduleDrip = () => {
      session.dripInterval = setTimeout(
        () => {
          if (this.ctx && !this.isAmbienceMuted) {
            this.playWaterDrip(session.gainNode);
          }
          scheduleDrip();
        },
        3800 + Math.random() * 2800,
      ) as unknown as number;
    };
    scheduleDrip();

    session.stopCallbacks.push(() => {
      try {
        cavernNoise.stop();
        draftLfo.stop();
        subDrone.stop();
        cavernNoise.disconnect();
        cavernFilter.disconnect();
        cavernGain.disconnect();
        draftLfo.disconnect();
        draftLfoGain.disconnect();
        subDrone.disconnect();
        subGain.disconnect();
      } catch {}
    });
  }

  private playWaterDrip(targetNode: GainNode) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const freq = 1150 + Math.random() * 450;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.7, now + 0.06);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(targetNode);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  // --- CONTINUOUS NIGHT FOREST LOOP GENERATOR ---
  private createForestNightAmbience(session: AmbienceSession) {
    const ctx = this.ctx!;
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(8, 'brown');
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;

    const windGain = ctx.createGain();
    windGain.gain.value = 0.38;

    noise.connect(filter);
    filter.connect(windGain);
    windGain.connect(session.gainNode);
    noise.start();

    // High subtle cricket pulse
    const cricket = ctx.createOscillator();
    cricket.type = 'sine';
    cricket.frequency.value = 4500;
    const cricketGain = ctx.createGain();
    cricketGain.gain.value = 0.015;

    const pulse = ctx.createOscillator();
    pulse.frequency.value = 8;
    const pulseGain = ctx.createGain();
    pulseGain.gain.value = 0.012;
    pulse.connect(pulseGain);
    pulseGain.connect(cricketGain.gain);

    cricket.connect(cricketGain);
    cricketGain.connect(session.gainNode);

    cricket.start();
    pulse.start();

    session.stopCallbacks.push(() => {
      try {
        noise.stop();
        cricket.stop();
        pulse.stop();
        noise.disconnect();
        filter.disconnect();
        windGain.disconnect();
        cricket.disconnect();
        cricketGain.disconnect();
        pulse.disconnect();
        pulseGain.disconnect();
      } catch {}
    });
  }

  // --- CONTINUOUS RAIN LOOP GENERATOR ---
  private createRainAmbience(session: AmbienceSession) {
    const ctx = this.ctx!;
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(6, 'white');
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    filter.Q.value = 0.6;

    const rainGain = ctx.createGain();
    rainGain.gain.value = 0.42;

    noise.connect(filter);
    filter.connect(rainGain);
    rainGain.connect(session.gainNode);
    noise.start();

    session.stopCallbacks.push(() => {
      try {
        noise.stop();
        noise.disconnect();
        filter.disconnect();
        rainGain.disconnect();
      } catch {}
    });
  }

  // --- CONTINUOUS VILLAGE LOOP GENERATOR ---
  private createVillageAmbience(session: AmbienceSession) {
    const ctx = this.ctx!;
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(6, 'pink');
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 580;

    const villageGain = ctx.createGain();
    villageGain.gain.value = 0.28;

    noise.connect(filter);
    filter.connect(villageGain);
    villageGain.connect(session.gainNode);
    noise.start();

    session.stopCallbacks.push(() => {
      try {
        noise.stop();
        noise.disconnect();
        filter.disconnect();
        villageGain.disconnect();
      } catch {}
    });
  }

  // --- CONTINUOUS RUINS LOOP GENERATOR ---
  private createRuinsAmbience(session: AmbienceSession) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 52;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 110;

    const ruinsGain = ctx.createGain();
    ruinsGain.gain.value = 0.22;

    osc.connect(filter);
    filter.connect(ruinsGain);
    ruinsGain.connect(session.gainNode);
    osc.start();

    session.stopCallbacks.push(() => {
      try {
        osc.stop();
        osc.disconnect();
        filter.disconnect();
        ruinsGain.disconnect();
      } catch {}
    });
  }

  // --- PROCEDURAL SFX SYNTHESIZERS ---

  public playSFX(event: string, intensity = 0.8) {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isSfxMuted) return;

    const now = this.ctx.currentTime;
    const gain = Math.max(0.1, Math.min(1.0, intensity));

    switch (event) {
      case 'mokuton_grow':
        this.synthMokuton(now, gain);
        break;
      case 'chakra_surge':
        this.synthChakraSurge(now, gain);
        break;
      case 'raiton_spark':
        this.synthRaiton(now, gain);
        break;
      case 'kunai_throw':
        this.synthKunai(now, gain);
        break;
      case 'branch_crack':
        this.synthBranchCrack(now, gain);
        break;
      case 'impact_heavy':
        this.synthImpactHeavy(now, gain);
        break;
      case 'body_collapse':
        this.synthBodyCollapse(now, gain);
        break;
      case 'wind_gust':
        this.synthWindGust(now, gain);
        break;
      case 'susanoo_hum':
        this.synthSusanoo(now, gain);
        break;
      default:
        this.synthGenericImpact(now, gain);
        break;
    }
  }

  private synthMokuton(t: number, intensity: number) {
    const ctx = this.ctx!;
    // Wood groan & deep earth root burst
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.45);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, t);
    filter.frequency.linearRampToValueAtTime(100, t + 0.5);

    g.gain.setValueAtTime(0.5 * intensity, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

    osc.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain!);

    osc.start(t);
    osc.stop(t + 0.6);
  }

  private synthChakraSurge(t: number, intensity: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.35);

    g.gain.setValueAtTime(0.01, t);
    g.gain.linearRampToValueAtTime(0.4 * intensity, t + 0.15);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(g);
    g.connect(this.sfxGain!);

    osc.start(t);
    osc.stop(t + 0.5);
  }

  private synthRaiton(t: number, intensity: number) {
    const ctx = this.ctx!;
    // High voltage noise burst + square crackle
    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.setValueAtTime(1200, t + 0.05);
    osc.frequency.setValueAtTime(450, t + 0.1);

    g.gain.setValueAtTime(0.45 * intensity, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    osc.connect(g);
    g.connect(this.sfxGain!);

    osc.start(t);
    osc.stop(t + 0.3);
  }

  private synthKunai(t: number, intensity: number) {
    const ctx = this.ctx!;

    // 1. High-speed metallic blade slice (white noise + sharp bandpass filter)
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(0.3, 'white');
    const filter = ctx.createBiquadFilter();
    const gNoise = ctx.createGain();

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(4500, t);
    filter.frequency.exponentialRampToValueAtTime(1200, t + 0.12);
    filter.Q.value = 5.0;

    gNoise.gain.setValueAtTime(0.6 * intensity, t);
    gNoise.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    noise.connect(filter);
    filter.connect(gNoise);
    gNoise.connect(this.sfxGain!);

    noise.start(t);
    noise.stop(t + 0.15);

    // 2. Ninja steel blade ring (high sine ping at 4200Hz)
    const ping = ctx.createOscillator();
    const gPing = ctx.createGain();
    ping.type = 'sine';
    ping.frequency.setValueAtTime(4200, t);
    ping.frequency.exponentialRampToValueAtTime(2800, t + 0.08);

    gPing.gain.setValueAtTime(0.3 * intensity, t);
    gPing.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    ping.connect(gPing);
    gPing.connect(this.sfxGain!);

    ping.start(t);
    ping.stop(t + 0.1);
  }

  private synthBranchCrack(t: number, intensity: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.08);

    g.gain.setValueAtTime(0.6 * intensity, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(g);
    g.connect(this.sfxGain!);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  private synthImpactHeavy(t: number, intensity: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.4);

    g.gain.setValueAtTime(0.8 * intensity, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(g);
    g.connect(this.sfxGain!);

    osc.start(t);
    osc.stop(t + 0.5);
  }

  private synthBodyCollapse(t: number, intensity: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.35);

    g.gain.setValueAtTime(0.5 * intensity, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(g);
    g.connect(this.sfxGain!);

    osc.start(t);
    osc.stop(t + 0.45);
  }

  private synthWindGust(t: number, intensity: number) {
    const ctx = this.ctx!;
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(2, 'pink');
    const filter = ctx.createBiquadFilter();
    const g = ctx.createGain();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(250, t);
    filter.frequency.linearRampToValueAtTime(800, t + 0.4);
    filter.frequency.exponentialRampToValueAtTime(200, t + 1.1);

    g.gain.setValueAtTime(0.05, t);
    g.gain.linearRampToValueAtTime(0.5 * intensity, t + 0.4);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

    noise.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain!);

    noise.start(t);
    noise.stop(t + 1.3);
  }

  private synthSusanoo(t: number, intensity: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(65, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.8);

    g.gain.setValueAtTime(0.05, t);
    g.gain.linearRampToValueAtTime(0.55 * intensity, t + 0.25);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

    osc.connect(g);
    g.connect(this.sfxGain!);

    osc.start(t);
    osc.stop(t + 1.0);
  }

  private synthGenericImpact(t: number, intensity: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.25);

    g.gain.setValueAtTime(0.4 * intensity, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(g);
    g.connect(this.sfxGain!);

    osc.start(t);
    osc.stop(t + 0.35);
  }
}

export const soundManager = new SoundGeneratorManager();

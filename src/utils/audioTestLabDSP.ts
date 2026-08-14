// AudioTestLabDSP: Web Audio API Signal Chain & Impulse Response Generator
export type ReverbEnvironment =
  'none' | 'ryuchi_cave' | 'leaf_forest' | 'valley_end' | 'rain_village' | 'anbu_vault';

export interface EQState {
  subBass: number; // 60Hz
  lowMid: number; // 250Hz
  mid: number; // 1.2kHz
  highMid: number; // 4kHz
  highShelf: number; // 12kHz
}

export interface PannerState {
  x: number;
  y: number;
  z: number;
}

export class AudioTestLabDSP {
  public ctx: AudioContext;
  private currentBuffer: AudioBuffer | null = null;
  private activeSource: AudioBufferSourceNode | null = null;
  private isLooping = false;

  // DSP Nodes
  public eqFilters: BiquadFilterNode[] = [];
  public convolverNode: ConvolverNode;
  public dryGainNode: GainNode;
  public wetGainNode: GainNode;
  public pannerNode: PannerNode;
  public masterGainNode: GainNode;
  public analyserNode: AnalyserNode;

  private onEndedCallback?: () => void;

  constructor() {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioCtx();

    // 1. Initialize 5-Band Equalizer
    const eqFrequencies = [60, 250, 1200, 4000, 12000];
    const eqTypes: BiquadFilterType[] = ['lowshelf', 'peaking', 'peaking', 'peaking', 'highshelf'];

    this.eqFilters = eqFrequencies.map((freq, idx) => {
      const filter = this.ctx.createBiquadFilter();
      filter.type = eqTypes[idx];
      filter.frequency.value = freq;
      filter.Q.value = 1.0;
      filter.gain.value = 0;
      return filter;
    });

    for (let i = 0; i < this.eqFilters.length - 1; i++) {
      this.eqFilters[i].connect(this.eqFilters[i + 1]);
    }

    // 2. Reverb Convolver & Dry/Wet Mixer
    this.convolverNode = this.ctx.createConvolver();
    this.dryGainNode = this.ctx.createGain();
    this.wetGainNode = this.ctx.createGain();
    this.dryGainNode.gain.value = 1.0;
    this.wetGainNode.gain.value = 0.0; // dry by default

    // 3. 3D HRTF Panner
    this.pannerNode = new PannerNode(this.ctx, {
      panningModel: 'HRTF',
      distanceModel: 'inverse',
      positionX: 0,
      positionY: 0,
      positionZ: 1,
    });

    // 4. Master Gain & Analyser
    this.masterGainNode = this.ctx.createGain();
    this.analyserNode = this.ctx.createAnalyser();
    this.analyserNode.fftSize = 2048;
    this.analyserNode.smoothingTimeConstant = 0.8;

    // 5. Connect Signal Chain
    const lastEq = this.eqFilters[this.eqFilters.length - 1];

    lastEq.connect(this.dryGainNode);
    lastEq.connect(this.convolverNode);
    this.convolverNode.connect(this.wetGainNode);

    this.dryGainNode.connect(this.pannerNode);
    this.wetGainNode.connect(this.pannerNode);

    this.pannerNode.connect(this.masterGainNode);
    this.masterGainNode.connect(this.analyserNode);
    this.analyserNode.connect(this.ctx.destination);
  }

  public async resumeContext() {
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  public async loadAudioFromUrl(url: string): Promise<AudioBuffer> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} al cargar ${url}`);
    const arrayBuf = await res.arrayBuffer();
    this.currentBuffer = await this.ctx.decodeAudioData(arrayBuf);
    return this.currentBuffer;
  }

  public playBuffer(buffer?: AudioBuffer, loop = false, onEnded?: () => void) {
    this.resumeContext();
    this.stop();

    const targetBuf = buffer || this.currentBuffer;
    if (!targetBuf) return;

    this.isLooping = loop;
    this.onEndedCallback = onEnded;

    const source = this.ctx.createBufferSource();
    source.buffer = targetBuf;
    source.loop = loop;
    source.connect(this.eqFilters[0]);

    source.onended = () => {
      if (this.activeSource === source) {
        this.activeSource = null;
        if (this.onEndedCallback) this.onEndedCallback();
      }
    };

    source.start(0);
    this.activeSource = source;
  }

  public stop() {
    if (this.activeSource) {
      try {
        this.activeSource.stop();
        this.activeSource.disconnect();
      } catch {}
      this.activeSource = null;
    }
  }

  // --- DSP CONTROLS ---

  public setEQBand(index: number, gainDb: number) {
    if (this.eqFilters[index]) {
      this.eqFilters[index].gain.setTargetAtTime(gainDb, this.ctx.currentTime, 0.05);
    }
  }

  public setReverbEnvironment(env: ReverbEnvironment, wetMix = 0.35) {
    if (env === 'none') {
      this.wetGainNode.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      this.dryGainNode.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.05);
      return;
    }

    const irBuffer = this.generateSyntheticImpulseResponse(env);
    this.convolverNode.buffer = irBuffer;
    this.wetGainNode.gain.setTargetAtTime(wetMix, this.ctx.currentTime, 0.05);
    this.dryGainNode.gain.setTargetAtTime(1 - wetMix * 0.5, this.ctx.currentTime, 0.05);
  }

  public setPannerPosition(x: number, y: number, z: number) {
    this.pannerNode.positionX.setTargetAtTime(x, this.ctx.currentTime, 0.05);
    this.pannerNode.positionY.setTargetAtTime(y, this.ctx.currentTime, 0.05);
    this.pannerNode.positionZ.setTargetAtTime(z, this.ctx.currentTime, 0.05);
  }

  public setMasterVolume(vol: number) {
    this.masterGainNode.gain.setTargetAtTime(
      Math.max(0, Math.min(2, vol)),
      this.ctx.currentTime,
      0.05,
    );
  }

  // --- SYNTHETIC IMPULSE RESPONSE GENERATOR ---

  private generateSyntheticImpulseResponse(env: ReverbEnvironment): AudioBuffer {
    const sampleRate = this.ctx.sampleRate;
    let duration = 1.5;
    let decayRate = 3.0;

    switch (env) {
      case 'ryuchi_cave':
        duration = 3.8;
        decayRate = 1.8;
        break;
      case 'leaf_forest':
        duration = 1.2;
        decayRate = 4.5;
        break;
      case 'valley_end':
        duration = 2.8;
        decayRate = 2.2;
        break;
      case 'rain_village':
        duration = 2.0;
        decayRate = 2.8;
        break;
      case 'anbu_vault':
        duration = 0.6;
        decayRate = 7.0;
        break;
    }

    const length = Math.floor(sampleRate * duration);
    const impulse = this.ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * decayRate);
      left[i] = (Math.random() * 2 - 1) * envelope;
      right[i] = (Math.random() * 2 - 1) * envelope;
    }

    return impulse;
  }

  // --- OFFLINE RENDERER (WAV EXPORTER) ---

  public async renderProcessedWav(buffer?: AudioBuffer): Promise<Blob> {
    const srcBuf = buffer || this.currentBuffer;
    if (!srcBuf) throw new Error('No hay buffer cargado para exportar WAV');

    const offlineCtx = new OfflineAudioContext(
      srcBuf.numberOfChannels,
      srcBuf.length,
      srcBuf.sampleRate,
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = srcBuf;

    // Build parallel offline chain
    const eqFilt = [60, 250, 1200, 4000, 12000].map((freq, idx) => {
      const f = offlineCtx.createBiquadFilter();
      f.type = this.eqFilters[idx].type;
      f.frequency.value = freq;
      f.gain.value = this.eqFilters[idx].gain.value;
      return f;
    });

    for (let i = 0; i < eqFilt.length - 1; i++) {
      eqFilt[i].connect(eqFilt[i + 1]);
    }

    source.connect(eqFilt[0]);
    eqFilt[eqFilt.length - 1].connect(offlineCtx.destination);

    source.start(0);
    const renderedBuffer = await offlineCtx.startRendering();
    return audioBufferToWavBlob(renderedBuffer);
  }
}

function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const numSamples = buffer.length * numChannels;
  const dataSize = numSamples * (bitDepth / 8);
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const dataView = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      dataView.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  dataView.setUint32(4, totalSize - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  dataView.setUint32(16, 16, true);
  dataView.setUint16(20, format, true);
  dataView.setUint16(22, numChannels, true);
  dataView.setUint32(24, sampleRate, true);
  dataView.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  dataView.setUint16(32, numChannels * (bitDepth / 8), true);
  dataView.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  dataView.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      dataView.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

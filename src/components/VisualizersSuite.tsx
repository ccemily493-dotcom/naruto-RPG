import React, { useEffect, useRef, useState } from 'react';
import { Activity, BarChart2, Radio } from 'lucide-react';

interface VisualizersSuiteProps {
  analyserNode: AnalyserNode | null;
  isPlaying: boolean;
}

export const VisualizersSuite: React.FC<VisualizersSuiteProps> = ({ analyserNode, isPlaying }) => {
  const [activeTab, setActiveTab] = useState<'oscilloscope' | 'rta' | 'spectrogram'>(
    'oscilloscope',
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const peakHoldRef = useRef<number[]>(new Array(64).fill(0));

  useEffect(() => {
    if (!canvasRef.current || !analyserNode) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArrayTime = new Uint8Array(bufferLength);
    const dataArrayFreq = new Uint8Array(bufferLength);

    const renderFrame = () => {
      animationRef.current = requestAnimationFrame(renderFrame);

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Background grid
      ctx.fillStyle = '#0a0a0d';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 25) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      if (activeTab === 'oscilloscope') {
        // --- REAL-TIME VECTOR OSCILLOSCOPE ---
        analyserNode.getByteTimeDomainData(dataArrayTime);

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#06b6d4'; // cian glow
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#06b6d4';
        ctx.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArrayTime[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);

          x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (activeTab === 'rta') {
        // --- REAL-TIME RTA SPECTRUM ANALYZER WITH PEAK HOLD ---
        analyserNode.getByteFrequencyData(dataArrayFreq);

        const numBars = 48;
        const barWidth = (width - numBars * 2) / numBars;
        const step = Math.floor(bufferLength / numBars);

        for (let i = 0; i < numBars; i++) {
          let val = 0;
          for (let j = 0; j < step; j++) {
            val += dataArrayFreq[i * step + j];
          }
          val = val / step;

          const barHeight = (val / 255) * (height - 15);
          const x = i * (barWidth + 2);
          const y = height - barHeight;

          // Peak hold decay calculation
          if (val > peakHoldRef.current[i]) {
            peakHoldRef.current[i] = val;
          } else {
            peakHoldRef.current[i] = Math.max(0, peakHoldRef.current[i] - 1.8);
          }
          const peakY = height - (peakHoldRef.current[i] / 255) * (height - 15);

          // Bar gradient
          const gradient = ctx.createLinearGradient(0, height, 0, 0);
          gradient.addColorStop(0, '#10b981'); // emerald
          gradient.addColorStop(0.6, '#f59e0b'); // amber
          gradient.addColorStop(1, '#ef4444'); // red

          ctx.fillStyle = gradient;
          ctx.fillRect(x, y, barWidth, barHeight);

          // Peak hold cap
          ctx.fillStyle = '#67e8f9';
          ctx.fillRect(x, peakY - 2, barWidth, 2);
        }
      } else if (activeTab === 'spectrogram') {
        // --- SCROLLING SPECTROGRAM (CHROMATIC HEATMAP) ---
        analyserNode.getByteFrequencyData(dataArrayFreq);

        const imgData = ctx.getImageData(1, 0, width - 1, height);
        ctx.putImageData(imgData, 0, 0);

        for (let y = 0; y < height; y++) {
          const freqIndex = Math.floor(((height - y) / height) * (bufferLength / 2));
          const val = dataArrayFreq[freqIndex];

          // Inferno chromatic heatmap color conversion
          const r = Math.min(255, val * 2.2);
          const g = Math.min(255, val > 100 ? (val - 100) * 1.8 : 0);
          const b = Math.min(255, val > 180 ? (val - 180) * 3 : val * 0.4);

          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fillRect(width - 1, y, 1, 1);
        }
      }
    };

    renderFrame();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [analyserNode, activeTab, isPlaying]);

  return (
    <div className="bg-[#121216] border border-neutral-800 rounded-xl p-4 space-y-3 shadow-xl">
      {/* Header Tabs */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
            Suite de Visualización 60 FPS
          </span>
        </div>

        <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800 text-[11px]">
          <button
            onClick={() => setActiveTab('oscilloscope')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-semibold ${
              activeTab === 'oscilloscope'
                ? 'bg-cyan-950 text-cyan-200 border border-cyan-700/80 shadow'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> Osciloscopio
          </button>
          <button
            onClick={() => setActiveTab('rta')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-semibold ${
              activeTab === 'rta'
                ? 'bg-emerald-950 text-emerald-200 border border-emerald-700/80 shadow'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" /> RTA Espectro
          </button>
          <button
            onClick={() => setActiveTab('spectrogram')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-semibold ${
              activeTab === 'spectrogram'
                ? 'bg-amber-950 text-amber-200 border border-amber-700/80 shadow'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" /> Espectrograma
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative rounded-lg overflow-hidden border border-neutral-800 shadow-inner bg-black">
        <canvas ref={canvasRef} width={680} height={180} className="w-full h-[180px] block" />
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur text-[10px] font-mono text-cyan-400 border border-neutral-800">
          FFT 2048 / 60 FPS
        </div>
      </div>
    </div>
  );
};

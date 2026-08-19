import React, { useState, useEffect } from 'react';
import { OpenAIConfig } from '../types';
import { X, Key, Cpu, ShieldCheck, HelpCircle } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: OpenAIConfig;
  onSave: (config: OpenAIConfig) => void;
  hasServerKey: boolean;
}

const AVAILABLE_MODELS = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o (Recomendado)',
    desc: 'Máxima capacidad narrativa, coherencia táctica y ritmo',
  },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', desc: 'Rápido, ágil y económico' },
  {
    id: 'o3-mini',
    name: 'o3-mini (Razonamiento)',
    desc: 'Profundidad de análisis táctico y continuidad',
  },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', desc: 'Narrativa clásica de alta fidelidad' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
  hasServerKey,
}) => {
  const [apiKey, setApiKey] = useState(config.apiKey || '');
  const [model, setModel] = useState(config.model || 'gpt-4o');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setApiKey(config.apiKey || '');
      setModel(config.model || 'gpt-4o');
    }
  }, [isOpen, config.apiKey, config.model]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      ...config,
      apiKey: apiKey.trim(),
      model,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        id="settings-modal"
        className="w-full max-w-md bg-[#ffffff] border border-[#e3e2e0] rounded-xl shadow-xl overflow-hidden text-[#37352f]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#eeedea]">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#787774]" />
            <h2 className="text-sm font-semibold tracking-tight text-[#1f1f1e]">
              Configuración del Motor
            </h2>
          </div>
          <button
            id="close-settings-btn"
            onClick={onClose}
            className="p-1 rounded-md text-[#787774] hover:text-[#1f1f1e] hover:bg-[#f1f1ef] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs">
          {/* Server Key Banner if detected */}
          {hasServerKey && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#f7f6f3] border border-[#e9e9e7]">
              <ShieldCheck className="w-4 h-4 text-[#37352f] shrink-0 mt-0.5" />
              <p className="text-[#5a5955] leading-relaxed">
                <span className="font-medium text-[#1f1f1e]">API Key de servidor activa.</span> El
                backend ya cuenta con credenciales configuradas en el entorno. Puedes dejar el campo
                de API Key vacío o introducir una propia.
              </p>
            </div>
          )}

          {/* OpenAI API Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-medium text-[#37352f] flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-[#787774]" />
                OpenAI API Key
              </label>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="text-[11px] text-[#787774] hover:text-[#1f1f1e] underline underline-offset-2"
              >
                {showKey ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            <input
              id="openai-key-input"
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                hasServerKey ? 'Usando clave del servidor (opcional sobreescribir)' : 'sk-...'
              }
              className="w-full px-3 py-2 bg-[#ffffff] border border-[#d3d2ce] focus:border-[#37352f] rounded-md outline-none text-xs text-[#1f1f1e] placeholder:text-[#9b9a97] transition-all font-mono"
            />
            <p className="text-[11px] text-[#787774]">
              Tu clave nunca se expone públicamente y se procesa a través del backend seguro.
            </p>
          </div>

          {/* OpenAI Model */}
          <div className="space-y-1.5">
            <label className="font-medium text-[#37352f]">Modelo del Game Master</label>
            <div className="space-y-1.5">
              {AVAILABLE_MODELS.map((m) => (
                <label
                  key={m.id}
                  className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    model === m.id
                      ? 'border-[#37352f] bg-[#f7f6f3]'
                      : 'border-[#eeedea] hover:bg-[#fbfbfa]'
                  }`}
                >
                  <input
                    type="radio"
                    name="openai_model"
                    value={m.id}
                    checked={model === m.id}
                    onChange={() => setModel(m.id)}
                    className="mt-0.5 text-[#37352f] focus:ring-0"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-[#1f1f1e]">{m.name}</div>
                    <div className="text-[11px] text-[#787774]">{m.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-[#9b9a97] pt-1">
            <HelpCircle className="w-3.5 h-3.5 shrink-0" />
            <span>El Game Master mantendrá la continuidad y creará capítulos automáticamente.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-3.5 bg-[#fbfbfa] border-t border-[#eeedea]">
          <button
            id="cancel-settings-btn"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-md text-xs font-medium text-[#5a5955] hover:bg-[#eeedea] transition-colors"
          >
            Cancelar
          </button>
          <button
            id="save-settings-btn"
            onClick={handleSave}
            className="px-4 py-1.5 rounded-md text-xs font-medium bg-[#1f1f1e] text-white hover:bg-[#37352f] transition-colors"
          >
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
};

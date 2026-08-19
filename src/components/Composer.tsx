import React, { useRef, useEffect } from 'react';
import { ArrowUp, Square } from 'lucide-react';

interface ComposerProps {
  input: string;
  setInput: (val: string) => void;
  onSend: () => void;
  isLoading: boolean;
  onStop: () => void;
}

export const Composer: React.FC<ComposerProps> = ({
  input,
  setInput,
  onSend,
  isLoading,
  onStop,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 200);
      textareaRef.current.style.height = `${Math.max(newHeight, 48)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && input.trim()) {
        onSend();
      }
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 md:px-6 pb-4 pt-2">
      <div className="relative flex flex-col bg-[#ffffff] border border-[#dcdad6] focus-within:border-[#37352f] rounded-2xl shadow-xs transition-all duration-150 p-2.5">
        <textarea
          id="roleplay-composer-input"
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe lo que hace, dice o intenta tu personaje..."
          rows={1}
          disabled={isLoading}
          className="w-full bg-transparent resize-none text-sm text-[#1f1f1e] placeholder:text-[#9b9a97] outline-none px-2 pt-1 pb-2 leading-relaxed"
        />

        <div className="flex items-center justify-between pt-1 border-t border-[#f4f3f0] px-1 mt-1">
          <div className="text-[11px] text-[#9b9a97] select-none hidden sm:block">
            <span className="font-medium text-[#787774]">Enter</span> para enviar ·{' '}
            <span className="font-medium text-[#787774]">Shift + Enter</span> para salto
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            {isLoading ? (
              <button
                id="stop-stream-btn"
                type="button"
                onClick={onStop}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#37352f] text-white hover:bg-[#1f1f1e] text-xs font-medium transition-colors"
                title="Detener respuesta"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Detener</span>
              </button>
            ) : (
              <button
                id="send-message-btn"
                type="button"
                onClick={onSend}
                disabled={!input.trim()}
                className={`p-1.5 rounded-full transition-all flex items-center justify-center ${
                  input.trim()
                    ? 'bg-[#1f1f1e] text-white hover:bg-[#37352f] shadow-2xs'
                    : 'bg-[#eeedea] text-[#9b9a97] cursor-not-allowed'
                }`}
                title="Enviar acción"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

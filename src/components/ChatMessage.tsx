import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '../types';
import { parseMessageForChapters } from '../utils/chapterParser';
import { Copy, Check, RotateCcw, Edit2, Sparkles, User } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
  isLast: boolean;
  isStreaming?: boolean;
  onRegenerate?: () => void;
  onEditMessage?: (id: string, newContent: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isLast,
  isStreaming,
  onRegenerate,
  onEditMessage,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);

  const isUser = message.role === 'user';
  const { cleanText, segments } = parseMessageForChapters(message.content);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cleanText || message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  const handleSaveEdit = () => {
    if (editValue.trim() && onEditMessage) {
      onEditMessage(message.id, editValue.trim());
      setIsEditing(false);
    }
  };

  return (
    <div
      id={`message-${message.id}`}
      className={`group relative w-full py-4 transition-colors ${
        isUser ? 'bg-[#ffffff]' : 'bg-[#fafaf9]/80 border-y border-[#f1f1ef]/60'
      }`}
    >
      <div className="max-w-3xl mx-auto px-4 md:px-6">
        {/* Render Chapters embedded in message if present */}
        {segments.map((seg, idx) => {
          if (seg.type === 'chapter' && seg.chapter) {
            return (
              <div
                key={`chap-banner-${idx}`}
                id={`chapter-marker-${seg.chapter.roman}`}
                className="my-6 pt-4 pb-5 border-y border-[#e3e2e0] text-center space-y-1.5 bg-[#ffffff] rounded-lg p-4 shadow-2xs"
              >
                <div className="text-[11px] font-semibold uppercase tracking-widest text-[#787774] font-title">
                  — CAPÍTULO {seg.chapter.roman} —
                </div>
                <h2 className="text-base md:text-lg font-semibold text-[#1f1f1e] font-serif tracking-tight">
                  {seg.chapter.title}
                </h2>
                {seg.chapter.synopsis && (
                  <p className="text-xs text-[#787774] max-w-md mx-auto italic font-serif">
                    {seg.chapter.synopsis}
                  </p>
                )}
              </div>
            );
          }

          if (seg.type === 'text' && seg.content) {
            return null; // The text is rendered below in full markdown
          }
          return null;
        })}

        {/* Message Main Body */}
        <div className="flex items-start gap-3.5">
          {/* Avatar / Role Badge */}
          <div className="shrink-0 mt-0.5">
            {isUser ? (
              <div className="w-6 h-6 rounded-full bg-[#e9e9e7] text-[#37352f] flex items-center justify-center text-[10px] font-semibold">
                <User className="w-3.5 h-3.5 text-[#5a5955]" />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full bg-[#1f1f1e] text-white flex items-center justify-center text-[10px] font-medium font-serif">
                GM
              </div>
            )}
          </div>

          {/* Message Content Area */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-semibold text-[#1f1f1e]">
                {isUser ? 'Tú' : 'Game Master'}
              </span>
              <span className="text-[10px] text-[#9b9a97]">
                {(() => {
                  const d = new Date(message.timestamp);
                  return isNaN(d.getTime())
                    ? ''
                    : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                })()}
              </span>
            </div>

            {/* Editing mode for user message */}
            {isEditing ? (
              <div className="space-y-2 mt-1">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full p-2.5 bg-[#ffffff] border border-[#37352f] rounded-lg text-sm text-[#1f1f1e] outline-none resize-y min-h-[80px]"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveEdit}
                    className="px-3 py-1 bg-[#1f1f1e] text-white text-xs rounded-md hover:bg-[#37352f] transition-colors"
                  >
                    Guardar y reenviar
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditValue(message.content);
                    }}
                    className="px-3 py-1 text-xs text-[#5a5955] hover:bg-[#f1f1ef] rounded-md transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-[#2b2b29] leading-relaxed notion-prose">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {cleanText || message.content}
                </ReactMarkdown>

                {/* Streaming Indicator */}
                {isStreaming && isLast && !isUser && (
                  <span className="inline-block w-1.5 h-4 ml-1 bg-[#37352f] animate-pulse align-middle" />
                )}
              </div>
            )}

            {/* Action Bar (Copy, Edit, Regenerate) */}
            {!isEditing && (
              <div className="flex items-center gap-1 mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-[#787774] hover:text-[#1f1f1e] hover:bg-[#f1f1ef] transition-colors"
                  title="Copiar mensaje"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-green-700" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copied ? 'Copiado' : 'Copiar'}</span>
                </button>

                {isUser && onEditMessage && (
                  <button
                    onClick={() => {
                      setEditValue(message.content);
                      setIsEditing(true);
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-[#787774] hover:text-[#1f1f1e] hover:bg-[#f1f1ef] transition-colors"
                    title="Editar tu último mensaje"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Editar</span>
                  </button>
                )}

                {!isUser && isLast && !isStreaming && onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-[#787774] hover:text-[#1f1f1e] hover:bg-[#f1f1ef] transition-colors"
                    title="Regenerar respuesta del Game Master"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Regenerar</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

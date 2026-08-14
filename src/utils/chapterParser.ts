import { Chapter } from '../types';

export interface ParsedSegment {
  type: 'text' | 'chapter';
  content?: string;
  chapter?: {
    roman: string;
    title: string;
    synopsis: string;
  };
}

// Regex to capture [[CAPÍTULO: <Roman> | <Title> | <Synopsis>]] or variations like [[CAPITULO: ...]]
const CHAPTER_REGEX = /\[\[\s*CAP[ÍI]TULO:\s*([IVXLCDM0-9]+)\s*\|\s*([^|\]]+)\s*(?:\|\s*([^\]]*))?\]\]/gi;

export function parseMessageForChapters(text: string): {
  cleanText: string;
  chaptersFound: Array<{ roman: string; title: string; synopsis: string }>;
  segments: ParsedSegment[];
} {
  if (!text) return { cleanText: '', chaptersFound: [], segments: [{ type: 'text' as const, content: '' }] };
  const chaptersFound: Array<{ roman: string; title: string; synopsis: string }> = [];
  const segments: ParsedSegment[] = [];

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const regex = /\[\[\s*CAP[ÍI]TULO:\s*([IVXLCDM0-9]+)\s*\|\s*([^|\]]+)\s*(?:\|\s*([^\]]*))?\]\]/gi;

  while ((match = regex.exec(text)) !== null) {
    // Text before the chapter match
    if (match.index > lastIndex) {
      const precedingText = text.substring(lastIndex, match.index);
      if (precedingText.trim()) {
        segments.push({ type: 'text', content: precedingText });
      }
    }

    const roman = (match[1] || 'I').trim();
    const title = (match[2] || 'Nuevo Capítulo').trim();
    const synopsis = (match[3] || '').trim();

    const chapterInfo = { roman, title, synopsis };
    chaptersFound.push(chapterInfo);
    segments.push({ type: 'chapter', chapter: chapterInfo });

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex);
    if (remainingText.trim()) {
      segments.push({ type: 'text', content: remainingText });
    }
  }

  // If no segments created (e.g. Empty or pure text)
  if (segments.length === 0) {
    segments.push({ type: 'text', content: text });
  }

  const cleanText = text
    .replace(CHAPTER_REGEX, '')
    .replace(/<!--\s*AUDIO_DIRECTION:[\s\S]*?-->/gi, '')
    .replace(/\[\[\s*AUDIO_DIRECTION:[\s\S]*?\]\]/gi, '')
    .trim();

  return {
    cleanText,
    chaptersFound,
    segments,
  };
}

export function extractChapterFromChunk(accumulatedText: string): {
  cleanContent: string;
  foundChapters: Array<{ roman: string; title: string; synopsis: string }>;
} {
  const result = parseMessageForChapters(accumulatedText);
  return {
    cleanContent: result.cleanText,
    foundChapters: result.chaptersFound,
  };
}

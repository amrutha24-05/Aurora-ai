import { SupportedLanguage, AgentId } from '../types/index.ts';

export interface SpeechSegment {
  index: number;
  text: string;
  audioSrc?: string;
  durationSec?: number;
  status: 'pending' | 'synthesizing' | 'ready' | 'playing' | 'played' | 'error';
  timings?: {
    synthesisMs?: number;
  };
}

export interface ProgressivePlaybackSession {
  sessionId: string;
  messageId: string;
  agentId?: AgentId;
  language?: SupportedLanguage;
  segments: SpeechSegment[];
  currentPlayingIndex: number;
  isPaused: boolean;
  isCancelled: boolean;
  startTime: number;
  timeToFirstSound?: number;
}

/**
 * Robust sentence segmenter for Indian and multilingual texts
 * Supports English, Telugu, Hindi, Tamil, Kannada, Malayalam, Bengali, Marathi, Gujarati, Punjabi
 * Handles: '.', '!', '?', '।' (Devanagari/Bengali danda), '॥', newlines
 * Protects against:
 *  - abbreviations: e.g., i.e., Dr., Mr., Mrs., Prof., vs., approx., NCERT, etc.
 *  - decimal numbers (3.14, 2.5)
 *  - numbered list items (1., 2.)
 * Consolidates fragments shorter than minLength (e.g. 25 chars) with next sentence
 */
export function segmentTextIntoSentences(
  rawText: string,
  minLength: number = 25,
  maxLength: number = 360
): string[] {
  if (!rawText || typeof rawText !== 'string') return [];

  // 1. Strip markdown, citations, and code blocks
  let cleaned = rawText
    .replace(/```[\s\S]*?```/g, '') // Strip codeblocks
    .replace(/`[^`]+`/g, ' ') // Strip inline code
    .replace(/[#*_\~]/g, '') // Strip markdown formatting symbols
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Strip markdown links, keep text
    .replace(/\r\n/g, '\n')
    .trim();

  if (!cleaned) return [];

  // Protect known abbreviations and numbers by substituting period with safe token
  const abbrevs = [
    'dr.', 'mr.', 'mrs.', 'ms.', 'prof.', 'vs.', 'e.g.', 'i.e.', 'etc.',
    'ncert.', 'pvt.', 'ltd.', 'ph.d.', 'approx.', 'no.', 'vol.', 'fig.', 'al.'
  ];
  let protectedText = cleaned;

  // Protect decimals (e.g., 3.14, 1.5)
  protectedText = protectedText.replace(/(\d+)\.(\d+)/g, '$1__DECIMAL__$2');

  // Protect numbered lists (e.g., "1. ", "2. ")
  protectedText = protectedText.replace(/(^|\n)(\d+)\.\s+/g, '$1$2__LISTNUM__ ');

  // Protect abbreviations
  for (const ab of abbrevs) {
    const escaped = ab.replace(/\./g, '\\.');
    const regex = new RegExp(`\\b${escaped}`, 'gi');
    protectedText = protectedText.replace(regex, (match) => match.replace(/\./g, '__DOT__'));
  }

  // Split on sentence boundaries: . ! ? । ॥ or paragraph breaks
  const rawSegments = protectedText.split(/(?<=[.!?।॥]|\n\n+)\s+/);

  const sentences: string[] = [];
  let current = '';

  for (let seg of rawSegments) {
    // Restore protected characters
    seg = seg
      .replace(/__DECIMAL__/g, '.')
      .replace(/__LISTNUM__/g, '.')
      .replace(/__DOT__/g, '.')
      .trim();

    if (!seg) continue;

    if (!current) {
      current = seg;
    } else if (
      current.length < minLength || 
      (current.length + seg.length + 1 <= maxLength && !current.match(/[.!?।॥]$/))
    ) {
      current = `${current} ${seg}`;
    } else {
      sentences.push(current);
      current = seg;
    }
  }

  if (current) {
    sentences.push(current);
  }

  return sentences.filter(s => s.trim().length > 0);
}

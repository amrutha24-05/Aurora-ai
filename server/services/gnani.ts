import { spawn } from 'child_process';
import { AgentId, SupportedLanguage } from '../types.ts';

/**
 * Gnani.ai Verified Service Definitions
 * Based on official Gnani Prisma v3.0 STT & Timbre v3.0 TTS catalogs.
 */

export interface GnaniVoice {
  id: string;
  name: string;
  gender: 'female' | 'male';
  character: string;
  primaryUseCase: string;
  multilingual: boolean;
  supportedLanguages: SupportedLanguage[];
}

export const GNANI_TIMBRE_VOICES: GnaniVoice[] = [
  // Feminine Voices (7)
  {
    id: 'shivani',
    name: 'Shivani',
    gender: 'female',
    character: 'Warm, empathetic, natural customer support',
    primaryUseCase: 'Inbound care, guidance, conversational AI',
    multilingual: true,
    supportedLanguages: ['en', 'hi', 'te', 'ta', 'kn', 'ml', 'bn', 'mr', 'gu', 'pa'],
  },
  {
    id: 'kalpana',
    name: 'Kalpana',
    gender: 'female',
    character: 'Professional, refined, articulate',
    primaryUseCase: 'Corporate briefings, technical explanations',
    multilingual: true,
    supportedLanguages: ['en', 'hi', 'te', 'ta', 'kn', 'ml', 'bn', 'mr', 'gu', 'pa'],
  },
  {
    id: 'chetana',
    name: 'Chetana',
    gender: 'female',
    character: 'Calm, patient, academic',
    primaryUseCase: 'E-learning, student mentoring, tutoring',
    multilingual: true,
    supportedLanguages: ['en', 'hi', 'te', 'ta', 'kn', 'ml', 'bn', 'mr', 'gu', 'pa'],
  },
  {
    id: 'tarika',
    name: 'Tarika',
    gender: 'female',
    character: 'Gentle, trustworthy, clear',
    primaryUseCase: 'Healthcare, advisory, reminders',
    multilingual: true,
    supportedLanguages: ['en', 'hi', 'te', 'ta', 'kn', 'ml', 'bn', 'mr', 'gu', 'pa'],
  },
  {
    id: 'riyaa',
    name: 'Riyaa',
    gender: 'female',
    character: 'Energetic, dynamic, enthusiastic',
    primaryUseCase: 'Language practice, conversational drills',
    multilingual: true,
    supportedLanguages: ['en', 'hi', 'te', 'ta', 'kn', 'ml', 'bn', 'mr', 'gu', 'pa'],
  },
  {
    id: 'lakshmi',
    name: 'Lakshmi',
    gender: 'female',
    character: 'Traditional, melodic, cultural warmth',
    primaryUseCase: 'Cultural storytelling, regional literature',
    multilingual: true,
    supportedLanguages: ['en', 'hi', 'te', 'ta', 'kn', 'ml', 'bn', 'mr', 'gu', 'pa'],
  },
  {
    id: 'vasudha',
    name: 'Vasudha',
    gender: 'female',
    character: 'Narrative, rich, expressive',
    primaryUseCase: 'Audiobooks, documentary narration',
    multilingual: true,
    supportedLanguages: ['en', 'hi', 'te', 'ta', 'kn', 'ml', 'bn', 'mr', 'gu', 'pa'],
  },
  // Masculine Voices (5)
  {
    id: 'shubham',
    name: 'Shubham',
    gender: 'male',
    character: 'Energetic, engaging, friendly',
    primaryUseCase: 'General assistant, daily planning',
    multilingual: true,
    supportedLanguages: ['en', 'hi', 'te', 'ta', 'kn', 'ml', 'bn', 'mr', 'gu', 'pa'],
  },
  {
    id: 'avinash',
    name: 'Avinash',
    gender: 'male',
    character: 'Authoritative, calm, dependable',
    primaryUseCase: 'Engineering reviews, logic walkthroughs',
    multilingual: true,
    supportedLanguages: ['en', 'hi', 'te', 'ta', 'kn', 'ml', 'bn', 'mr', 'gu', 'pa'],
  },
  {
    id: 'prakash',
    name: 'Prakash',
    gender: 'male',
    character: 'Steady, deliberate, reassuring',
    primaryUseCase: 'Historical narratives, heritage discussions',
    multilingual: true,
    supportedLanguages: ['en', 'hi', 'te', 'ta', 'kn', 'ml', 'bn', 'mr', 'gu', 'pa'],
  },
  {
    id: 'devansh',
    name: 'Devansh',
    gender: 'male',
    character: 'Youthful, conversational, crisp',
    primaryUseCase: 'Math drills, science quizzes',
    multilingual: true,
    supportedLanguages: ['en', 'hi', 'te', 'ta', 'kn', 'ml', 'bn', 'mr', 'gu', 'pa'],
  },
  {
    id: 'yashraj',
    name: 'Yashraj',
    gender: 'male',
    character: 'Resonant, formal, broadcasting grade',
    primaryUseCase: 'Executive summaries, presentations',
    multilingual: true,
    supportedLanguages: ['en', 'hi', 'te', 'ta', 'kn', 'ml', 'bn', 'mr', 'gu', 'pa'],
  },
  {
    id: 'harshad',
    name: 'Harshad',
    gender: 'male',
    character: 'Confident, modern, engaging',
    primaryUseCase: 'Product tours, tech updates, interviews',
    multilingual: true,
    supportedLanguages: ['en', 'hi', 'te', 'ta', 'kn', 'ml', 'bn', 'mr', 'gu', 'pa'],
  },
];

/**
 * Aurora AI - Configurable Agent Voice Personas
 * Maps each specialized agent to their signature Gnani Timbre production voice.
 */
export const AGENT_DEFAULT_VOICES: Record<AgentId, string> = {
  technical: 'Avinash',      // Authoritative, dependable, engineering walkthroughs
  cultural: 'Lakshmi',       // Traditional, melodic, cultural warmth & narratives
  school: 'Chetana',         // Academic, patient, student tutoring & mentoring
  personal: 'Shivani',       // Warm, empathetic, conversational AI & daily planning
  language_learning: 'Riyaa', // Energetic, dynamic, conversational drills & practice
};

/**
 * Resolves the appropriate Gnani Voice for a given agent persona or custom override
 */
export function getVoiceForAgent(agentId?: AgentId, customVoice?: string): GnaniVoice {
  if (customVoice && typeof customVoice === 'string') {
    const found = GNANI_TIMBRE_VOICES.find(v => v.name.toLowerCase() === customVoice.toLowerCase());
    if (found) return found;
  }
  if (agentId && AGENT_DEFAULT_VOICES[agentId]) {
    const defaultVoiceName = AGENT_DEFAULT_VOICES[agentId];
    const found = GNANI_TIMBRE_VOICES.find(v => v.name.toLowerCase() === defaultVoiceName.toLowerCase());
    if (found) return found;
  }
  return GNANI_TIMBRE_VOICES.find(v => v.name === 'Shivani') || GNANI_TIMBRE_VOICES[0];
}

export const VERIFIED_GNANI_LANGUAGES: Record<SupportedLanguage, {
  name: string;
  native: string;
  prismaSttSupported: boolean;
  timbreTtsSupported: boolean;
  warpStsSupported: boolean;
}> = {
  en: { name: 'English (India)', native: 'English', prismaSttSupported: true, timbreTtsSupported: true, warpStsSupported: true },
  te: { name: 'Telugu', native: 'తెలుగు', prismaSttSupported: true, timbreTtsSupported: true, warpStsSupported: true },
  hi: { name: 'Hindi', native: 'हिन्दी', prismaSttSupported: true, timbreTtsSupported: true, warpStsSupported: true },
  ta: { name: 'Tamil', native: 'தமிழ்', prismaSttSupported: true, timbreTtsSupported: true, warpStsSupported: true },
  kn: { name: 'Kannada', native: 'ಕನ್ನಡ', prismaSttSupported: true, timbreTtsSupported: true, warpStsSupported: true },
  ml: { name: 'Malayalam', native: 'മലയാളം', prismaSttSupported: true, timbreTtsSupported: true, warpStsSupported: false },
  bn: { name: 'Bengali', native: 'বাংলা', prismaSttSupported: true, timbreTtsSupported: true, warpStsSupported: false },
  mr: { name: 'Marathi', native: 'मराठी', prismaSttSupported: true, timbreTtsSupported: true, warpStsSupported: false },
  gu: { name: 'Gujarati', native: 'ગુજરાતી', prismaSttSupported: true, timbreTtsSupported: true, warpStsSupported: false },
  pa: { name: 'Punjabi', native: 'ਪੰਜਾਬੀ', prismaSttSupported: true, timbreTtsSupported: true, warpStsSupported: false },
};

/**
 * Check if a language is supported by a given provider
 */
export function validateLanguageSupport(
  provider: 'prisma' | 'timbre' | 'warp', 
  lang: string
): { supported: boolean; reason?: string } {
  const verified = VERIFIED_GNANI_LANGUAGES[lang as SupportedLanguage];
  if (!verified) {
    return {
      supported: false,
      reason: `Language '${lang}' is not in the certified 10-language Indian catalog. Supported options: English, Telugu, Hindi, Tamil, Kannada, Malayalam, Bengali, Marathi, Gujarati, Punjabi.`,
    };
  }

  if (provider === 'warp' && !verified.warpStsSupported) {
    return {
      supported: false,
      reason: `Experimental Warp STS is currently restricted to tier-1 languages (English, Telugu, Hindi, Tamil, Kannada). Fallback to Prisma+Timbre is active.`,
    };
  }

  return { supported: true };
}

export const GNANI_LANGUAGE_CODE_MAP: Record<SupportedLanguage, string> = {
  en: 'en-IN',
  te: 'te-IN',
  hi: 'hi-IN',
  ta: 'ta-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  bn: 'bn-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
  pa: 'pa-IN',
};

/**
 * Check if live Gnani credentials are configured on the server
 */
export function getGnaniStatus(): {
  isConfigured: boolean;
  apiKeySet: boolean;
  endpoint: string;
  model: string;
  ttsEndpoint: string;
  ttsModel: string;
  agentVoices: Record<AgentId, string>;
  mode: 'live' | 'unconfigured';
  supportedLanguages: Record<SupportedLanguage, { name: string; native: string; code: string }>;
} {
  const apiKey = process.env.GNANI_API_KEY || process.env.GNANI_TOKEN;
  const isConfigured = Boolean(apiKey && apiKey.trim().length > 0);
  return {
    isConfigured,
    apiKeySet: isConfigured,
    endpoint: 'https://api.vachana.ai/stt/v3',
    model: 'prisma-v3.0',
    ttsEndpoint: 'https://api.vachana.ai/api/v1/tts/inference',
    ttsModel: 'timbre-v3.0',
    agentVoices: AGENT_DEFAULT_VOICES,
    mode: isConfigured ? 'live' : 'unconfigured',
    supportedLanguages: {
      en: { name: 'English (India)', native: 'English', code: 'en-IN' },
      te: { name: 'Telugu', native: 'తెలుగు', code: 'te-IN' },
      hi: { name: 'Hindi', native: 'हिन्दी', code: 'hi-IN' },
      ta: { name: 'Tamil', native: 'தமிழ்', code: 'ta-IN' },
      kn: { name: 'Kannada', native: 'ಕನ್ನಡ', code: 'kn-IN' },
      ml: { name: 'Malayalam', native: 'മലയാളം', code: 'ml-IN' },
      bn: { name: 'Bengali', native: 'বাংলা', code: 'bn-IN' },
      mr: { name: 'Marathi', native: 'मराठी', code: 'mr-IN' },
      gu: { name: 'Gujarati', native: 'ગુજરાતી', code: 'gu-IN' },
      pa: { name: 'Punjabi', native: 'ਪੰਜਾਬੀ', code: 'pa-IN' },
    },
  };
}

export interface GnaniTranscriptionResult {
  transcript: string;
  detectedLanguage?: string;
  languageCode: string;
  confidence: number;
  segments?: Array<{ start: number; end: number; text: string }>;
  provider: string;
  isMock: false;
  rawResponse?: any;
}

/**
 * Converts any non-WAV audio buffer (such as browser WebM/Opus) into standard 16kHz mono WAV for Gnani Prisma STT
 */
export async function convertToWav(inputBuffer: Buffer): Promise<Buffer> {
  // If already a valid RIFF/WAV container, return as is
  if (
    inputBuffer.length >= 12 &&
    inputBuffer.slice(0, 4).toString('ascii') === 'RIFF' &&
    inputBuffer.slice(8, 12).toString('ascii') === 'WAVE'
  ) {
    return inputBuffer;
  }

  return new Promise((resolve) => {
    try {
      const proc = spawn('ffmpeg', [
        '-i', 'pipe:0',
        '-ar', '16000',
        '-ac', '1',
        '-f', 'wav',
        'pipe:1',
      ]);

      const chunks: Buffer[] = [];
      const errChunks: Buffer[] = [];

      proc.stdout.on('data', (d: Buffer) => chunks.push(d));
      proc.stderr.on('data', (d: Buffer) => errChunks.push(d));

      proc.on('close', (code) => {
        if (code === 0 && chunks.length > 0) {
          resolve(Buffer.concat(chunks));
        } else {
          console.warn('[STT Audio Conversion] Warning from ffmpeg:', Buffer.concat(errChunks).toString('utf8').slice(0, 200));
          resolve(inputBuffer);
        }
      });

      proc.on('error', (err) => {
        console.warn('[STT Audio Conversion] Spawn error:', err.message);
        resolve(inputBuffer);
      });

      proc.stdin.write(inputBuffer);
      proc.stdin.end();
    } catch (err: any) {
      console.warn('[STT Audio Conversion] Execution error:', err.message);
      resolve(inputBuffer);
    }
  });
}

/**
 * Official Gnani Prisma v3.0 Speech-to-Text Integration
 * Endpoint: https://api.vachana.ai/stt/v3
 * Auth Header: X-API-Key-ID: <GNANI_API_KEY>
 * Format: multipart/form-data (audio_file, model, language_code, format)
 */
export async function transcribeWithPrisma(
  audioInput: string | Buffer,
  language: SupportedLanguage | string = 'indic-auto',
  mimeType: string = 'audio/wav',
  fileName: string = 'audio.wav'
): Promise<GnaniTranscriptionResult> {
  const apiKey = (process.env.GNANI_API_KEY || process.env.GNANI_TOKEN || '').trim();
  
  if (!apiKey) {
    throw new Error('GNANI_API_KEY_MISSING: Gnani Speech-to-Text API key is unconfigured. Please configure GNANI_API_KEY in your environment variables to enable live transcription.');
  }

  // Validate or resolve language code
  let targetLangCode = 'indic-auto';
  if (language && language !== 'indic-auto') {
    if (GNANI_LANGUAGE_CODE_MAP[language as SupportedLanguage]) {
      targetLangCode = GNANI_LANGUAGE_CODE_MAP[language as SupportedLanguage];
    } else if (Object.values(GNANI_LANGUAGE_CODE_MAP).includes(language)) {
      targetLangCode = language;
    } else {
      const validation = validateLanguageSupport('prisma', language);
      if (!validation.supported) {
        throw new Error(validation.reason);
      }
    }
  }

  // Convert input to Buffer
  let audioBuffer: Buffer;
  if (typeof audioInput === 'string') {
    const cleanBase64 = audioInput.replace(/^data:audio\/[^;]+;base64,/, '').trim();
    if (!cleanBase64) {
      throw new Error('Empty audio payload provided for speech recognition.');
    }
    audioBuffer = Buffer.from(cleanBase64, 'base64');
  } else if (Buffer.isBuffer(audioInput)) {
    audioBuffer = audioInput;
  } else {
    throw new Error('Unsupported audio input format. Expected Base64 string or binary Buffer.');
  }

  if (audioBuffer.length === 0) {
    throw new Error('Audio buffer length is 0 bytes.');
  }

  // Convert WebM or non-WAV formats to standard 16kHz mono WAV for Gnani Prisma compatibility
  const wavAudio = await convertToWav(audioBuffer);
  audioBuffer = wavAudio;
  mimeType = 'audio/wav';
  fileName = 'recording.wav';

  console.log(`[Gnani STT Diagnostic] Model: prisma-v3.0 | TargetLang: ${targetLangCode} | AudioSize: ${audioBuffer.length} bytes`);

  // Build standard multipart request using native Node.js FormData and Blob
  const formData = new FormData();
  const arrayBuffer = audioBuffer.buffer.slice(audioBuffer.byteOffset, audioBuffer.byteOffset + audioBuffer.byteLength) as ArrayBuffer;
  const audioBlob = new Blob([arrayBuffer], { type: mimeType });
  formData.append('audio_file', audioBlob, fileName);
  formData.append('model', 'prisma-v3.0');
  formData.append('language_code', targetLangCode);
  formData.append('format', 'transcribe');

  const endpoint = 'https://api.vachana.ai/stt/v3';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'X-API-Key-ID': apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let message = errorBody;
    try {
      const parsed = JSON.parse(errorBody);
      message = parsed.message || parsed.error || errorBody;
    } catch {}
    throw new Error(`Gnani Prisma API error (${response.status} ${response.statusText}): ${message}`);
  }

  const data = await response.json();

  const transcript = (data.transcript || data.full_transcript || data.text || '').trim();
  const detectedLanguage = data.language_code || data.detected_language || targetLangCode;
  const confidence = typeof data.confidence === 'number' ? data.confidence : 0.95;

  console.log(`[Gnani STT Diagnostic] Success: transcript="${transcript}" | detectedLang=${detectedLanguage} | confidence=${confidence}`);

  return {
    transcript,
    detectedLanguage,
    languageCode: detectedLanguage,
    confidence,
    segments: Array.isArray(data.segments) ? data.segments : [],
    provider: 'Gnani Prisma v3.0 (Live)',
    isMock: false,
    rawResponse: data,
  };
}

/**
 * Constructs a valid standard 44-byte RIFF/WAVE header for raw Linear PCM audio.
 * Verified Gnani Timbre v3.0 audio output: 48000 Hz, 16-bit, mono Linear PCM.
 */
export function pcmToWav(
  pcmBuffer: Buffer,
  sampleRate: number = 48000,
  numChannels: number = 1,
  bitsPerSample: number = 16
): Buffer {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  // 00-03: 'RIFF'
  header.write('RIFF', 0);
  // 04-07: Total file size minus 8 bytes
  header.writeUInt32LE(36 + dataSize, 4);
  // 08-11: 'WAVE'
  header.write('WAVE', 8);
  // 12-15: 'fmt '
  header.write('fmt ', 12);
  // 16-19: SubChunk1Size (16 for PCM)
  header.writeUInt32LE(16, 16);
  // 20-21: AudioFormat (1 = PCM)
  header.writeUInt16LE(1, 20);
  // 22-23: NumChannels (1 = mono)
  header.writeUInt16LE(numChannels, 22);
  // 24-27: SampleRate (48000)
  header.writeUInt32LE(sampleRate, 24);
  // 28-31: ByteRate (sampleRate * numChannels * bitsPerSample / 8)
  header.writeUInt32LE(byteRate, 28);
  // 32-33: BlockAlign (numChannels * bitsPerSample / 8)
  header.writeUInt16LE(blockAlign, 32);
  // 34-35: BitsPerSample (16)
  header.writeUInt16LE(bitsPerSample, 34);
  // 36-39: 'data'
  header.write('data', 36);
  // 40-43: SubChunk2Size (data size)
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

/**
 * Cleans text for natural speech synthesis:
 * Strips markdown, code blocks, citations, emojis, and formatting markers.
 */
export function cleanTextForSpeech(text: string): string {
  if (!text) return '';
  return text
    // Strip markdown code fences (e.g. ```typescript ... ```)
    .replace(/```[\s\S]*?```/g, '')
    // Strip inline code `...`
    .replace(/`([^`]+)`/g, '$1')
    // Strip markdown links: [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Strip RAG citations like [Source: ...], [Doc 1], [1]
    .replace(/\[(?:Source|Doc|\d+)[^\]]*\]/gi, '')
    // Strip markdown headings, bold, italics, blockquotes, list markers
    .replace(/^#+\s+/gm, '')
    .replace(/[*_~]+/g, '')
    .replace(/^>\s+/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    // Strip HTML tags
    .replace(/<[^>]+>/g, '')
    // Normalize excess whitespace and newlines
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Splits text into sentence-aware bursts under maxChunkLength (default ~380 chars)
 * to ensure reliable, stutter-free synthesis without truncation.
 */
export function chunkTextForSpeech(text: string, maxChunkLength: number = 380): string[] {
  const cleaned = cleanTextForSpeech(text);
  if (!cleaned) return [];
  if (cleaned.length <= maxChunkLength) return [cleaned];

  // Match sentences ending in punctuation (. ! ? । \n)
  const sentenceRegex = /[^.!?।\n]+[.!?।\n]+|[^.!?।\n]+$/g;
  const rawSentences = cleaned.match(sentenceRegex) || [cleaned];

  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of rawSentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if ((currentChunk + ' ' + trimmed).trim().length <= maxChunkLength) {
      currentChunk = currentChunk ? `${currentChunk} ${trimmed}` : trimmed;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      // If a single sentence exceeds maxChunkLength, split by words
      if (trimmed.length > maxChunkLength) {
        const words = trimmed.split(' ');
        let subChunk = '';
        for (const word of words) {
          if ((subChunk + ' ' + word).trim().length <= maxChunkLength) {
            subChunk = subChunk ? `${subChunk} ${word}` : word;
          } else {
            if (subChunk) chunks.push(subChunk);
            subChunk = word;
          }
        }
        if (subChunk) chunks.push(subChunk);
        currentChunk = '';
      } else {
        currentChunk = trimmed;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

export interface GnaniSynthesisResult {
  audioBase64?: string;
  mimeType: string;
  voice: GnaniVoice;
  languageCode: string;
  provider: string;
  isMock: boolean;
  chunksCount: number;
  durationEstimateSec: number;
  sampleRate: number;
  timings?: {
    chunksCount: number;
    cleanTextMs: number;
    gnaniApiMs: number;
    packagingMs: number;
    totalServerMs: number;
  };
}

/**
 * Official Gnani Timbre v3.0 Text-to-Speech Integration
 * Endpoint: https://api.vachana.ai/api/v1/tts/inference
 * Model: timbre-v3.0
 * Auth Header: X-API-Key-ID: <GNANI_API_KEY>
 * Output: Raw 24kHz 16-bit mono PCM -> Packaged to 44-byte standard browser-playable WAV
 */
export async function synthesizeWithTimbre(
  text: string,
  voiceName?: string,
  language: SupportedLanguage | string = 'en',
  agentId?: AgentId
): Promise<GnaniSynthesisResult> {
  const overallStart = Date.now();
  const apiKey = (process.env.GNANI_API_KEY || process.env.GNANI_TOKEN || '').trim();
  const selectedVoice = getVoiceForAgent(agentId, voiceName);

  // Resolve 2-letter language code and BCP-47 mapping
  let shortLang: SupportedLanguage = 'en';
  let targetLangCode = 'en-IN';

  if (typeof language === 'string') {
    if (GNANI_LANGUAGE_CODE_MAP[language as SupportedLanguage]) {
      shortLang = language as SupportedLanguage;
      targetLangCode = GNANI_LANGUAGE_CODE_MAP[shortLang];
    } else {
      const match = Object.entries(GNANI_LANGUAGE_CODE_MAP).find(([_, code]) => code === language);
      if (match) {
        shortLang = match[0] as SupportedLanguage;
        targetLangCode = match[1];
      }
    }
  }

  const validation = validateLanguageSupport('timbre', shortLang);
  if (!validation.supported) {
    throw new Error(validation.reason);
  }

  const cleanStart = Date.now();
  const chunks = chunkTextForSpeech(text);
  const cleanTextMs = Date.now() - cleanStart;

  if (chunks.length === 0) {
    throw new Error('No synthesizable text after cleaning.');
  }

  // Fallback indicator when credentials are not configured
  if (!apiKey) {
    return {
      mimeType: 'audio/wav',
      voice: selectedVoice,
      languageCode: targetLangCode,
      provider: 'Gnani Timbre v3.0 (Unconfigured - Browser Web Speech Fallback)',
      isMock: true,
      chunksCount: 0,
      durationEstimateSec: 0,
      sampleRate: 48000,
      timings: {
        chunksCount: 0,
        cleanTextMs,
        gnaniApiMs: 0,
        packagingMs: 0,
        totalServerMs: Date.now() - overallStart,
      },
    };
  }

  const endpoint = 'https://api.vachana.ai/api/v1/tts/inference';
  const gnaniStart = Date.now();
  const pcmBuffers: Buffer[] = [];

  console.log(`[Gnani TTS Diagnostic] Model: timbre-v3.0 | Voice: ${selectedVoice.name} | Lang: ${targetLangCode} | SampleRate: 48000Hz | Chunks: ${chunks.length}`);

  // Note: Gnani Timbre v3.0 enforces strict concurrency: "Only 1 active request is allowed at a time"
  // Chunks must be processed sequentially to prevent HTTP 429 (RATE_LIMITED)
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkStart = Date.now();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key-ID': apiKey,
      },
      body: JSON.stringify({
        model: 'timbre-v3.0',
        text: chunk,
        voice: selectedVoice.name,
        language: targetLangCode,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let msg = errorText;
      try {
        const parsed = JSON.parse(errorText);
        msg = parsed.detail?.message || parsed.message || parsed.error || errorText;
      } catch {}
      throw new Error(`Gnani Timbre TTS error (${response.status} ${response.statusText}): ${msg}`);
    }

    const arrayBuf = await response.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    const chunkMs = Date.now() - chunkStart;
    console.log(`[Gnani TTS Diagnostic] Chunk ${i + 1}/${chunks.length} -> Voice: ${selectedVoice.name} | Received: ${buf.length} bytes PCM in ${chunkMs}ms`);
    if (buf.length > 0) {
      pcmBuffers.push(buf);
    }
  }

  const gnaniApiMs = Date.now() - gnaniStart;
  const packStart = Date.now();

  if (pcmBuffers.length === 0) {
    throw new Error('Gnani Timbre returned an empty audio stream.');
  }

  // Concatenate raw PCM buffers and wrap in 44-byte standard WAV header at 48000 Hz, 16-bit mono
  const fullPcm = Buffer.concat(pcmBuffers);
  const sampleRate = 48000;
  const wavBuffer = pcmToWav(fullPcm, sampleRate, 1, 16);
  // 48000 samples/sec * 2 bytes/sample = 96000 bytes/sec
  const durationEstimateSec = Math.round((fullPcm.length / 96000) * 10) / 10;
  const packagingMs = Date.now() - packStart;
  const totalServerMs = Date.now() - overallStart;

  return {
    audioBase64: wavBuffer.toString('base64'),
    mimeType: 'audio/wav',
    voice: selectedVoice,
    languageCode: targetLangCode,
    provider: 'Gnani Timbre v3.0 (Live)',
    isMock: false,
    chunksCount: chunks.length,
    durationEstimateSec,
    sampleRate,
    timings: {
      chunksCount: chunks.length,
      cleanTextMs,
      gnaniApiMs,
      packagingMs,
      totalServerMs,
    },
  };
}

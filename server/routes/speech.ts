import { Router, Request, Response } from 'express';
import multer from 'multer';
import { 
  GNANI_TIMBRE_VOICES, 
  VERIFIED_GNANI_LANGUAGES, 
  GNANI_LANGUAGE_CODE_MAP,
  AGENT_DEFAULT_VOICES,
  getVoiceForAgent,
  getGnaniStatus, 
  transcribeWithPrisma, 
  synthesizeWithTimbre, 
  validateLanguageSupport,
  cleanTextForSpeech
} from '../services/gnani.ts';
import { AgentId, SupportedLanguage } from '../types.ts';

export const speechRouter = Router();

// Configure Multer for in-memory audio buffering (max 25MB, strictly held in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max
  },
  fileFilter: (_req, file, cb) => {
    const isAudio = file.mimetype.startsWith('audio/') || 
                    file.mimetype.includes('webm') || 
                    file.mimetype.includes('ogg') || 
                    file.mimetype === 'application/octet-stream';
    if (isAudio) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio format. Please upload a WAV, WebM, MP3, OGG, or FLAC audio file.'));
    }
  },
});

// GET /api/speech/status - Health & configuration state of Gnani Speech Gateway
speechRouter.get('/status', (_req: Request, res: Response) => {
  const status = getGnaniStatus();
  res.json({
    platform: 'Aurora AI Speech Gateway',
    isConfigured: status.isConfigured,
    provider: 'Gnani.ai Prisma v3.0 (STT) & Timbre v3.0 (TTS)',
    endpoint: status.endpoint,
    model: status.model,
    authHeader: 'X-API-Key-ID',
    environmentVariable: 'GNANI_API_KEY',
    supportedLanguages: status.supportedLanguages,
    browserFallbackActive: !status.isConfigured,
    description: status.isConfigured 
      ? 'Gnani Prisma v3.0 Speech-to-Text is authenticated and ready for live recognition.' 
      : 'GNANI_API_KEY is unconfigured in the server environment. Browser Web Speech API acts as the client-side voice engine.',
  });
});

// GET /api/speech/languages - List all 10 certified Indian languages
speechRouter.get('/languages', (_req: Request, res: Response) => {
  res.json({
    languages: VERIFIED_GNANI_LANGUAGES,
    codeMapping: GNANI_LANGUAGE_CODE_MAP,
  });
});

// GET /api/speech/voices - List certified Gnani Timbre voices
speechRouter.get('/voices', (_req: Request, res: Response) => {
  res.json({
    voices: GNANI_TIMBRE_VOICES,
  });
});

// GET /api/speech/agent-voices - Configurable default voice assignments for all five Aurora agents
speechRouter.get('/agent-voices', (_req: Request, res: Response) => {
  res.json({
    agentVoices: AGENT_DEFAULT_VOICES,
    personas: Object.entries(AGENT_DEFAULT_VOICES).map(([agentId, voiceName]) => {
      const voiceInfo = getVoiceForAgent(agentId as AgentId);
      return {
        agentId,
        defaultVoice: voiceName,
        gender: voiceInfo.gender,
        character: voiceInfo.character,
        primaryUseCase: voiceInfo.primaryUseCase,
      };
    }),
  });
});

/**
 * Speech-to-Text Controller: Supports both multipart/form-data upload and JSON Base64 audio
 * Endpoint: POST /api/speech/transcribe & POST /api/speech/stt
 */
async function handleTranscription(req: Request, res: Response) {
  try {
    const status = getGnaniStatus();
    
    // Explicit error when credentials are not configured (never pretending mock is real)
    if (!status.isConfigured) {
      return res.status(503).json({
        error: 'Gnani Speech-to-Text API key is unconfigured.',
        message: 'GNANI_API_KEY is missing from server environment. Configure GNANI_API_KEY to activate live Gnani Prisma v3.0 transcription.',
        code: 'GNANI_API_KEY_MISSING',
        isConfigured: false,
        clientFallbackRecommended: 'webspeech',
      });
    }

    let audioBuffer: Buffer | null = null;
    let mimeType = 'audio/wav';
    let fileName = 'recording.wav';
    const language = req.body.language || req.body.language_code || 'indic-auto';

    // 1. Process Multipart file upload
    if (req.file) {
      audioBuffer = req.file.buffer;
      mimeType = req.file.mimetype || 'audio/wav';
      fileName = req.file.originalname || fileName;
    } 
    // 2. Process Base64 audio payload
    else if (req.body.audioBase64 || req.body.audio) {
      const rawBase64 = String(req.body.audioBase64 || req.body.audio).replace(/^data:audio\/[^;]+;base64,/, '').trim();
      if (!rawBase64) {
        return res.status(400).json({ error: 'Audio payload is empty.' });
      }
      audioBuffer = Buffer.from(rawBase64, 'base64');
      mimeType = req.body.mimeType || req.body.audioFormat ? `audio/${req.body.audioFormat}` : 'audio/webm';
      fileName = req.body.fileName || `recording.${req.body.audioFormat || 'webm'}`;
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      return res.status(400).json({ 
        error: 'No audio data provided. Please provide an audio file via multipart form-data (audio_file) or JSON base64 string (audioBase64).' 
      });
    }

    // 25MB file size limit check
    if (audioBuffer.length > 25 * 1024 * 1024) {
      return res.status(413).json({
        error: 'Audio payload exceeds maximum permitted file size of 25MB.',
      });
    }

    console.log(`[STT Route] Received transcription request: format=${mimeType}, size=${audioBuffer.length} bytes, language=${language}`);

    // Call live Gnani Prisma v3 STT
    const result = await transcribeWithPrisma(audioBuffer, language, mimeType, fileName);

    return res.json({
      success: true,
      transcript: result.transcript,
      detectedLanguage: result.detectedLanguage,
      languageCode: result.languageCode,
      confidence: result.confidence,
      segments: result.segments,
      provider: result.provider,
      isMock: false,
    });
  } catch (err: any) {
    const isConfigError = err.message && err.message.includes('GNANI_API_KEY_MISSING');
    const statusCode = isConfigError ? 503 : 500;
    return res.status(statusCode).json({
      error: err.message || 'Speech-to-text transcription failed.',
      code: isConfigError ? 'GNANI_API_KEY_MISSING' : 'STT_PROCESSING_ERROR',
    });
  }
}

// Register both POST /api/speech/transcribe and POST /api/speech/stt
speechRouter.post('/transcribe', upload.single('audio_file'), handleTranscription);
speechRouter.post('/stt', upload.single('audio_file'), handleTranscription);

/**
 * Text-to-Speech Controller
 * Official Gnani Timbre v3.0 Integration
 * Endpoints: POST /api/speech/synthesize & POST /api/speech/tts
 */
async function handleSynthesis(req: Request, res: Response) {
  try {
    const text = req.body.text;
    const voiceName = req.body.voiceName || req.body.voice;
    const agentId = req.body.agentId || req.body.agentType || req.body.agent;
    const language = req.body.language || req.body.language_code || req.body.lang || 'en';
    const speed = req.body.speed !== undefined ? req.body.speed : 1.0;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text string is required for synthesis.' });
    }

    const clean = cleanTextForSpeech(text);
    if (!clean) {
      return res.status(400).json({ error: 'Text contains no synthesizable speech content after cleaning.' });
    }

    const status = getGnaniStatus();
    if (!status.isConfigured) {
      return res.status(503).json({
        error: 'Gnani Text-to-Speech API key is unconfigured.',
        message: 'GNANI_API_KEY is missing from server environment. Falling back to browser Web Speech API.',
        code: 'GNANI_API_KEY_MISSING',
        isConfigured: false,
        clientFallbackRecommended: 'webspeech',
      });
    }

    const result = await synthesizeWithTimbre(clean, voiceName, language, agentId as AgentId);

    console.log(`[TTS Route] Synthesized successfully: voice="${typeof result.voice === 'object' ? result.voice.name : result.voice}", sampleRate=${result.sampleRate}Hz, chunks=${result.chunksCount}, duration=${result.durationEstimateSec}s`);

    if (result.timings) {
      console.log(`[Voice Pipeline Timing] Chunks: ${result.chunksCount} | Text: ${clean.length} chars | Gnani API: ${result.timings.gnaniApiMs}ms | Packaging: ${result.timings.packagingMs}ms | Total Server: ${result.timings.totalServerMs}ms`);
    }

    return res.json({
      success: true,
      audioBase64: result.audioBase64,
      mimeType: result.mimeType,
      voice: typeof result.voice === 'object' ? result.voice.name : result.voice,
      voicePersona: result.voice,
      languageCode: result.languageCode,
      provider: result.provider,
      isMock: result.isMock,
      chunksCount: result.chunksCount,
      durationEstimateSec: result.durationEstimateSec,
      sampleRate: result.sampleRate,
      speed,
      timings: result.timings,
    });
  } catch (err: any) {
    console.error('Speech synthesis error:', err.message);
    const isValidation = err.message && (err.message.includes('not in the certified') || err.message.includes('synthesizable'));
    return res.status(isValidation ? 400 : 500).json({
      error: err.message || 'Text-to-speech synthesis failed.',
      code: isValidation ? 'INVALID_SYNTHESIS_PARAM' : 'TTS_PROCESSING_ERROR',
    });
  }
}

speechRouter.post('/synthesize', handleSynthesis);
speechRouter.post('/tts', handleSynthesis);

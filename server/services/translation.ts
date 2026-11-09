import { SupportedLanguage } from '../types.ts';
import { generateGeminiContent, getGeminiClient } from './gemini.ts';
import { VERIFIED_GNANI_LANGUAGES } from './gnani.ts';
import { detectLanguage, detectLanguageFromScript, detectRomanizedLanguage } from './orchestrator.ts';

export interface TranslationRequest {
  text: string;
  sourceLanguage?: SupportedLanguage | 'auto';
  targetLanguage: SupportedLanguage;
  preserveTechnicalTerms?: boolean;
}

export interface TranslationResult {
  translatedText: string;
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  detectedSource: boolean;
  provider: string;
  tokensUsed?: number;
}

const LANGUAGE_NAMES: Record<SupportedLanguage, { name: string; native: string; script: string }> = {
  en: { name: 'English', native: 'English', script: 'Latin' },
  te: { name: 'Telugu', native: 'తెలుగు', script: 'Telugu' },
  hi: { name: 'Hindi', native: 'हिन्दी', script: 'Devanagari' },
  ta: { name: 'Tamil', native: 'தமிழ்', script: 'Tamil' },
  kn: { name: 'Kannada', native: 'ಕನ್ನಡ', script: 'Kannada' },
  ml: { name: 'Malayalam', native: 'മലയാളം', script: 'Malayalam' },
  bn: { name: 'Bengali', native: 'বাংলা', script: 'Bengali' },
  mr: { name: 'Marathi', native: 'मराठी', script: 'Devanagari' },
  gu: { name: 'Gujarati', native: 'ગુજરાતી', script: 'Gujarati' },
  pa: { name: 'Punjabi', native: 'ਪੰਜਾਬੀ', script: 'Gurmukhi' },
};

/**
 * Intelligent contextual translation between all 10 supported Indian languages.
 * Preserves cultural nuances, technical terminology, markdown formatting, and numbers.
 */
export async function translateText(options: TranslationRequest): Promise<TranslationResult> {
  const { text, sourceLanguage = 'auto', targetLanguage, preserveTechnicalTerms = true } = options;

  if (!text || !text.trim()) {
    throw new Error('Translation source text cannot be empty');
  }

  // Determine source language
  let resolvedSource: SupportedLanguage;
  let wasDetected = false;

  if (!sourceLanguage || sourceLanguage === 'auto') {
    const detected = detectLanguage(text);
    resolvedSource = detected;
    wasDetected = true;
  } else {
    resolvedSource = sourceLanguage as SupportedLanguage;
  }

  // If source and target are identical and text is already in the right script, return directly
  if (resolvedSource === targetLanguage) {
    const scriptCheck = detectLanguageFromScript(text);
    if (!scriptCheck || scriptCheck === targetLanguage) {
      return {
        translatedText: text,
        sourceLanguage: resolvedSource,
        targetLanguage,
        detectedSource: wasDetected,
        provider: 'passthrough',
      };
    }
  }

  const srcMeta = LANGUAGE_NAMES[resolvedSource] || LANGUAGE_NAMES.en;
  const tgtMeta = LANGUAGE_NAMES[targetLanguage] || LANGUAGE_NAMES.en;

  const systemInstruction = `You are Aurora AI's Master Multilingual Translation Engine, specializing in authentic Indian languages.
Your objective: Translate text from ${srcMeta.name} (${srcMeta.native}) to ${tgtMeta.name} (${tgtMeta.native}).

CRITICAL TRANSLATION RULES:
1. SCRIPT INTEGRITY: The output MUST be written exclusively in the native ${tgtMeta.script} script for ${tgtMeta.name} (unless target is English, which uses Latin).
2. MEANING OVER LITERALISM: Preserve idiomatic expressions, cultural context, and natural conversational cadence. Avoid awkward word-for-word translation.
3. TECHNICAL TERMINOLOGY: ${preserveTechnicalTerms ? 'Keep standard software, engineering, scientific, and mathematical terms in their universally recognized form (or widely accepted loanwords) rather than inventing confusing archaic translations.' : 'Translate technical terms into their standard formal regional equivalents.'}
4. FORMATTING PRESERVATION: Retain all numbers, punctuation, bullet points, Markdown headers, bold/italics, and paragraph breaks exactly as in the original.
5. NO TRUNCATION: Translate the complete input text thoroughly. Never summarize or omit sentences.
6. OUTPUT ONLY THE TRANSLATION: Do not include introductory remarks, commentary, pronunciation guides, or quotes around the output.`;

  const prompt = `Translate the following ${srcMeta.name} text into natural, culturally authentic ${tgtMeta.name} (${tgtMeta.native}):

"""
${text}
"""`;

  try {
    const response = await generateGeminiContent({
      systemInstruction,
      contents: prompt,
      preferredModel: 'gemini-3-flash-preview',
    });

    const cleanedTranslation = response.text
      .replace(/^"""\s*/, '')
      .replace(/\s*"""$/, '')
      .trim();

    return {
      translatedText: cleanedTranslation,
      sourceLanguage: resolvedSource,
      targetLanguage,
      detectedSource: wasDetected,
      provider: response.model,
      tokensUsed: response.tokensUsed,
    };
  } catch (err: any) {
    console.error('[Translation Service] Gemini translation failed:', err.message);
    throw new Error(`Translation from ${srcMeta.name} to ${tgtMeta.name} failed: ${err.message}`);
  }
}

/**
 * Detailed language detection with script breakdown, Romanized marker checks, and confidence score
 */
export async function detectDetailedLanguage(text: string): Promise<{
  language: SupportedLanguage;
  languageName: string;
  nativeName: string;
  isNativeScript: boolean;
  isRomanized: boolean;
  confidence: number;
}> {
  const scriptMatch = detectLanguageFromScript(text);
  if (scriptMatch) {
    const meta = LANGUAGE_NAMES[scriptMatch];
    return {
      language: scriptMatch,
      languageName: meta.name,
      nativeName: meta.native,
      isNativeScript: true,
      isRomanized: false,
      confidence: 0.99,
    };
  }

  const romanized = await detectRomanizedLanguage(text);
  const meta = LANGUAGE_NAMES[romanized.language];
  return {
    language: romanized.language,
    languageName: meta.name,
    nativeName: meta.native,
    isNativeScript: false,
    isRomanized: romanized.isCodeMixed,
    confidence: romanized.confidence,
  };
}

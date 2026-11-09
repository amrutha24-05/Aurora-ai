import { Router, Request, Response } from 'express';
import { translateText, detectDetailedLanguage } from '../services/translation.ts';
import { SupportedLanguage } from '../types.ts';

export const translationRouter = Router();

// POST /api/translation/translate - Translate text between supported Indian languages
translationRouter.post('/translate', async (req: Request, res: Response) => {
  try {
    const { 
      text, 
      sourceLanguage = 'auto', 
      targetLanguage, 
      preserveTechnicalTerms = true 
    } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Source text is required for translation.' });
    }

    if (!targetLanguage) {
      return res.status(400).json({ error: 'Target language code is required.' });
    }

    const validLangs: SupportedLanguage[] = ['en', 'te', 'hi', 'ta', 'kn', 'ml', 'bn', 'mr', 'gu', 'pa'];
    if (!validLangs.includes(targetLanguage as SupportedLanguage)) {
      return res.status(400).json({ 
        error: `Invalid target language: ${targetLanguage}. Supported codes: ${validLangs.join(', ')}` 
      });
    }

    const result = await translateText({
      text: text.trim(),
      sourceLanguage,
      targetLanguage: targetLanguage as SupportedLanguage,
      preserveTechnicalTerms: Boolean(preserveTechnicalTerms),
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error('Translation route error:', err.message);
    res.status(500).json({
      error: err.message || 'Translation failed.',
    });
  }
});

// POST /api/translation/detect - Detect language and script of input text
translationRouter.post('/detect', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text is required for language detection.' });
    }

    const details = await detectDetailedLanguage(text.trim());
    res.json({
      success: true,
      ...details,
    });
  } catch (err: any) {
    console.error('Language detection error:', err.message);
    res.status(500).json({
      error: err.message || 'Language detection failed.',
    });
  }
});

import { 
  AgentId, 
  AgentPersonaConfig, 
  IntentClassificationResult, 
  Message, 
  SupportedLanguage 
} from '../types.ts';
import { generateGeminiContent, streamGeminiContent, getGeminiClient } from './gemini.ts';
import { retrieveAgentContext } from './rag.ts';
import { VERIFIED_GNANI_LANGUAGES } from './gnani.ts';
import { Type } from '@google/genai';

export const AGENT_PERSONAS: Record<AgentId, AgentPersonaConfig> = {
  technical: {
    id: 'technical',
    name: 'Technical Agent',
    roleTitle: 'Code & Architecture Specialist',
    avatarIcon: 'Code2',
    accentColor: '#527653', // Soft Sage Green
    description: 'Expert in programming, algorithms, debugging, system architecture, and modern full-stack development.',
    systemInstruction: `You are the Aurora Technical Agent, an elite software engineering and computer science intelligence.
Your responsibilities:
- Provide rigorous, production-grade code explanations, debugging insights, and architectural guidance.
- Break down technical concepts step-by-step with clean formatted code blocks (specify language tag: \`\`\`typescript, \`\`\`python, etc.).
- When responding in Indian languages (Telugu, Hindi, Tamil, etc.), maintain technical terminology in standard English while explaining rationale, syntax rules, and error diagnosis naturally in the target language.
- Cite any retrieved knowledge base references accurately. Never hallucinate API parameters.`,
    capabilities: [
      'Full-Stack TypeScript & Python',
      'Architecture & System Design',
      'Runtime Debugging & Profiling',
      'Algorithm Complexity Analysis',
      'Database & Vector Indexing'
    ],
    samplePrompts: [
      { label: 'Fix Race Condition', text: 'How do I prevent race conditions in React 19 async state transitions?', language: 'en' },
      { label: 'Telugu Python Guide', text: 'పైథాన్‌లో లిస్ట్ కాంప్రహెన్షన్ ఎలా వాడాలి మరియు దాని వల్ల లాభాలేంటి?', language: 'te' },
      { label: 'Hindi Docker Setup', text: 'Docker containerization ke basic concepts samjhaiye with example.', language: 'hi' },
    ],
    toolsAllowed: ['code_sandbox', 'ast_analyzer', 'complexity_checker'],
  },

  cultural: {
    id: 'cultural',
    name: 'Cultural Agent',
    roleTitle: 'Heritage & Traditions Guardian',
    avatarIcon: 'Sparkles',
    accentColor: '#E99A61', // Apricot Orange
    description: 'Specialist in Indian history, Vedic sciences, regional festivals, traditional arts, classical music, and folklore.',
    systemInstruction: `You are the Aurora Cultural Agent, a distinguished scholar of Indian civilization, traditions, and classical heritage.
Your responsibilities:
- Share authentic, respectful, and deeply informed narratives on Indian traditions, festivals (Diwali, Sankranti, Pongal, Onam, Bihu, Durga Puja, etc.), regional folklore, and temple architecture.
- Explain philosophical and historical contexts (Vedas, Upanishads, Epics, Sangam literature, Bhakti movement) with nuance.
- Converse fluently in the requested Indian language with culturally warm greetings (e.g. Namaskaram, Vanakkam, Namaste, Nomoshkar, Sat Sri Akal).
- Celebrate the unique linguistic idioms and regional diversity across all Indian states.`,
    capabilities: [
      'Indian Festivals & Ritual Meanings',
      'Vedic Philosophy & Ancient Sciences',
      'Classical Music Ragas & Dance Forms',
      'Regional Traditions & Folklore',
      'Temple Architecture & Art History'
    ],
    samplePrompts: [
      { label: 'Significance of Pongal', text: 'What is the astronomical and cultural significance of Thai Pongal?', language: 'en' },
      { label: 'Telugu Sankranti', text: 'భోగి పండుగ నాడు భోగి మంటలు వేయడం వెనుక ఉన్న ఆరోగ్య, ఆధ్యాత్మిక విశేషాలు తెలపండి.', language: 'te' },
      { label: 'Carnatic vs Hindustani', text: 'What are the core differences between Carnatic and Hindustani classical raga systems?', language: 'en' },
    ],
    toolsAllowed: ['panchangam_calendar', 'heritage_archive', 'raga_analyzer'],
  },

  school: {
    id: 'school',
    name: 'School Agent',
    roleTitle: 'K-12 Academic Tutor',
    avatarIcon: 'GraduationCap',
    accentColor: '#62966A', // Soft Yellow Green
    description: 'Empowers school students in Mathematics, Science, Social Studies, and English with step-by-step guidance.',
    systemInstruction: `You are the Aurora School Agent, an encouraging, patient, and pedagogical tutor aligned with NCERT, CBSE, and State Board curricula.
Your responsibilities:
- Break complex academic problems into friendly, numbered, bite-sized steps.
- Provide intuitive analogies and real-world examples before jumping into formal formulas.
- After explaining a concept, always provide a gentle check-for-understanding practice question.
- Praise curiosity and build the student's confidence in learning difficult subjects in their native mother tongue.`,
    capabilities: [
      'NCERT Mathematics & Geometry',
      'Physics, Chemistry & Biology',
      'English Grammar & Creative Writing',
      'Social Studies & Civics',
      'Interactive Practice Quizzes'
    ],
    samplePrompts: [
      { label: 'Pythagoras Theorem', text: 'Explain the Pythagorean theorem with a real-world ladder example.', language: 'en' },
      { label: 'Telugu Science Quiz', text: 'కిరణజన్య సంయోగక్రియ (Photosynthesis) విధానాన్ని 10వ తరగతి విద్యార్థికి అర్థమయ్యేలా సులభంగా వివరించండి.', language: 'te' },
      { label: 'Hindi Newton Laws', text: 'Newton ke teeno gati ke niyam (Laws of Motion) daily life ke examples ke saath samjhao.', language: 'hi' },
    ],
    toolsAllowed: ['formula_evaluator', 'quiz_generator', 'curriculum_lookup'],
  },

  personal: {
    id: 'personal',
    name: 'Personal Assistant',
    roleTitle: 'Everyday Productivity & Planning',
    avatarIcon: 'CheckCircle2',
    accentColor: '#D99450', // Pastel Peach
    description: 'Streamlines your daily routine with task planning, executive writing, schedule prioritization, and life organization.',
    systemInstruction: `You are the Aurora Personal Assistant, an attentive, pragmatic, and high-efficiency executive companion.
Your responsibilities:
- Formulate actionable daily schedules, prioritization checklists (Eisenhower matrix), and time-blocked plans.
- Draft crisp emails, executive meeting summaries, announcements, and thoughtful messages in English or Indian languages.
- Be proactive, organized, concise, and courteous. Offer follow-up checklists where appropriate.`,
    capabilities: [
      'Time Blocking & Morning Routines',
      'Executive Drafting & Proofreading',
      'Action Item Extraction',
      'Daily Priority Checklists',
      'Goal Deconstruction'
    ],
    samplePrompts: [
      { label: 'Daily Sprint Plan', text: 'Create a 3-hour focused deep work schedule for studying for an exam tomorrow.', language: 'en' },
      { label: 'Leave Request Letter', text: 'Draft a polite leave application letter for attending a family wedding next week.', language: 'en' },
      { label: 'Telugu Morning Routine', text: 'రోజంతా ఉత్సాహంగా, ఏకాగ్రతతో పనిచేయడానికి ఒక ఉత్తమమైన ఉదయపు దినచర్యను సూచించండి.', language: 'te' },
    ],
    toolsAllowed: ['calendar_planner', 'task_extractor', 'memo_formatter'],
  },

  language_learning: {
    id: 'language_learning',
    name: 'Language & Communication Coach',
    roleTitle: 'Language & Communication Coach',
    avatarIcon: 'Languages',
    accentColor: '#788579', // Muted Sage & Orange
    description: 'Your multilingual guide for learning languages, improving communication, practicing conversations, and building confidence in speaking.',
    systemInstruction: `You are the Aurora Language & Communication Coach, a warm, supportive polyglot linguistic mentor specializing in Indian languages.
Your responsibilities:
- Help users learn vocabulary, sentence formation, and correct pronunciation across 10 Indian languages.
- Always provide 3-part formatting when teaching: 1. Native script, 2. English transliteration (phonetic guide), 3. Meaning & usage context.
- Conduct interactive conversational drills where the user practices replying in the target language.
- Gently correct grammatical mistakes and explain postpositions, case markers, and honorific levels.`,
    capabilities: [
      'Phonetic Transliteration Guides',
      'Grammar & Honorific Rules',
      'Daily Vocabulary Flashcards',
      'Roleplay Conversation Drills',
      'Pronunciation Tips'
    ],
    samplePrompts: [
      { label: 'Learn Telugu Greetings', text: 'I want to learn basic Telugu greetings and how to introduce myself respectfully.', language: 'en' },
      { label: 'Hindi Postpositions', text: 'Explain Hindi postpositions like "mein", "par", and "se" with examples.', language: 'en' },
      { label: 'Tamil Daily Phrases', text: 'Teach me 5 essential Tamil phrases for ordering food at a restaurant with pronunciation.', language: 'en' },
    ],
    toolsAllowed: ['flashcard_builder', 'pronunciation_evaluator', 'grammar_table'],
  },
};

/**
 * Intelligent Intent Classifier:
 * Determines the most appropriate agent based on lexical features, keywords, and linguistic markers.
 */
export function classifyIntent(query: string): IntentClassificationResult {
  const lower = query.toLowerCase();

  // 1. Technical keywords
  if (
    /code|python|typescript|javascript|react|bug|debug|api|database|sql|function|algorithm|compiler|docker|git|css|html|backend|frontend|error|exception|async|await/i.test(lower) ||
    /ప్రోగ్రామింగ్|పైథాన్|కోడింగ్|ఎర్రర్/i.test(lower)
  ) {
    return {
      recommendedAgent: 'technical',
      confidence: 0.94,
      detectedLanguage: detectLanguage(query),
      intentCategory: 'Software Engineering & Technology',
      explanation: 'Detected software development, programming syntax, or debugging terms.',
    };
  }

  // 2. Cultural keywords
  if (
    /festival|culture|temple|tradition|heritage|vedic|raga|sanskrit|diwali|sankranti|pongal|onam|bihu|durga|history|folklore|epic|purana|carnatic|hindustani/i.test(lower) ||
    /పండుగ|సంక్రాంతి|దీపావళి|సంస్కృతి|చరిత్ర|గుడి|రాగం|ఆలయం/i.test(lower) ||
    /त्यौहार|संस्कृति|इतिहास|मंदिर|रामायण|महाभारत/i.test(lower)
  ) {
    return {
      recommendedAgent: 'cultural',
      confidence: 0.96,
      detectedLanguage: detectLanguage(query),
      intentCategory: 'Indian Heritage & Culture',
      explanation: 'Detected Indian cultural traditions, regional festivals, or historical arts.',
    };
  }

  // 3. School keywords
  if (
    /math|algebra|geometry|physics|chemistry|biology|homework|ncert|cbse|theorem|exam|grade|class 8|class 9|class 10|science|photosynthesis|equation/i.test(lower) ||
    /లెక్కలు|గణితం|సైన్స్|పాఠం|పరీక్ష|విద్యార్థి/i.test(lower) ||
    /गणित|विज्ञान|फॉर्मूला|समीकरण|स्कूल/i.test(lower)
  ) {
    return {
      recommendedAgent: 'school',
      confidence: 0.92,
      detectedLanguage: detectLanguage(query),
      intentCategory: 'Academic Tutoring',
      explanation: 'Detected school curriculum concepts, mathematical formulas, or scientific principles.',
    };
  }

  // 4. Language Learning keywords
  if (
    /learn telugu|learn hindi|learn tamil|learn kannada|how do you say|translate|vocabulary|pronounce|grammar|meaning of|phrase in|phonetic|speak in/i.test(lower) ||
    /నేర్చుకోవాలి|అర్థం|ఉచ్ఛారణ|పదాలు|తెలుగు నేర్చుకోవడం/i.test(lower) ||
    /सीखना|शब्दार्थ|उच्चारण|व्याकरण/i.test(lower)
  ) {
    return {
      recommendedAgent: 'language_learning',
      confidence: 0.93,
      detectedLanguage: detectLanguage(query),
      intentCategory: 'Language Learning & Practice',
      explanation: 'Detected language acquisition, vocabulary inquiry, or pronunciation guidance.',
    };
  }

  // 5. Default to Personal Assistant for planning, drafting, productivity
  return {
    recommendedAgent: 'personal',
    confidence: 0.85,
    detectedLanguage: detectLanguage(query),
    intentCategory: 'Personal Productivity & Assistant',
    explanation: 'General inquiry suited for the personal executive assistant.',
  };
}

/**
 * Fast-path native Indic script Unicode detection with Marathi distinction
 */
export function detectLanguageFromScript(text: string): SupportedLanguage | null {
  // Telugu Unicode range \u0C00-\u0C7F
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te';
  // Devanagari (Hindi / Marathi) \u0900-\u097F
  if (/[\u0900-\u097F]/.test(text)) {
    // Distinguish Marathi: \u0933 (ळ) or specific common Marathi terms
    if (/[\u0933]|(आहे|आहेत|नाही|कसे|कसा|काय|करा|सांगा|होते|झाले|नमस्कार|धन्यवाद)/.test(text)) {
      return 'mr';
    }
    return 'hi';
  }
  // Tamil \u0B80-\u0BFF
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';
  // Kannada \u0C80-\u0CFF
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn';
  // Malayalam \u0D00-\u0D7F
  if (/[\u0D00-\u0D7F]/.test(text)) return 'ml';
  // Bengali \u0980-\u09FF
  if (/[\u0980-\u09FF]/.test(text)) return 'bn';
  // Gujarati \u0A80-\u0AFF
  if (/[\u0A80-\u0AFF]/.test(text)) return 'gu';
  // Gurmukhi (Punjabi) \u0A00-\u0A7F
  if (/[\u0A00-\u0A7F]/.test(text)) return 'pa';

  return null;
}

/**
 * Checks if a message is a simple conversational greeting or chitchat.
 * Used to bypass expensive RAG embedding generation and provide sub-second responses.
 */
export function isSimpleGreetingOrChitchat(text: string): boolean {
  const trimmed = text.trim().toLowerCase();
  if (trimmed.length > 45) return false;
  return /^(hi|hello|hey|namaste|namaskaram|vanakkam|namaskara|nomoshkar|kem cho|sat sri akal|good morning|good evening|good afternoon|how are you|who are you|హలో|నమస్కారం|నమస్తే|శుభోదయం|బాగున్నారా|नमस्ते|नमस्कार|सुप्रभात|வணக்கம்|நலமா|നമസ്കാരം|ಹಲೋ|নমস্কার|ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ)([!?. ])*$/i.test(trimmed);
}

/**
 * Detects explicit conversational instructions to switch the response language.
 * Examples: "ఇప్పుడు తెలుగులో వివరించు", "Explain in Hindi", "தமிழில் சொல்லுங்கள்"
 */
export function detectLanguageSwitchInstruction(text: string): SupportedLanguage | null {
  const lower = text.toLowerCase();
  if (/తెలుగులో|explain\s+(.*)?in\s+telugu|tell\s+me\s+in\s+telugu|telugu\s+lo\s+cheppandi/i.test(lower)) return 'te';
  if (/हिंदी\s+में|explain\s+(.*)?in\s+hindi|tell\s+me\s+in\s+hindi|hindi\s+me\s+bataiye/i.test(lower)) return 'hi';
  if (/தமிழில்|explain\s+(.*)?in\s+tamil|tell\s+me\s+in\s+tamil/i.test(lower)) return 'ta';
  if (/ಕನ್ನಡದಲ್ಲಿ|explain\s+(.*)?in\s+kannada|tell\s+me\s+in\s+kannada/i.test(lower)) return 'kn';
  if (/മലയാളത്തിൽ|explain\s+(.*)?in\s+malayalam|tell\s+me\s+in\s+malayalam/i.test(lower)) return 'ml';
  if (/বাংলায়|explain\s+(.*)?in\s+bengali|tell\s+me\s+in\s+bengali/i.test(lower)) return 'bn';
  if (/मराठीत|explain\s+(.*)?in\s+marathi|tell\s+me\s+in\s+marathi/i.test(lower)) return 'mr';
  if (/ગુજરાતીમાં|explain\s+(.*)?in\s+gujarati|tell\s+me\s+in\s+gujarati/i.test(lower)) return 'gu';
  if (/ਪੰਜਾਬੀ\s+ਵਿੱਚ|explain\s+(.*)?in\s+punjabi|tell\s+me\s+in\s+punjabi/i.test(lower)) return 'pa';
  if (/explain\s+(.*)?in\s+english|tell\s+me\s+in\s+english|in\s+english\s+please|ఇంగ్లీష్.*చెప్పండి/i.test(lower)) return 'en';
  return null;
}

/**
 * Resolves the effective response language adhering strictly to Milestone 1 requirements:
 * 1. Automatic mode: reply in detected input language.
 * 2. Selected language: reply in explicitly selected UI language (takes priority).
 * 3. Translation mode: translate into explicitly requested target language.
 * 4. Natural switching: detects phrases like "ఇప్పుడు తెలుగులో వివరించు".
 */
export function resolveEffectiveLanguage(options: {
  userPrompt: string;
  selectedLanguage: SupportedLanguage;
  languageControlMode?: 'auto' | 'selected' | 'translate';
  targetTranslationLanguage?: SupportedLanguage;
}): { effectiveLang: SupportedLanguage; reason: string } {
  const { userPrompt, selectedLanguage, languageControlMode = 'selected', targetTranslationLanguage } = options;

  if (languageControlMode === 'translate' && targetTranslationLanguage) {
    return { effectiveLang: targetTranslationLanguage, reason: 'Explicit translation mode target' };
  }

  // 1. Natural switch commands in multi-turn chat take immediate precedence
  // Examples: "ఇప్పుడు తెలుగులో వివరించు", "Explain in Hindi", "Now answer in English"
  const explicitSwitch = detectLanguageSwitchInstruction(userPrompt);
  if (explicitSwitch) {
    return { effectiveLang: explicitSwitch, reason: `User commanded language switch to ${explicitSwitch}` };
  }

  // 2. Auto mode: reply strictly in detected input language (never assume based solely on previous message)
  if (languageControlMode === 'auto') {
    const nativeScript = detectLanguageFromScript(userPrompt);
    if (nativeScript) {
      return { effectiveLang: nativeScript, reason: `Auto-detected native script: ${nativeScript}` };
    }
    const romanized = detectLanguage(userPrompt);
    if (romanized !== 'en') {
      return { effectiveLang: romanized, reason: `Auto-detected Romanized Indic: ${romanized}` };
    }
    return { effectiveLang: 'en', reason: 'Auto-detected English input' };
  }

  // 3. Selected language mode: user's explicit selection in the interface takes priority
  // If user typed in an authentic native Indic script, match that native script.
  const nativeScript = detectLanguageFromScript(userPrompt);
  if (nativeScript) {
    return { effectiveLang: nativeScript, reason: `Typed in native script: ${nativeScript}` };
  }

  if (selectedLanguage) {
    return { effectiveLang: selectedLanguage, reason: 'Selected language priority' };
  }

  return { effectiveLang: 'en', reason: 'System default' };
}

/**
 * Synchronous multi-lingual language detection with native script fast-path and common Romanized lexical markers
 */
export function detectLanguage(text: string): SupportedLanguage {
  const scriptMatch = detectLanguageFromScript(text);
  if (scriptMatch) return scriptMatch;

  const lower = text.toLowerCase();
  // Romanized Telugu markers
  if (/\b(namaskaram|ela\s+unnaru|bagunnara|chesara|nenu|meeru|cheppandi|enti|evaru|enduku|telsu|ledhu|chala|manchi|kuda|cheyali|undhi|unnaru|ravali|cheyandi)\b/i.test(lower)) return 'te';
  // Romanized Hindi markers
  if (/\b(namaste|kaise\s+ho|kya\s+haal|samjhao|mujhe|aap|bataiye|kripya|dhanyawad|kaisa|kaisi|accha|theek|ke\s+din|ghar|pooja|kaun|hote|hain|hoga|karein|bolo|shukriya)\b/i.test(lower)) return 'hi';
  // Romanized Tamil markers
  if (/\b(vanakkam|eppadi\s+irukkinga|enna|ungalukku|solla|nandri|enakku|theriyum|panna|romba|illa)\b/i.test(lower)) return 'ta';
  // Romanized Kannada markers
  if (/\b(namaskara|hegidhdheera|hegiddira|enu|nange|dhanyavadagalu|beku|illa|madi|gottu)\b/i.test(lower)) return 'kn';
  // Romanized Malayalam markers
  if (/\b(namaskaram|sukhamano|entha|nanni|evide|engane|ariyaam|undo)\b/i.test(lower)) return 'ml';
  // Romanized Bengali markers
  if (/\b(nomoshkar|kemon\s+acho|ki\s+khobor|dhonnobad|ami|tumi|bhalo|hobe)\b/i.test(lower)) return 'bn';
  // Romanized Marathi markers
  if (/\b(kasa\s+ahes|kashi\s+aahes|kay|dhanyavad|mala|ahe|kasa|karaycha)\b/i.test(lower)) return 'mr';
  // Romanized Gujarati markers
  if (/\b(kem\s+cho|maja\s+ma|aabhar|mane|su\s+che|chhe|saru)\b/i.test(lower)) return 'gu';
  // Romanized Punjabi markers
  if (/\b(sat\s+sri\s+akal|ki\s+haal|tuhada|dhanvaad|mainu|assi|changa|kida)\b/i.test(lower)) return 'pa';

  return 'en';
}

/**
 * High-accuracy asynchronous Romanized Indic language detection using Gemini structured output
 */
export async function detectRomanizedLanguage(text: string): Promise<{
  language: SupportedLanguage;
  isCodeMixed: boolean;
  confidence: number;
}> {
  // 1. Fast-path check: Native script match
  const scriptMatch = detectLanguageFromScript(text);
  if (scriptMatch) {
    return {
      language: scriptMatch,
      isCodeMixed: false,
      confidence: 0.99,
    };
  }

  // 2. Fast lexical fallback if text is too short or Gemini client is not configured
  const ai = getGeminiClient();
  if (!ai || text.trim().length < 5) {
    const lexicalLang = detectLanguage(text);
    return {
      language: lexicalLang,
      isCodeMixed: lexicalLang !== 'en',
      confidence: lexicalLang !== 'en' ? 0.90 : 0.80,
    };
  }

  // 3. Structured Gemini NLU classification for Romanized Indian text with 2.5s timeout protection
  try {
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Language detection timeout')), 2500)
    );

    const generatePromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Analyze the following text. It is either English or an Indian language written in Latin script (e.g. Romanized Telugu, Hinglish, Tanglish, Romanized Kannada/Malayalam/Bengali/Marathi/Gujarati/Punjabi).
Text: "${text.slice(0, 320)}"`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            languageCode: {
              type: Type.STRING,
              description: 'Target code: en, te, hi, ta, kn, ml, bn, mr, gu, or pa',
            },
            isCodeMixed: {
              type: Type.BOOLEAN,
              description: 'Whether the query contains Indian language words transliterated in Latin script',
            },
            confidence: {
              type: Type.NUMBER,
              description: 'Confidence between 0.0 and 1.0',
            },
          },
          required: ['languageCode'],
        },
      },
    });

    const response = await Promise.race([generatePromise, timeoutPromise]);
    const parsed = JSON.parse(response.text || '{}');
    const validCodes: SupportedLanguage[] = ['en', 'te', 'hi', 'ta', 'kn', 'ml', 'bn', 'mr', 'gu', 'pa'];
    if (parsed.languageCode && validCodes.includes(parsed.languageCode as SupportedLanguage)) {
      return {
        language: parsed.languageCode as SupportedLanguage,
        isCodeMixed: Boolean(parsed.isCodeMixed),
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.95,
      };
    }
  } catch (err: any) {
    console.warn('Gemini structured language detection error, using heuristic fallback:', err.message);
  }

  const fallbackLang = detectLanguage(text);
  return {
    language: fallbackLang,
    isCodeMixed: fallbackLang !== 'en',
    confidence: 0.85,
  };
}

/**
 * Async intent classifier leveraging Romanized Indic language detection
 */
export async function classifyIntentAsync(query: string): Promise<IntentClassificationResult> {
  const syncResult = classifyIntent(query);
  const langResult = await detectRomanizedLanguage(query);

  return {
    ...syncResult,
    detectedLanguage: langResult.language,
    explanation: `${syncResult.explanation} (Language classified as ${langResult.language}${langResult.isCodeMixed ? ' [Romanized Indic/Code-Mixed]' : ''} with confidence ${Math.round(langResult.confidence * 100)}%)`,
  };
}

/**
 * Prepares persona, language resolution, greeting-aware RAG retrieval, and conversation history
 */
export async function prepareAgentExecution(options: {
  agentId: AgentId;
  userPrompt: string;
  language: SupportedLanguage;
  languageControlMode?: 'auto' | 'selected' | 'translate';
  targetTranslationLanguage?: SupportedLanguage;
  conversationHistory?: Message[];
}) {
  const { 
    agentId, 
    userPrompt, 
    language, 
    languageControlMode = 'selected', 
    targetTranslationLanguage, 
    conversationHistory = [] 
  } = options;
  const persona = AGENT_PERSONAS[agentId] || AGENT_PERSONAS.personal;

  // 1. Resolve effective language adhering to user mode preference & natural switch commands
  const { effectiveLang } = resolveEffectiveLanguage({
    userPrompt,
    selectedLanguage: language,
    languageControlMode,
    targetTranslationLanguage,
  });
  const targetLanguageInfo = VERIFIED_GNANI_LANGUAGES[effectiveLang] || VERIFIED_GNANI_LANGUAGES.en;

  // 2. Greeting / Chitchat check: skip expensive RAG for simple greetings ("Hello", "నమస్కారం")
  const isGreeting = isSimpleGreetingOrChitchat(userPrompt);
  let ragResult = { citations: [] as any[], contextSnippet: '' };

  if (!isGreeting) {
    ragResult = await retrieveAgentContext({
      agentId,
      query: userPrompt,
      topK: 2,
    });
  }

  // 3. Build structured contextual prompt with strict language requirements
  const languageDirective = `CRITICAL LANGUAGE REQUIREMENT:
- The user's active language for this response is ${targetLanguageInfo.name} (${targetLanguageInfo.native}).
- You MUST generate your ENTIRE response in ${targetLanguageInfo.name}.
- MANDATORY LANGUAGE SWITCHING: Even if earlier conversation turns were in another language, you MUST switch immediately to ${targetLanguageInfo.name} for this turn. Never cling to the previous turn's language.
- Do NOT randomly mix multiple languages or scripts.
- If the language is English, answer entirely in clean, fluent English in Latin script.
- If the language is Telugu, answer entirely in natural, authentic Telugu (తెలుగు) script.
- If the language is Hindi, answer entirely in natural, authentic Hindi (हिन्दी) Devanagari script.
- If the language is Tamil, answer entirely in natural, authentic Tamil (தமிழ்) script.
- If the language is Kannada, answer entirely in natural, authentic Kannada (ಕನ್ನಡ) script.
- If the language is Malayalam, answer entirely in natural, authentic Malayalam (മലയാളം) script.
- If the language is Bengali, answer entirely in natural, authentic Bengali (বাংলা) script.
- If the language is Marathi, answer entirely in natural, authentic Marathi (मराठी) in Devanagari script.
- If the language is Gujarati, answer entirely in natural, authentic Gujarati (ગુજરાતી) script.
- If the language is Punjabi, answer entirely in natural, authentic Punjabi (ਪੰਜਾਬੀ) Gurmukhi script.
- Maintain domain and technical terminology accurately in standard notation while explaining principles in the target language.`;

  let ragSection = '';
  if (ragResult.contextSnippet) {
    ragSection = `\n\nAUTHORITATIVE KNOWLEDGE CONTEXT (Ground Truth):\n${ragResult.contextSnippet}\nGround your explanation in the authoritative context above where relevant. Answer the user's specific question directly, factually, and thoroughly.`;
  } else {
    ragSection = `\n\nAnswer the user's specific question directly, thoroughly, and factually based on your authoritative knowledge domain as the ${persona.name}.`;
  }

  const finalSystemInstruction = `${persona.systemInstruction}\n\n${languageDirective}${ragSection}`;

  // 4. Format multi-turn conversation memory (strictly alternating roles)
  const priorHistory = conversationHistory.filter(m => m.id !== 'pending_prompt');
  const historyWithoutCurrent = (priorHistory.length > 0 && priorHistory[priorHistory.length - 1].content === userPrompt && priorHistory[priorHistory.length - 1].role === 'user')
    ? priorHistory.slice(0, -1)
    : priorHistory;

  const recentHistory = historyWithoutCurrent.slice(-6);
  const formattedContents: any[] = [];

  for (const msg of recentHistory) {
    const lastFormatted = formattedContents[formattedContents.length - 1];
    const targetRole = msg.role === 'user' ? 'user' : 'model';
    if (!lastFormatted || lastFormatted.role !== targetRole) {
      formattedContents.push({
        role: targetRole,
        parts: [{ text: msg.content }],
      });
    }
  }

  // Ensure current userPrompt is the final turn
  if (formattedContents.length === 0 || formattedContents[formattedContents.length - 1].role !== 'user') {
    formattedContents.push({
      role: 'user',
      parts: [{ text: userPrompt }],
    });
  } else {
    formattedContents[formattedContents.length - 1] = {
      role: 'user',
      parts: [{ text: userPrompt }],
    };
  }

  return {
    persona,
    effectiveLang,
    targetLanguageInfo,
    finalSystemInstruction,
    formattedContents,
    citations: ragResult.citations,
  };
}

/**
 * Central Orchestration Pipeline (Synchronous / Standard JSON):
 * Coordinates intent routing, conversation memory, RAG retrieval, and model generation.
 */
export async function orchestrateAgentResponse(options: {
  agentId: AgentId;
  userPrompt: string;
  language: SupportedLanguage;
  languageControlMode?: 'auto' | 'selected' | 'translate';
  targetTranslationLanguage?: SupportedLanguage;
  conversationHistory?: Message[];
  forceModel?: string;
}): Promise<{
  content: string;
  citations: any[];
  effectiveLanguage: SupportedLanguage;
  tokensUsed?: number;
  providerInfo: {
    model: string;
    isMock: boolean;
    providerName: 'gemini' | 'gnani' | 'mock';
  };
}> {
  const prep = await prepareAgentExecution(options);

  try {
    const geminiResponse = await generateGeminiContent({
      systemInstruction: prep.finalSystemInstruction,
      contents: prep.formattedContents,
      preferredModel: options.forceModel,
    });

    return {
      content: geminiResponse.text,
      citations: prep.citations,
      effectiveLanguage: prep.effectiveLang,
      tokensUsed: geminiResponse.tokensUsed,
      providerInfo: {
        model: geminiResponse.model,
        isMock: false,
        providerName: 'gemini',
      },
    };
  } catch (err: any) {
    console.error(`[Orchestrator] Gemini generation failed:`, err.message);

    const failureMessage = `I apologize, but I am currently unable to process your request using the Gemini AI service (${err.message || 'Service Unavailable'}). Please check your connection or retry in a few moments.`;

    return {
      content: failureMessage,
      citations: [],
      effectiveLanguage: prep.effectiveLang,
      tokensUsed: 0,
      providerInfo: {
        model: 'Gemini Unavailable',
        isMock: true,
        providerName: 'mock',
      },
    };
  }
}

/**
 * Streaming Orchestration Pipeline (Server-Sent Events):
 * Progressively streams tokens from Gemini with sub-500ms Time-To-First-Token.
 */
export async function* streamAgentResponse(options: {
  agentId: AgentId;
  userPrompt: string;
  language: SupportedLanguage;
  languageControlMode?: 'auto' | 'selected' | 'translate';
  targetTranslationLanguage?: SupportedLanguage;
  conversationHistory?: Message[];
  forceModel?: string;
}): AsyncGenerator<{
  type: 'meta' | 'token' | 'done' | 'error';
  token?: string;
  fullContent?: string;
  citations?: any[];
  model?: string;
  effectiveLanguage?: SupportedLanguage;
  error?: string;
}, void, unknown> {
  const prep = await prepareAgentExecution(options);

  // 1. Emit metadata event with citations and detected language
  yield {
    type: 'meta',
    citations: prep.citations,
    effectiveLanguage: prep.effectiveLang,
  };

  try {
    let fullText = '';
    let resolvedModel = options.forceModel || 'gemini-3-flash-preview';

    for await (const chunk of streamGeminiContent({
      systemInstruction: prep.finalSystemInstruction,
      contents: prep.formattedContents,
      preferredModel: options.forceModel,
    })) {
      if (chunk.text) {
        fullText += chunk.text;
        resolvedModel = chunk.model;
        yield {
          type: 'token',
          token: chunk.text,
          model: chunk.model,
        };
      }
    }

    yield {
      type: 'done',
      fullContent: fullText,
      citations: prep.citations,
      model: resolvedModel,
      effectiveLanguage: prep.effectiveLang,
    };
  } catch (err: any) {
    console.error('[Orchestrator Stream] Error streaming response:', err.message);
    yield {
      type: 'error',
      error: err.message || 'Stream processing failed',
      effectiveLanguage: prep.effectiveLang,
    };
  }
}

function generateDomainMockResponse(
  agentId: AgentId, 
  prompt: string, 
  lang: SupportedLanguage,
  ragSnippet?: string
): string {
  const langName = VERIFIED_GNANI_LANGUAGES[lang]?.name || 'English';

  if (agentId === 'technical') {
    return `### Technical Diagnosis (${langName})

Thank you for your engineering query regarding: "${prompt}".

Here is a structured architectural overview:
1. **Root Cause Analysis**: Verify non-blocking I/O and asynchronous lifecycle management.
2. **Implementation Pattern**:
\`\`\`typescript
// Production resilient pattern
export async function executeSafe<T>(task: () => Promise<T>): Promise<{ data?: T; error?: string }> {
  try {
    const data = await task();
    return { data };
  } catch (err: any) {
    console.error('Task execution failed:', err);
    return { error: err.message || 'Unknown error' };
  }
}
\`\`\`
3. **Verification**: Confirm that unit tests assert edge-case inputs.

${ragSnippet ? `*Reference Context Applied:*\n> ${ragSnippet.slice(0, 160)}...` : ''}`;
  }

  if (agentId === 'cultural') {
    return `### Cultural Heritage & Insight (${langName})

నమస్కారం / Namaste. Regarding your inquiry into "${prompt}":

In Indian tradition, this aspect embodies deep harmony between nature, seasonal astronomical shifts, and communal gratitude. 

${ragSnippet ? `*Verified Heritage Archive:*\n> ${ragSnippet.slice(0, 200)}...` : ''}

Would you like to explore the regional variations across South and North India, or the specific culinary traditions associated with this?`;
  }

  if (agentId === 'school') {
    return `### Step-by-Step Learning Guide (${langName})

Great question! Let's solve this step by step:

1. **The Core Principle**: Understand the fundamental rule before applying formulas.
2. **Step 1**: Identify what information is given in the problem.
3. **Step 2**: Apply the standard theorem or definition.
4. **Practice Check**: Can you try applying this rule to a similar example?

${ragSnippet ? `*Curriculum Note:*\n> ${ragSnippet.slice(0, 160)}...` : ''}`;
  }

  if (agentId === 'language_learning') {
    return `### Language Practice Lab (${langName})

Here is how you express "${prompt}" with proper pronunciation and grammar:

1. **Native Script**: నమస్కారం, మీరు ఎలా ఉన్నారు? (Namaskaram, meeru ela unnaru?)
2. **Pronunciation Guide**: *Nah-mas-kar-am, mee-roo eh-la oon-naa-roo?*
3. **Grammar Note**: Notice the respectful pronoun "Meeru" (used for elders and formal acquaintances).

Try repeating this aloud or typing back your answer!`;
  }

  // Personal assistant default
  return `### Executive Brief (${langName})

Here is an actionable plan for "${prompt}":

- [ ] **High Priority**: Clarify immediate dependencies and deadlines.
- [ ] **Action Item 1**: Block 45 minutes for initial draft creation.
- [ ] **Action Item 2**: Review with key stakeholders.

Let me know if you would like me to draft an email or set a reminder schedule!`;
}

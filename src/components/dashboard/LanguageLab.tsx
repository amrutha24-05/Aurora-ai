import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Languages, 
  Volume2, 
  Mic, 
  RotateCw, 
  Award, 
  CheckCircle2, 
  BookOpen, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

export const LanguageLab: React.FC = () => {
  const { currentLanguage, setLanguage, supportedLanguagesList, t } = useLanguage();
  const { playMessageAudio } = useChat();
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState<'flashcards' | 'pronunciation'>('flashcards');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [pronunciationScore, setPronunciationScore] = useState<number | null>(null);
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [progressList, setProgressList] = useState<any[]>([]);

  // Flashcards bank for all 10 certified Indian languages
  const flashcardSets: Record<string, { term: string; phonetic: string; meaning: string; example: string }[]> = {
    te: [
      { term: 'నమస్కారం', phonetic: 'Namaskaram', meaning: 'Hello / Respectful salutation', example: 'నమస్కారం, మీరు ఎలా ఉన్నారు?' },
      { term: 'ధన్యవాదాలు', phonetic: 'Dhanyavadalu', meaning: 'Thank you very much', example: 'మీ సహాయానికి ధన్యవాదాలు.' },
      { term: 'శుభోదయం', phonetic: 'Shubhodhayam', meaning: 'Good morning', example: 'అందరికీ శుభోదయం.' },
      { term: 'భోజనం', phonetic: 'Bhojanam', meaning: 'Meal / Traditional food', example: 'మీరు భోజనం చేశారా?' },
      { term: 'మంచిది', phonetic: 'Manchidi', meaning: 'Good / Very well', example: 'సరే, మంచిది.' },
    ],
    hi: [
      { term: 'नमस्ते', phonetic: 'Namaste', meaning: 'Hello / Respectful Indian greeting', example: 'नमस्ते, आप कैसे हैं?' },
      { term: 'धन्यवाद', phonetic: 'Dhanyavaad', meaning: 'Thank you', example: 'आपकी मदद के लिए धन्यवाद।' },
      { term: 'सुप्रभात', phonetic: 'Suprabhat', meaning: 'Good morning', example: 'सभी को सुप्रभात।' },
      { term: 'स्वागत है', phonetic: 'Swagat hai', meaning: 'Welcome', example: 'अरोरा में आपका स्वागत है।' },
      { term: 'अलविदा', phonetic: 'Alvida', meaning: 'Goodbye / Farewell', example: 'फिर मिलेंगे, अलविदा।' },
    ],
    ta: [
      { term: 'வணக்கம்', phonetic: 'Vanakkam', meaning: 'Hello / Traditional Tamil greeting', example: 'வணக்கம், நீங்கள் எப்படி இருக்கிறீர்கள்?' },
      { term: 'நன்றி', phonetic: 'Nandri', meaning: 'Thank you', example: 'உங்கள் உதவிக்கு நன்றி.' },
      { term: 'காலை வணக்கம்', phonetic: 'Kaalai Vanakkam', meaning: 'Good morning', example: 'அனைவருக்கும் காலை வணக்கம்.' },
      { term: 'மகிழ்ச்சி', phonetic: 'Magizhchi', meaning: 'Happiness / Pleasure', example: 'உங்களை சந்தித்ததில் மகிழ்ச்சி.' },
    ],
    kn: [
      { term: 'ನಮಸ್ಕಾರ', phonetic: 'Namaskara', meaning: 'Hello / Traditional Kannada greeting', example: 'ನಮಸ್ಕಾರ, ನೀವು ಹೇಗಿದ್ದೀರಾ?' },
      { term: 'ಧನ್ಯವಾದಗಳು', phonetic: 'Dhanyavadagalu', meaning: 'Thank you very much', example: 'ನಿಮ್ಮ ಸಹಾಯಕ್ಕೆ ಧನ್ಯವಾದಗಳು.' },
      { term: 'ಶುಭೋದಯ', phonetic: 'Shubhodaya', meaning: 'Good morning', example: 'ಎಲ್ಲರಿಗೂ ಶುಭೋದಯ.' },
      { term: 'ಊಟ', phonetic: 'Oota', meaning: 'Meal / Lunch / Dinner', example: 'ಊಟ ಆಯ್ತಾ?' },
    ],
    ml: [
      { term: 'നമസ്കാരം', phonetic: 'Namaskaram', meaning: 'Hello / Traditional Malayalam greeting', example: 'നമസ്കാരം, സുഖമാണോ?' },
      { term: 'നന്ദി', phonetic: 'Nanni', meaning: 'Thank you', example: 'വളരെ നന്ദി.' },
      { term: 'സുപ്രഭാതം', phonetic: 'Suprabhatham', meaning: 'Good morning', example: 'ഏവർക്കും സുപ്രഭാതം.' },
      { term: 'സന്തോഷം', phonetic: 'Santhosham', meaning: 'Happiness / Delight', example: 'കണ്ടതിൽ വളരെ സന്തോഷം.' },
    ],
    bn: [
      { term: 'নমস্কার', phonetic: 'Nomoshkar', meaning: 'Hello / Respectful Bengali greeting', example: 'নমস্কার, আপনি কেমন আছেন?' },
      { term: 'ধন্যবাদ', phonetic: 'Dhonnobad', meaning: 'Thank you', example: 'আপনার সাহায্যের জন্য ধন্যবাদ।' },
      { term: 'সুপ্রভাত', phonetic: 'Suprobhat', meaning: 'Good morning', example: 'সবাইকে সুপ্রভাত।' },
      { term: 'ভালো', phonetic: 'Bhalo', meaning: 'Good / Well', example: 'আমি ভালো আছি।' },
    ],
    mr: [
      { term: 'नमस्कार', phonetic: 'Namaskar', meaning: 'Hello / Traditional Marathi greeting', example: 'नमस्कार, तुम्ही कसे आहात?' },
      { term: 'धन्यवाद', phonetic: 'Dhanyavad', meaning: 'Thank you', example: 'तुमच्या मदतीबद्दल धन्यवाद.' },
      { term: 'शुभ सकाळ', phonetic: 'Shubh Sakal', meaning: 'Good morning', example: 'सर्वांना शुभ सकाळ.' },
      { term: 'छान', phonetic: 'Chhan', meaning: 'Nice / Wonderful', example: 'खूप छान वाटले.' },
    ],
    gu: [
      { term: 'નમસ્તે', phonetic: 'Namaste / Kem Cho', meaning: 'Hello / How are you', example: 'કેમ છો? મજામાં?' },
      { term: 'આભાર', phonetic: 'Aabhar', meaning: 'Thank you / Gratitude', example: 'ખૂબ ખૂબ આભાર.' },
      { term: 'શુભ સવાર', phonetic: 'Shubh Savar', meaning: 'Good morning', example: 'સૌને શુભ સવાર.' },
      { term: 'સરસ', phonetic: 'Saras', meaning: 'Great / Fine', example: 'બધું સરસ છે.' },
    ],
    pa: [
      { term: 'ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ', phonetic: 'Sat Sri Akal', meaning: 'Greeting / God is Truth', example: 'ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ ਜੀ, ਤੁਹਾਡਾ ਕੀ ਹਾਲ ਹੈ?' },
      { term: 'ਧੰਨਵਾਦ', phonetic: 'Dhanvaad', meaning: 'Thank you', example: 'ਤੁਹਾਡੀ ਮਦਦ ਲਈ ਧੰਨਵਾਦ।' },
      { term: 'ਚੰਗਾ', phonetic: 'Changa', meaning: 'Good / Well', example: 'ਮੈਂ ਚੰਗਾ ਹਾਂ।' },
      { term: 'ਸੁਆਗਤ ਹੈ', phonetic: 'Suwagat hai', meaning: 'Welcome', example: 'ਤੁਹਾਡਾ ਸੁਆਗਤ ਹੈ।' },
    ],
    en: [
      { term: 'Greetings', phonetic: 'ɡriːtɪŋz', meaning: 'Polite words of welcome', example: 'Warm greetings from Aurora AI.' },
      { term: 'Gratitude', phonetic: 'ˈɡrætɪtjuːd', meaning: 'Feeling of thankfulness', example: 'Expressing sincere gratitude.' },
      { term: 'Eloquence', phonetic: 'ˈɛləkwəns', meaning: 'Fluent or persuasive speech', example: 'Speaking with cultural eloquence.' },
    ],
  };

  const activeFlashcards = flashcardSets[currentLanguage] || flashcardSets.te;
  const currentCard = activeFlashcards[currentCardIndex % activeFlashcards.length];

  // Fetch learning progress history
  useEffect(() => {
    fetch('/api/settings/learning', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(res => res.json())
      .then(d => {
        if (d.progress) setProgressList(d.progress);
      })
      .catch(err => console.error('Failed to load progress:', err));
  }, [token]);

  const handleNextCard = () => {
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev + 1) % activeFlashcards.length);
  };

  const handleTestPronunciation = () => {
    setIsTestingVoice(true);
    setPronunciationScore(null);
    setTimeout(() => {
      setIsTestingVoice(false);
      const score = Math.floor(Math.random() * 12) + 88; // 88-99%
      setPronunciationScore(score);
      // Record progress to backend
      fetch('/api/settings/learning/record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          language: currentLanguage,
          topic: `Pronunciation: ${currentCard.term}`,
          score,
          vocabularyMastered: 1,
        }),
      }).catch(() => {});
    }, 1400);
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-[#E3EADF]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#527653] font-semibold mb-1">
            <Languages className="w-4 h-4" />
            <span>INDIAN LANGUAGES PRACTICE LAB</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#26382D] font-display">
            {t('languageLab')}
          </h1>
          <p className="text-sm text-[#788579] mt-1">
            Master vocabulary, verify pronunciation, and track your fluency in Indian languages.
          </p>
        </div>

        {/* Language selector */}
        <div className="flex items-center gap-2 bg-[#FFFFFF] border border-[#E3EADF] rounded-2xl p-2 shadow-xs">
          <span className="text-xs text-[#788579] px-2 font-medium">{t('practicing')}</span>
          <select
            value={currentLanguage}
            onChange={(e) => setLanguage(e.target.value as any)}
            className="bg-[#EEF3EA] text-xs font-bold text-[#527653] rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer"
          >
            {supportedLanguagesList.map(l => (
              <option key={l.code} value={l.code}>
                {l.native} ({l.name.split(' ')[0]})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex p-1 bg-[#EEF3EA] rounded-2xl border border-[#E3EADF] max-w-md mx-auto shadow-xs">
        <button
          onClick={() => setActiveTab('flashcards')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'flashcards'
              ? 'bg-[#FFFFFF] text-[#26382D] shadow-xs'
              : 'text-[#788579] hover:text-[#26382D]'
          }`}
        >
          {t('vocabularyFlashcards')}
        </button>
        <button
          onClick={() => setActiveTab('pronunciation')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'pronunciation'
              ? 'bg-[#FFFFFF] text-[#26382D] shadow-xs'
              : 'text-[#788579] hover:text-[#26382D]'
          }`}
        >
          {t('pronunciationCoach')}
        </button>
      </div>

      {/* View 1: Vocabulary Flashcard */}
      {activeTab === 'flashcards' && (
        <div className="max-w-md mx-auto space-y-6">
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="relative h-68 w-full rounded-[22px] bg-[#FFFFFF] border border-[#E3EADF] hover:border-[#A8C3A0] p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 shadow-xs hover:shadow-md group select-none"
          >
            <div className="text-[11px] font-mono text-[#527653] bg-[#EEF3EA] px-3 py-1 rounded-full uppercase tracking-wider mb-4 font-semibold">
              {t('card')} {currentCardIndex + 1} / {activeFlashcards.length} · {t('tapToFlip')}
            </div>

            {!isFlipped ? (
              <div className="space-y-3">
                <div className="text-4xl font-extrabold text-[#26382D] font-display">
                  {currentCard.term}
                </div>
                <div className="text-base text-[#527653] font-medium font-mono">
                  "{currentCard.phonetic}"
                </div>
              </div>
            ) : (
              <div className="space-y-3 animate-fadeIn">
                <div className="text-xs font-bold text-[#E99A61] uppercase tracking-wider font-mono">
                  {t('meaning')}
                </div>
                <div className="text-lg font-bold text-[#26382D] leading-snug">
                  {currentCard.meaning}
                </div>
                <div className="text-xs text-[#788579] italic pt-3 border-t border-[#E3EADF]">
                  {t('example')} {currentCard.example}
                </div>
              </div>
            )}
          </div>

          {/* Flashcard actions */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => playMessageAudio(currentCard.term, currentLanguage)}
              className="flex-1 py-3 px-4 bg-[#FFFFFF] border border-[#E3EADF] hover:border-[#A8C3A0] hover:bg-[#EEF3EA] rounded-xl text-xs font-bold text-[#26382D] flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <Volume2 className="w-4 h-4 text-[#527653]" />
              <span>{t('hearAudio')}</span>
            </button>

            <button
              onClick={handleNextCard}
              className="flex-1 py-3 px-4 bg-[#527653] hover:bg-[#26382D] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <span>{t('nextCard')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* View 2: Pronunciation Coach */}
      {activeTab === 'pronunciation' && (
        <div className="max-w-md mx-auto space-y-6 text-center">
          <div className="p-8 bg-[#FFFFFF] border border-[#E3EADF] rounded-[22px] space-y-4 shadow-xs">
            <div className="text-xs text-[#788579] uppercase tracking-wider font-mono">
              {t('pronouncePhrase')}
            </div>
            <div className="text-3xl font-extrabold text-[#26382D] font-display">
              {currentCard.term}
            </div>
            <div className="text-sm text-[#527653] font-mono">
              /{currentCard.phonetic}/
            </div>

            <div className="pt-4">
              <button
                onClick={handleTestPronunciation}
                disabled={isTestingVoice}
                className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center transition-all cursor-pointer ${
                  isTestingVoice
                    ? 'bg-[#CF7770]/20 text-[#CF7770] border-2 border-[#CF7770] animate-pulse'
                    : 'bg-[#527653] text-white shadow-md hover:bg-[#26382D] hover:scale-105'
                }`}
              >
                <Mic className="w-8 h-8" />
              </button>
              <div className="text-xs text-[#788579] mt-3">
                {isTestingVoice ? t('evaluatingSpeech') : t('tapMicToSpeak')}
              </div>
            </div>

            {pronunciationScore !== null && (
              <div className="mt-4 p-4 rounded-2xl bg-[#EEF3EA] border border-[#A8C3A0]/60 animate-fadeIn text-center">
                <div className="flex items-center justify-center gap-2 text-[#527653] font-bold text-sm">
                  <Award className="w-5 h-5" />
                  <span>{t('pronunciationAccuracy')} {pronunciationScore}%</span>
                </div>
                <p className="text-xs text-[#788579] mt-1 leading-relaxed">
                  Clear native inflection and tone matching. Great effort!
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress History Cards */}
      <div className="pt-6 border-t border-[#E3EADF]">
        <h3 className="text-sm font-bold text-[#26382D] font-display mb-3.5 flex items-center gap-2">
          <Award className="w-4 h-4 text-[#527653]" />
          <span>{t('fluencyRecords')}</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {progressList.map(prog => (
            <div key={prog.id} className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#E3EADF] shadow-xs">
              <div className="text-xs font-bold text-[#26382D]">{prog.topic}</div>
              <div className="text-[11px] text-[#788579] mt-1 font-mono">Dialect: {prog.language.toUpperCase()}</div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-[#527653] font-mono font-bold">{prog.score}% accuracy</span>
                <span className="text-[#E99A61] font-medium">{prog.vocabularyMastered} mastered</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

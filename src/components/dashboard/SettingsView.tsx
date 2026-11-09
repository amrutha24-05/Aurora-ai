import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  Settings, 
  Volume2, 
  Languages, 
  ShieldCheck, 
  User, 
  Check, 
  Sun,
  Lock
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { user, token } = useAuth();
  const { t, currentLanguage, setLanguage, supportedLanguagesList } = useLanguage();

  const [voices, setVoices] = useState<any[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('Shivani');
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [autoPlayAudio, setAutoPlayAudio] = useState(false);
  const [speechProvider, setSpeechProvider] = useState<'webspeech' | 'gnani'>('webspeech');
  const [isSaved, setIsSaved] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const previewAudioRef = React.useRef<HTMLAudioElement | null>(null);

  const handlePreviewVoice = async () => {
    if (isPreviewing) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setIsPreviewing(false);
      return;
    }
    try {
      setIsPreviewing(true);
      const res = await fetch('/api/speech/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `Hello, this is ${selectedVoice} speaking for Aurora AI.`,
          voiceName: selectedVoice,
          language: currentLanguage || 'en',
          speed: voiceSpeed,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          const audio = new Audio(`data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`);
          audio.playbackRate = voiceSpeed;
          previewAudioRef.current = audio;
          audio.onended = () => setIsPreviewing(false);
          audio.onerror = () => setIsPreviewing(false);
          await audio.play();
        } else {
          setIsPreviewing(false);
        }
      } else {
        setIsPreviewing(false);
      }
    } catch {
      setIsPreviewing(false);
    }
  };

  useEffect(() => {
    fetch('/api/speech/voices')
      .then(res => res.json())
      .then(d => {
        if (d.voices) setVoices(d.voices);
      })
      .catch(err => console.error('Error loading voices:', err));

    fetch('/api/settings', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(res => res.json())
      .then(d => {
        if (d.preferences) {
          setSelectedVoice(d.preferences.preferredVoice || 'Shivani');
          setVoiceSpeed(d.preferences.voiceSpeed || 1.0);
          setAutoPlayAudio(Boolean(d.preferences.autoPlayAudio));
          setSpeechProvider(d.preferences.speechProvider || 'webspeech');
        }
      })
      .catch(() => {});
  }, [token]);

  const handleSaveSettings = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          preferredVoice: selectedVoice,
          voiceSpeed,
          autoPlayAudio,
          speechProvider,
          defaultLanguage: currentLanguage,
        }),
      });
      if (res.ok) {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2500);
      }
    } catch (err) {
      console.error('Save settings error:', err);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto w-full space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="pb-4 border-b border-[#E3EADF] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#527653] font-semibold mb-1">
            <Settings className="w-4 h-4" />
            <span>{t('platformConfig')}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#26382D] font-display">
            {t('preferencesSettingsTitle')}
          </h1>
          <p className="text-sm text-[#788579] mt-1">
            {t('preferencesDesc')}
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#527653] hover:bg-[#26382D] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
        >
          {isSaved ? <Check className="w-4 h-4 text-white" /> : null}
          <span>{isSaved ? t('settingsSaved') : t('savePreferences')}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: Voice & Speech Synthesis */}
        <div className="p-6 rounded-[22px] bg-[#FFFFFF] border border-[#E3EADF] space-y-5 shadow-xs">
          <div className="flex items-center gap-2 text-sm font-bold text-[#26382D] font-display pb-3 border-b border-[#E3EADF]">
            <Volume2 className="w-4 h-4 text-[#527653]" />
            <span>{t('voiceSynthesisSection')}</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#26382D] mb-2">
              {t('preferredVoicePersona')}
            </label>
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#F7F8F2] border border-[#E3EADF] rounded-xl text-xs text-[#26382D] focus:outline-none focus:ring-1 focus:ring-[#A8C3A0] cursor-pointer"
            >
              {voices.map(v => (
                <option key={v.id} value={v.name}>
                  {v.name} ({v.gender === 'female' ? 'Female' : 'Male'}) — {v.character}
                </option>
              ))}
            </select>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[11px] text-[#788579]">
                {t('voicePersonaDesc')}
              </span>
              <button
                type="button"
                onClick={handlePreviewVoice}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#EEF3EA] hover:bg-[#E3EADF] text-[#527653] text-[11px] font-semibold transition-all cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>{isPreviewing ? t('stopPreview') : t('listenToSample')}</span>
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-medium text-[#26382D] mb-2">
              <span>{t('speechCadence')}</span>
              <span className="font-mono text-[#527653] font-bold">{voiceSpeed}x</span>
            </div>
            <input
              type="range"
              min="0.75"
              max="1.5"
              step="0.05"
              value={voiceSpeed}
              onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
              className="w-full accent-[#527653] cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <div className="text-xs font-bold text-[#26382D]">{t('autoPlayAudio')}</div>
              <div className="text-[11px] text-[#788579]">{t('autoPlayDesc')}</div>
            </div>
            <input
              type="checkbox"
              checked={autoPlayAudio}
              onChange={(e) => setAutoPlayAudio(e.target.checked)}
              className="w-4 h-4 accent-[#527653] rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Section 2: Language & Speech Recognition */}
        <div className="p-6 rounded-[22px] bg-[#FFFFFF] border border-[#E3EADF] space-y-5 shadow-xs">
          <div className="flex items-center gap-2 text-sm font-bold text-[#26382D] font-display pb-3 border-b border-[#E3EADF]">
            <Languages className="w-4 h-4 text-[#E99A61]" />
            <span>{t('linguisticSection')}</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#26382D] mb-2">
              {t('defaultConversationalLang')}
            </label>
            <select
              value={currentLanguage}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="w-full px-3.5 py-2 bg-[#F7F8F2] border border-[#E3EADF] rounded-xl text-xs text-[#26382D] focus:outline-none focus:ring-1 focus:ring-[#A8C3A0] cursor-pointer"
            >
              {supportedLanguagesList.map(l => (
                <option key={l.code} value={l.code}>
                  {l.native} — {l.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#26382D] mb-2">
              {t('sttEngine')}
            </label>
            <select
              value={speechProvider}
              onChange={(e) => setSpeechProvider(e.target.value as any)}
              className="w-full px-3.5 py-2 bg-[#F7F8F2] border border-[#E3EADF] rounded-xl text-xs text-[#26382D] focus:outline-none focus:ring-1 focus:ring-[#A8C3A0] cursor-pointer"
            >
              <option value="webspeech">{t('sttWebSpeech')}</option>
              <option value="gnani">{t('sttGnani')}</option>
            </select>
          </div>

          <div className="p-3.5 bg-[#EEF3EA] rounded-xl border border-[#A8C3A0]/60 text-[11px] text-[#527653] leading-relaxed font-medium">
            {t('preferencesDesc')}
          </div>
        </div>
      </div>

      {/* Section 3: Appearance & Theme */}
      <div className="p-6 rounded-[22px] bg-[#FFFFFF] border border-[#E3EADF] shadow-xs">
        <div className="flex items-center gap-2 text-sm font-bold text-[#26382D] font-display pb-3 border-b border-[#E3EADF] mb-4">
          <Sun className="w-4 h-4 text-[#F4B183]" />
          <span>{t('appearanceThemeSection')}</span>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-[#26382D]">{t('activeThemeTitle')}</div>
            <div className="text-[11px] text-[#788579] mt-0.5">
              {t('activeThemeDesc')}
            </div>
          </div>
          <span className="text-xs font-mono font-semibold text-[#527653] bg-[#EEF3EA] px-3 py-1 rounded-lg">
            {t('activeThemeBadge')}
          </span>
        </div>
      </div>

      {/* Section 4: Security & Account Management */}
      <div className="p-6 rounded-[22px] bg-[#FFFFFF] border border-[#E3EADF] shadow-xs">
        <div className="flex items-center gap-2 text-sm font-bold text-[#26382D] font-display pb-3 border-b border-[#E3EADF] mb-4">
          <ShieldCheck className="w-4 h-4 text-[#527653]" />
          <span>{t('securitySection')}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <div className="text-[#788579]">{t('accountName')}</div>
            <div className="font-bold text-[#26382D] mt-0.5">{user?.name || 'Guest User'}</div>
          </div>
          <div>
            <div className="text-[#788579]">{t('emailAddressLabel')}</div>
            <div className="font-bold text-[#26382D] mt-0.5">{user?.email || 'demo@aurora.ai'}</div>
          </div>
          <div>
            <div className="text-[#788579]">{t('passwordEncryption')}</div>
            <div className="font-mono text-[#527653] font-bold mt-0.5">Argon2id (65536 iter)</div>
          </div>
        </div>

        <div className="mt-4 pt-3.5 border-t border-[#E3EADF] text-[11px] text-[#788579] flex items-center justify-between">
          <span>PostgreSQL relational data store with pgvector cosine distance metrics.</span>
          <span className="text-[#527653] font-mono font-semibold">Aurora AI Privacy v3.0</span>
        </div>
      </div>
    </div>
  );
};

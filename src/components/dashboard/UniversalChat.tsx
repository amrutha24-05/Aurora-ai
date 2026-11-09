import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { AudioWaveform } from '../common/AudioWaveform';
import { AgentId } from '../../types';
import { 
  Send, 
  Mic, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Trash2, 
  Copy, 
  Check, 
  Bookmark, 
  Database, 
  Sparkles, 
  Bot, 
  User, 
  CheckCircle2,
  Clock,
  Plus,
  Pause,
  Play,
  Loader2,
  Square,
  Languages,
  X,
  AlertCircle,
  MicOff
} from 'lucide-react';
import { SupportedLanguage } from '../../types';

interface UniversalChatProps {
  onOpenRAGInspector: (agentId: AgentId) => void;
  autoStartVoice?: boolean;
  onVoiceStarted?: () => void;
}

export const UniversalChat: React.FC<UniversalChatProps> = ({ 
  onOpenRAGInspector,
  autoStartVoice = false,
  onVoiceStarted,
}) => {
  const {
    activeConversation,
    messages,
    activeAgent,
    agents,
    isGenerating,
    isListening,
    isPlayingAudio,
    playingMessageId,
    audioPlaybackState,
    activeAudioVoice,
    audioAmplitude,
    transcriptPreview,
    playbackSpeed,
    setPlaybackSpeed,
    languageControlMode,
    setLanguageControlMode,
    startVoiceInput,
    stopVoiceInput,
    playMessageAudio,
    pauseAudio,
    resumeAudio,
    replayAudio,
    stopAudio,
    sendMessage,
    translateMessageText,
    setActiveAgent,
    clearCurrentChat,
    regenerateLastMessage,
    saveResponse,
    createNewConversation,
  } = useChat();

  const { t, currentLanguage, setLanguage, supportedLanguagesList } = useLanguage();

  const [inputPrompt, setInputPrompt] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [activeTranslateMsgId, setActiveTranslateMsgId] = useState<string | null>(null);
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, { text: string; lang: string; loading?: boolean }>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Speech-to-Text (STT) Voice Input State & Controls
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingAmplitude, setRecordingAmplitude] = useState(0);
  const [sttError, setSttError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const durationTimerRef = useRef<any>(null);
  const isCancelledRef = useRef<boolean>(false);
  const recordingStartTimeRef = useRef<number>(0);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const cleanupMediaStream = () => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setRecordingAmplitude(0);
  };

  // Ensure full audio cleanup when conversation changes or component unmounts
  useEffect(() => {
    return () => {
      cleanupMediaStream();
    };
  }, [activeConversation?.id]);

  const startVoiceRecording = async () => {
    if (isRecording) {
      stopVoiceRecording();
      return;
    }

    // Stop any ongoing AI audio playback to prevent audio feedback
    stopAudio();
    setSttError(null);
    isCancelledRef.current = false;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setSttError('Voice recording is not supported in this browser. Please use Chrome, Edge, Safari, or Firefox.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Connect real-time Web Audio Analyser for live waveform visualization
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const renderAmp = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
            const avg = sum / dataArray.length;
            setRecordingAmplitude(Math.min(1.0, Math.max(0.08, avg / 120)));
            animFrameRef.current = requestAnimationFrame(renderAmp);
          };
          renderAmp();
        }
      } catch (err) {
        console.warn('Analyser setup non-fatal error:', err);
      }

      // Check supported recording format
      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/wav')) {
          mimeType = 'audio/wav';
        }
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        cleanupMediaStream();

        if (isCancelledRef.current) {
          isCancelledRef.current = false;
          setIsRecording(false);
          setIsTranscribing(false);
          setRecordingDuration(0);
          return;
        }

        const elapsedSec = (Date.now() - recordingStartTimeRef.current) / 1000;
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        if (elapsedSec < 0.3 || audioBlob.size === 0) {
          setIsRecording(false);
          setIsTranscribing(false);
          setRecordingDuration(0);
          setSttError('Recording was too short. Please speak clearly into your microphone.');
          return;
        }

        setIsRecording(false);
        setIsTranscribing(true);

        try {
          const targetLang = activeConversation?.language || currentLanguage || 'en';
          const formData = new FormData();
          const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('mp4') ? 'mp4' : 'wav';
          formData.append('audio_file', audioBlob, `recording.${ext}`);
          formData.append('language', targetLang);

          const res = await fetch('/api/speech/transcribe', {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(errJson.error || errJson.message || `Transcription failed with HTTP ${res.status}`);
          }

          const data = await res.json();
          const transcript = (data.transcript || '').trim();

          if (transcript) {
            // Automatically insert recognized text into existing composer, preserving typed text
            setInputPrompt(prev => prev.trim() ? `${prev.trim()} ${transcript}` : transcript);
            setSttError(null);
            setTimeout(() => {
              inputRef.current?.focus();
            }, 60);
          } else {
            setSttError('No speech was detected in the audio. Please try speaking closer to your microphone.');
          }
        } catch (sttErr: any) {
          console.error('STT Request Error:', sttErr);
          setSttError(sttErr.message || 'Speech recognition failed. Please try again.');
        } finally {
          setIsTranscribing(false);
          setRecordingDuration(0);
        }
      };

      recorder.start(250);
      recordingStartTimeRef.current = Date.now();
      setIsRecording(true);
      setRecordingDuration(0);

      durationTimerRef.current = setInterval(() => {
        setRecordingDuration(s => s + 1);
      }, 1000);

    } catch (micErr: any) {
      cleanupMediaStream();
      setIsRecording(false);
      setIsTranscribing(false);
      console.warn('Microphone permission/access error:', micErr);

      if (micErr.name === 'NotAllowedError' || micErr.name === 'PermissionDeniedError') {
        setSttError('Microphone permission denied. Please allow microphone access in your browser settings.');
      } else if (micErr.name === 'NotFoundError' || micErr.name === 'DevicesNotFoundError') {
        setSttError('No microphone detected on your device.');
      } else {
        setSttError(`Microphone error: ${micErr.message || micErr}`);
      }
    }
  };

  const stopVoiceRecording = () => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn('Error stopping mediaRecorder:', err);
      }
    }
  };

  const cancelVoiceRecording = () => {
    isCancelledRef.current = true;
    cleanupMediaStream();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {}
    }
    setIsRecording(false);
    setIsTranscribing(false);
    setRecordingDuration(0);
    audioChunksRef.current = [];
  };

  // Auto-start voice recording when triggered from Voice Quick Launch
  useEffect(() => {
    if (autoStartVoice) {
      startVoiceRecording();
      onVoiceStarted?.();
    }
  }, [autoStartVoice]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const currentAgentObj = agents.find(a => a.id === activeAgent) || agents[0];

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputPrompt.trim() || isGenerating) return;
    const text = inputPrompt;
    setInputPrompt('');
    await sendMessage(text);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSave = async (msg: any) => {
    await saveResponse(msg);
    setSavedId(msg.id);
    setTimeout(() => setSavedId(null), 2000);
  };

  const handleQuickPrompt = (promptText: string) => {
    sendMessage(promptText);
  };

  const handleTranslate = async (msgId: string, text: string, targetLang: SupportedLanguage) => {
    setActiveTranslateMsgId(null);
    setTranslatedMessages(prev => ({
      ...prev,
      [msgId]: { text: '', lang: targetLang, loading: true }
    }));
    try {
      const translated = await translateMessageText(text, targetLang);
      setTranslatedMessages(prev => ({
        ...prev,
        [msgId]: { text: translated, lang: targetLang, loading: false }
      }));
    } catch (err: any) {
      setTranslatedMessages(prev => ({
        ...prev,
        [msgId]: { text: `Translation failed: ${err.message}`, lang: targetLang, loading: false }
      }));
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F7F8F2] text-[#26382D] relative overflow-hidden">
      {/* Universal Chat Top Bar */}
      <div className="px-6 py-3.5 bg-[#FFFFFF] border-b border-[#E3EADF] flex flex-wrap items-center justify-between gap-4 z-20 shadow-xs">
        {/* Left: Active Agent Identity & Switcher */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#EEF3EA] border border-[#A8C3A0]/60 flex items-center justify-center shrink-0 text-[#527653]">
            <Bot className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <select
                aria-label="Active Agent Selector"
                value={activeAgent}
                onChange={(e) => setActiveAgent(e.target.value as AgentId)}
                className="bg-transparent font-bold text-sm text-[#26382D] font-display focus:outline-none cursor-pointer hover:text-[#527653] transition-colors"
              >
                {agents.map(a => (
                  <option key={a.id} value={a.id} className="bg-[#FFFFFF] text-[#26382D]">
                    {t(`agent_${a.id}_name`) || a.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-[11px] text-[#788579]">
              {currentAgentObj ? (t(`agent_${currentAgentObj.id}_role`) || currentAgentObj.roleTitle) : ''}
            </div>
          </div>
        </div>

        {/* Right: Language Selector, RAG Inspector & Chat Utilities */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Conversation Language Selector */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#F7F8F2] border border-[#E3EADF] text-xs">
            <span className="text-[11px] text-[#788579]">{t('languageLabel')}</span>
            <select
              aria-label="Conversation Language Selector"
              value={currentLanguage || activeConversation?.language || 'en'}
              onChange={(e) => {
                const newLang = e.target.value as any;
                setLanguage(newLang);
                if (activeConversation) {
                  activeConversation.language = newLang;
                }
              }}
              className="bg-transparent text-xs font-bold text-[#527653] focus:outline-none cursor-pointer"
            >
              {supportedLanguagesList.map(lang => (
                <option key={lang.code} value={lang.code} className="bg-[#FFFFFF] text-[#26382D]">
                  {lang.native} ({lang.name.split(' ')[0]})
                </option>
              ))}
            </select>
          </div>

          {/* Response Language Control Mode */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#F7F8F2] border border-[#E3EADF] text-xs">
            <span className="text-[11px] text-[#788579]">{t('modeLabel')}</span>
            <select
              aria-label="Response Language Control Mode"
              value={languageControlMode}
              onChange={(e) => setLanguageControlMode(e.target.value as any)}
              className="bg-transparent text-xs font-semibold text-[#527653] focus:outline-none cursor-pointer"
            >
              <option value="selected" className="bg-[#FFFFFF] text-[#26382D]">{t('modeSelected')}</option>
              <option value="auto" className="bg-[#FFFFFF] text-[#26382D]">{t('modeAuto')}</option>
              <option value="translate" className="bg-[#FFFFFF] text-[#26382D]">{t('modeTranslate')}</option>
            </select>
          </div>

          {/* RAG Knowledge Base Inspector Button */}
          <button
            onClick={() => onOpenRAGInspector(activeAgent)}
            title="Inspect Agent RAG Knowledge Store"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EEF3EA] border border-[#A8C3A0]/60 text-[#527653] hover:bg-[#A8C3A0]/20 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('ragSources')}</span>
          </button>

          {/* New Chat Button */}
          <button
            onClick={() => createNewConversation(activeAgent)}
            title={t('newConversation')}
            className="p-1.5 rounded-lg text-[#788579] hover:text-[#26382D] hover:bg-[#EEF3EA] transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Clear Chat */}
          <button
            onClick={clearCurrentChat}
            title={t('clearChat')}
            className="p-1.5 rounded-lg text-[#899287] hover:text-[#CF7770] hover:bg-[#EEF3EA] transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
        {messages.length === 0 ? (
          /* Empty State & Starter Prompts */
          <div className="max-w-2xl mx-auto py-12 text-center space-y-6 animate-fadeIn">
            <div className="w-16 h-16 rounded-2xl bg-[#EEF3EA] border border-[#A8C3A0]/60 mx-auto flex items-center justify-center text-[#527653] shadow-xs">
              <Bot className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#26382D] font-display">
                {currentAgentObj ? (t(`agent_${currentAgentObj.id}_name`) || currentAgentObj.name) : ''}
              </h2>
              <p className="text-xs sm:text-sm text-[#788579] max-w-md mx-auto mt-2 leading-relaxed font-normal">
                {currentAgentObj ? (t(`agent_${currentAgentObj.id}_desc`) || currentAgentObj.description) : ''}
              </p>
            </div>

            {/* Starter Prompts in pastel styling */}
            <div className="pt-4 text-left">
              <div className="text-[11px] font-mono uppercase tracking-wider text-[#788579] mb-3 text-center">
                {t('suggestedStarters')}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentAgentObj?.samplePrompts.map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickPrompt(sample.text)}
                    className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#E3EADF] hover:border-[#A8C3A0] text-left transition-all hover:-translate-y-0.5 cursor-pointer shadow-xs group"
                  >
                    <div className="text-xs font-bold text-[#26382D] group-hover:text-[#527653]">
                      {sample.label}
                    </div>
                    <p className="text-xs text-[#788579] line-clamp-2 mt-1">
                      {sample.text}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Populated Messages Feed */
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 sm:gap-4 max-w-3xl mx-auto ${
                  isUser ? 'justify-end' : 'justify-start'
                }`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-[#EEF3EA] border border-[#A8C3A0]/60 text-[#527653] flex items-center justify-center shrink-0 mt-1 shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`space-y-1.5 max-w-[85%] sm:max-w-[78%] ${isUser ? 'items-end' : 'items-start'}`}>
                  {/* Message Bubble */}
                  <div
                    className={`rounded-[18px] px-4.5 py-3.5 text-xs sm:text-sm leading-relaxed ${
                      isUser
                        ? 'bg-[#527653] text-[#FFFFFF] rounded-tr-xs shadow-xs'
                        : 'bg-[#FFFFFF] border border-[#E3EADF] text-[#26382D] rounded-tl-xs shadow-xs'
                    }`}
                  >
                    <div className="whitespace-pre-wrap select-text font-normal">
                      {msg.content}
                    </div>

                    {/* RAG Context Citations Badge */}
                    {msg.ragContext && msg.ragContext.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-[#E3EADF]">
                        <div className="text-[10px] text-[#527653] font-mono flex items-center gap-1.5 font-bold">
                          <CheckCircle2 className="w-3 h-3 text-[#527653]" />
                          <span>{t('groundedIn')} {msg.ragContext.length} {t('verifiedRagSources')}:</span>
                        </div>
                        <div className="mt-1 space-y-1">
                          {msg.ragContext.map((c, i) => (
                            <div key={i} className="text-[10px] text-[#788579] font-medium">
                              · {c.documentTitle} <span className="text-[#E99A61] font-mono font-bold">({Math.round(c.relevanceScore * 100)}% similarity)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Collapsible Inline Translation Result */}
                    {translatedMessages[msg.id] && (
                      <div className="mt-2.5 p-3 bg-[#EEF3EA]/80 border border-[#A8C3A0]/60 rounded-xl text-xs space-y-1.5 animate-fadeIn">
                        <div className="flex items-center justify-between text-[11px] font-mono text-[#527653] font-bold border-b border-[#A8C3A0]/30 pb-1">
                          <span className="flex items-center gap-1.5">
                            <Languages className="w-3.5 h-3.5" />
                            {t('translatedTo')} {supportedLanguagesList.find(l => l.code === translatedMessages[msg.id].lang)?.name || translatedMessages[msg.id].lang}
                          </span>
                          <button 
                            onClick={() => setTranslatedMessages(prev => { const c = { ...prev }; delete c[msg.id]; return c; })}
                            className="text-[#788579] hover:text-[#26382D] text-[10px] cursor-pointer"
                          >
                            {t('dismiss')}
                          </button>
                        </div>
                        {translatedMessages[msg.id].loading ? (
                          <div className="flex items-center gap-2 py-1 text-[#788579] italic">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#527653]" />
                            {t('translating')}
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap leading-relaxed text-[#26382D] text-xs">
                            {translatedMessages[msg.id].text}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Message Footer Utilities */}
                  {!isUser && (
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] text-[#788579] px-1 relative">
                      {/* Interactive Audio Playback Controls */}
                      {playingMessageId === msg.id ? (
                        <div className="flex items-center gap-1.5 bg-[#EEF3EA] border border-[#A8C3A0]/70 px-2 py-0.5 rounded-lg text-[#527653] shadow-xs">
                          {audioPlaybackState === 'loading' ? (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-[#527653]">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>{t('synthesizing')}</span>
                            </span>
                          ) : audioPlaybackState === 'playing' ? (
                            <>
                              <button
                                onClick={pauseAudio}
                                title={t('pause')}
                                className="flex items-center gap-1 font-semibold hover:text-[#26382D] transition-colors cursor-pointer"
                              >
                                <Pause className="w-3.5 h-3.5 fill-current" />
                                <span>{t('pause')}</span>
                              </button>
                              <span className="text-[#A8C3A0]">•</span>
                              <button
                                onClick={stopAudio}
                                title={t('stop')}
                                className="flex items-center gap-1 text-[#CF7770] hover:text-[#b24840] font-semibold transition-colors cursor-pointer"
                              >
                                <Square className="w-3 h-3 fill-current" />
                                <span>{t('stop')}</span>
                              </button>
                            </>
                          ) : (
                            /* audioPlaybackState === 'paused' */
                            <>
                              <button
                                onClick={resumeAudio}
                                title={t('resume')}
                                className="flex items-center gap-1 font-semibold hover:text-[#26382D] transition-colors cursor-pointer"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>{t('resume')}</span>
                              </button>
                              <span className="text-[#A8C3A0]">•</span>
                              <button
                                onClick={() => replayAudio(msg.id, msg.content, activeAgent, activeConversation?.language)}
                                title={t('replay')}
                                className="flex items-center gap-1 hover:text-[#26382D] transition-colors cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>{t('replay')}</span>
                              </button>
                              <span className="text-[#A8C3A0]">•</span>
                              <button
                                onClick={stopAudio}
                                title={t('stop')}
                                className="flex items-center gap-1 text-[#CF7770] hover:text-[#b24840] font-semibold transition-colors cursor-pointer"
                              >
                                <Square className="w-3 h-3 fill-current" />
                              </button>
                            </>
                          )}
                          {activeAudioVoice && (
                            <span className="text-[10px] text-[#788579] font-mono pl-1 border-l border-[#A8C3A0]/60 max-w-[130px] truncate">
                              {activeAudioVoice}
                            </span>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => playMessageAudio(msg.id, msg.content, activeAgent, activeConversation?.language)}
                          title={t('listen')}
                          className="flex items-center gap-1 hover:text-[#527653] transition-colors cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>{t('listen')}</span>
                        </button>
                      )}

                      {/* On-Demand Translation button & dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setActiveTranslateMsgId(activeTranslateMsgId === msg.id ? null : msg.id)}
                          title={t('translate')}
                          className="flex items-center gap-1 hover:text-[#527653] transition-colors cursor-pointer"
                        >
                          <Languages className="w-3.5 h-3.5" />
                          <span>{t('translate')}</span>
                        </button>

                        {activeTranslateMsgId === msg.id && (
                          <div className="absolute left-0 bottom-full mb-2 bg-[#FFFFFF] border border-[#E3EADF] rounded-xl shadow-lg p-1.5 z-40 w-44 grid grid-cols-1 gap-0.5 text-xs">
                            <div className="text-[10px] font-bold text-[#788579] px-2 py-1 border-b border-[#E3EADF]">
                              {t('translateInto')}
                            </div>
                            {supportedLanguagesList.map(l => (
                              <button
                                key={l.code}
                                onClick={() => handleTranslate(msg.id, msg.content, l.code)}
                                className="text-left px-2 py-1 rounded-lg hover:bg-[#EEF3EA] hover:text-[#527653] transition-colors cursor-pointer text-xs"
                              >
                                {l.native} ({l.name.split(' ')[0]})
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Copy Message button */}
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="flex items-center gap-1 hover:text-[#26382D] transition-colors cursor-pointer"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#527653]" />
                            <span className="text-[#527653] font-semibold">{t('copied')}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>{t('copy')}</span>
                          </>
                        )}
                      </button>

                      {/* Bookmark button */}
                      <button
                        onClick={() => handleSave(msg)}
                        className="flex items-center gap-1 hover:text-[#26382D] transition-colors cursor-pointer"
                      >
                        {savedId === msg.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#E99A61]" />
                            <span className="text-[#E99A61] font-semibold">{t('saved')}</span>
                          </>
                        ) : (
                          <>
                            <Bookmark className="w-3.5 h-3.5" />
                            <span>{t('save')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {isUser && (
                    <div className="text-[10px] text-[#899287] font-mono text-right pr-1">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-[#EEF3EA] text-[#527653] border border-[#A8C3A0]/60 flex items-center justify-center shrink-0 mt-1 shadow-xs">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Loading / Generating skeleton state */}
        {isGenerating && (
          <div className="flex gap-4 max-w-3xl mx-auto justify-start animate-pulse">
            <div className="w-8 h-8 rounded-xl bg-[#EEF3EA] border border-[#E3EADF] flex items-center justify-center text-[#527653]">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 bg-[#FFFFFF] border border-[#E3EADF] rounded-2xl space-y-2 w-64 shadow-xs">
              <div className="h-2.5 bg-[#EEF3EA] rounded w-3/4" />
              <div className="h-2 bg-[#EEF3EA] rounded w-full" />
              <div className="h-2 bg-[#EEF3EA] rounded w-1/2" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* STT Error Notification Banner */}
      {sttError && (
        <div className="px-6 py-2.5 bg-[#CF7770]/10 border-t border-[#CF7770]/30 flex items-center justify-between gap-3 text-xs text-[#CF7770] animate-fadeIn z-30">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{sttError}</span>
          </div>
          <button
            type="button"
            onClick={() => setSttError(null)}
            className="p-1 hover:bg-[#CF7770]/20 rounded-md transition-colors cursor-pointer text-[#CF7770]"
            title="Dismiss error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Voice Recording Active Banner */}
      {isRecording && (
        <div className="px-6 py-3 bg-[#FFFFFF] border-t border-[#CF7770]/40 shadow-sm flex flex-wrap items-center justify-between gap-3 animate-fadeIn z-30">
          {/* Left: Recording Indicator & Duration Timer */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#CF7770] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#CF7770]"></span>
              </span>
              <span className="text-xs font-bold font-mono text-[#CF7770] uppercase tracking-wider">
                REC
              </span>
            </div>

            <span className="font-mono text-xs font-bold text-[#26382D] bg-[#F7F8F2] px-2 py-0.5 rounded border border-[#E3EADF]">
              {formatDuration(recordingDuration)}
            </span>

            <span className="text-[11px] font-medium text-[#788579] hidden sm:inline">
              {supportedLanguagesList.find(l => l.code === (activeConversation?.language || currentLanguage))?.name || 'English'}
            </span>
          </div>

          {/* Center: Live Audio Waveform responding to microphone volume */}
          <div className="flex-1 max-w-xs flex justify-center">
            <AudioWaveform isActive={true} amplitude={recordingAmplitude} barCount={18} heightClass="h-7" />
          </div>

          {/* Right: Cancel & Stop/Insert Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cancelVoiceRecording}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E3EADF] bg-[#F7F8F2] hover:bg-[#E3EADF] text-[#788579] hover:text-[#26382D] text-xs font-semibold transition-all cursor-pointer"
              title={t('cancel')}
            >
              <X className="w-3.5 h-3.5" />
              <span>{t('cancel')}</span>
            </button>

            <button
              type="button"
              onClick={stopVoiceRecording}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#527653] hover:bg-[#26382D] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
              title={t('doneSpeaking')}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{t('doneSpeaking')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Voice Transcribing Progress Banner */}
      {isTranscribing && (
        <div className="px-6 py-2.5 bg-[#FFFFFF] border-t border-[#A8C3A0] shadow-sm flex items-center justify-between gap-4 animate-fadeIn z-30">
          <div className="flex items-center gap-2.5 text-xs text-[#527653] font-medium">
            <Loader2 className="w-4 h-4 animate-spin text-[#527653]" />
            <span>{t('transcribingBanner')}</span>
            <span className="text-[#788579] text-[11px] hidden sm:inline">({t('originalScriptPreserved')})</span>
          </div>
          <span className="text-[11px] font-mono text-[#788579] px-2 py-0.5 bg-[#EEF3EA] rounded">
            {t('processingAudio')}
          </span>
        </div>
      )}

      {/* Audio Playback Controls Banner */}
      {audioPlaybackState !== 'idle' && (
        <div className="px-6 py-2 bg-[#FFFFFF] border-t border-[#A8C3A0]/60 shadow-sm flex flex-wrap items-center justify-between gap-3 animate-fadeIn z-30">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#EEF3EA] text-[#527653] flex items-center justify-center">
              <Volume2 className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#26382D]">
                {activeAudioVoice || t('audioPlayback')}
              </span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#EEF3EA] text-[#527653] font-semibold">
                {audioPlaybackState}
              </span>
            </div>
            <AudioWaveform isActive={audioPlaybackState === 'playing'} amplitude={audioAmplitude} barCount={12} />
          </div>

          <div className="flex items-center gap-3">
            {/* Playback speed selector pills (0.85x, 1.0x, 1.1x, 1.25x, 1.5x) */}
            <div className="flex items-center gap-1 bg-[#F7F8F2] p-0.5 rounded-lg border border-[#E3EADF] text-[10px] font-mono">
              {[0.85, 1.0, 1.1, 1.25, 1.5].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
                    playbackSpeed === spd
                      ? 'bg-[#527653] text-white shadow-xs'
                      : 'text-[#788579] hover:text-[#26382D]'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            {/* Play/Pause control */}
            {audioPlaybackState === 'playing' ? (
              <button
                onClick={pauseAudio}
                className="p-1.5 rounded-lg bg-[#EEF3EA] text-[#527653] hover:bg-[#A8C3A0]/30 transition-colors cursor-pointer"
                title={t('pause')}
              >
                <Pause className="w-4 h-4 fill-current" />
              </button>
            ) : audioPlaybackState === 'paused' ? (
              <button
                onClick={resumeAudio}
                className="p-1.5 rounded-lg bg-[#527653] text-white hover:bg-[#26382D] transition-colors cursor-pointer"
                title={t('resume')}
              >
                <Play className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <Loader2 className="w-4 h-4 animate-spin text-[#527653]" />
            )}

            {/* Stop / Interrupt button */}
            <button
              onClick={stopAudio}
              className="p-1.5 rounded-lg bg-[#CF7770]/15 text-[#CF7770] hover:bg-[#CF7770]/30 transition-colors cursor-pointer"
              title={t('stop')}
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          </div>
        </div>
      )}

      {/* Universal Chat Input Composer */}
      <div className="p-4 bg-[#FFFFFF] border-t border-[#E3EADF] z-20 shadow-xs">
        <form onSubmit={handleSend} className="max-w-3xl mx-auto relative flex items-center gap-2">
          {/* Microphone button: click to start or stop voice input */}
          <button
            type="button"
            onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
            disabled={isTranscribing || isGenerating}
            title={isRecording ? t('doneSpeaking') : t('typeMessagePlaceholder')}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
              isRecording
                ? 'bg-[#CF7770]/15 text-[#CF7770] border-[#CF7770]/60 animate-pulse'
                : isTranscribing
                ? 'bg-[#EEF3EA] text-[#527653] border-[#A8C3A0] cursor-wait'
                : 'bg-[#F7F8F2] text-[#527653] hover:text-[#26382D] border-[#E3EADF] hover:border-[#A8C3A0]'
            }`}
          >
            {isTranscribing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>

          {/* Text Input: retains existing text, receives transcription for editing */}
          <input
            ref={inputRef}
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder={
              isRecording
                ? `${t('listening')} ${t('speakNow')}`
                : isTranscribing
                ? t('transcribingAudio')
                : t('typeMessagePlaceholder')
            }
            disabled={isGenerating}
            className="flex-1 px-4 py-2.5 bg-[#F7F8F2] border border-[#E3EADF] rounded-xl text-xs sm:text-sm text-[#26382D] placeholder-[#899287] focus:outline-none focus:ring-1 focus:ring-[#A8C3A0] transition-colors disabled:opacity-50"
          />

          {/* Send Button: explicitly submitted by user after review/edit */}
          <button
            type="submit"
            disabled={!inputPrompt.trim() || isGenerating || isTranscribing}
            title={t('send')}
            className="p-2.5 rounded-xl bg-[#527653] hover:bg-[#26382D] text-white shadow-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>

        <div className="max-w-3xl mx-auto flex items-center justify-between text-[11px] text-[#788579] mt-2 px-1">
          <span>{t('aiRespondsIn')} {supportedLanguagesList.find(l => l.code === (activeConversation?.language || currentLanguage))?.name}</span>
          <div className="flex items-center gap-3">
            <button
              onClick={regenerateLastMessage}
              disabled={messages.length === 0 || isGenerating}
              className="hover:text-[#26382D] transition-colors cursor-pointer disabled:opacity-30"
            >
              {t('regenerate')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

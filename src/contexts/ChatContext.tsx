import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AgentId, AgentPersona, Conversation, Message, SavedResponse, SupportedLanguage } from '../types';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import { segmentTextIntoSentences, ProgressivePlaybackSession } from '../services/progressiveSpeech';

export type AudioPlaybackState = 'idle' | 'loading' | 'playing' | 'paused';

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  activeAgent: AgentId;
  agents: AgentPersona[];
  isGenerating: boolean;
  isListening: boolean;
  isPlayingAudio: boolean;
  playingMessageId: string | null;
  audioPlaybackState: AudioPlaybackState;
  activeAudioVoice: string | null;
  audioAmplitude: number;
  transcriptPreview: string;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
  languageControlMode: 'auto' | 'selected' | 'translate';
  setLanguageControlMode: (mode: 'auto' | 'selected' | 'translate') => void;
  savedResponses: SavedResponse[];
  startVoiceInput: () => void;
  stopVoiceInput: () => void;
  playMessageAudio: (messageId: string, text: string, agentId?: AgentId, lang?: SupportedLanguage, customVoice?: string) => Promise<void>;
  pauseAudio: () => void;
  resumeAudio: () => void;
  replayAudio: (messageId: string, text: string, agentId?: AgentId, lang?: SupportedLanguage, customVoice?: string) => Promise<void>;
  stopAudio: () => void;
  selectConversation: (id: string) => Promise<void>;
  createNewConversation: (agentId?: AgentId, lang?: SupportedLanguage) => Promise<Conversation>;
  sendMessage: (content: string) => Promise<void>;
  translateMessageText: (text: string, targetLanguage: SupportedLanguage) => Promise<string>;
  setActiveAgent: (agent: AgentId) => void;
  clearCurrentChat: () => void;
  regenerateLastMessage: () => Promise<void>;
  saveResponse: (msg: Message) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Web Speech API language mapping
const BROWSER_SPEECH_LANG_MAP: Record<SupportedLanguage, string> = {
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

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const { currentLanguage } = useLanguage();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeAgent, setActiveAgent] = useState<AgentId>('technical');
  const [agents, setAgents] = useState<AgentPersona[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [audioPlaybackState, setAudioPlaybackState] = useState<AudioPlaybackState>('idle');
  const [activeAudioVoice, setActiveAudioVoice] = useState<string | null>(null);
  const [audioAmplitude, setAudioAmplitude] = useState<number>(0);
  const [transcriptPreview, setTranscriptPreview] = useState<string>('');
  const [savedResponses, setSavedResponses] = useState<SavedResponse[]>([]);
  const [playbackSpeed, setPlaybackSpeedState] = useState<number>(1.0);
  const [languageControlMode, setLanguageControlMode] = useState<'auto' | 'selected' | 'translate'>('selected');
  const [preferredVoice, setPreferredVoice] = useState<string>('Shivani');

  const playbackSpeedRef = useRef<number>(1.0);
  const recognitionRef = useRef<any>(null);
  const audioAnimationRef = useRef<number | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const audioCacheRef = useRef<Map<string, { src: string; voice: string }>>(new Map());
  const progressiveCacheRef = useRef<Map<string, { segments: { audioSrc: string; durationSec?: number }[]; voice: string }>>(new Map());
  const currentSessionRef = useRef<ProgressivePlaybackSession | null>(null);
  const isUsingBrowserFallbackRef = useRef<boolean>(false);

  const applyPitchPreservation = (audio: HTMLAudioElement) => {
    try {
      if ('preservesPitch' in audio) {
        audio.preservesPitch = true;
      }
      if ('webkitPreservesPitch' in audio) {
        (audio as any).webkitPreservesPitch = true;
      }
      if ('mozPreservesPitch' in audio) {
        (audio as any).mozPreservesPitch = true;
      }
    } catch {}
  };

  const setPlaybackSpeed = (speed: number) => {
    setPlaybackSpeedState(speed);
    playbackSpeedRef.current = speed;
    if (audioPlayerRef.current) {
      audioPlayerRef.current.defaultPlaybackRate = speed;
      audioPlayerRef.current.playbackRate = speed;
      applyPitchPreservation(audioPlayerRef.current);
    }
  };

  // Fetch agents list
  useEffect(() => {
    fetch('/api/chat/agents')
      .then(res => res.json())
      .then(data => {
        if (data.agents) {
          setAgents(data.agents);
        }
      })
      .catch(err => console.error('Failed to load agents:', err));
  }, []);

  // Fetch conversations when token changes
  useEffect(() => {
    fetchConversations();
    fetchSavedResponses();
    fetch('/api/settings', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(res => res.json())
      .then(d => {
        if (d.preferences?.preferredVoice) {
          setPreferredVoice(d.preferences.preferredVoice);
        }
      })
      .catch(() => {});
  }, [token]);

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/chat/conversations', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        const convList = Array.isArray(data.conversations) ? data.conversations : [];
        setConversations(convList);
        if (convList.length > 0 && !activeConversation) {
          selectConversation(convList[0].id);
        }
      }
    } catch (err) {
      console.warn('Notice: Could not refresh conversations list:', err);
    }
  };

  const fetchSavedResponses = async () => {
    try {
      const res = await fetch('/api/chat/saved-responses', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setSavedResponses(data.savedResponses || []);
      }
    } catch (err) {
      console.warn('Notice: Could not load saved responses:', err);
    }
  };

  const selectConversation = async (id: string) => {
    if (!id || id === 'undefined' || id === 'null') return;

    // Optimistically sync local active conversation from state to prevent UI flicker
    setConversations(prev => {
      const local = prev.find(c => c.id === id);
      if (local) {
        setActiveConversation(local);
        setActiveAgent(local.agentId);
      }
      return prev;
    });

    try {
      const res = await fetch(`/api/chat/conversations/${encodeURIComponent(id)}/messages`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data.conversation) {
          setActiveConversation(data.conversation);
          setMessages(Array.isArray(data.messages) ? data.messages : []);
          setActiveAgent(data.conversation.agentId);
        }
      } else if (res.status === 404) {
        // If conversation no longer exists on server, remove it from local state
        setConversations(prev => prev.filter(c => c.id !== id));
      }
    } catch (err: any) {
      console.warn('Notice: Could not load conversation messages from server, using local session state:', err?.message || err);
    }
  };

  const createNewConversation = async (agentId?: AgentId, lang?: SupportedLanguage): Promise<Conversation> => {
    const selectedAgent = agentId || activeAgent;
    const selectedLang = lang || currentLanguage;

    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          agentId: selectedAgent,
          language: selectedLang,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.conversation) {
          const newConv = data.conversation;
          setConversations(prev => [newConv, ...prev.filter(c => c.id !== newConv.id)]);
          setActiveConversation(newConv);
          setMessages([]);
          setActiveAgent(newConv.agentId);
          return newConv;
        }
      }
    } catch (err: any) {
      console.warn('Notice: Server conversation creation unavailable, initializing local session:', err?.message || err);
    }

    // Graceful local fallback conversation
    const fallbackConv: Conversation = {
      id: 'conv_' + Math.random().toString(36).substring(2, 10),
      userId: 'usr_demo_aurora_01',
      agentId: selectedAgent,
      title: 'New Conversation',
      language: selectedLang,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setConversations(prev => [fallbackConv, ...prev]);
    setActiveConversation(fallbackConv);
    setMessages([]);
    setActiveAgent(selectedAgent);
    return fallbackConv;
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isGenerating) return;

    let conv = activeConversation;
    if (!conv) {
      conv = await createNewConversation(activeAgent, currentLanguage);
    }

    // Optimistic user message update
    const tempUserMsg: Message = {
      id: 'temp_user_' + Date.now(),
      conversationId: conv.id,
      role: 'user',
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    const tempAssistantId = 'stream_asst_' + Date.now();
    const tempAssistantMsg: Message = {
      id: tempAssistantId,
      conversationId: conv.id,
      role: 'assistant',
      content: '',
      providerInfo: {
        model: 'gemini-3-flash-preview',
        isMock: false,
        providerName: 'gemini',
      },
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, tempUserMsg, tempAssistantMsg]);
    setIsGenerating(true);

    let streamSucceeded = false;

    // 1. Primary: Server-Sent Events (SSE) progressive streaming
    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          conversationId: conv.id,
          content: content.trim(),
          agentId: activeAgent,
          language: currentLanguage || conv.language,
          languageControlMode,
        }),
      });

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let streamBuffer = '';
        let accumulatedText = '';
        let citationsReceived: any[] = [];
        let finalModel = 'gemini-3-flash-preview';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          streamBuffer += decoder.decode(value, { stream: true });
          const events = streamBuffer.split('\n\n');
          streamBuffer = events.pop() || '';

          for (const event of events) {
            const trimmed = event.trim();
            if (!trimmed.startsWith('data:')) continue;
            const dataStr = trimmed.replace(/^data:\s*/, '');
            if (dataStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.type === 'token') {
                accumulatedText += (parsed.token || '');
                if (parsed.model) finalModel = parsed.model;
                setMessages(prev => prev.map(m => 
                  m.id === tempAssistantId 
                    ? { ...m, content: accumulatedText, providerInfo: { model: finalModel, isMock: false, providerName: 'gemini' } } 
                    : m
                ));
              } else if (parsed.type === 'citations') {
                citationsReceived = parsed.citations || [];
                setMessages(prev => prev.map(m => 
                  m.id === tempAssistantId ? { ...m, ragContext: citationsReceived } : m
                ));
              } else if (parsed.type === 'done' && parsed.assistantMessage) {
                setMessages(prev => prev.map(m => 
                  m.id === tempAssistantId ? parsed.assistantMessage : m
                ));
                if (parsed.conversation) {
                  setActiveConversation(parsed.conversation);
                  setConversations(prev => prev.map(c => c.id === parsed.conversation.id ? parsed.conversation : c));
                }
              }
            } catch {}
          }
        }

        if (accumulatedText.length > 0) {
          streamSucceeded = true;
        }
      }
    } catch (streamErr: any) {
      console.warn('Streaming fetch failed or was interrupted, checking fallback:', streamErr.message);
    }

    // 2. Fallback: Standard POST /api/chat/send if streaming did not yield text
    if (!streamSucceeded) {
      try {
        const res = await fetch('/api/chat/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            conversationId: conv.id,
            content: content.trim(),
            agentId: activeAgent,
            language: currentLanguage || conv.language,
            languageControlMode,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || 'Server error occurred');
        }

        const data = await res.json();
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== tempUserMsg.id && m.id !== tempAssistantId);
          return [...filtered, data.userMessage, data.assistantMessage];
        });

        setConversations(prev =>
          prev.map(c => (c.id === data.conversation.id ? data.conversation : c))
        );
        setActiveConversation(data.conversation);
      } catch (fallbackErr: any) {
        console.error('Failed to send message via fallback:', fallbackErr);
        const errorMsg: Message = {
          id: 'err_' + Date.now(),
          conversationId: conv.id,
          role: 'assistant',
          content: `Apologies, an error occurred while processing your query: ${fallbackErr.message}. Please check your connection and try again.`,
          createdAt: new Date().toISOString(),
        };
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== tempAssistantId);
          return [...filtered, errorMsg];
        });
      }
    }

    setIsGenerating(false);
  };

  const translateMessageText = async (text: string, targetLanguage: SupportedLanguage): Promise<string> => {
    try {
      const res = await fetch('/api/translation/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          text,
          targetLanguage,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Translation request failed');
      }

      const data = await res.json();
      return data.translatedText || text;
    } catch (err: any) {
      console.error('Translation error:', err);
      throw err;
    }
  };

  const regenerateLastMessage = async () => {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      await sendMessage(lastUserMsg.content);
    }
  };

  const clearCurrentChat = () => {
    setMessages([]);
  };

  const saveResponse = async (msg: Message) => {
    try {
      const res = await fetch('/api/chat/save-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messageId: msg.id,
          content: msg.content,
          agentId: activeAgent,
          language: activeConversation?.language || currentLanguage,
        }),
      });
      if (res.ok) {
        fetchSavedResponses();
      }
    } catch (err) {
      console.error('Save response error:', err);
    }
  };

  const deleteConversation = async (id: string) => {
    try {
      await fetch(`/api/chat/conversations/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConversation?.id === id) {
        setActiveConversation(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Delete conversation error:', err);
    }
  };

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Voice Interaction Engine: MediaRecorder for Gnani Cloud STT with Web Speech fallback
  const startVoiceInput = async () => {
    if (isListening) {
      stopVoiceInput();
      return;
    }

    // 1. Primary path: Use MediaRecorder to capture audio for Gnani Prisma STT
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        audioChunksRef.current = [];

        const mimeType = (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/webm'))
          ? 'audio/webm' 
          : 'audio/wav';

        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event: BlobEvent) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          stopWaveformAnimation();
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
          }

          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          if (audioBlob.size === 0) {
            setIsListening(false);
            return;
          }

          setTranscriptPreview('Transcribing audio...');

          try {
            const formData = new FormData();
            formData.append('audio_file', audioBlob, `recording.${mimeType.includes('webm') ? 'webm' : 'wav'}`);
            formData.append('language', currentLanguage);

            const res = await fetch('/api/speech/transcribe', {
              method: 'POST',
              body: formData,
            });

            if (res.ok) {
              const data = await res.json();
              if (data.transcript) {
                setTranscriptPreview(data.transcript);
              } else {
                setTranscriptPreview('');
              }
            } else {
              const errData = await res.json().catch(() => ({}));
              if (errData.code === 'GNANI_API_KEY_MISSING') {
                setTranscriptPreview('Connecting voice input...');
                setTimeout(() => {
                  setTranscriptPreview('');
                  startBrowserSpeech();
                }, 800);
              } else {
                console.warn('Speech transcription response:', errData.error || errData.message);
                setTranscriptPreview('');
              }
            }
          } catch (uploadErr: any) {
            console.warn('Audio transcription network error:', uploadErr.message);
            setTranscriptPreview('');
          } finally {
            setIsListening(false);
          }
        };

        mediaRecorder.start(250); // slice every 250ms
        setIsListening(true);
        setTranscriptPreview('Listening...');
        animateWaveform();
        return;
      } catch (micErr) {
        console.warn('MediaRecorder microphone error, using browser speech fallback:', micErr);
      }
    }

    // 2. Fallback: Browser Web Speech API
    startBrowserSpeech();
  };

  const startBrowserSpeech = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Microphone recording is unavailable or not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = BROWSER_SPEECH_LANG_MAP[currentLanguage] || 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
        setTranscriptPreview('');
        animateWaveform();
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setTranscriptPreview(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        stopVoiceInput();
      };

      recognition.onend = () => {
        setIsListening(false);
        stopWaveformAnimation();
      };

      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
      stopWaveformAnimation();
    }
  };

  const stopVoiceInput = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsListening(false);
    stopWaveformAnimation();
  };

  // Real-time audio waveform simulation
  const animateWaveform = () => {
    const loop = () => {
      const amp = Math.sin(Date.now() / 80) * 0.4 + Math.random() * 0.6;
      setAudioAmplitude(Math.max(0.1, amp));
      audioAnimationRef.current = requestAnimationFrame(loop);
    };
    audioAnimationRef.current = requestAnimationFrame(loop);
  };

  const stopWaveformAnimation = () => {
    if (audioAnimationRef.current) {
      cancelAnimationFrame(audioAnimationRef.current);
      audioAnimationRef.current = null;
    }
    setAudioAmplitude(0);
  };

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Audio Playback Controls
  const stopAudio = () => {
    if (currentSessionRef.current) {
      currentSessionRef.current.isCancelled = true;
      currentSessionRef.current = null;
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    isUsingBrowserFallbackRef.current = false;
    setPlayingMessageId(null);
    setAudioPlaybackState('idle');
    setIsPlayingAudio(false);
    stopWaveformAnimation();
  };

  const pauseAudio = () => {
    if (currentSessionRef.current) {
      currentSessionRef.current.isPaused = true;
    }
    if (isUsingBrowserFallbackRef.current) {
      if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
      }
    } else if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    setAudioPlaybackState('paused');
    setIsPlayingAudio(false);
    stopWaveformAnimation();
  };

  const resumeAudio = () => {
    if (currentSessionRef.current) {
      currentSessionRef.current.isPaused = false;
    }
    if (isUsingBrowserFallbackRef.current) {
      if ('speechSynthesis' in window && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setAudioPlaybackState('playing');
        setIsPlayingAudio(true);
        animateWaveform();
      }
    } else if (audioPlayerRef.current) {
      const currentSpeed = playbackSpeedRef.current || 1.0;
      audioPlayerRef.current.defaultPlaybackRate = currentSpeed;
      audioPlayerRef.current.playbackRate = currentSpeed;
      applyPitchPreservation(audioPlayerRef.current);
      audioPlayerRef.current.play().then(() => {
        if (audioPlayerRef.current) {
          audioPlayerRef.current.playbackRate = playbackSpeedRef.current || 1.0;
        }
        setAudioPlaybackState('playing');
        setIsPlayingAudio(true);
        animateWaveform();
      }).catch(err => {
        console.warn('Resume audio error:', err);
      });
    }
  };

  const playAudioSource = (
    messageId: string, 
    src: string, 
    voiceName: string,
    timingMeta?: { requestStart: number; serverMs?: number; transferMs?: number }
  ) => {
    isUsingBrowserFallbackRef.current = false;
    setActiveAudioVoice(voiceName);

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.removeAttribute('src');
      audioPlayerRef.current.load();
    }

    const currentSpeed = playbackSpeedRef.current || 1.0;
    const audio = new Audio();
    audio.preload = 'auto';
    audio.defaultPlaybackRate = currentSpeed;
    audio.playbackRate = currentSpeed;
    applyPitchPreservation(audio);
    audioPlayerRef.current = audio;

    const enforceSpeed = () => {
      const activeSpeed = playbackSpeedRef.current || 1.0;
      audio.defaultPlaybackRate = activeSpeed;
      audio.playbackRate = activeSpeed;
      applyPitchPreservation(audio);
    };

    audio.onloadedmetadata = () => {
      enforceSpeed();
    };

    audio.oncanplay = () => {
      enforceSpeed();
    };

    audio.onplay = () => {
      enforceSpeed();
      setPlayingMessageId(messageId);
      setAudioPlaybackState('playing');
      setIsPlayingAudio(true);
      animateWaveform();
      if (timingMeta) {
        const totalMs = Math.round(performance.now() - timingMeta.requestStart);
        const initMs = Math.max(0, totalMs - (timingMeta.serverMs || 0) - (timingMeta.transferMs || 0));
        console.log(`[Voice Pipeline Latency] Server: ${timingMeta.serverMs ?? 'cached'}ms | Transfer: ${timingMeta.transferMs ?? 0}ms | Audio Init: ${initMs}ms | Total to Playback: ${totalMs}ms`);
      }
    };

    audio.onpause = () => {
      if (audio.currentTime < audio.duration) {
        setAudioPlaybackState('paused');
      }
      setIsPlayingAudio(false);
      stopWaveformAnimation();
    };

    audio.onended = () => {
      setPlayingMessageId(null);
      setAudioPlaybackState('idle');
      setIsPlayingAudio(false);
      stopWaveformAnimation();
    };

    audio.onerror = (e) => {
      console.warn('Audio element error:', e);
      setPlayingMessageId(null);
      setAudioPlaybackState('idle');
      setIsPlayingAudio(false);
      stopWaveformAnimation();
    };

    audio.src = src;

    audio.play().then(() => {
      enforceSpeed();
    }).catch(playErr => {
      console.warn('Audio play() error:', playErr);
      setPlayingMessageId(null);
      setAudioPlaybackState('idle');
      setIsPlayingAudio(false);
      stopWaveformAnimation();
    });
  };

  const playBrowserSpeechFallback = (messageId: string, text: string, lang?: SupportedLanguage) => {
    if (!('speechSynthesis' in window)) {
      setAudioPlaybackState('idle');
      setPlayingMessageId(null);
      setIsPlayingAudio(false);
      return;
    }

    window.speechSynthesis.cancel();
    isUsingBrowserFallbackRef.current = true;
    setActiveAudioVoice('Voice Audio');
    const cleanText = text.replace(/```[\s\S]*?```/g, '').replace(/[#*`_\[\]()]/g, ' ').slice(0, 350);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const targetLang = lang || currentLanguage;
    utterance.lang = BROWSER_SPEECH_LANG_MAP[targetLang] || 'en-IN';
    utterance.rate = playbackSpeedRef.current || 1.0;

    utterance.onstart = () => {
      setPlayingMessageId(messageId);
      setAudioPlaybackState('playing');
      setIsPlayingAudio(true);
      animateWaveform();
    };

    utterance.onend = () => {
      setPlayingMessageId(null);
      setAudioPlaybackState('idle');
      setIsPlayingAudio(false);
      stopWaveformAnimation();
      isUsingBrowserFallbackRef.current = false;
    };

    utterance.onerror = () => {
      setPlayingMessageId(null);
      setAudioPlaybackState('idle');
      setIsPlayingAudio(false);
      stopWaveformAnimation();
      isUsingBrowserFallbackRef.current = false;
    };

    window.speechSynthesis.speak(utterance);
  };

  const playProgressiveSegment = (
    session: ProgressivePlaybackSession,
    segmentIndex: number,
    voicePersonaName: string
  ) => {
    if (session.isCancelled || currentSessionRef.current?.sessionId !== session.sessionId) {
      return;
    }

    const seg = session.segments[segmentIndex];
    if (!seg || !seg.audioSrc) {
      // Segment still synthesizing by sequential worker; show loading and await trigger
      setAudioPlaybackState('loading');
      return;
    }

    session.currentPlayingIndex = segmentIndex;
    seg.status = 'playing';
    isUsingBrowserFallbackRef.current = false;
    setActiveAudioVoice(`${voicePersonaName} Persona`);

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.removeAttribute('src');
    }

    const currentSpeed = playbackSpeedRef.current || 1.0;
    const audio = new Audio();
    audio.preload = 'auto';
    audio.defaultPlaybackRate = currentSpeed;
    audio.playbackRate = currentSpeed;
    applyPitchPreservation(audio);
    audioPlayerRef.current = audio;

    const enforceSpeed = () => {
      const activeSpeed = playbackSpeedRef.current || 1.0;
      audio.defaultPlaybackRate = activeSpeed;
      audio.playbackRate = activeSpeed;
      applyPitchPreservation(audio);
    };

    audio.onloadedmetadata = () => enforceSpeed();
    audio.oncanplay = () => enforceSpeed();

    audio.onplay = () => {
      enforceSpeed();
      setPlayingMessageId(session.messageId);
      setAudioPlaybackState('playing');
      setIsPlayingAudio(true);
      animateWaveform();
    };

    audio.onpause = () => {
      if (audio.currentTime < audio.duration) {
        setAudioPlaybackState('paused');
      }
      setIsPlayingAudio(false);
      stopWaveformAnimation();
    };

    audio.onended = () => {
      seg.status = 'played';
      const nextIndex = segmentIndex + 1;
      if (
        nextIndex < session.segments.length &&
        !session.isCancelled &&
        currentSessionRef.current?.sessionId === session.sessionId
      ) {
        session.currentPlayingIndex = nextIndex;
        const nextSeg = session.segments[nextIndex];
        if (nextSeg && nextSeg.status === 'ready' && nextSeg.audioSrc) {
          playProgressiveSegment(session, nextIndex, voicePersonaName);
        } else {
          // Worker is still finishing synthesis of next segment -> transition to brief buffering
          setAudioPlaybackState('loading');
          setIsPlayingAudio(false);
          stopWaveformAnimation();
        }
      } else if (nextIndex >= session.segments.length) {
        // All segments finished!
        setPlayingMessageId(null);
        setAudioPlaybackState('idle');
        setIsPlayingAudio(false);
        stopWaveformAnimation();
        currentSessionRef.current = null;
      }
    };

    audio.onerror = (e) => {
      console.warn(`Audio playback error on segment ${segmentIndex}:`, e);
      seg.status = 'error';
      const nextIndex = segmentIndex + 1;
      if (nextIndex < session.segments.length && !session.isCancelled) {
        session.currentPlayingIndex = nextIndex;
        playProgressiveSegment(session, nextIndex, voicePersonaName);
      } else {
        setPlayingMessageId(null);
        setAudioPlaybackState('idle');
        setIsPlayingAudio(false);
        stopWaveformAnimation();
        currentSessionRef.current = null;
      }
    };

    audio.src = seg.audioSrc;
    audio.play().then(() => {
      enforceSpeed();
    }).catch(err => {
      console.warn('Audio play() error on segment:', err);
      setPlayingMessageId(null);
      setAudioPlaybackState('idle');
      setIsPlayingAudio(false);
      stopWaveformAnimation();
    });
  };

  const playMessageAudio = async (
    messageId: string, 
    text: string, 
    agentId?: AgentId, 
    lang?: SupportedLanguage,
    customVoice?: string
  ) => {
    // If clicking on already playing message -> pause
    if (playingMessageId === messageId && audioPlaybackState === 'playing') {
      pauseAudio();
      return;
    }

    // If clicking on paused message -> resume
    if (playingMessageId === messageId && audioPlaybackState === 'paused') {
      resumeAudio();
      return;
    }

    // Otherwise stop previous audio and start fresh
    stopAudio();

    const requestStart = performance.now();
    const targetLang = lang || activeConversation?.language || currentLanguage;
    const targetAgent = agentId || activeAgent;
    
    // Signature voice persona mapping
    const AGENT_VOICE_MAP: Record<string, string> = {
      technical: 'Avinash',
      cultural: 'Lakshmi',
      school: 'Chetana',
      personal: 'Shivani',
      language_learning: 'Riyaa',
    };
    const targetVoice = customVoice || (agentId && AGENT_VOICE_MAP[agentId]) || preferredVoice || AGENT_VOICE_MAP[activeAgent] || 'Shivani';
    const cacheKey = `${messageId}_${targetLang}_${targetAgent}_${targetVoice}`;

    setPlayingMessageId(messageId);
    setAudioPlaybackState('loading');

    // 1. Check in-memory audio cache for unified audio
    const cached = audioCacheRef.current.get(cacheKey);
    if (cached) {
      playAudioSource(messageId, cached.src, cached.voice, { requestStart, serverMs: 0, transferMs: 0 });
      return;
    }

    // Segment text into clean natural sentences
    const sentences = segmentTextIntoSentences(text);

    // If single sentence or very short text -> use standard direct synthesis
    if (sentences.length <= 1) {
      try {
        const fetchStart = performance.now();
        const response = await fetch('/api/speech/synthesize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            agentId: targetAgent,
            voiceName: targetVoice,
            language: targetLang,
          }),
        });

        const transferMs = Math.round(performance.now() - fetchStart);
        if (!response.ok) {
          console.warn(`Speech synthesis endpoint returned status ${response.status}. Using fallback.`);
          playBrowserSpeechFallback(messageId, text, targetLang);
          return;
        }

        const data = await response.json();
        if (data.audioBase64) {
          const audioSrc = `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`;
          const rawVoice = data.voice || data.voicePersona?.name;
          const resolvedVoiceName = (typeof rawVoice === 'string' && rawVoice !== 'Gnani' && !rawVoice.includes('('))
            ? rawVoice
            : (data.voicePersona?.name || 'Voice');
          const voiceLabel = `${resolvedVoiceName} Persona`;
          audioCacheRef.current.set(cacheKey, { src: audioSrc, voice: voiceLabel });
          playAudioSource(messageId, audioSrc, voiceLabel, {
            requestStart,
            serverMs: data.timings?.totalServerMs,
            transferMs,
          });
        } else {
          playBrowserSpeechFallback(messageId, text, targetLang);
        }
      } catch (err) {
        console.warn('Failed to synthesize speech via backend, falling back to browser:', err);
        playBrowserSpeechFallback(messageId, text, targetLang);
      }
      return;
    }

    // MULTI-SENTENCE PROGRESSIVE SPEECH PLAYBACK:
    // Check if progressive cache already exists for this message
    const cachedProg = progressiveCacheRef.current.get(cacheKey);
    if (cachedProg && cachedProg.segments.every(s => s.audioSrc)) {
      const replaySession: ProgressivePlaybackSession = {
        sessionId: 'prog_' + Date.now(),
        messageId,
        agentId: targetAgent,
        language: targetLang,
        segments: cachedProg.segments.map((s, idx) => ({
          index: idx,
          text: sentences[idx] || '',
          audioSrc: s.audioSrc,
          durationSec: s.durationSec,
          status: 'ready' as const,
        })),
        currentPlayingIndex: 0,
        isPaused: false,
        isCancelled: false,
        startTime: performance.now(),
      };
      currentSessionRef.current = replaySession;
      playProgressiveSegment(replaySession, 0, cachedProg.voice);
      return;
    }

    // Start fresh progressive session
    const sessionId = 'prog_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    const session: ProgressivePlaybackSession = {
      sessionId,
      messageId,
      agentId: targetAgent,
      language: targetLang,
      segments: sentences.map((s, idx) => ({
        index: idx,
        text: s,
        status: 'pending' as const,
      })),
      currentPlayingIndex: 0,
      isPaused: false,
      isCancelled: false,
      startTime: requestStart,
    };
    currentSessionRef.current = session;

    // Run Sequential Synthesis Worker in background
    (async () => {
      let resolvedVoiceName = 'Voice';

      for (let i = 0; i < session.segments.length; i++) {
        if (session.isCancelled || currentSessionRef.current?.sessionId !== session.sessionId) {
          break;
        }

        const seg = session.segments[i];
        seg.status = 'synthesizing';
        const t0 = performance.now();

        try {
          const response = await fetch('/api/speech/synthesize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: seg.text,
              agentId: targetAgent,
              voiceName: targetVoice,
              language: targetLang,
            }),
          });

          if (session.isCancelled || currentSessionRef.current?.sessionId !== session.sessionId) {
            break;
          }

          if (!response.ok) {
            console.warn(`[Progressive Speech] Segment ${i} failed with status ${response.status}`);
            seg.status = 'error';
            if (i === 0) {
              // Fallback to browser speech if initial segment fails
              playBrowserSpeechFallback(messageId, text, targetLang);
              return;
            }
            continue;
          }

          const data = await response.json();
          if (!data.audioBase64) {
            seg.status = 'error';
            if (i === 0) {
              playBrowserSpeechFallback(messageId, text, targetLang);
              return;
            }
            continue;
          }

          seg.audioSrc = `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`;
          seg.durationSec = data.durationEstimateSec;
          seg.status = 'ready';
          seg.timings = { synthesisMs: Math.round(performance.now() - t0) };

          const rawVoice = data.voice || data.voicePersona?.name;
          resolvedVoiceName = (typeof rawVoice === 'string' && rawVoice !== 'Gnani' && !rawVoice.includes('('))
            ? rawVoice
            : (data.voicePersona?.name || 'Voice');

          // If Segment 0 is ready, START AUDIO PLAYBACK IMMEDIATELY!
          if (i === 0) {
            session.timeToFirstSound = Math.round(performance.now() - session.startTime);
            console.log(`[Progressive Speech] ⚡ First sound playing in ${session.timeToFirstSound}ms! (Total sentences: ${session.segments.length})`);
            playProgressiveSegment(session, 0, resolvedVoiceName);
          } else if (session.currentPlayingIndex === i && !session.isCancelled) {
            // Player reached this segment while synthesis was completing -> start it immediately
            playProgressiveSegment(session, i, resolvedVoiceName);
          }
        } catch (fetchErr: any) {
          console.warn(`[Progressive Speech] Segment ${i} network error:`, fetchErr.message);
          seg.status = 'error';
          if (i === 0) {
            playBrowserSpeechFallback(messageId, text, targetLang);
            return;
          }
        }
      }

      // If all segments synthesized successfully, cache session for instant zero-latency replay
      if (session.segments.every(s => s.status === 'ready' || s.status === 'played')) {
        progressiveCacheRef.current.set(cacheKey, {
          segments: session.segments.map(s => ({ audioSrc: s.audioSrc!, durationSec: s.durationSec })),
          voice: resolvedVoiceName,
        });
      }
    })();
  };

  const replayAudio = async (
    messageId: string, 
    text: string, 
    agentId?: AgentId, 
    lang?: SupportedLanguage,
    customVoice?: string
  ) => {
    stopAudio();
    await playMessageAudio(messageId, text, agentId, lang, customVoice);
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
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
        savedResponses,
        startVoiceInput,
        stopVoiceInput,
        playMessageAudio,
        pauseAudio,
        resumeAudio,
        replayAudio,
        stopAudio,
        selectConversation,
        createNewConversation,
        sendMessage,
        translateMessageText,
        setActiveAgent,
        clearCurrentChat,
        regenerateLastMessage,
        saveResponse,
        deleteConversation,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
};

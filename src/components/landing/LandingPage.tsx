import React from 'react';
import { AuroraOrb } from '../common/AuroraOrb';
import { useLanguage } from '../../contexts/LanguageContext';
import { useChat } from '../../contexts/ChatContext';
import { AgentId } from '../../types';
import { 
  Code2, 
  Sparkles, 
  GraduationCap, 
  CheckCircle2, 
  Languages, 
  Mic, 
  Volume2, 
  Database, 
  ShieldCheck, 
  ArrowRight,
  Globe2,
  Cpu,
  Layers,
  MessageSquare
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onExploreAgents: (agentId?: AgentId) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGetStarted,
  onExploreAgents,
}) => {
  const { currentLanguage, setLanguage, supportedLanguagesList, t } = useLanguage();
  const { agents } = useChat();

  const agentIcons: Record<string, any> = {
    Code2,
    Sparkles,
    GraduationCap,
    CheckCircle2,
    Languages,
  };

  const agentPastelThemes: Record<string, { bg: string; border: string; accent: string; textAccent: string }> = {
    technical: { bg: '#EEF3EA', border: '#A8C3A0', accent: '#A8C3A0', textAccent: '#527653' }, // Soft Sage
    cultural: { bg: '#FBE5D4', border: '#F4B183', accent: '#F4B183', textAccent: '#E99A61' }, // Apricot Orange
    school: { bg: '#F5EBC7', border: '#CADBB7', accent: '#CADBB7', textAccent: '#527653' }, // Soft Yellow Green
    personal: { bg: '#FBE5D4', border: '#E99A61', accent: '#E99A61', textAccent: '#26382D' }, // Pastel Peach
    language_learning: { bg: '#EEF3EA', border: '#F4B183', accent: '#F4B183', textAccent: '#527653' }, // Muted Sage & Orange
  };

  return (
    <div className="min-h-screen bg-[#F7F8F2] text-[#26382D] flex flex-col relative overflow-hidden">
      {/* Nature-inspired soft ambient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[650px] pointer-events-none overflow-hidden">
        <div className="absolute top-[-5%] left-[15%] w-[550px] h-[550px] rounded-full bg-[#A8C3A0]/20 blur-[130px]" />
        <div className="absolute top-[10%] right-[10%] w-[500px] h-[500px] rounded-full bg-[#F4B183]/18 blur-[120px]" />
        <div className="absolute top-[40%] left-[40%] w-[450px] h-[450px] rounded-full bg-[#FBE5D4]/25 blur-[100px]" />
      </div>

      {/* Hero Section */}
      <section className="relative pt-16 md:pt-24 pb-20 px-6 max-w-7xl mx-auto w-full flex flex-col lg:flex-row items-center justify-between gap-12 z-10">
        {/* Left text column */}
        <div className="flex-1 text-center lg:text-left">
          {/* Subtle nature kicker */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EEF3EA] border border-[#E3EADF] text-xs font-semibold text-[#527653] mb-5 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#527653]" />
            <span>Multilingual Multi-Agent Intelligence Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#26382D] font-display leading-[1.12] mb-6 max-w-2xl mx-auto lg:mx-0">
            {t('tagline')}
          </h1>

          <p className="text-base sm:text-lg text-[#788579] max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed font-normal">
            {t('heroSubtitle')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
            <button
              onClick={() => onExploreAgents()}
              className="w-full sm:w-auto px-7 py-3 rounded-xl bg-[#527653] hover:bg-[#26382D] text-white font-semibold text-sm tracking-wide shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{t('exploreAgents')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onGetStarted}
              className="w-full sm:w-auto px-7 py-3 rounded-xl bg-[#FFFFFF] hover:bg-[#EEF3EA] text-[#26382D] font-semibold text-sm border border-[#E3EADF] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <span>{t('experienceAurora')}</span>
            </button>
          </div>

          {/* Quick Language Badges */}
          <div className="mt-10 pt-6 border-t border-[#E3EADF] flex flex-wrap items-center justify-center lg:justify-start gap-2 text-xs text-[#788579]">
            <span className="font-semibold text-[#26382D] mr-1 flex items-center gap-1.5">
              <Globe2 className="w-3.5 h-3.5 text-[#527653]" /> {t('tenIndianLanguages')}
            </span>
            {supportedLanguagesList.slice(0, 7).map(lang => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={`transition-colors cursor-pointer ${
                  currentLanguage === lang.code 
                    ? 'text-[#527653] font-bold underline decoration-[#A8C3A0] decoration-2 underline-offset-4' 
                    : 'hover:text-[#26382D]'
                }`}
              >
                {lang.native} ·
              </button>
            ))}
            <span className="text-[#E99A61] font-semibold">+3 more</span>
          </div>
        </div>

        {/* Right hero visual: Animated glowing aurora orb */}
        <div className="flex-1 flex items-center justify-center relative">
          <div className="relative p-6 sm:p-10">
            <AuroraOrb size="hero" state="idle" />

            {/* Floating feature pills in soft ivory styling */}
            <div className="absolute top-4 left-2 sm:-left-4 bg-[#FFFFFF]/90 border border-[#E3EADF] backdrop-blur-md rounded-2xl p-3.5 shadow-sm flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#EEF3EA] text-[#527653] flex items-center justify-center">
                <Mic className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-[#26382D]">Dual Voice Engine</div>
                <div className="text-[11px] text-[#788579]">Neural & Browser Speech</div>
              </div>
            </div>

            <div className="absolute bottom-4 right-2 sm:-right-4 bg-[#FFFFFF]/90 border border-[#E3EADF] backdrop-blur-md rounded-2xl p-3.5 shadow-sm flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#FBE5D4] text-[#E99A61] flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-[#26382D]">PostgreSQL & pgvector</div>
                <div className="text-[11px] text-[#788579]">768-Dim Vector Retrieval</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Language Showcase: All Ten Target Languages */}
      <section id="languages" className="py-20 px-6 max-w-7xl mx-auto w-full bg-[#FFFFFF] rounded-[22px] border border-[#E3EADF] my-8 shadow-xs">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF3EA] text-[#527653] text-xs font-semibold mb-2">
            <span>Linguistic Diversity</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#26382D] font-display">
            Explore 10 Target Indian Languages
          </h2>
          <p className="text-sm text-[#788579] mt-2">
            Interact by speaking or writing in your native tongue with certified speech synthesis and transcription.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
          {supportedLanguagesList.map((lang) => {
            const isSelected = currentLanguage === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={`p-4 rounded-2xl text-left transition-all border cursor-pointer ${
                  isSelected
                    ? 'bg-[#EEF3EA] border-[#A8C3A0] shadow-xs'
                    : 'bg-[#F7F8F2] border-[#E3EADF] hover:border-[#A8C3A0]/60 hover:bg-[#FFFFFF]'
                }`}
              >
                <div className="text-lg font-bold text-[#26382D] font-display">
                  {lang.native}
                </div>
                <div className="text-xs text-[#527653] font-medium mt-0.5">
                  {lang.name}
                </div>
                <div className="text-[11px] text-[#788579] mt-1 truncate">
                  {lang.region}
                </div>
                <div className="mt-3 pt-2 border-t border-[#E3EADF] flex items-center justify-between text-[11px]">
                  <span className="text-[#899287] font-mono">STT · TTS</span>
                  <span className={isSelected ? 'text-[#527653] font-bold' : 'text-[#899287]'}>
                    {isSelected ? 'Active' : 'Select'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Meet the Agents Section */}
      <section id="agents" className="py-20 px-6 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FBE5D4] text-[#E99A61] text-xs font-semibold mb-2">
            <span>Specialised Intelligence</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#26382D] font-display">
            Meet the Five Specialised AI Agents
          </h2>
          <p className="text-sm text-[#788579] mt-2">
            Each agent has an independent personality, dedicated system prompt, and verified domain RAG knowledge.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => {
            const IconComponent = agentIcons[agent.avatarIcon] || Sparkles;
            const theme = agentPastelThemes[agent.id] || agentPastelThemes.technical;
            return (
              <div
                key={agent.id}
                className="bg-[#FFFFFF] border border-[#E3EADF] hover:border-[#A8C3A0] rounded-[22px] p-6.5 transition-all duration-200 hover:-translate-y-1 shadow-xs hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div 
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs"
                      style={{
                        backgroundColor: theme.bg,
                        border: `1px solid ${theme.border}`,
                      }}
                    >
                      <IconComponent className="w-6 h-6 text-[#26382D]" />
                    </div>
                    <span className="text-[11px] font-mono text-[#527653] bg-[#EEF3EA] px-2.5 py-1 rounded-lg">
                      RAG Verified
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-[#26382D] font-display mb-1">
                    {t(`agent_${agent.id}_name`) || agent.name}
                  </h3>
                  <div className="text-xs text-[#527653] font-semibold mb-3">
                    {t(`agent_${agent.id}_role`) || agent.roleTitle}
                  </div>
                  <p className="text-xs text-[#788579] leading-relaxed mb-5">
                    {t(`agent_${agent.id}_desc`) || agent.description}
                  </p>

                  <div className="space-y-2 mb-6">
                    {agent.capabilities.slice(0, 3).map((cap, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-[#26382D]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#527653]" />
                        <span>{cap}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => onExploreAgents(agent.id)}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#F7F8F2] hover:bg-[#EEF3EA] text-[#26382D] text-xs font-semibold transition-all border border-[#E3EADF] hover:border-[#A8C3A0] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{t('launch')} {t(`agent_${agent.id}_name`)?.split(' ')[0] || agent.name.split(' ')[0]}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#527653]" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Voice and Text Experience Section */}
      <section className="py-20 px-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        <div className="bg-[#FFFFFF] border border-[#E3EADF] rounded-[22px] p-8 sm:p-10 flex flex-col justify-between shadow-xs">
          <div>
            <div className="w-11 h-11 rounded-2xl bg-[#EEF3EA] border border-[#A8C3A0]/60 text-[#527653] flex items-center justify-center mb-5">
              <Mic className="w-5 h-5" />
            </div>
            <h3 className="text-2xl font-bold text-[#26382D] font-display mb-3">
              Voice & Text Multilingual Experience
            </h3>
            <p className="text-sm text-[#788579] leading-relaxed mb-6">
              Speak naturally using your browser's microphone or type in any Indian script. Receive fluent voice playback through 12 verified expressive production voices or native browser synthesizers.
            </p>

            <div className="p-4 bg-[#F7F8F2] rounded-2xl border border-[#E3EADF] space-y-3 mb-6 text-xs text-[#26382D]">
              <div className="flex items-center justify-between">
                <span className="text-[#788579]">Speech Recognition:</span>
                <span className="font-semibold text-[#527653]">Neural Speech & Web Audio</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#788579]">Voice Synthesis:</span>
                <span className="font-semibold text-[#E99A61]">12 Expressive Personas (Shivani, Lakshmi, etc.)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#788579]">In-Chat Switcher:</span>
                <span className="font-semibold text-[#527653]">Change language anytime</span>
              </div>
            </div>
          </div>

          <button
            onClick={onGetStarted}
            className="w-full py-3 px-4 rounded-xl bg-[#527653] hover:bg-[#26382D] text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <span>Try Voice Interaction in Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* How Aurora Works Flow */}
        <div id="about" className="bg-[#FFFFFF] border border-[#E3EADF] rounded-[22px] p-8 sm:p-10 flex flex-col justify-between shadow-xs">
          <div>
            <div className="w-11 h-11 rounded-2xl bg-[#FBE5D4] border border-[#F4B183]/60 text-[#E99A61] flex items-center justify-center mb-5">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-2xl font-bold text-[#26382D] font-display mb-3">
              How Aurora AI Works
            </h3>
            <p className="text-sm text-[#788579] leading-relaxed mb-6">
              A transparent, provider-independent pipeline orchestrating speech recognition, vector knowledge retrieval, and model inference.
            </p>

            {/* Step sequence */}
            <div className="space-y-3 mb-6">
              {[
                { step: '01', title: 'User Input', desc: 'Voice audio or typed text in any of 10 Indian languages.' },
                { step: '02', title: 'Intent Classification', desc: 'Central orchestrator routes query to the best specialised agent.' },
                { step: '03', title: 'RAG Vector Grounding', desc: '768-dim semantic search retrieves verified domain documents.' },
                { step: '04', title: 'Multimodal Response', desc: 'Formatted markdown answers paired with natural voice synthesis.' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3.5 p-3 rounded-xl bg-[#F7F8F2] border border-[#E3EADF]">
                  <span className="text-xs font-mono font-bold text-[#527653] bg-[#EEF3EA] px-2 py-0.5 rounded-md">
                    {item.step}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-[#26382D]">{item.title}</div>
                    <div className="text-[11px] text-[#788579]">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 text-xs text-[#899287] text-center">
            User → Language Selection → Specialised Agent → AI Intelligence → Voice/Text Response
          </div>
        </div>
      </section>
    </div>
  );
};

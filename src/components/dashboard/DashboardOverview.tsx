import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
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
  ArrowRight, 
  MessageSquare, 
  Clock, 
  Globe2, 
  Activity,
  Plus,
  Bookmark,
  Award
} from 'lucide-react';

interface DashboardOverviewProps {
  onLaunchAgent: (agentId: AgentId) => void;
  onOpenConversation: (convId: string) => void;
  onStartNewChat: () => void;
  onVoiceQuickLaunch: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  onLaunchAgent,
  onOpenConversation,
  onStartNewChat,
  onVoiceQuickLaunch,
}) => {
  const { user } = useAuth();
  const { t, currentLanguage, setLanguage, supportedLanguagesList } = useLanguage();
  const { agents, conversations, savedResponses } = useChat();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('goodMorning');
    if (hour < 17) return t('goodAfternoon');
    return t('goodEvening');
  };

  const agentIcons: Record<string, any> = {
    Code2,
    Sparkles,
    GraduationCap,
    CheckCircle2,
    Languages,
  };

  const agentThemes: Record<string, { bg: string; border: string; accent: string; text: string }> = {
    technical: { bg: '#EEF3EA', border: '#A8C3A0', accent: '#A8C3A0', text: '#527653' }, // Soft Sage Green
    cultural: { bg: '#FBE5D4', border: '#F4B183', accent: '#F4B183', text: '#E99A61' }, // Apricot Orange
    school: { bg: '#F5EBC7', border: '#CADBB7', accent: '#CADBB7', text: '#527653' }, // Soft Yellow Green
    personal: { bg: '#FBE5D4', border: '#E99A61', accent: '#E99A61', text: '#26382D' }, // Pastel Peach
    language_learning: { bg: '#EEF3EA', border: '#F4B183', accent: '#F4B183', text: '#527653' }, // Muted Sage & Orange
  };

  const userName = user?.name ? user.name.split(' ')[0] : 'Explorer';

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8 animate-fadeIn">
      {/* Top Welcome Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-[#E3EADF]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#527653] font-semibold mb-1">
            <span className="w-2 h-2 rounded-full bg-[#527653]" />
            <span>{t('intelligenceSuite')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#26382D] font-display">
            {getGreeting()}, {userName}
          </h1>
          <p className="text-sm text-[#788579] mt-1 font-normal">
            {t('whatToExplore')}
          </p>
        </div>

        {/* Two Actions: Voice Quick Launch & New Chat */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={onVoiceQuickLaunch}
            className="flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-xs bg-[#FFFFFF] text-[#527653] border-[#E3EADF] hover:border-[#A8C3A0] hover:bg-[#EEF3EA] active:scale-95"
          >
            <Mic className="w-4 h-4 text-[#527653]" />
            <span>{t('voiceQuickLaunch')}</span>
          </button>

          <button
            type="button"
            onClick={onStartNewChat}
            className="flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-[#527653] hover:bg-[#26382D] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{t('newChat')}</span>
          </button>
        </div>
      </div>

      {/* Language Selector: 10 Indian Languages with Native Scripts */}
      <div className="bg-[#FFFFFF] border border-[#E3EADF] rounded-[22px] p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3 text-xs">
          <div className="flex items-center gap-2 text-[#26382D] font-bold">
            <Globe2 className="w-4 h-4 text-[#527653]" />
            <span>{t('conversationalLangSelection')}</span>
          </div>
          <span className="text-[#788579] font-mono text-[11px]">
            {t('nativeScriptsReady')}
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {supportedLanguagesList.map(lang => {
            const isSelected = currentLanguage === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 border ${
                  isSelected
                    ? 'bg-[#EEF3EA] border-[#A8C3A0] text-[#26382D] shadow-xs'
                    : 'bg-[#F7F8F2] text-[#788579] hover:text-[#26382D] hover:border-[#F4B183] border-[#E3EADF]'
                }`}
              >
                {lang.native} <span className="text-[11px] font-normal opacity-80">({lang.name.split(' ')[0]})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Five Specialised Agents Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[#26382D] font-display">
            {t('specialisedAiAgents')}
          </h2>
          <span className="text-xs text-[#788579]">
            {t('selectAgentDesc')}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {agents.map((agent) => {
            const IconComponent = agentIcons[agent.avatarIcon] || Sparkles;
            const theme = agentThemes[agent.id] || agentThemes.technical;
            const localizedName = t(`agent_${agent.id}_name`) || agent.name;
            const localizedRole = t(`agent_${agent.id}_role`) || agent.roleTitle;
            const localizedDesc = t(`agent_${agent.id}_desc`) || agent.description;

            return (
              <div
                key={agent.id}
                className="bg-[#FFFFFF] border border-[#E3EADF] hover:border-[#A8C3A0] rounded-[22px] p-6 transition-all duration-200 hover:-translate-y-1 shadow-xs hover:shadow-md flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-xs"
                      style={{
                        backgroundColor: theme.bg,
                        border: `1px solid ${theme.border}`,
                      }}
                    >
                      <IconComponent className="w-5 h-5 text-[#26382D]" />
                    </div>
                    <span className="text-[11px] font-mono font-semibold text-[#527653] bg-[#EEF3EA] px-2.5 py-0.5 rounded-lg">
                      {agent.id}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-[#26382D] font-display">
                    {localizedName}
                  </h3>
                  <div className="text-[11px] text-[#527653] font-semibold mb-2">
                    {localizedRole}
                  </div>
                  <p className="text-xs text-[#788579] line-clamp-3 leading-relaxed mb-4">
                    {localizedDesc}
                  </p>
                </div>

                <div className="pt-3.5 border-t border-[#E3EADF] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#788579]">
                    <Activity className="w-3.5 h-3.5 text-[#527653]" />
                    <span>{t('ragGrounded')}</span>
                  </div>
                  <button
                    onClick={() => onLaunchAgent(agent.id)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#EEF3EA] group-hover:bg-[#527653] text-[#26382D] group-hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <span>{t('launch')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom 2-Column Split: Recent Conversations + Learning & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* Recent Conversations (2 cols) */}
        <div className="lg:col-span-2 bg-[#FFFFFF] border border-[#E3EADF] rounded-[22px] p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E3EADF]">
            <h3 className="text-sm font-bold text-[#26382D] font-display flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#527653]" />
              <span>{t('recentConversations')}</span>
            </h3>
            <span className="text-xs text-[#788579]">
              {conversations.length} {t('totalSessions')}
            </span>
          </div>

          {conversations.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-[#E3EADF] rounded-2xl bg-[#F7F8F2]">
              <p className="text-xs text-[#788579] mb-3">{t('noConversationsYet')}</p>
              <button
                onClick={onStartNewChat}
                className="px-4 py-2 bg-[#527653] hover:bg-[#26382D] text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                {t('startFirstConversation')}
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {conversations.slice(0, 4).map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => onOpenConversation(conv.id)}
                  className="p-3.5 rounded-xl bg-[#F7F8F2] border border-[#E3EADF] hover:border-[#A8C3A0] hover:bg-[#EEF3EA] transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded-xl bg-[#FFFFFF] border border-[#E3EADF] text-[#527653] flex items-center justify-center shrink-0 shadow-xs">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-xs font-bold text-[#26382D] group-hover:text-[#527653] truncate">
                        {conv.title}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-[#788579] mt-0.5">
                        <span className="capitalize">{conv.agentId}</span>
                        <span>·</span>
                        <span className="uppercase text-[#527653] font-mono font-semibold">{conv.language}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-[#899287] shrink-0 font-mono">
                    <Clock className="w-3 h-3 text-[#788579]" />
                    <span>{new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Panel: Saved Insights & Architecture Status */}
        <div className="bg-[#FFFFFF] border border-[#E3EADF] rounded-[22px] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#26382D] font-display mb-4 pb-3 border-b border-[#E3EADF] flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-[#E99A61]" />
              <span>{t('savedInsightsTitle')}</span>
            </h3>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-[#F7F8F2] border border-[#E3EADF]">
                <div className="text-[10px] text-[#788579] uppercase tracking-wider font-mono">
                  {t('savedBookmarks')}
                </div>
                <div className="text-sm font-bold text-[#26382D] mt-0.5">
                  {savedResponses.length} {t('itemsStored')}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#EEF3EA] border border-[#A8C3A0]/60">
                <div className="text-[10px] text-[#527653] uppercase tracking-wider font-mono font-semibold">
                  {t('languageLab')}
                </div>
                <div className="text-xs font-bold text-[#26382D] mt-0.5">
                  {t('vocabularyFlashcards')} & {t('pronunciationCoach')}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FBE5D4] border border-[#F4B183]/60">
                <div className="text-[10px] text-[#E99A61] uppercase tracking-wider font-mono font-semibold">
                  {t('dualVoiceSynthesis')}
                </div>
                <div className="text-xs font-bold text-[#26382D] mt-0.5">
                  {t('verifiedVoices')}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E3EADF] text-[11px] text-[#788579] flex items-center justify-between">
            <span>{t('ragArchitecture')}</span>
            <span className="text-[#527653] font-mono font-semibold">PostgreSQL pgvector</span>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { useChat } from '../../contexts/ChatContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { AgentId } from '../../types';
import { 
  Code2, 
  Sparkles, 
  GraduationCap, 
  CheckCircle2, 
  Languages, 
  ArrowRight,
  Database,
  Layers
} from 'lucide-react';

interface AgentsGalleryViewProps {
  onLaunchAgent: (agentId: AgentId) => void;
  onOpenRAGInspector: (agentId: AgentId) => void;
}

export const AgentsGalleryView: React.FC<AgentsGalleryViewProps> = ({
  onLaunchAgent,
  onOpenRAGInspector,
}) => {
  const { agents } = useChat();
  const { t } = useLanguage();

  const agentIcons: Record<string, any> = {
    Code2,
    Sparkles,
    GraduationCap,
    CheckCircle2,
    Languages,
  };

  const agentPastelThemes: Record<string, { bg: string; border: string; accent: string; text: string }> = {
    technical: { bg: '#EEF3EA', border: '#A8C3A0', accent: '#A8C3A0', text: '#527653' }, // Soft Sage
    cultural: { bg: '#FBE5D4', border: '#F4B183', accent: '#F4B183', text: '#E99A61' }, // Apricot Orange
    school: { bg: '#F5EBC7', border: '#CADBB7', accent: '#CADBB7', text: '#527653' }, // Soft Yellow Green
    personal: { bg: '#FBE5D4', border: '#E99A61', accent: '#E99A61', text: '#26382D' }, // Pastel Peach
    language_learning: { bg: '#EEF3EA', border: '#F4B183', accent: '#F4B183', text: '#527653' }, // Muted Sage & Orange
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto w-full space-y-6 animate-fadeIn">
      <div className="pb-4 border-b border-[#E3EADF]">
        <div className="flex items-center gap-2 text-xs font-mono text-[#527653] font-semibold mb-1">
          <Layers className="w-4 h-4" />
          <span>SPECIALISED MULTI-AGENT ARCHITECTURE</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#26382D] font-display">
          {t('specialisedAiAgents')}
        </h1>
        <p className="text-sm text-[#788579] mt-1">
          {t('selectAgentDesc')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {agents.map(agent => {
          const Icon = agentIcons[agent.avatarIcon] || Sparkles;
          const theme = agentPastelThemes[agent.id] || agentPastelThemes.technical;
          const localizedName = t(`agent_${agent.id}_name`) || agent.name;
          const localizedRole = t(`agent_${agent.id}_role`) || agent.roleTitle;
          const localizedDesc = t(`agent_${agent.id}_desc`) || agent.description;

          return (
            <div
              key={agent.id}
              className="p-6.5 rounded-[22px] bg-[#FFFFFF] border border-[#E3EADF] hover:border-[#A8C3A0] transition-all flex flex-col justify-between group shadow-xs hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
                      style={{
                        backgroundColor: theme.bg,
                        border: `1px solid ${theme.border}`,
                      }}
                    >
                      <Icon className="w-6 h-6 text-[#26382D]" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#26382D] font-display">
                        {localizedName}
                      </h3>
                      <div className="text-xs text-[#527653] font-semibold">
                        {localizedRole}
                      </div>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono font-semibold text-[#527653] uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-[#EEF3EA]">
                    {agent.id}
                  </span>
                </div>

                <p className="text-xs text-[#788579] leading-relaxed mb-4">
                  {localizedDesc}
                </p>

                {/* Capabilities */}
                <div className="mb-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#26382D] mb-2 font-mono">
                    {t('coreCapabilities')}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {agent.capabilities.map((cap, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-[#788579]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#527653]" />
                        <span>{cap}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sample Prompts */}
                <div className="mb-6">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#26382D] mb-2 font-mono">
                    {t('multilingualExamples')}
                  </div>
                  <div className="space-y-1.5">
                    {agent.samplePrompts.slice(0, 2).map((sp, i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-[#F7F8F2] border border-[#E3EADF] text-xs text-[#788579] italic">
                        "{sp.text}"
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-[#E3EADF] flex items-center gap-3">
                <button
                  onClick={() => onOpenRAGInspector(agent.id)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#F7F8F2] hover:bg-[#EEF3EA] border border-[#E3EADF] rounded-xl text-xs font-semibold text-[#527653] transition-colors cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5 text-[#527653]" />
                  <span>{t('ragSources')}</span>
                </button>

                <button
                  onClick={() => onLaunchAgent(agent.id)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#527653] hover:bg-[#26382D] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                >
                  <span>{t('launchAgentSession')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

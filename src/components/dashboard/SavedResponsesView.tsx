import React, { useState } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Bookmark, Volume2, Copy, Check } from 'lucide-react';

export const SavedResponsesView: React.FC = () => {
  const { savedResponses, playMessageAudio } = useChat();
  const { t } = useLanguage();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full space-y-6 animate-fadeIn">
      <div className="pb-4 border-b border-[#E3EADF]">
        <div className="flex items-center gap-2 text-xs font-mono text-[#527653] font-semibold mb-1">
          <Bookmark className="w-4 h-4" />
          <span>{t('bookmarkedKnowledge')}</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#26382D] font-display">
          {t('savedResponsesTitle')}
        </h1>
        <p className="text-sm text-[#788579] mt-1">
          {t('savedResponsesDesc')}
        </p>
      </div>

      {savedResponses.length === 0 ? (
        <div className="p-12 text-center bg-[#FFFFFF] border border-[#E3EADF] rounded-[22px] shadow-xs">
          <Bookmark className="w-10 h-10 text-[#899287] mx-auto mb-3 opacity-40" />
          <h3 className="text-sm font-bold text-[#26382D]">{t('noSavedResponses')}</h3>
          <p className="text-xs text-[#788579] mt-1 max-w-sm mx-auto">
            {t('noSavedResponsesDesc')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {savedResponses.map((item) => (
            <div
              key={item.id}
              className="p-5.5 rounded-[22px] bg-[#FFFFFF] border border-[#E3EADF] hover:border-[#A8C3A0] transition-all shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono text-[#788579] mb-2.5">
                  <span className="capitalize text-[#527653] font-bold bg-[#EEF3EA] px-2 py-0.5 rounded-md">
                    {t(`agent_${item.agentId}_name`) || `${item.agentId} ${t('agent')}`}
                  </span>
                  <span className="uppercase text-[#E99A61] font-bold">{item.language}</span>
                </div>
                <h3 className="text-sm font-bold text-[#26382D] mb-2">
                  {item.title}
                </h3>
                <p className="text-xs text-[#788579] line-clamp-4 leading-relaxed mb-4">
                  {item.content}
                </p>
              </div>

              <div className="pt-3.5 border-t border-[#E3EADF] flex items-center justify-between text-xs text-[#788579]">
                <button
                  onClick={() => playMessageAudio(item.content, item.language)}
                  className="flex items-center gap-1.5 hover:text-[#527653] transition-colors cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{t('listen')}</span>
                </button>

                <button
                  onClick={() => handleCopy(item.id, item.content)}
                  className="flex items-center gap-1.5 hover:text-[#26382D] transition-colors cursor-pointer"
                >
                  {copiedId === item.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#527653]" />
                      <span className="text-[#527653] font-semibold">{t('copied')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{t('copyText')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { MessageSquare, Clock, Trash2, Plus, Search } from 'lucide-react';

interface ConversationsViewProps {
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
}

export const ConversationsView: React.FC<ConversationsViewProps> = ({
  onSelectConversation,
  onNewChat,
}) => {
  const { conversations, deleteConversation } = useChat();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = conversations.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.agentId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto w-full space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#E3EADF]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#527653] font-semibold mb-1">
            <MessageSquare className="w-4 h-4" />
            <span>{t('sessionArchive')}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#26382D] font-display">
            {t('myConversations')}
          </h1>
          <p className="text-sm text-[#788579] mt-1">
            {t('conversationsSubtitle')}
          </p>
        </div>

        <button
          onClick={onNewChat}
          className="flex items-center gap-2 px-4.5 py-2.5 bg-[#527653] hover:bg-[#26382D] text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t('newConversation')}</span>
        </button>
      </div>

      {/* Search Filter */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#899287]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('searchConversations')}
          className="w-full pl-10 pr-4 py-2.5 bg-[#FFFFFF] border border-[#E3EADF] rounded-xl text-xs sm:text-sm text-[#26382D] placeholder-[#899287] focus:outline-none focus:ring-1 focus:ring-[#A8C3A0] transition-colors shadow-xs"
        />
      </div>

      {/* Conversations List */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-[#FFFFFF] border border-[#E3EADF] rounded-[22px] shadow-xs">
          <MessageSquare className="w-8 h-8 text-[#899287] mx-auto mb-2 opacity-40" />
          <h3 className="text-sm font-bold text-[#26382D]">{t('noConversationsFound')}</h3>
          <p className="text-xs text-[#788579] mt-1">{t('startNewConvToChat')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(conv => (
            <div
              key={conv.id}
              className="p-4 rounded-[18px] bg-[#FFFFFF] border border-[#E3EADF] hover:border-[#A8C3A0] hover:bg-[#EEF3EA]/40 transition-all flex items-center justify-between group shadow-xs"
            >
              <div 
                onClick={() => onSelectConversation(conv.id)}
                className="flex items-center gap-3.5 flex-1 cursor-pointer overflow-hidden mr-4"
              >
                <div className="w-9 h-9 rounded-xl bg-[#EEF3EA] border border-[#A8C3A0]/60 text-[#527653] flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <div className="text-sm font-bold text-[#26382D] group-hover:text-[#527653] truncate transition-colors">
                    {conv.title}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#788579] mt-0.5">
                    <span className="capitalize text-[#527653] font-semibold">{t(`agent_${conv.agentId}_name`) || `${conv.agentId} ${t('agent')}`}</span>
                    <span>·</span>
                    <span className="uppercase text-[#E99A61] font-mono font-bold text-[11px]">{conv.language}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1 text-[11px] font-mono">
                      <Clock className="w-3 h-3 text-[#788579]" />
                      {new Date(conv.updatedAt).toLocaleDateString()} {new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(conv.id);
                }}
                title={t('delete')}
                className="p-2 text-[#899287] hover:text-[#CF7770] hover:bg-[#EEF3EA] rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

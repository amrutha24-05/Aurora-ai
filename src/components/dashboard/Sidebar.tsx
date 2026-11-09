import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  LayoutDashboard, 
  Bot, 
  MessageSquare, 
  Languages, 
  Bookmark, 
  Settings, 
  LogOut, 
  Database,
  Layers
} from 'lucide-react';

export type DashboardTab = 
  | 'overview' 
  | 'chat' 
  | 'agents' 
  | 'conversations' 
  | 'language_lab' 
  | 'saved' 
  | 'settings';

interface SidebarProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  onNavigateHome: () => void;
  onOpenRAGInspector: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onNavigateHome,
  onOpenRAGInspector,
}) => {
  const { user, logout } = useAuth();
  const { t, currentLanguage } = useLanguage();

  const navItems = [
    { id: 'overview', key: 'overview', fallback: 'Overview', icon: LayoutDashboard },
    { id: 'chat', key: 'activeChat', fallback: 'Active Agent Chat', icon: MessageSquare },
    { id: 'agents', key: 'specialisedAgents', fallback: 'Specialised Agents', icon: Bot },
    { id: 'conversations', key: 'myConversations', fallback: 'My Conversations', icon: MessageSquare },
    { id: 'language_lab', key: 'languageLab', fallback: 'Language Practice Lab', icon: Languages },
    { id: 'saved', key: 'savedResponses', fallback: 'Saved Responses', icon: Bookmark },
    { id: 'settings', key: 'settings', fallback: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#F7F8F2] border-r border-[#E3EADF] flex flex-col justify-between shrink-0 h-screen sticky top-0 z-40 select-none shadow-xs">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-[#E3EADF] flex items-center justify-between">
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-2.5 text-left group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#A8C3A0] via-[#F4B183] to-[#FBE5D4] p-[1.5px] shadow-xs">
              <div className="w-full h-full bg-[#FFFFFF] rounded-[10px] flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-[#527653]" />
              </div>
            </div>
            <span className="text-base font-bold tracking-tight text-[#26382D] font-display">
              Aurora <span className="text-[#527653]">AI</span>
            </span>
          </button>

          <span className="text-[10px] font-mono text-[#527653] bg-[#EEF3EA] border border-[#E3EADF] px-2 py-0.5 rounded-md font-semibold">
            v3.0
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id as DashboardTab)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#EEF3EA] text-[#26382D] border border-[#A8C3A0]/60 shadow-xs'
                    : 'text-[#788579] hover:text-[#26382D] hover:bg-[#FFFFFF]/70'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#527653]' : 'text-[#899287]'}`} />
                <span className="truncate">{t(item.key) || item.fallback}</span>
              </button>
            );
          })}
        </nav>

        {/* RAG Knowledge Base Shortcut */}
        <div className="px-3 pt-2">
          <button
            onClick={onOpenRAGInspector}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#FFFFFF] border border-[#E3EADF] text-[#527653] hover:text-[#26382D] hover:border-[#A8C3A0] text-xs font-semibold transition-all cursor-pointer shadow-xs"
          >
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-[#527653]" />
              <span>{t('ragKnowledgeBase')}</span>
            </div>
            <span className="text-[10px] font-mono text-[#E99A61] bg-[#FBE5D4] px-1.5 py-0.5 rounded">
              768-d
            </span>
          </button>
        </div>
      </div>

      {/* User profile & Logout footer */}
      <div className="p-4 border-t border-[#E3EADF] bg-[#FFFFFF]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-[#EEF3EA] text-[#527653] border border-[#A8C3A0]/50 flex items-center justify-center font-bold text-xs shrink-0">
              {user?.name ? user.name[0].toUpperCase() : 'A'}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-[#26382D] truncate">
                {user?.name || 'Guest User'}
              </div>
              <div className="text-[11px] text-[#788579] truncate">
                {user?.email || 'demo@aurora.ai'}
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            title={t('logOut')}
            className="text-[#899287] hover:text-[#CF7770] p-1.5 rounded-lg hover:bg-[#EEF3EA] transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#788579] pt-2 border-t border-[#E3EADF]">
          <span>{t('interactionDialect')}:</span>
          <span className="text-[#527653] font-bold font-mono">
            {currentLanguage.toUpperCase()}
          </span>
        </div>
      </div>
    </aside>
  );
};

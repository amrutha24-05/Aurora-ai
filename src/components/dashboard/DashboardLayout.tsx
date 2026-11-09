import React, { useState } from 'react';
import { Sidebar, DashboardTab } from './Sidebar';
import { DashboardOverview } from './DashboardOverview';
import { UniversalChat } from './UniversalChat';
import { AgentsGalleryView } from './AgentsGalleryView';
import { ConversationsView } from './ConversationsView';
import { LanguageLab } from './LanguageLab';
import { SavedResponsesView } from './SavedResponsesView';
import { SettingsView } from './SettingsView';
import { RAGInspectorModal } from '../common/RAGInspectorModal';
import { useChat } from '../../contexts/ChatContext';
import { AgentId } from '../../types';
import { Menu, X } from 'lucide-react';

interface DashboardLayoutProps {
  onNavigateHome: () => void;
  initialAgent?: AgentId;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  onNavigateHome,
  initialAgent,
}) => {
  const { setActiveAgent, createNewConversation, selectConversation, activeConversation } = useChat();

  const [activeTab, setActiveTab] = useState<DashboardTab>(initialAgent ? 'chat' : 'overview');
  const [ragModalAgent, setRagModalAgent] = useState<AgentId | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [autoStartVoice, setAutoStartVoice] = useState(false);

  const handleLaunchAgent = async (agentId: AgentId) => {
    setActiveAgent(agentId);
    await createNewConversation(agentId);
    setActiveTab('chat');
    setMobileMenuOpen(false);
  };

  const handleOpenConversation = (convId: string) => {
    selectConversation(convId);
    setActiveTab('chat');
    setMobileMenuOpen(false);
  };

  const handleStartNewChat = async () => {
    await createNewConversation();
    setActiveTab('chat');
    setMobileMenuOpen(false);
  };

  const handleVoiceQuickLaunch = async () => {
    if (!activeConversation) {
      await createNewConversation();
    }
    setAutoStartVoice(true);
    setActiveTab('chat');
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen w-full bg-[#F7F8F2] text-[#26382D] overflow-hidden relative font-sans">
      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-[#26382D]/40 z-30 md:hidden backdrop-blur-xs"
        />
      )}

      {/* Sidebar: Desktop fixed / Mobile slide-over */}
      <div className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 md:relative md:translate-x-0 ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setMobileMenuOpen(false);
          }}
          onNavigateHome={onNavigateHome}
          onOpenRAGInspector={() => setRagModalAgent('technical')}
        />
      </div>

      {/* Main View Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Top Bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#FFFFFF] border-b border-[#E3EADF] z-20 shadow-xs">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-xl text-[#788579] hover:text-[#26382D] hover:bg-[#EEF3EA] cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="font-bold text-sm text-[#26382D] font-display">
            Aurora <span className="text-[#527653]">AI</span>
          </span>
          <div className="w-6" />
        </div>

        {/* Active Content Container */}
        <main className="flex-1 overflow-y-auto bg-[#F7F8F2]">
          {activeTab === 'overview' && (
            <DashboardOverview
              onLaunchAgent={handleLaunchAgent}
              onOpenConversation={handleOpenConversation}
              onStartNewChat={handleStartNewChat}
              onVoiceQuickLaunch={handleVoiceQuickLaunch}
            />
          )}

          {activeTab === 'chat' && (
            <div className="h-full">
              <UniversalChat
                onOpenRAGInspector={(agentId) => setRagModalAgent(agentId)}
                autoStartVoice={autoStartVoice}
                onVoiceStarted={() => setAutoStartVoice(false)}
              />
            </div>
          )}

          {activeTab === 'agents' && (
            <AgentsGalleryView
              onLaunchAgent={handleLaunchAgent}
              onOpenRAGInspector={(agentId) => setRagModalAgent(agentId)}
            />
          )}

          {activeTab === 'conversations' && (
            <ConversationsView
              onSelectConversation={handleOpenConversation}
              onNewChat={handleStartNewChat}
            />
          )}

          {activeTab === 'language_lab' && (
            <LanguageLab />
          )}

          {activeTab === 'saved' && (
            <SavedResponsesView />
          )}

          {activeTab === 'settings' && (
            <SettingsView />
          )}
        </main>
      </div>

      {/* RAG Knowledge Architecture Inspector Modal */}
      {ragModalAgent && (
        <RAGInspectorModal
          isOpen={Boolean(ragModalAgent)}
          onClose={() => setRagModalAgent(null)}
          agentId={ragModalAgent}
        />
      )}
    </div>
  );
};

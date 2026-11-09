/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ChatProvider } from './contexts/ChatContext';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { LandingPage } from './components/landing/LandingPage';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import { AuthModal } from './components/common/AuthModal';
import { AgentId } from './types';

function AppContent() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<'landing' | 'dashboard'>('landing');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [targetAgent, setTargetAgent] = useState<AgentId | undefined>(undefined);

  const handleGetStarted = () => {
    if (user) {
      setCurrentView('dashboard');
    } else {
      setIsAuthOpen(true);
    }
  };

  const handleExploreAgents = (agentId?: AgentId) => {
    if (agentId) {
      setTargetAgent(agentId);
    }
    setCurrentView('dashboard');
  };

  return (
    <div className="min-h-screen bg-[#F7F8F2] text-[#26382D] flex flex-col font-sans selection:bg-[#A8C3A0]/40 selection:text-[#26382D]">
      {currentView === 'landing' ? (
        <>
          <Header
            onOpenAuth={() => setIsAuthOpen(true)}
            onNavigateDashboard={() => setCurrentView('dashboard')}
            currentView="landing"
            onNavigateHome={() => setCurrentView('landing')}
          />

          <main className="flex-1">
            <LandingPage
              onGetStarted={handleGetStarted}
              onExploreAgents={handleExploreAgents}
            />
          </main>

          <Footer />
        </>
      ) : (
        <DashboardLayout
          onNavigateHome={() => setCurrentView('landing')}
          initialAgent={targetAgent}
        />
      )}

      {/* Global Real Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={() => {
          setCurrentView('dashboard');
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <ChatProvider>
          <AppContent />
        </ChatProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}

import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface HeaderProps {
  onOpenAuth: () => void;
  onNavigateDashboard: () => void;
  currentView: 'landing' | 'dashboard';
  onNavigateHome: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAuth,
  onNavigateDashboard,
  currentView,
  onNavigateHome,
}) => {
  const { user } = useAuth();
  const { t, currentLanguage, setLanguage, supportedLanguagesList } = useLanguage();

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-[#F7F8F2]/90 border-b border-[#E3EADF] transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 py-3.5">
        {/* Zone 1: Brand Wordmark with Soft Sage & Apricot Symbol */}
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-2.5 text-left group whitespace-nowrap shrink-0 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#A8C3A0] via-[#F4B183] to-[#FBE5D4] p-[1.5px] shadow-xs">
            <div className="w-full h-full bg-[#FFFFFF] rounded-[10px] flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-[#527653] shadow-xs" />
            </div>
          </div>
          <span className="text-xl font-bold tracking-tight text-[#26382D] font-display">
            Aurora <span className="text-[#527653]">AI</span>
          </span>
        </button>

        {/* Zone 2: Clean Nav Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#788579]">
          <button
            onClick={onNavigateHome}
            className="hover:text-[#26382D] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t('home')}
          </button>
          <a
            href="#agents"
            className="hover:text-[#26382D] transition-colors whitespace-nowrap shrink-0"
          >
            {t('exploreAgents')}
          </a>
          <a
            href="#languages"
            className="hover:text-[#26382D] transition-colors whitespace-nowrap shrink-0"
          >
            {t('languages')}
          </a>
          <a
            href="#about"
            className="hover:text-[#26382D] transition-colors whitespace-nowrap shrink-0"
          >
            {t('about')}
          </a>
        </nav>

        {/* Zone 3: Primary Action & Language Selector */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Language selector dropdown */}
          <div className="relative">
            <select
              aria-label="Language Selector"
              value={currentLanguage}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="bg-[#FFFFFF] border border-[#E3EADF] hover:border-[#A8C3A0] text-xs font-medium text-[#26382D] rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#A8C3A0] cursor-pointer transition-colors shadow-xs"
            >
              {supportedLanguagesList.map(lang => (
                <option key={lang.code} value={lang.code} className="bg-[#FFFFFF] text-[#26382D]">
                  {lang.native} ({lang.name.split(' ')[0]})
                </option>
              ))}
            </select>
          </div>

          {user ? (
            <button
              onClick={onNavigateDashboard}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#527653] hover:bg-[#26382D] rounded-xl transition-all shadow-xs whitespace-nowrap shrink-0 cursor-pointer"
            >
              {currentView === 'dashboard' ? t('inDashboard') : t('openDashboard')}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenAuth}
                className="hidden sm:inline-block px-3 py-2 text-xs font-semibold text-[#527653] hover:text-[#26382D] hover:bg-[#EEF3EA] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {t('signIn')}
              </button>
              <button
                onClick={onOpenAuth}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#527653] hover:bg-[#26382D] rounded-xl transition-colors shadow-xs whitespace-nowrap shrink-0 cursor-pointer"
              >
                {t('getStarted')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

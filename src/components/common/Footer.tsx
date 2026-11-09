import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

export const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="w-full bg-[#FFFFFF] border-t border-[#E3EADF] py-14 px-6 mt-20">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex flex-col items-center md:items-start gap-2 text-center md:text-left">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-lg bg-gradient-to-tr from-[#A8C3A0] to-[#F4B183] p-[1px]">
              <div className="w-full h-full bg-[#FFFFFF] rounded-[6px] flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[#527653]" />
              </div>
            </div>
            <span className="text-base font-bold tracking-tight text-[#26382D] font-display">
              Aurora AI
            </span>
          </div>
          <p className="text-xs text-[#788579] max-w-sm leading-relaxed">
            {t('tagline')}. {t('heroSubtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-[#788579]">
          <a href="#about" className="hover:text-[#26382D] transition-colors">{t('aboutAurora')}</a>
          <a href="#agents" className="hover:text-[#26382D] transition-colors">{t('exploreAgents')}</a>
          <a href="#languages" className="hover:text-[#26382D] transition-colors">{t('supportedLanguages')}</a>
          <span className="hover:text-[#26382D] transition-colors cursor-pointer">{t('privacy')}</span>
          <span className="hover:text-[#26382D] transition-colors cursor-pointer">{t('terms')}</span>
          <span className="hover:text-[#26382D] transition-colors cursor-pointer">{t('contact')}</span>
        </div>

        <div className="text-xs text-[#899287] text-center md:text-right">
          <p>© 2026 Aurora AI. {t('allRightsReserved')}</p>
          <p className="mt-1 text-[11px] text-[#A8C3A0]">
            English · Telugu · Hindi · Tamil · Kannada · Malayalam · Bengali · Marathi · Gujarati · Punjabi
          </p>
        </div>
      </div>
    </footer>
  );
};

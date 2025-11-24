'use client';

import { WalletButton } from './WalletButton';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTranslation } from '@/lib/translations';
import { Globe } from 'lucide-react';
import { useState } from 'react';

export function Header() {
  const { language, setLanguage } = useLanguage();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const t = (key: keyof typeof import('@/lib/translations').translations.en) => getTranslation(language, key);

  return (
    <header className="w-full border-b border-gray-800 bg-gray-900">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-1 sm:gap-2">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white">{t('appName')}</h1>
          <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold bg-blue-600 text-white rounded">
            {t('testnet')}
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
              title={t('language')}
            >
              <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm hidden sm:inline">{language.toUpperCase()}</span>
            </button>
            {showLangMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowLangMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-40 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-20">
                  <button
                    onClick={() => {
                      setLanguage('en');
                      setShowLangMenu(false);
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-700 rounded-t-lg transition-colors ${
                      language === 'en' ? 'bg-gray-700' : ''
                    }`}
                  >
                    {t('english')}
                  </button>
                  <button
                    onClick={() => {
                      setLanguage('tr');
                      setShowLangMenu(false);
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-700 rounded-b-lg transition-colors ${
                      language === 'tr' ? 'bg-gray-700' : ''
                    }`}
                  >
                    {t('turkish')}
                  </button>
                </div>
              </>
            )}
          </div>
          <WalletButton />
        </div>
      </div>
    </header>
  );
}


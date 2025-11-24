'use client';

import { ConnectButton, useWallets, useCurrentAccount, useConnectWallet } from '@mysten/dapp-kit';
import { useEffect, useState, useMemo } from 'react';
import { Smartphone, Plug } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTranslation } from '@/lib/translations';

// Detect if running on mobile device
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || (window.innerWidth <= 768);
}

export function WalletButton() {
  const allWallets = useWallets();
  const currentAccount = useCurrentAccount();
  const { mutate: connectWallet } = useConnectWallet();
  const { language } = useLanguage();
  const t = (key: keyof typeof import('@/lib/translations').translations.en) => getTranslation(language, key);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  
  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);
  
  // Separate mobile and extension wallets
  const mobileWallets = useMemo(() => {
    return allWallets.filter(wallet => !wallet.installed);
  }, [allWallets]);
  
  const extensionWallets = useMemo(() => {
    return allWallets.filter(wallet => wallet.installed);
  }, [allWallets]);
  
  // Log available wallets for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('=== Wallet Detection Debug ===');
      console.log('Total wallets detected:', allWallets.length);
      console.log('Mobile wallets:', mobileWallets.length);
      console.log('Extension wallets:', extensionWallets.length);
      console.log('Is mobile device:', isMobile);
      console.log('User agent:', navigator.userAgent);
      console.log('Window.sui exists:', !!(window as any).sui);
      console.log('Navigator.wallet exists:', !!(navigator as any).wallet);
      
      if (allWallets.length > 0) {
        console.log('All wallets details:', allWallets.map(w => ({
          name: w.name,
          installed: w.installed,
          accounts: w.accounts.length,
          features: w.features
        })));
      } else {
        console.warn('⚠️ No wallets detected!');
        console.warn('This could mean:');
        console.warn('1. No Sui-compatible wallet is installed');
        console.warn('2. Wallet discovery is still in progress (wait a few seconds)');
        console.warn('3. Wallet Standard is not supported');
        console.warn('');
        console.warn('For mobile: Make sure Slush, Suiet, or Sui Wallet is installed');
        console.warn('Try refreshing the page or opening from within the wallet app');
      }
    }
  }, [allWallets, mobileWallets, extensionWallets, isMobile]);

  // If connected, show connected state
  if (currentAccount) {
    return <ConnectButton />;
  }

  return (
    <div className="flex items-center gap-2">
      {/* Mobile Wallet Button - Only show on mobile devices */}
      {isMobile && (
        <div className="relative">
          <button
            onClick={() => {
              setShowMobileModal(true);
            }}
            className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors text-xs sm:text-sm font-semibold"
            title={language === 'tr' ? 'Mobil Cüzdan Bağla' : 'Connect Mobile Wallet'}
          >
            <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">{language === 'tr' ? 'Mobil' : 'Mobile'}</span>
          </button>
          {showMobileModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowMobileModal(false)}>
              <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-blue-400" />
                  {language === 'tr' ? 'Mobil Cüzdan Bağla' : 'Connect Mobile Wallet'}
                </h3>
                <div className="space-y-2 mb-4">
                  {mobileWallets.length > 0 ? (
                    mobileWallets.map((wallet) => (
                      <button
                        key={wallet.name}
                        onClick={() => {
                          connectWallet(
                            { wallet },
                            {
                              onSuccess: () => {
                                setShowMobileModal(false);
                              },
                              onError: (err) => {
                                console.error('Connection error:', err);
                              },
                            }
                          );
                        }}
                        className="w-full flex items-center gap-3 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                      >
                        {wallet.icon && <img src={wallet.icon} alt={wallet.name} className="w-6 h-6" />}
                        <span className="font-semibold">{wallet.name}</span>
                      </button>
                    ))
                  ) : (
                    <div className="space-y-3">
                      <p className="text-gray-400 text-sm">
                        {language === 'tr' 
                          ? 'Mobil cüzdan bulunamadı.'
                          : 'No mobile wallets found.'}
                      </p>
                      <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-3">
                        <p className="text-blue-400 text-xs font-semibold mb-2">
                          {language === 'tr' ? 'Nasıl Bağlanır?' : 'How to Connect?'}
                        </p>
                        <ol className="text-xs text-gray-300 space-y-1 list-decimal list-inside">
                          <li>
                            {language === 'tr' 
                              ? 'Slush, Suiet veya Sui Wallet uygulamasını yükleyin'
                              : 'Install Slush, Suiet, or Sui Wallet app'}
                          </li>
                          <li>
                            {language === 'tr' 
                              ? 'Cüzdan uygulamasını açın ve içindeki tarayıcıyı kullanın'
                              : 'Open the wallet app and use its built-in browser'}
                          </li>
                          <li>
                            {language === 'tr' 
                              ? 'Bu sayfayı cüzdan uygulamasının tarayıcısından açın'
                              : 'Open this page from within the wallet app\'s browser'}
                          </li>
                        </ol>
                      </div>
                      <p className="text-gray-500 text-xs">
                        {language === 'tr' 
                          ? '💡 İpucu: Normal tarayıcıdan açmak yerine, cüzdan uygulamasının içindeki tarayıcıyı kullanın.'
                          : '💡 Tip: Use the wallet app\'s built-in browser instead of a regular browser.'}
                      </p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowMobileModal(false)}
                  className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors"
                >
                  {language === 'tr' ? 'İptal' : 'Cancel'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Extension Wallet Button - Only show on desktop */}
      {!isMobile && (
        <div className="relative">
          <button
            onClick={() => setShowExtensionModal(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors text-xs sm:text-sm font-semibold"
            title={language === 'tr' ? 'Extension Cüzdan Bağla' : 'Connect Extension Wallet'}
          >
            <Plug className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">{language === 'tr' ? 'Extension' : 'Extension'}</span>
          </button>
          {showExtensionModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowExtensionModal(false)}>
              <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Plug className="w-5 h-5 text-purple-400" />
                  {language === 'tr' ? 'Extension Cüzdan Bağla' : 'Connect Extension Wallet'}
                </h3>
                <div className="space-y-2 mb-4">
                  {extensionWallets.length > 0 ? (
                    extensionWallets.map((wallet) => (
                      <button
                        key={wallet.name}
                        onClick={() => {
                          connectWallet(
                            { wallet },
                            {
                              onSuccess: () => {
                                setShowExtensionModal(false);
                              },
                              onError: (err) => {
                                console.error('Connection error:', err);
                              },
                            }
                          );
                        }}
                        className="w-full flex items-center gap-3 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                      >
                        {wallet.icon && <img src={wallet.icon} alt={wallet.name} className="w-6 h-6" />}
                        <span className="font-semibold">{wallet.name}</span>
                      </button>
                    ))
                  ) : (
                    <p className="text-gray-400 text-sm">
                      {language === 'tr' 
                        ? 'Extension cüzdan bulunamadı. Tarayıcı extension cüzdanı yükleyin.'
                        : 'No extension wallets found. Please install a browser extension wallet.'}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowExtensionModal(false)}
                  className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors"
                >
                  {language === 'tr' ? 'İptal' : 'Cancel'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fallback: If no wallets detected on desktop, show default ConnectButton */}
      {!isMobile && allWallets.length === 0 && (
        <ConnectButton />
      )}
    </div>
  );
}

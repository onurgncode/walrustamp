'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { ReactNode, useState, useEffect } from 'react';
import { LanguageProvider } from '@/contexts/LanguageContext';

const networks = {
  testnet: { url: 'https://fullnode.testnet.sui.io:443' },
};

// Detect if running on mobile device
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || (window.innerWidth <= 768);
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks} defaultNetwork="testnet">
        <WalletProvider 
          storageKey="walrus-stamp-wallet"
          enableMobileWallet={true}
          autoConnect={false}
        >
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

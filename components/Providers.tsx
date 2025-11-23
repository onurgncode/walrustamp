'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { ReactNode, useState, useEffect } from 'react';

// Configure the network to connect to the Sui testnet
// Using testnet URL directly: https://fullnode.testnet.sui.io:443
const networks = {
  testnet: { url: 'https://fullnode.testnet.sui.io:443' },
};

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

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Always render providers, but conditionally render WalletProvider to prevent SSR localStorage issues
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks} defaultNetwork="testnet">
        {mounted ? (
          <WalletProvider autoConnect storageKey="walrus-stamp-wallet">
            {children}
          </WalletProvider>
        ) : (
          <div suppressHydrationWarning>{children}</div>
        )}
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

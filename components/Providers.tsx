'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { ReactNode, useState } from 'react';

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

  // Since this component is dynamically imported with ssr: false,
  // we can safely use WalletProvider without mounted check
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks} defaultNetwork="testnet">
        <WalletProvider autoConnect storageKey="walrus-stamp-wallet">
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

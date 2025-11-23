'use client';

import { ConnectButton, useCurrentWallet } from '@mysten/dapp-kit';
import { Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';

export function WalletButton() {
  const [mounted, setMounted] = useState(false);
  
  // Always call hooks, but they will return null if WalletProvider context is not available
  const currentWallet = useCurrentWallet();
  const isConnected = currentWallet !== null;

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex items-center gap-4">
      {mounted && isConnected && currentWallet && (
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <Wallet className="w-4 h-4" />
          <span className="text-sm font-medium">
            {currentWallet.name}
          </span>
        </div>
      )}
      {mounted ? <ConnectButton /> : <div className="w-32 h-10" />}
    </div>
  );
}


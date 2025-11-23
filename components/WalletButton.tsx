'use client';

import { ConnectButton, useCurrentWallet } from '@mysten/dapp-kit';
import { Wallet } from 'lucide-react';

export function WalletButton() {
  // useCurrentWallet will return null if WalletProvider context is not available
  // This is safe and won't throw an error
  const currentWallet = useCurrentWallet();
  const isConnected = currentWallet !== null;

  return (
    <div className="flex items-center gap-4">
      {isConnected && currentWallet && (
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <Wallet className="w-4 h-4" />
          <span className="text-sm font-medium">
            {currentWallet.name}
          </span>
        </div>
      )}
      <ConnectButton />
    </div>
  );
}


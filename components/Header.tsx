'use client';

import { ConnectButton } from '@mysten/dapp-kit';

export function Header() {
  return (
    <header className="w-full border-b border-gray-800 bg-gray-900">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-white">WalrusStamp</h1>
          <span className="px-2 py-1 text-xs font-semibold bg-blue-600 text-white rounded">
            Testnet
          </span>
        </div>
        <ConnectButton />
      </div>
    </header>
  );
}


# 🦭 WalrusStamp

**Decentralized File Certification on Sui Blockchain**

A modern dApp that combines Walrus decentralized storage with Sui blockchain to provide permanent, verifiable file certification. Upload files, store them on Walrus, and stamp their metadata on-chain for immutable proof of existence.

## 🚀 What It Does

WalrusStamp allows users to:
- **Upload files** to Walrus decentralized storage network
- **Calculate SHA-256 hash** for file integrity verification
- **Stamp metadata on Sui blockchain** (blobId, fileHash, fileName) for permanent record
- **Verify authenticity** via on-chain transaction digests

## ✨ Key Features

- 📤 Drag & drop file upload
- 🔐 SHA-256 hash calculation (client-side)
- 🦭 Walrus Testnet storage integration
- 🔗 Sui blockchain certification via Move contracts
- 💼 Sui wallet integration (`@mysten/dapp-kit`)
- 🎨 Modern dark mode UI

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Blockchain**: Sui (Testnet)
- **Storage**: Walrus Testnet
- **Wallet**: `@mysten/dapp-kit`
- **Smart Contract**: Move (Sui)

## 📦 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

### Environment Variables

Create `.env.local`:
```env
NEXT_PUBLIC_SUI_PACKAGE_ID=0x7c1a7e8776126c07a4dabfb1ac02a11740018ea6d310cb4a784f6d43b4e9e73c
```

## 🎯 How It Works

1. **Connect Wallet** → Link your Sui wallet
2. **Select File** → Drag & drop or browse
3. **Calculate Hash** → SHA-256 hash computed in browser
4. **Upload to Walrus** → File stored on Walrus Testnet, receive Blob ID
5. **Stamp on Sui** → Metadata recorded on-chain via Move contract

## 📁 Project Structure

```
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main page wrapper
│   ├── page-client.tsx     # Client-side main component
│   └── globals.css         # Global styles
├── components/
│   ├── Header.tsx          # App header with wallet button
│   ├── Providers.tsx       # Sui/Wallet providers
│   └── WalletButton.tsx    # Wallet connection component
└── contracts/
    └── walrus_stamp/       # Sui Move contract
        └── sources/
            └── walrus_stamp.move
```

## 🔗 Links

- **Live Demo**: [Vercel Deployment]
- **Sui Testnet Explorer**: https://suiscan.xyz/testnet
- **Walrus Testnet**: https://aggregator.walrus-testnet.walrus.space

## 📝 License

MIT

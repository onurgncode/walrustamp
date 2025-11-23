# WalrusStamp

A Sui x Walrus dApp built with Next.js 14, TypeScript, and Tailwind CSS. Upload files to Walrus storage and stamp them on the Sui blockchain for permanent verification.

## Features

- 📤 **File Upload**: Drag and drop file upload with SHA-256 hash calculation
- 🦭 **Walrus Storage**: Upload files to Walrus Testnet storage
- 🔗 **Sui Blockchain**: Stamp file metadata on Sui blockchain using Move contracts
- 💼 **Wallet Integration**: Connect Sui wallets using `@mysten/dapp-kit`
- 🎨 **Modern UI**: Dark mode interface with Lucide icons

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Blockchain**: Sui (Testnet)
- **Storage**: Walrus Testnet
- **Wallet**: `@mysten/dapp-kit`
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Sui Wallet (for blockchain interactions)

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUI_PACKAGE_ID=0x7c1a7e8776126c07a4dabfb1ac02a11740018ea6d310cb4a784f6d43b4e9e73c
```

## Deployment

### Vercel

This project is configured for Vercel deployment:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Walrus Sites (Alternative)

For decentralized hosting on Walrus Sites, see the deployment guide.

## Usage

1. **Connect Wallet**: Click "Connect Wallet" to connect your Sui wallet
2. **Upload File**: Drag and drop or select a file
3. **Calculate Hash**: File hash is automatically calculated using SHA-256
4. **Upload to Walrus**: Click "Upload to Walrus" to store the file
5. **Stamp on Sui**: Click "Stamp on Sui Network" to record metadata on-chain

## Project Structure

```
├── app/
│   ├── layout.tsx      # Root layout with providers
│   ├── page.tsx        # Main application page
│   └── globals.css     # Global styles
├── components/
│   ├── Header.tsx      # App header
│   ├── Providers.tsx   # Sui/Wallet providers
│   └── WalletButton.tsx # Wallet connection button
├── contracts/
│   └── walrus_stamp/   # Sui Move contract
└── public/             # Static assets
```

## License

MIT


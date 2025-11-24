export type Language = 'en' | 'tr';

export const translations = {
  en: {
    // Header
    appName: 'WalrusStamp',
    testnet: 'Testnet',
    
    // Main page
    title: 'Certify Your Files',
    subtitle: 'Upload files to Walrus and stamp them on the Sui blockchain for permanent verification',
    
    // File upload
    dragDrop: 'Drag and drop a file here',
    clickBrowse: 'or click to browse',
    calculatingHash: 'Calculating file hash...',
    hashWaitMessage: 'Please wait, this might take a moment for large files.',
    removeFile: 'Remove file',
    
    // Actions
    uploadToWalrus: 'Upload to Walrus',
    stampOnSui: 'Stamp on Sui Network',
    uploadAndStamp: 'Upload to Walrus & Stamp on Sui',
    connectWallet: 'Please connect your wallet to stamp on Sui',
    
    // Status messages
    uploading: 'Uploading to Walrus...',
    uploadingDesc: 'Your file is being securely uploaded to the Walrus network.',
    stamping: 'Stamping on Sui Network...',
    stampingDesc: 'Please confirm the transaction in your Sui Wallet to complete the stamping process.',
    
    // Success
    certified: 'Certified!',
    successMessage: 'Your file has been successfully stamped on the Sui Network.',
    certifyAnother: 'Certify Another File',
    shareOnX: 'Share on X (Twitter)',
    
    // File info
    fileName: 'File Name',
    fileHash: 'File Hash (SHA-256)',
    blobId: 'Blob ID',
    transactionDigest: 'Transaction Digest',
    downloadWithType: 'Download with correct Content-Type',
    
    // Errors
    selectFileFirst: 'Please select a file first',
    fileTooLarge: 'File is too large',
    maxSize: 'Maximum size is 50MB',
    uploadFailed: 'Upload failed',
    transactionFailed: 'Transaction failed',
    hashFailed: 'Failed to calculate file hash',
    notReady: 'File, hash, or wallet not ready for stamping.',
    
    // Info sections
    whatIsThis: 'What is WalrusStamp?',
    whatIsThisDesc: 'WalrusStamp is a decentralized file certification platform that combines Walrus decentralized storage with Sui blockchain. Upload your files, store them permanently on Walrus, and get an immutable proof of existence on the Sui blockchain.',
    
    howItWorks: 'How It Works',
    step1: '1. Connect your Sui wallet',
    step2: '2. Select or drag & drop a file',
    step3: '3. File hash is calculated automatically',
    step4: '4. Upload to Walrus decentralized storage',
    step5: '5. Stamp metadata on Sui blockchain',
    
    whyStamp: 'Why Stamp Files?',
    whyStampDesc: 'Stamping files on the blockchain provides permanent, verifiable proof of file existence at a specific point in time. This is useful for:',
    useCase1: '• Intellectual property protection',
    useCase2: '• Document timestamping',
    useCase3: '• Content authenticity verification',
    useCase4: '• Legal proof of file existence',
    
    supportedFiles: 'Supported Files',
    supportedFilesDesc: 'You can upload any type of file (images, documents, videos, etc.) up to 50MB. The file will be stored on Walrus and its metadata will be permanently recorded on Sui blockchain.',
    
    // Faucet
    getTestnetSui: 'Get Testnet SUI',
    faucetDescription: 'Need SUI tokens for transactions? Get free testnet tokens from the faucet.',
    claimTokens: 'Claim Tokens',
    
    // Language
    language: 'Language',
    turkish: 'Türkçe',
    english: 'English',
  },
  tr: {
    // Header
    appName: 'WalrusStamp',
    testnet: 'Testnet',
    
    // Main page
    title: 'Dosyalarınızı Sertifikalandırın',
    subtitle: 'Dosyalarınızı Walrus\'a yükleyin ve Sui blockchain\'inde kalıcı doğrulama için damgalayın',
    
    // File upload
    dragDrop: 'Bir dosyayı buraya sürükleyip bırakın',
    clickBrowse: 'veya gözatmak için tıklayın',
    calculatingHash: 'Dosya hash\'i hesaplanıyor...',
    hashWaitMessage: 'Lütfen bekleyin, büyük dosyalar için biraz zaman alabilir.',
    removeFile: 'Dosyayı kaldır',
    
    // Actions
    uploadToWalrus: 'Walrus\'a Yükle',
    stampOnSui: 'Sui Ağında Damgala',
    uploadAndStamp: 'Walrus\'a Yükle ve Sui\'de Damgala',
    connectWallet: 'Sui\'de damgalamak için lütfen cüzdanınızı bağlayın',
    
    // Status messages
    uploading: 'Walrus\'a yükleniyor...',
    uploadingDesc: 'Dosyanız güvenli bir şekilde Walrus ağına yükleniyor.',
    stamping: 'Sui Ağında damgalanıyor...',
    stampingDesc: 'Damgalama işlemini tamamlamak için lütfen Sui Cüzdanınızda işlemi onaylayın.',
    
    // Success
    certified: 'Sertifikalandırıldı!',
    successMessage: 'Dosyanız başarıyla Sui Ağında damgalandı.',
    certifyAnother: 'Başka Bir Dosya Sertifikalandır',
    shareOnX: 'X (Twitter)\'da Paylaş',
    
    // File info
    fileName: 'Dosya Adı',
    fileHash: 'Dosya Hash\'i (SHA-256)',
    blobId: 'Blob ID',
    transactionDigest: 'İşlem Özeti',
    downloadWithType: 'Doğru Content-Type ile İndir',
    
    // Errors
    selectFileFirst: 'Lütfen önce bir dosya seçin',
    fileTooLarge: 'Dosya çok büyük',
    maxSize: 'Maksimum boyut 50MB',
    uploadFailed: 'Yükleme başarısız',
    transactionFailed: 'İşlem başarısız',
    hashFailed: 'Dosya hash\'i hesaplanamadı',
    notReady: 'Dosya, hash veya cüzdan damgalama için hazır değil.',
    
    // Info sections
    whatIsThis: 'WalrusStamp Nedir?',
    whatIsThisDesc: 'WalrusStamp, Walrus merkeziyetsiz depolama ile Sui blockchain\'ini birleştiren bir merkeziyetsiz dosya sertifikasyon platformudur. Dosyalarınızı yükleyin, Walrus\'ta kalıcı olarak saklayın ve Sui blockchain\'inde değiştirilemez bir varlık kanıtı alın.',
    
    howItWorks: 'Nasıl Çalışır?',
    step1: '1. Sui cüzdanınızı bağlayın',
    step2: '2. Bir dosya seçin veya sürükleyip bırakın',
    step3: '3. Dosya hash\'i otomatik olarak hesaplanır',
    step4: '4. Walrus merkeziyetsiz depolamaya yükleyin',
    step5: '5. Metadata\'yı Sui blockchain\'inde damgalayın',
    
    whyStamp: 'Neden Dosya Damgalamak?',
    whyStampDesc: 'Dosyaları blockchain\'de damgalamak, belirli bir zamanda dosya varlığının kalıcı, doğrulanabilir kanıtını sağlar. Bu şunlar için yararlıdır:',
    useCase1: '• Fikri mülkiyet koruması',
    useCase2: '• Belge zaman damgası',
    useCase3: '• İçerik orijinallik doğrulaması',
    useCase4: '• Dosya varlığının yasal kanıtı',
    
    supportedFiles: 'Desteklenen Dosyalar',
    supportedFilesDesc: '50MB\'a kadar her türlü dosyayı (resimler, belgeler, videolar vb.) yükleyebilirsiniz. Dosya Walrus\'ta saklanacak ve metadata\'sı Sui blockchain\'inde kalıcı olarak kaydedilecektir.',
    
    // Faucet
    getTestnetSui: 'Testnet SUI Al',
    faucetDescription: 'İşlemler için SUI token\'larına mı ihtiyacınız var? Faucet\'ten ücretsiz testnet token\'ları alın.',
    claimTokens: 'Token Al',
    
    // Language
    language: 'Dil',
    turkish: 'Türkçe',
    english: 'English',
  },
};

export function getTranslation(lang: Language, key: keyof typeof translations.en): string {
  return translations[lang][key] || translations.en[key];
}


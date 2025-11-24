'use client';

import { useState, useCallback, useEffect } from 'react';
import { Header } from '@/components/Header';
import { useCurrentAccount, useSignAndExecuteTransactionBlock } from '@mysten/dapp-kit';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTranslation } from '@/lib/translations';
import { 
  Upload, 
  File, 
  CheckCircle2, 
  Loader2, 
  ExternalLink,
  Hash,
  Link as LinkIcon,
  X,
  Twitter,
  Info,
  Coins,
  XCircle,
  Share2,
  Mail
} from 'lucide-react';

type UploadState = 'idle' | 'hashing' | 'uploading' | 'stamping' | 'success' | 'error';

interface SuccessData {
  fileName: string;
  blobId: string;
  fileHash: string;
  transactionDigest: string;
}

export default function Home() {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute, isPending: isTransactionPending } = useSignAndExecuteTransactionBlock();
  const { language } = useLanguage();
  const t = useCallback((key: keyof typeof import('@/lib/translations').translations.en) => getTranslation(language, key), [language]);
  
  const [file, setFile] = useState<File | null>(null);
  const [fileHash, setFileHash] = useState<string>('');
  const [blobId, setBlobId] = useState<string>('');
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [error, setError] = useState<string>('');
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileType, setFileType] = useState<string>('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [autoUploadAndStamp, setAutoUploadAndStamp] = useState(false);

  // Calculate SHA-256 hash
  const calculateHash = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Handle file selection
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setFileHash('');
    setBlobId('');
    setFileType(selectedFile.type || 'application/octet-stream');
    setUploadState('hashing');
    setError('');
    setSuccessData(null);
    setAutoUploadAndStamp(false);

    try {
      const hash = await calculateHash(selectedFile);
      setFileHash(hash);
      setUploadState('idle');
    } catch (err) {
      setError(t('hashFailed'));
      setUploadState('error');
    }
  }, [t]);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  }, [handleFileSelect]);

  // Remove file handler
  const handleRemoveFile = useCallback(() => {
    setFile(null);
    setFileHash('');
    setBlobId('');
    setFileType('');
    setUploadState('idle');
    setError('');
    setSuccessData(null);
    setShowShareModal(false);
    setAutoUploadAndStamp(false);
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }, []);

  // Upload to Walrus
  const handleUploadToWalrus = async () => {
    if (!file) {
      setError(t('selectFileFirst'));
      return;
    }

    // Check file size (warn if > 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      setError(`${t('fileTooLarge')} (${(file.size / 1024 / 1024).toFixed(2)}MB). ${t('maxSize')}.`);
      return;
    }

    setUploadState('uploading');
    setError('');
    setBlobId('');

    try {
      console.log('Uploading file to Walrus...', file.name, 'Size:', (file.size / 1024 / 1024).toFixed(2), 'MB');

      const controller = new AbortController();
      // Increase timeout based on file size: 60 seconds base + 1 second per MB
      const timeoutDuration = 60000 + (file.size / 1024 / 1024) * 1000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

      const response = await fetch('https://publisher.walrus-testnet.walrus.space/v1/blobs', {
        method: 'PUT',
        body: file,
        signal: controller.signal,
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
      }).finally(() => clearTimeout(timeoutId));

      console.log('Response received, status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Could not read error response');
        console.error('Upload failed - Status:', response.status, 'Error:', errorText);
        throw new Error(`${t('uploadFailed')}: ${response.statusText} (${response.status}). ${errorText}`);
      }

      const data = await response.json().catch(async (e) => {
        const text = await response.text();
        console.error('Failed to parse JSON, response text:', text);
        throw new Error('Invalid JSON response: ' + text);
      });

      console.log('Upload response:', JSON.stringify(data, null, 2));

      const uploadedBlobId =
        data.newlyCreated?.blobObject?.blobId ||
        data.blobId ||
        data.id ||
        data.blob?.id;

      if (!uploadedBlobId) {
        console.error('Blob ID not found in response. Full response:', data);
        throw new Error('Blob ID not found in response. Response structure: ' + JSON.stringify(data, null, 2));
      }

      setBlobId(uploadedBlobId);
      setUploadState('idle');
      console.log('✅ Upload successful! Blob ID:', uploadedBlobId);

      // If auto mode is enabled, automatically proceed to stamp
      if (autoUploadAndStamp && currentAccount) {
        setTimeout(() => {
          handleStampOnSui();
        }, 500);
      }
    } catch (err) {
      console.error('❌ Upload error:', err);
      let errorMessage = t('uploadFailed');

      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          const fileSizeMB = file ? (file.size / 1024 / 1024).toFixed(2) : 'unknown';
          errorMessage = `Upload timeout - The file (${fileSizeMB}MB) took too long to upload. This might be due to network issues or the file being too large. Please try again with a smaller file or check your connection.`;
        } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          errorMessage = 'Network error - Could not connect to Walrus API. Please check your internet connection and try again.';
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
      setUploadState('error');
      setAutoUploadAndStamp(false);
    }
  };

  // Stamp on Sui Network
  const handleStampOnSui = async () => {
    if (!file || !fileHash || !currentAccount || !blobId) {
      setError(t('notReady'));
      return;
    }

    setUploadState('stamping');
    setError('');

    try {
      const txb = new TransactionBlock();
      txb.setGasBudget(10000000);

      const blobIdBytes = Array.from(new TextEncoder().encode(blobId));
      const fileHashBytes = Array.from(new TextEncoder().encode(fileHash));
      const fileNameBytes = Array.from(new TextEncoder().encode(file.name));

      const PACKAGE_ID = process.env.NEXT_PUBLIC_SUI_PACKAGE_ID || '0x7c1a7e8776126c07a4dabfb1ac02a11740018ea6d310cb4a784f6d43b4e9e73c';

      txb.moveCall({
        target: `${PACKAGE_ID}::walrus_stamp::stamp_file`,
        arguments: [
          txb.pure(blobIdBytes),
          txb.pure(fileHashBytes),
          txb.pure(fileNameBytes),
        ],
      });

      signAndExecute(
        {
          transactionBlock: txb,
          chain: 'sui:testnet',
        },
        {
          onSuccess: (result) => {
            setSuccessData({
              fileName: file.name,
              blobId: blobId,
              fileHash: fileHash,
              transactionDigest: result.digest,
            });
            setUploadState('success');
            setAutoUploadAndStamp(false);
            // Show share modal after a short delay
            setTimeout(() => {
              setShowShareModal(true);
            }, 1000);
            console.log('✅ Transaction successful! Digest:', result.digest);
          },
          onError: (err) => {
            console.error('❌ Transaction failed:', err);
            setError(err.message || t('transactionFailed'));
            setUploadState('error');
            setAutoUploadAndStamp(false);
          },
        }
      );
    } catch (err) {
      console.error('❌ Stamping error:', err);
      setError(err instanceof Error ? err.message : t('transactionFailed'));
      setUploadState('error');
      setAutoUploadAndStamp(false);
    }
  };

  // Combined upload and stamp
  const handleUploadAndStamp = async () => {
    if (!currentAccount) {
      setError(t('connectWallet'));
      return;
    }
    
    // Prevent multiple clicks
    if (uploadState === 'uploading' || uploadState === 'stamping' || uploadState === 'hashing') {
      return;
    }
    
    if (!file || !fileHash) {
      setError(t('selectFileFirst'));
      return;
    }

    // Check file size
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      setError(`${t('fileTooLarge')} (${(file.size / 1024 / 1024).toFixed(2)}MB). ${t('maxSize')}.`);
      return;
    }

    setAutoUploadAndStamp(true);
    setError('');
    
    // Step 1: Upload to Walrus
    setUploadState('uploading');
    setBlobId('');

    try {
      console.log('Uploading file to Walrus...', file.name, 'Size:', (file.size / 1024 / 1024).toFixed(2), 'MB');

      const controller = new AbortController();
      const timeoutDuration = 60000 + (file.size / 1024 / 1024) * 1000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

      const response = await fetch('https://publisher.walrus-testnet.walrus.space/v1/blobs', {
        method: 'PUT',
        body: file,
        signal: controller.signal,
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
      }).finally(() => clearTimeout(timeoutId));

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Could not read error response');
        throw new Error(`${t('uploadFailed')}: ${response.statusText} (${response.status}). ${errorText}`);
      }

      const data = await response.json().catch(async (e) => {
        const text = await response.text();
        throw new Error('Invalid JSON response: ' + text);
      });

      const uploadedBlobId =
        data.newlyCreated?.blobObject?.blobId ||
        data.blobId ||
        data.id ||
        data.blob?.id;

      if (!uploadedBlobId) {
        throw new Error('Blob ID not found in response');
      }

      setBlobId(uploadedBlobId);
      console.log('✅ Upload successful! Blob ID:', uploadedBlobId);

      // Step 2: Stamp on Sui (automatically continue)
      if (currentAccount) {
        setUploadState('stamping');
        
        const txb = new TransactionBlock();
        txb.setGasBudget(10000000);

        const blobIdBytes = Array.from(new TextEncoder().encode(uploadedBlobId));
        const fileHashBytes = Array.from(new TextEncoder().encode(fileHash));
        const fileNameBytes = Array.from(new TextEncoder().encode(file.name));

        const PACKAGE_ID = process.env.NEXT_PUBLIC_SUI_PACKAGE_ID || '0x7c1a7e8776126c07a4dabfb1ac02a11740018ea6d310cb4a784f6d43b4e9e73c';

        txb.moveCall({
          target: `${PACKAGE_ID}::walrus_stamp::stamp_file`,
          arguments: [
            txb.pure(blobIdBytes),
            txb.pure(fileHashBytes),
            txb.pure(fileNameBytes),
          ],
        });

        signAndExecute(
          {
            transactionBlock: txb,
            chain: 'sui:testnet',
          },
          {
            onSuccess: (result) => {
              setSuccessData({
                fileName: file.name,
                blobId: uploadedBlobId,
                fileHash: fileHash,
                transactionDigest: result.digest,
              });
              setUploadState('success');
              setAutoUploadAndStamp(false);
              setTimeout(() => {
                setShowShareModal(true);
              }, 1000);
              console.log('✅ Transaction successful! Digest:', result.digest);
            },
            onError: (err) => {
              console.error('❌ Transaction failed:', err);
              setError(err.message || t('transactionFailed'));
              setUploadState('error');
              setAutoUploadAndStamp(false);
            },
          }
        );
      }
    } catch (err) {
      console.error('❌ Upload error:', err);
      let errorMessage = t('uploadFailed');

      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          const fileSizeMB = file ? (file.size / 1024 / 1024).toFixed(2) : 'unknown';
          errorMessage = `Upload timeout - The file (${fileSizeMB}MB) took too long to upload. Please try again with a smaller file or check your connection.`;
        } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          errorMessage = 'Network error - Could not connect to Walrus API. Please check your internet connection and try again.';
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
      setUploadState('error');
      setAutoUploadAndStamp(false);
    }
  };

  // Get share text and URL
  const getShareText = () => {
    if (!successData) return '';
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const txUrl = `https://suiscan.xyz/testnet/tx/${successData.transactionDigest}`;
    
    return language === 'tr' 
      ? `Dosyamı WalrusStamp ile Sui blockchain'inde sertifikalandırdım! 🦭\n\n📄 ${successData.fileName}\n🔗 Transaction: ${txUrl}\n\n#Sui #Walrus #Blockchain`
      : `I just certified my file on Sui blockchain with WalrusStamp! 🦭\n\n📄 ${successData.fileName}\n🔗 Transaction: ${txUrl}\n\n#Sui #Walrus #Blockchain`;
  };

  const getShareUrl = () => {
    if (!successData) return '';
    return typeof window !== 'undefined' ? window.location.href : '';
  };

  // Share functions
  const handleShareOnX = () => {
    const text = getShareText();
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    setShowShareModal(false);
  };

  const handleShareOnFacebook = () => {
    const url = getShareUrl();
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank');
    setShowShareModal(false);
  };

  const handleShareOnLinkedIn = () => {
    const text = getShareText();
    const url = getShareUrl();
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank');
    setShowShareModal(false);
  };

  const handleShareOnWhatsApp = () => {
    const text = getShareText();
    const shareUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank');
    setShowShareModal(false);
  };

  const handleShareOnTelegram = () => {
    const text = getShareText();
    const shareUrl = `https://t.me/share/url?text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank');
    setShowShareModal(false);
  };

  const handleShareOnReddit = () => {
    const text = getShareText();
    const url = getShareUrl();
    const shareUrl = `https://reddit.com/submit?title=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank');
    setShowShareModal(false);
  };

  const handleShareViaEmail = () => {
    const text = getShareText();
    const subject = language === 'tr' ? 'WalrusStamp - Dosya Sertifikasyonu' : 'WalrusStamp - File Certification';
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    window.location.href = mailtoUrl;
    setShowShareModal(false);
  };

  // Native share API (for mobile)
  const handleNativeShare = async () => {
    if (navigator.share && successData) {
      try {
        await navigator.share({
          title: t('shareTitle'),
          text: getShareText(),
          url: getShareUrl(),
        });
        setShowShareModal(false);
      } catch (err) {
        // User cancelled or error occurred
        console.log('Share cancelled');
      }
    }
  };

  // Faucet handler
  const handleFaucet = () => {
    if (currentAccount?.address) {
      window.open(`https://faucet.sui.io/?address=${currentAccount.address}`, '_blank');
    } else {
      window.open('https://faucet.sui.io/', '_blank');
    }
  };

  const isHashing = uploadState === 'hashing';
  const isUploading = uploadState === 'uploading';
  const isStamping = uploadState === 'stamping' || isTransactionPending;
  const hasFile = file !== null && fileHash !== '';
  const canUpload = hasFile && (uploadState === 'idle' || uploadState === 'error');
  const canStamp = canUpload && currentAccount !== null && blobId !== '' && (uploadState === 'idle' || uploadState === 'error');
  const canUploadAndStamp = hasFile && currentAccount !== null;

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white">
      <Header />
      <main className="flex-1 container mx-auto px-3 sm:px-4 py-6 sm:py-8 lg:py-12 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8">
          {/* Left Info Panel - Hidden on mobile */}
          <div className="hidden lg:block lg:col-span-3 space-y-6">
            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-400" />
                {t('whatIsThis')}
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                {t('whatIsThisDesc')}
              </p>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <h3 className="text-xl font-bold mb-4">{t('howItWorks')}</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>{t('step1')}</li>
                <li>{t('step2')}</li>
                <li>{t('step3')}</li>
                <li>{t('step4')}</li>
                <li>{t('step5')}</li>
              </ul>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-6 space-y-4 sm:space-y-6 lg:space-y-8">
            {/* Title Section */}
            <div className="text-center space-y-2 sm:space-y-4">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">{t('title')}</h1>
              <p className="text-sm sm:text-base text-gray-400 px-2">
                {t('subtitle')}
              </p>
            </div>

            {/* Faucet Button */}
            {!currentAccount && (
              <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-yellow-400 mb-1 text-sm sm:text-base">{t('getTestnetSui')}</p>
                    <p className="text-xs sm:text-sm text-gray-300">{t('faucetDescription')}</p>
                  </div>
                  <button
                    onClick={handleFaucet}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-semibold transition-colors whitespace-nowrap text-sm sm:text-base"
                  >
                    <Coins className="w-4 h-4" />
                    {t('claimTokens')}
                  </button>
                </div>
              </div>
            )}

            {/* Upload Section */}
            {uploadState !== 'success' && (
              <div className="space-y-4 sm:space-y-6">
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`
                    relative border-2 border-dashed rounded-lg p-6 sm:p-8 lg:p-12 text-center transition-colors
                    ${isDragging
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700 hover:border-gray-600'
                    }
                    ${file ? 'border-green-500 bg-green-500/10' : ''}
                  `}
                >
                  <input
                    type="file"
                    id="file-input"
                    className="hidden"
                    onChange={handleFileInput}
                  />
                  <label htmlFor="file-input" className="cursor-pointer block w-full h-full absolute inset-0 z-10"></label>

                  {file && !isUploading && !isStamping && (
                    <button
                      onClick={handleRemoveFile}
                      className="absolute top-2 right-2 p-2 rounded-full bg-gray-700 hover:bg-gray-600 text-white z-20"
                      title={t('removeFile')}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  {isHashing ? (
                    <div className="space-y-3 sm:space-y-4">
                      <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 mx-auto animate-spin text-blue-500" />
                      <p className="text-sm sm:text-base text-gray-400">{t('calculatingHash')}</p>
                      <p className="text-xs sm:text-sm text-gray-500">{t('hashWaitMessage')}</p>
                    </div>
                  ) : file ? (
                    <div className="space-y-3 sm:space-y-4">
                      <File className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-green-500" />
                      <div>
                        <p className="font-semibold text-sm sm:text-base break-all px-2">{file.name}</p>
                        <p className="text-xs sm:text-sm text-gray-400">
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                      {fileHash && (
                        <div className="flex items-center justify-center gap-2 text-xs text-gray-500 px-2">
                          <Hash className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="font-mono break-all text-[10px] sm:text-xs">{fileHash}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
                      <Upload className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-500" />
                      <div>
                        <p className="font-semibold text-sm sm:text-base">{t('dragDrop')}</p>
                        <p className="text-xs sm:text-sm text-gray-400">{t('clickBrowse')}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Loading/Status Indicators */}
                {(isUploading || isStamping) && (
                  <div className="p-3 sm:p-4 bg-blue-500/20 border border-blue-500 rounded-lg text-center space-y-2">
                    <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 mx-auto animate-spin text-blue-400" />
                    <p className="font-semibold text-sm sm:text-base text-blue-300">
                      {isUploading 
                        ? (language === 'tr' ? 'Walrus\'a yükleniyor...' : 'Uploading to Walrus...')
                        : (language === 'tr' ? 'Sui blockchain\'inde damgalanıyor...' : 'Stamping on Sui blockchain...')
                      }
                    </p>
                    <p className="text-xs sm:text-sm text-blue-400 px-2">
                      {isUploading 
                        ? (language === 'tr' 
                          ? 'Dosyanız Walrus ağına yükleniyor. Lütfen bekleyin...'
                          : 'Your file is being uploaded to the Walrus network. Please wait...')
                        : (language === 'tr'
                          ? 'Lütfen mobil cüzdan uygulamanızda (Slush, Sui Wallet, vb.) işlemi onaylayın. Cüzdan uygulamanız otomatik olarak açılacaktır.'
                          : 'Please confirm the transaction in your mobile wallet app (Slush, Sui Wallet, etc.). Your wallet app will open automatically.')
                      }
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                {hasFile && !isUploading && !isStamping && (
                  <div className="space-y-3 sm:space-y-4">
                    {/* Single Upload & Stamp Button */}
                    <button
                      onClick={handleUploadAndStamp}
                      disabled={!currentAccount || isHashing}
                      className="w-full py-2.5 sm:py-3 px-4 sm:px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="text-center">{t('uploadAndStamp')}</span>
                    </button>

                    {!currentAccount && (
                      <p className="text-center text-yellow-500 text-xs sm:text-sm px-2">
                        {t('connectWallet')}
                      </p>
                    )}
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="p-3 sm:p-4 bg-red-500/20 border border-red-500 rounded-lg">
                    <p className="text-red-400 text-sm sm:text-base break-words">{error}</p>
                  </div>
                )}
              </div>
            )}

            {/* Success Card */}
            {uploadState === 'success' && successData && (
              <div className="p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-green-500/20 to-blue-500/20 border border-green-500/50 rounded-lg space-y-4 sm:space-y-6">
                <div className="text-center space-y-2 sm:space-y-4">
                  <CheckCircle2 className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-green-500" />
                  <h2 className="text-2xl sm:text-3xl font-bold">{t('certified')}</h2>
                  <p className="text-sm sm:text-base text-gray-300 px-2">{t('successMessage')}</p>
                </div>

                {/* Image Preview (if file is an image) */}
                {file && file.type.startsWith('image/') && (
                  <div className="flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={URL.createObjectURL(file)}
                      alt="Uploaded file preview"
                      className="max-w-full max-h-64 rounded-lg border border-gray-700"
                    />
                  </div>
                )}

                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-400 mb-1">{t('fileName')}</p>
                    <p className="font-semibold text-sm sm:text-base break-all">{successData.fileName}</p>
                  </div>

                  <div>
                    <p className="text-xs sm:text-sm text-gray-400 mb-1">{t('fileHash')}</p>
                    <div className="flex items-start gap-2">
                      <Hash className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <p className="font-mono text-xs sm:text-sm break-all">{successData.fileHash}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs sm:text-sm text-gray-400 mb-1">{t('blobId')}</p>
                    <div className="space-y-2">
                      <a
                        href={`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${successData.blobId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <LinkIcon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="font-mono text-xs sm:text-sm break-all">{successData.blobId}</span>
                        <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      </a>
                      <button
                        onClick={async () => {
                          try {
                            const response = await fetch(`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${successData.blobId}`);
                            const blob = await response.blob();
                            const detectedType = file?.type || fileType || 'application/octet-stream';
                            const url = window.URL.createObjectURL(new Blob([blob], { type: detectedType }));
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = successData.fileName;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                          } catch (err) {
                            console.error('Download error:', err);
                            setError('Failed to download file');
                          }
                        }}
                        className="text-xs sm:text-sm text-blue-400 hover:text-blue-300 transition-colors underline"
                      >
                        {t('downloadWithType')}
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs sm:text-sm text-gray-400 mb-1">{t('transactionDigest')}</p>
                    <a
                      href={`https://suiscan.xyz/testnet/tx/${successData.transactionDigest}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <LinkIcon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="font-mono text-xs sm:text-sm break-all">{successData.transactionDigest}</span>
                      <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    </a>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center items-stretch sm:items-center">
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="py-2 px-4 sm:px-5 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <Share2 className="w-4 h-4" />
                    {t('shareTitle')}
                  </button>
                  <button
                    onClick={handleRemoveFile}
                    className="py-2 px-4 sm:px-5 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    {t('certifyAnother')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Info Panel - Hidden on mobile */}
          <div className="hidden lg:block lg:col-span-3 space-y-6">
            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <h3 className="text-xl font-bold mb-4">{t('whyStamp')}</h3>
              <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                {t('whyStampDesc')}
              </p>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>{t('useCase1')}</li>
                <li>{t('useCase2')}</li>
                <li>{t('useCase3')}</li>
                <li>{t('useCase4')}</li>
              </ul>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <h3 className="text-xl font-bold mb-4">{t('supportedFiles')}</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                {t('supportedFilesDesc')}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Social Media Share Modal */}
      {showShareModal && successData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4" onClick={() => setShowShareModal(false)}>
          <div className="bg-gray-800 rounded-lg p-4 sm:p-6 max-w-lg w-full border border-gray-700" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <Share2 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                {t('shareTitle')}
              </h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
            <p className="text-sm sm:text-base text-gray-300 mb-4 sm:mb-6">
              {t('shareMessage')}
            </p>
            
            {/* Social Media Icons Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
              {/* X (Twitter) */}
              <button
                onClick={handleShareOnX}
                className="flex flex-col items-center justify-center gap-2 p-3 sm:p-4 bg-gray-700 hover:bg-blue-500 rounded-lg transition-colors group"
                title={t('shareOnX')}
              >
                <Twitter className="w-6 h-6 sm:w-8 sm:h-8 text-gray-300 group-hover:text-white" />
                <span className="text-xs sm:text-sm text-gray-300 group-hover:text-white font-medium">X</span>
              </button>

              {/* Facebook */}
              <button
                onClick={handleShareOnFacebook}
                className="flex flex-col items-center justify-center gap-2 p-3 sm:p-4 bg-gray-700 hover:bg-blue-600 rounded-lg transition-colors group"
                title={t('shareOnFacebook')}
              >
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-300 group-hover:text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span className="text-xs sm:text-sm text-gray-300 group-hover:text-white font-medium">Facebook</span>
              </button>

              {/* LinkedIn */}
              <button
                onClick={handleShareOnLinkedIn}
                className="flex flex-col items-center justify-center gap-2 p-3 sm:p-4 bg-gray-700 hover:bg-blue-700 rounded-lg transition-colors group"
                title={t('shareOnLinkedIn')}
              >
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-300 group-hover:text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                <span className="text-xs sm:text-sm text-gray-300 group-hover:text-white font-medium">LinkedIn</span>
              </button>

              {/* WhatsApp */}
              <button
                onClick={handleShareOnWhatsApp}
                className="flex flex-col items-center justify-center gap-2 p-3 sm:p-4 bg-gray-700 hover:bg-green-500 rounded-lg transition-colors group"
                title={t('shareOnWhatsApp')}
              >
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-300 group-hover:text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.77.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                <span className="text-xs sm:text-sm text-gray-300 group-hover:text-white font-medium">WhatsApp</span>
              </button>

              {/* Telegram */}
              <button
                onClick={handleShareOnTelegram}
                className="flex flex-col items-center justify-center gap-2 p-3 sm:p-4 bg-gray-700 hover:bg-blue-400 rounded-lg transition-colors group"
                title={t('shareOnTelegram')}
              >
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-300 group-hover:text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                <span className="text-xs sm:text-sm text-gray-300 group-hover:text-white font-medium">Telegram</span>
              </button>

              {/* Reddit */}
              <button
                onClick={handleShareOnReddit}
                className="flex flex-col items-center justify-center gap-2 p-3 sm:p-4 bg-gray-700 hover:bg-orange-500 rounded-lg transition-colors group"
                title={t('shareOnReddit')}
              >
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-300 group-hover:text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.753.786 1.753 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.785-1.754 1.753-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.33.33 0 0 0-.196.3c0 .2.162.361.361.361a.353.353 0 0 0 .33-.225c.01-.02.014-.04.014-.062 0-.2-.162-.361-.36-.361a.33.33 0 0 0-.149.027zm5.5 0a.33.33 0 0 0-.196.3c0 .2.162.361.361.361a.353.353 0 0 0 .33-.225c.01-.02.014-.04.014-.062 0-.2-.162-.361-.36-.361a.33.33 0 0 0-.149.027z"/>
                </svg>
                <span className="text-xs sm:text-sm text-gray-300 group-hover:text-white font-medium">Reddit</span>
              </button>

              {/* Email */}
              <button
                onClick={handleShareViaEmail}
                className="flex flex-col items-center justify-center gap-2 p-3 sm:p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors group"
                title={t('shareViaEmail')}
              >
                <Mail className="w-6 h-6 sm:w-8 sm:h-8 text-gray-300 group-hover:text-white" />
                <span className="text-xs sm:text-sm text-gray-300 group-hover:text-white font-medium">Email</span>
              </button>

              {/* Native Share (Mobile) */}
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  onClick={handleNativeShare}
                  className="flex flex-col items-center justify-center gap-2 p-3 sm:p-4 bg-gray-700 hover:bg-purple-500 rounded-lg transition-colors group"
                  title="Share"
                >
                  <Share2 className="w-6 h-6 sm:w-8 sm:h-8 text-gray-300 group-hover:text-white" />
                  <span className="text-xs sm:text-sm text-gray-300 group-hover:text-white font-medium">More</span>
                </button>
              )}
            </div>

            <button
              onClick={() => setShowShareModal(false)}
              className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors text-sm sm:text-base"
            >
              {language === 'tr' ? 'Kapat' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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
  XCircle
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
  const t = (key: keyof typeof import('@/lib/translations').translations.en) => getTranslation(language, key);
  
  const [file, setFile] = useState<File | null>(null);
  const [fileHash, setFileHash] = useState<string>('');
  const [blobId, setBlobId] = useState<string>('');
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [error, setError] = useState<string>('');
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileType, setFileType] = useState<string>('');
  const [showTwitterModal, setShowTwitterModal] = useState(false);
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
    setShowTwitterModal(false);
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
            // Show Twitter modal after a short delay
            setTimeout(() => {
              setShowTwitterModal(true);
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
                setShowTwitterModal(true);
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

  // Share on Twitter
  const handleShareOnTwitter = () => {
    if (!successData) return;
    
    const tweetText = language === 'tr' 
      ? `Dosyamı WalrusStamp ile Sui blockchain'inde sertifikalandırdım! 🦭\n\n📄 ${successData.fileName}\n🔗 Transaction: https://suiscan.xyz/testnet/tx/${successData.transactionDigest}\n\n#Sui #Walrus #Blockchain`
      : `I just certified my file on Sui blockchain with WalrusStamp! 🦭\n\n📄 ${successData.fileName}\n🔗 Transaction: https://suiscan.xyz/testnet/tx/${successData.transactionDigest}\n\n#Sui #Walrus #Blockchain`;
    
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(twitterUrl, '_blank');
    setShowTwitterModal(false);
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
                      disabled={!currentAccount || isHashing || uploadState === 'success'}
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
                    onClick={() => setShowTwitterModal(true)}
                    className="py-2 px-4 sm:px-5 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <Twitter className="w-4 h-4" />
                    {t('shareOnX')}
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

      {/* Twitter Share Modal */}
      {showTwitterModal && successData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-gray-800 rounded-lg p-4 sm:p-6 max-w-md w-full border border-gray-700">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <Twitter className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                {t('shareOnX')}
              </h3>
              <button
                onClick={() => setShowTwitterModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm sm:text-base text-gray-300 mb-4 sm:mb-6">
              {language === 'tr' 
                ? 'Dosyanızı başarıyla sertifikalandırdınız! X (Twitter)\'da paylaşmak ister misiniz?'
                : 'You\'ve successfully certified your file! Would you like to share it on X (Twitter)?'}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={handleShareOnTwitter}
                className="flex-1 py-2 px-4 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <Twitter className="w-4 h-4" />
                {t('shareOnX')}
              </button>
              <button
                onClick={() => setShowTwitterModal(false)}
                className="py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors text-sm sm:text-base"
              >
                {language === 'tr' ? 'Daha Sonra' : 'Later'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

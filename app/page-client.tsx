'use client';

import { useState, useCallback, useEffect } from 'react';
import { Header } from '@/components/Header';
import { useCurrentAccount, useSignAndExecuteTransactionBlock } from '@mysten/dapp-kit';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { 
  Upload, 
  File, 
  CheckCircle2, 
  Loader2, 
  ExternalLink,
  Hash,
  Link as LinkIcon,
  X
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
  
  const [file, setFile] = useState<File | null>(null);
  const [fileHash, setFileHash] = useState<string>('');
  const [blobId, setBlobId] = useState<string>('');
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [error, setError] = useState<string>('');
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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
    setUploadState('hashing');
    setError('');
    setSuccessData(null);

    try {
      const hash = await calculateHash(selectedFile);
      setFileHash(hash);
      setUploadState('idle');
    } catch (err) {
      setError('Failed to calculate file hash');
      setUploadState('error');
    }
  }, []);

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
    setUploadState('idle');
    setError('');
    setSuccessData(null);
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }, []);

  // Upload to Walrus
  const handleUploadToWalrus = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setUploadState('uploading');
    setError('');
    setBlobId('');

    try {
      console.log('Uploading file to Walrus...', file.name, 'Size:', file.size);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch('https://publisher.walrus-testnet.walrus.space/v1/blobs', {
        method: 'PUT',
        body: file,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      console.log('Response received, status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Could not read error response');
        console.error('Upload failed - Status:', response.status, 'Error:', errorText);
        throw new Error(`Upload failed: ${response.statusText} (${response.status}). ${errorText}`);
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
    } catch (err) {
      console.error('❌ Upload error:', err);
      let errorMessage = 'Upload failed';

      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMessage = 'Upload timeout - The request took too long. Please try again or check your connection.';
        } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          errorMessage = 'Network error - Could not connect to Walrus API. Please check your internet connection and try again.';
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
      setUploadState('error');
    }
  };

  // Stamp on Sui Network
  const handleStampOnSui = async () => {
    if (!file || !fileHash || !currentAccount || !blobId) {
      setError('File, hash, or wallet not ready for stamping.');
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
            console.log('✅ Transaction successful! Digest:', result.digest);
          },
          onError: (err) => {
            console.error('❌ Transaction failed:', err);
            setError(err.message || 'Transaction failed. Make sure the contract is deployed and PACKAGE_ID is set correctly.');
            setUploadState('error');
          },
        }
      );
    } catch (err) {
      console.error('❌ Stamping error:', err);
      setError(err instanceof Error ? err.message : 'Stamping failed');
      setUploadState('error');
    }
  };

  const isHashing = uploadState === 'hashing';
  const isUploading = uploadState === 'uploading';
  const isStamping = uploadState === 'stamping' || isTransactionPending;
  const canUpload = file !== null && fileHash !== '' && (uploadState === 'idle' || uploadState === 'error');
  const canStamp = canUpload && currentAccount !== null && blobId !== '' && (uploadState === 'idle' || uploadState === 'error');

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <div className="space-y-8">
          {/* Title Section */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">Certify Your Files</h1>
            <p className="text-gray-400">
              Upload files to Walrus and stamp them on the Sui blockchain for permanent verification
            </p>
          </div>

          {/* Upload Section */}
          {uploadState !== 'success' && (
            <div className="space-y-6">
              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  relative border-2 border-dashed rounded-lg p-12 text-center transition-colors
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
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                {isHashing ? (
                  <div className="space-y-4">
                    <Loader2 className="w-12 h-12 mx-auto animate-spin text-blue-500" />
                    <p className="text-gray-400">Calculating file hash...</p>
                    <p className="text-sm text-gray-500">Please wait, this might take a moment for large files.</p>
                  </div>
                ) : file ? (
                  <div className="space-y-4">
                    <File className="w-12 h-12 mx-auto text-green-500" />
                    <div>
                      <p className="font-semibold">{file.name}</p>
                      <p className="text-sm text-gray-400">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    {fileHash && (
                      <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                        <Hash className="w-4 h-4" />
                        <span className="font-mono break-all">{fileHash}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="w-12 h-12 mx-auto text-gray-500" />
                    <div>
                      <p className="font-semibold">Drag and drop a file here</p>
                      <p className="text-sm text-gray-400">or click to browse</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Loading/Status Indicators */}
              {(isUploading || isStamping) && (
                <div className="p-4 bg-blue-500/20 border border-blue-500 rounded-lg text-center space-y-2">
                  <Loader2 className="w-8 h-8 mx-auto animate-spin text-blue-400" />
                  <p className="font-semibold text-blue-300">
                    {isUploading ? 'Uploading to Walrus...' : 'Stamping on Sui Network...'}
                  </p>
                  <p className="text-sm text-blue-400">
                    {isUploading
                      ? 'Your file is being securely uploaded to the Walrus network.'
                      : 'Please confirm the transaction in your Sui Wallet to complete the stamping process.'
                    }
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              {!isUploading && !isStamping && canUpload && (
                <div className="space-y-4">
                  <button
                    onClick={handleUploadToWalrus}
                    disabled={!currentAccount}
                    className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <Upload className="w-5 h-5" />
                    Upload to Walrus
                  </button>

                  {blobId && (
                    <button
                      onClick={handleStampOnSui}
                      disabled={!currentAccount}
                      className="w-full py-3 px-6 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      Stamp on Sui Network
                    </button>
                  )}

                  {!currentAccount && (
                    <p className="text-center text-yellow-500 text-sm">
                      Please connect your wallet to stamp on Sui
                    </p>
                  )}
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg">
                  <p className="text-red-400">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Success Card */}
          {uploadState === 'success' && successData && (
            <div className="p-8 bg-gradient-to-br from-green-500/20 to-blue-500/20 border border-green-500/50 rounded-lg space-y-6">
              <div className="text-center space-y-4">
                <CheckCircle2 className="w-16 h-16 mx-auto text-green-500" />
                <h2 className="text-3xl font-bold">Certified!</h2>
                <p className="text-gray-300">Your file has been successfully stamped on the Sui Network.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">File Name</p>
                  <p className="font-semibold">{successData.fileName}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-400 mb-1">File Hash (SHA-256)</p>
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-gray-500" />
                    <p className="font-mono text-sm break-all">{successData.fileHash}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-400 mb-1">Blob ID</p>
                  <a
                    href={`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${successData.blobId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <LinkIcon className="w-4 h-4" />
                    <span className="font-mono text-sm break-all">{successData.blobId}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                <div>
                  <p className="text-sm text-gray-400 mb-1">Transaction Digest</p>
                  <a
                    href={`https://suiscan.xyz/testnet/tx/${successData.transactionDigest}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <LinkIcon className="w-4 h-4" />
                    <span className="font-mono text-sm break-all">{successData.transactionDigest}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              <div className="text-center">
                <button
                  onClick={handleRemoveFile}
                  className="py-2 px-5 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 mx-auto"
                >
                  Certify Another File
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}


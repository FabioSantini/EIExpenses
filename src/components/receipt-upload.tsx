"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ocrService, type ReceiptOCRResult } from "@/services/ocr-service";
import {
  CameraIcon,
  ImageIcon,
  LoaderIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertCircleIcon,
  FileImageIcon
} from "lucide-react";

export interface ExtractedReceiptData {
  type?: string;
  amount?: number;
  date?: string;
  vendor?: string;
  description?: string;
  location?: string;
  confidence?: number;
  rawText?: string;
}

export interface ReceiptUploadResult {
  extractedData: ExtractedReceiptData;
  receiptUrl: string;
  fileName: string;
}

interface ReceiptUploadProps {
  onReceiptConfirmed: (result: ReceiptUploadResult) => void;
  onCancel: () => void;
  disabled?: boolean;
  userId?: string;
  expenseId?: string;
}

export function ReceiptUpload({ 
  onReceiptConfirmed, 
  onCancel, 
  disabled = false,
  userId = 'demo-user', // Default for development
  expenseId = `expense-${Date.now()}` // Generate if not provided
}: ReceiptUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ReceiptOCRResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setResult({
        success: false,
        error: "Please select a valid image file (JPEG, PNG, WebP)"
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setResult({
        success: false,
        error: "Image file is too large. Please select a file smaller than 10MB."
      });
      return;
    }

    setSelectedFile(file);
    setResult(null);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Start processing
    setIsProcessing(true);

    try {
      console.log("📸 Processing receipt:", file.name);
      const ocrResult = await ocrService.processReceiptWithFallback(file);

      setResult(ocrResult);

      if (ocrResult.success && ocrResult.data) {
        // Show confirmation instead of auto-apply
        setShowConfirmation(true);
      }
    } catch (error) {
      console.error("Receipt processing error:", error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCameraCapture = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const handleFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRetry = () => {
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleConfirmReceipt = async () => {
    if (!selectedFile || !result?.data) {
      console.error('No file or result data available for confirmation');
      return;
    }

    setIsUploading(true);

    try {
      console.log('📤 Uploading receipt to Azure Storage...');

      // Upload to Azure Blob Storage
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('userId', userId);
      formData.append('expenseId', expenseId);

      const uploadResponse = await fetch('/api/receipts/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadResult = await uploadResponse.json();

      if (!uploadResponse.ok || !uploadResult.success) {
        throw new Error(uploadResult.error || 'Failed to upload receipt');
      }

      console.log('✅ Receipt uploaded successfully:', uploadResult.data.blobUrl);

      // Call the success callback with both data and receipt URL
      onReceiptConfirmed({
        extractedData: result.data,
        receiptUrl: uploadResult.data.blobUrl,
        fileName: selectedFile.name
      });

    } catch (error) {
      console.error('❌ Receipt upload failed:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload receipt'
      });
      setShowConfirmation(false);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRejectReceipt = () => {
    setShowConfirmation(false);
    setResult(null);
    // Keep the file selected so user can retry
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResult(null);
    setIsProcessing(false);
    setIsUploading(false);
    setShowConfirmation(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    // Reset file inputs
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-100 text-green-800";
    if (confidence >= 0.6) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return "High";
    if (confidence >= 0.6) return "Medium";
    return "Low";
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header with close button */}
          <div className="relative">
            <button
              onClick={onCancel}
              className="absolute right-0 top-0 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <XCircleIcon className="w-5 h-5 text-gray-500" />
            </button>
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Receipt Scanner</h3>
              <p className="text-sm text-gray-600">
                Upload or capture a receipt image to automatically extract expense details
              </p>
            </div>
          </div>

          {/* Upload buttons */}
          {!selectedFile && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={handleCameraCapture}
                  disabled={disabled || isProcessing}
                  className="h-20 flex-col space-y-2"
                  variant="outline"
                >
                  <CameraIcon className="w-6 h-6" />
                  <span>Take Photo</span>
                </Button>

                <Button
                  onClick={handleFileUpload}
                  disabled={disabled || isProcessing}
                  className="h-20 flex-col space-y-2"
                  variant="outline"
                >
                  <ImageIcon className="w-6 h-6" />
                  <span>Upload Image</span>
                </Button>
              </div>

              {/* Cancel button at the bottom */}
              <div className="flex justify-center">
                <Button
                  onClick={onCancel}
                  variant="ghost"
                  className="text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </Button>
              </div>
            </>
          )}

          {/* Hidden file inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleInputChange}
            className="hidden"
          />

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleInputChange}
            className="hidden"
          />

          {/* Preview and processing status */}
          {selectedFile && (
            <div className="space-y-4">
              {/* Image preview */}
              <div className="relative">
                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Receipt preview"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <FileImageIcon className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* File info */}
                <div className="mt-2 text-sm text-gray-600">
                  <p>📄 {selectedFile.name}</p>
                  <p>📏 {(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>

              {/* Processing status */}
              {isProcessing && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <LoaderIcon className="w-5 h-5 animate-spin text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">Processing Receipt...</p>
                      <p className="text-sm text-blue-700">
                        Analyzing image and extracting expense data
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Uploading status */}
              {isUploading && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <LoaderIcon className="w-5 h-5 animate-spin text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">Uploading Receipt...</p>
                      <p className="text-sm text-green-700">
                        Saving to Azure Storage and processing
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Results */}
              {result && !isProcessing && (
                <div className="space-y-4">
                  {result.success && result.data ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <CheckCircleIcon className="w-5 h-5 text-green-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-green-900 mb-3">Extraction Successful!</p>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            {result.data.type && (
                              <div>
                                <span className="font-medium">Type:</span>
                                <Badge variant="secondary" className="ml-2">
                                  {result.data.type.replace('_', ' ')}
                                </Badge>
                              </div>
                            )}

                            {result.data.amount && (
                              <div>
                                <span className="font-medium">Amount:</span>
                                <span className="ml-2">€{result.data.amount.toFixed(2)}</span>
                              </div>
                            )}

                            {result.data.date && (
                              <div>
                                <span className="font-medium">Date:</span>
                                <span className="ml-2">{result.data.date}</span>
                              </div>
                            )}

                            {result.data.vendor && (
                              <div>
                                <span className="font-medium">Vendor:</span>
                                <span className="ml-2">{result.data.vendor}</span>
                              </div>
                            )}

                            {result.data.location && (
                              <div className="col-span-2">
                                <span className="font-medium">Location:</span>
                                <span className="ml-2">{result.data.location}</span>
                              </div>
                            )}

                            {result.data.description && (
                              <div className="col-span-2">
                                <span className="font-medium">Description:</span>
                                <span className="ml-2">{result.data.description}</span>
                              </div>
                            )}
                          </div>

                          {/* Confidence indicator */}
                          {typeof result.data.confidence === 'number' && (
                            <div className="mt-3 flex items-center space-x-2">
                              <span className="text-sm font-medium">Confidence:</span>
                              <Badge className={getConfidenceColor(result.data.confidence)}>
                                {getConfidenceText(result.data.confidence)} ({Math.round(result.data.confidence * 100)}%)
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <XCircleIcon className="w-5 h-5 text-red-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-900">Extraction Failed</p>
                          <p className="text-sm text-red-700 mt-1">
                            {result.error || "Unknown error occurred"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Confirmation dialog */}
              {showConfirmation && result?.success && result.data && !isUploading && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-center space-y-4">
                    <div>
                      <AlertCircleIcon className="w-12 h-12 text-blue-600 mx-auto mb-2" />
                      <h3 className="font-semibold text-blue-900 text-lg">Confirm Receipt Data</h3>
                      <p className="text-sm text-blue-700 mt-1">
                        Please review the extracted data and confirm if it's correct.
                        <br />
                        <strong>Once confirmed, the receipt will be permanently saved.</strong>
                      </p>
                    </div>

                    <div className="flex justify-center space-x-3">
                      <Button
                        onClick={handleRejectReceipt}
                        variant="outline"
                        disabled={isUploading}
                        className="flex items-center space-x-2"
                      >
                        <XCircleIcon className="w-4 h-4" />
                        <span>❌ Not Correct</span>
                      </Button>

                      <Button
                        onClick={handleConfirmReceipt}
                        disabled={isUploading}
                        className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircleIcon className="w-4 h-4" />
                        <span>✅ Looks Good</span>
                      </Button>
                    </div>

                    <p className="text-xs text-gray-600">
                      If the data is not correct, click "Not Correct" to try again with a different image.
                    </p>
                  </div>
                </div>
              )}

              {/* Action buttons - hidden during confirmation */}
              {!showConfirmation && (
                <div className="flex justify-between">
                  <div className="space-x-2">
                    <Button
                      onClick={handleReset}
                      variant="outline"
                      size="sm"
                      disabled={isProcessing || isUploading}
                    >
                      📸 Try Another
                    </Button>

                    {result && !result.success && (
                      <Button
                        onClick={handleRetry}
                        variant="outline"
                        size="sm"
                        disabled={isProcessing || isUploading}
                      >
                        🔄 Retry
                      </Button>
                    )}
                  </div>

                  <Button
                    onClick={onCancel}
                    variant="ghost"
                    size="sm"
                    disabled={isProcessing || isUploading}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}

        </div>
      </CardContent>
    </Card>
  );
}
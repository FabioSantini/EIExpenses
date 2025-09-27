"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { azureStorageService } from "@/services/azure-storage";
import {
  ZoomInIcon,
  ZoomOutIcon,
  DownloadIcon,
  FileImageIcon,
  ExternalLinkIcon,
  XIcon,
  AlertCircleIcon
} from "lucide-react";

interface ReceiptViewerProps {
  receiptUrl: string;
  fileName?: string;
  onClose?: () => void;
  className?: string;
}

export function ReceiptViewer({ 
  receiptUrl, 
  fileName = "Receipt", 
  onClose,
  className = ""
}: ReceiptViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  // Generate SAS URL for secure access
  const secureUrl = azureStorageService.generateSasUrl(receiptUrl, 24); // 24 hours

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(secureUrl);
      const blob = await response.blob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download receipt:', error);
    }
  };

  const handleOpenInNewTab = () => {
    window.open(secureUrl, '_blank');
  };

  return (
    <Card className={`w-full max-w-4xl mx-auto ${className}`}>
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b bg-gray-50">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <FileImageIcon className="w-5 h-5 text-gray-600" />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{fileName}</h3>
              {imageSize.width > 0 && (
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                  {imageSize.width} × {imageSize.height} pixels
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
            {/* Zoom controls - hidden on mobile for space */}
            <div className="hidden sm:flex items-center space-x-1 bg-white rounded-lg border px-2 py-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="h-8 w-8 p-0"
              >
                <ZoomOutIcon className="w-4 h-4" />
              </Button>
              
              <Badge 
                variant="secondary" 
                className="cursor-pointer min-w-[60px] justify-center"
                onClick={handleResetZoom}
              >
                {Math.round(zoom * 100)}%
              </Badge>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                className="h-8 w-8 p-0"
              >
                <ZoomInIcon className="w-4 h-4" />
              </Button>
            </div>

            {/* Action buttons - simplified on mobile */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="hidden sm:flex items-center space-x-1"
            >
              <DownloadIcon className="w-4 h-4" />
              <span>Download</span>
            </Button>
            
            {/* Mobile-only download button (icon only) */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="sm:hidden h-8 w-8 p-0"
              title="Download"
            >
              <DownloadIcon className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenInNewTab}
              className="hidden sm:flex items-center space-x-1"
            >
              <ExternalLinkIcon className="w-4 h-4" />
              <span>Open</span>
            </Button>
            
            {/* Mobile-only open button (icon only) */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenInNewTab}
              className="sm:hidden h-8 w-8 p-0"
              title="Open in new tab"
            >
              <ExternalLinkIcon className="w-4 h-4" />
            </Button>

            {/* Close button - positioned for mobile visibility */}
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 ml-1 flex-shrink-0"
                title="Close"
              >
                <XIcon className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Mobile zoom controls */}
        <div className="sm:hidden flex items-center justify-center p-2 border-b bg-gray-50">
          <div className="flex items-center space-x-1 bg-white rounded-lg border px-2 py-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              className="h-7 w-7 p-0"
            >
              <ZoomOutIcon className="w-3 h-3" />
            </Button>
            
            <Badge 
              variant="secondary" 
              className="cursor-pointer min-w-[50px] justify-center text-xs"
              onClick={handleResetZoom}
            >
              {Math.round(zoom * 100)}%
            </Badge>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoom >= 3}
              className="h-7 w-7 p-0"
            >
              <ZoomInIcon className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Image container */}
        <div className="relative bg-gray-100 min-h-[300px] sm:min-h-[400px] max-h-[60vh] sm:max-h-[70vh] overflow-auto">
          {isLoading && !hasError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <FileImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2 animate-pulse" />
                <p className="text-gray-600">Loading image...</p>
              </div>
            </div>
          )}

          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <AlertCircleIcon className="w-12 h-12 text-red-400 mx-auto mb-2" />
                <p className="text-red-600 font-medium">Failed to load image</p>
                <p className="text-sm text-gray-600 mt-1">
                  The receipt image could not be displayed
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenInNewTab}
                  className="mt-3"
                >
                  Try opening in new tab
                </Button>
              </div>
            </div>
          )}

          {/* Image */}
          <div 
            className="flex items-center justify-center p-2 sm:p-4"
            style={{ 
              minHeight: hasError ? '300px' : 'auto',
              display: hasError ? 'none' : 'flex'
            }}
          >
            <img
              src={secureUrl}
              alt={fileName}
              onLoad={handleImageLoad}
              onError={handleImageError}
              style={{
                transform: `scale(${zoom})`,
                transition: 'transform 0.2s ease-in-out',
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain'
              }}
              className="shadow-lg rounded border"
            />
          </div>
        </div>

        {/* Footer with image info */}
        {!hasError && (
          <div className="px-3 sm:px-4 py-2 border-t bg-gray-50 text-xs text-gray-600">
            <div className="flex justify-between items-center">
              <span className="hidden sm:inline">Zoom: {Math.round(zoom * 100)}% • Click image to interact</span>
              <span className="sm:hidden">Zoom: {Math.round(zoom * 100)}%</span>
              <span className="hidden sm:inline">Secure Azure Blob Storage</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Compact receipt viewer for inline display
export function ReceiptThumbnail({ 
  receiptUrl, 
  fileName = "Receipt",
  onClick,
  className = ""
}: {
  receiptUrl: string;
  fileName?: string;
  onClick?: () => void;
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);
  const secureUrl = azureStorageService.generateSasUrl(receiptUrl, 24);

  return (
    <div 
      className={`relative group cursor-pointer ${className}`}
      onClick={onClick}
    >
      <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 group-hover:border-blue-300 transition-colors">
        {!hasError ? (
          <img
            src={secureUrl}
            alt={fileName}
            onError={() => setHasError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FileImageIcon className="w-8 h-8 text-gray-400" />
          </div>
        )}
      </div>
      
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
        <ZoomInIcon className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      
      {/* File name tooltip */}
      <div className="absolute -bottom-6 left-0 right-0 text-xs text-center text-gray-600 truncate">
        {fileName}
      </div>
    </div>
  );
}
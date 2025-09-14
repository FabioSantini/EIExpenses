"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useFileUpload } from "@/hooks/use-expenses";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading";
import {
  UploadIcon,
  CameraIcon,
  FileIcon,
  XIcon,
  CheckCircleIcon,
} from "lucide-react";

interface FileDropzoneProps {
  onUploadComplete?: (receiptUrl: string, ocrResult?: any) => void;
  onFilesSelected?: (files: File[]) => void;
  accept?: string;
  maxFiles?: number;
  disabled?: boolean;
}

interface UploadedFile {
  file: File;
  url?: string;
  ocrResult?: any;
  status: "uploading" | "processing" | "completed" | "error";
  error?: string;
  preview?: string;
}

export function FileDropzone({
  onUploadComplete,
  onFilesSelected,
  accept = "image/*",
  maxFiles = 5,
  disabled = false,
}: FileDropzoneProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const { uploadReceipt, processWithOCR, isUploading } = useFileUpload();
  const { toast } = useToast();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (disabled) return;

      // Create preview URLs for images
      const filesWithPreviews = acceptedFiles.map(file => ({
        file,
        status: "uploading" as const,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      }));

      setUploadedFiles(prev => [...prev, ...filesWithPreviews]);
      onFilesSelected?.(acceptedFiles);

      // Upload files one by one
      for (let i = 0; i < filesWithPreviews.length; i++) {
        const fileData = filesWithPreviews[i];
        const fileIndex = uploadedFiles.length + i;

        try {
          // Upload file
          const receiptUrl = await uploadReceipt(fileData.file);
          
          setUploadedFiles(prev => 
            prev.map((f, idx) => 
              idx === fileIndex
                ? { ...f, url: receiptUrl, status: "processing" }
                : f
            )
          );

          // Process with OCR
          const ocrResult = await processWithOCR(receiptUrl);
          
          setUploadedFiles(prev => 
            prev.map((f, idx) => 
              idx === fileIndex
                ? { ...f, ocrResult, status: "completed" }
                : f
            )
          );

          onUploadComplete?.(receiptUrl, ocrResult);

          toast({
            title: "Upload successful",
            description: `${fileData.file.name} has been uploaded and processed.`,
            variant: "success",
          });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Upload failed";
          
          setUploadedFiles(prev => 
            prev.map((f, idx) => 
              idx === fileIndex
                ? { ...f, status: "error", error: errorMessage }
                : f
            )
          );

          toast({
            title: "Upload failed",
            description: `Failed to upload ${fileData.file.name}: ${errorMessage}`,
            variant: "destructive",
          });
        }
      }
    },
    [disabled, uploadedFiles.length, uploadReceipt, processWithOCR, onUploadComplete, onFilesSelected, toast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      [accept]: [],
    },
    maxFiles,
    disabled: disabled || isUploading,
  });

  const removeFile = (index: number) => {
    setUploadedFiles(prev => {
      const file = prev[index];
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const openCamera = () => {
    // Create a file input element for camera
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment"; // Use back camera
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        onDrop(Array.from(files));
      }
    };
    input.click();
  };

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      <Card
        {...getRootProps()}
        className={`p-8 border-2 border-dashed cursor-pointer transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <input {...getInputProps()} />
        <div className="text-center">
          <div className="mx-auto w-12 h-12 mb-4">
            {isDragActive ? (
              <UploadIcon className="w-full h-full text-primary" />
            ) : (
              <FileIcon className="w-full h-full text-muted-foreground" />
            )}
          </div>
          
          <h3 className="text-lg font-medium text-foreground mb-2">
            {isDragActive ? "Drop files here" : "Upload receipts"}
          </h3>
          
          <p className="text-sm text-muted-foreground mb-4">
            Drag and drop your receipt images here, or click to browse
          </p>
          
          <div className="flex items-center justify-center space-x-4">
            <Button variant="outline" size="sm" disabled={disabled}>
              <UploadIcon className="w-4 h-4 mr-2" />
              Choose Files
            </Button>
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                openCamera();
              }}
              disabled={disabled}
            >
              <CameraIcon className="w-4 h-4 mr-2" />
              Take Photo
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground mt-2">
            Supported formats: JPG, PNG, PDF • Max {maxFiles} files
          </p>
        </div>
      </Card>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-foreground">Uploaded Files</h4>
          <div className="space-y-3">
            {uploadedFiles.map((fileData, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-center space-x-4">
                  {/* Preview */}
                  <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                    {fileData.preview ? (
                      <img
                        src={fileData.preview}
                        alt={fileData.file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileIcon className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground truncate">
                        {fileData.file.name}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <XIcon className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      {(fileData.file.size / 1024).toFixed(1)} KB
                    </p>

                    {/* Status */}
                    <div className="flex items-center space-x-2 mt-2">
                      {fileData.status === "uploading" && (
                        <>
                          <LoadingSpinner />
                          <span className="text-xs text-muted-foreground">Uploading...</span>
                        </>
                      )}
                      {fileData.status === "processing" && (
                        <>
                          <LoadingSpinner />
                          <span className="text-xs text-muted-foreground">Processing...</span>
                        </>
                      )}
                      {fileData.status === "completed" && (
                        <>
                          <CheckCircleIcon className="w-4 h-4 text-success" />
                          <span className="text-xs text-success">
                            Uploaded & processed successfully
                          </span>
                        </>
                      )}
                      {fileData.status === "error" && (
                        <span className="text-xs text-destructive">
                          Error: {fileData.error}
                        </span>
                      )}
                    </div>

                    {/* OCR Results Preview */}
                    {fileData.ocrResult && (
                      <div className="mt-2 p-2 bg-success/10 rounded text-xs">
                        <div className="font-medium text-success">OCR Results:</div>
                        <div className="text-muted-foreground">
                          Type: {fileData.ocrResult.expenseType} • 
                          Amount: €{fileData.ocrResult.amount} • 
                          Date: {fileData.ocrResult.date}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
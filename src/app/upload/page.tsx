"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useExpenseReports } from "@/hooks/use-expenses";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/ui/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDropzone } from "@/components/file-dropzone";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UploadIcon,
  FileTextIcon,
  ArrowRightIcon,
  PlusIcon,
} from "lucide-react";

export default function UploadPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string>("");
  const [uploadedReceipts, setUploadedReceipts] = useState<{
    receiptUrl: string;
    ocrResult: any;
  }[]>([]);

  const { reports, isLoading } = useExpenseReports();
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleUploadComplete = (receiptUrl: string, ocrResult?: any) => {
    setUploadedReceipts(prev => [...prev, { receiptUrl, ocrResult }]);
  };

  const handleProcessReceipts = () => {
    if (!selectedReportId) {
      toast({
        title: "Select a report",
        description: "Please select an expense report to add these receipts to.",
        variant: "warning",
      });
      return;
    }

    if (uploadedReceipts.length === 0) {
      toast({
        title: "No receipts uploaded",
        description: "Please upload at least one receipt before processing.",
        variant: "warning",
      });
      return;
    }

    // Navigate to expense creation with receipt data
    const receiptData = encodeURIComponent(JSON.stringify(uploadedReceipts));
    router.push(`/reports/${selectedReportId}/expenses/new?receipts=${receiptData}`);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xl text-foreground">Loading Upload...</div>
      </div>
    );
  }

  // Get recent reports for quick selection
  const recentReports = reports
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 10);

  return (
    <div className="min-h-screen bg-background">
      <Navigation currentPath="/upload" />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <UploadIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Upload Receipts</h1>
              <p className="text-muted-foreground mt-1">
                Upload receipt images and let AI extract expense data automatically
              </p>
            </div>
          </div>
        </div>

        {/* Report Selection */}
        <Card className="p-6 mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Select Expense Report
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Choose which expense report to add these receipts to, or create a new one.
          </p>

          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Select value={selectedReportId} onValueChange={setSelectedReportId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an expense report..." />
                </SelectTrigger>
                <SelectContent>
                  {recentReports.map((report) => (
                    <SelectItem key={report.id} value={report.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{report.title}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {new Date(report.year, report.month - 1).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push("/reports/new?returnTo=/upload")}
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              New Report
            </Button>
          </div>

          {recentReports.length === 0 && (
            <div className="mt-4 p-4 bg-warning/10 rounded-lg">
              <div className="flex items-center space-x-2">
                <FileTextIcon className="w-5 h-5 text-warning" />
                <div>
                  <p className="font-medium text-warning">No expense reports found</p>
                  <p className="text-sm text-muted-foreground">
                    Create a new expense report to get started.
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* File Upload */}
        <div className="mb-8">
          <FileDropzone
            onUploadComplete={handleUploadComplete}
            maxFiles={10}
            disabled={isLoading}
            reportId={selectedReportId}
          />
        </div>

        {/* Processing Summary */}
        {uploadedReceipts.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Ready to Process
              </h3>
              <Button
                onClick={handleProcessReceipts}
                disabled={!selectedReportId}
                className="bg-primary hover:bg-primary-hover"
              >
                Process {uploadedReceipts.length} Receipt{uploadedReceipts.length !== 1 ? 's' : ''}
                <ArrowRightIcon className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <div className="space-y-3">
              {uploadedReceipts.map((receipt, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-success/10 rounded flex items-center justify-center">
                      <span className="text-sm font-medium text-success">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        Receipt {index + 1}
                      </div>
                      {receipt.ocrResult && (
                        <div className="text-xs text-muted-foreground">
                          {receipt.ocrResult.expenseType} • €{receipt.ocrResult.amount} • 
                          {receipt.ocrResult.date}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Total receipts: {uploadedReceipts.length}
                </span>
                <span className="text-muted-foreground">
                  Estimated total: €{uploadedReceipts.reduce((sum, r) => 
                    sum + (r.ocrResult?.amount || 0), 0
                  ).toFixed(2)}
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Help Text */}
        <Card className="p-6 mt-8 bg-muted/30">
          <h3 className="text-lg font-semibold text-foreground mb-3">
            Upload Tips
          </h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• Take clear photos with good lighting for best OCR results</li>
            <li>• Ensure the entire receipt is visible in the image</li>
            <li>• Supported formats: JPG, PNG, PDF</li>
            <li>• AI will automatically extract date, amount, and expense type</li>
            <li>• You can review and edit the extracted data before saving</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
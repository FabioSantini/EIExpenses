"use client";

import { useState, useEffect } from "react";
import { useExpenseReports, useExport } from "@/hooks/use-expenses";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/ui/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingSpinner } from "@/components/ui/loading";
import {
  DownloadIcon,
  FileTextIcon,
  CalendarIcon,
  FilterIcon,
  PackageIcon,
} from "lucide-react";

export default function ExportPage() {
  const [mounted, setMounted] = useState(false);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({
    start: "",
    end: "",
  });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [includeReceipts, setIncludeReceipts] = useState(false);

  const { reports, isLoading, error } = useExpenseReports();
  const { exportToExcel, exportWithReceipts, isExporting } = useExport();
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
    if (error) {
      toast({
        title: "Error loading reports",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xl text-foreground">Loading Export...</div>
      </div>
    );
  }

  // Filter reports based on criteria
  const filteredReports = reports.filter(report => {
    // Status filter
    if (statusFilter !== "all" && report.status !== statusFilter) return false;
    
    // Date range filter
    if (dateRange.start && dateRange.end) {
      const reportDate = new Date(report.year, report.month - 1);
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      if (reportDate < startDate || reportDate > endDate) return false;
    }
    
    return true;
  });

  const handleSelectAll = () => {
    if (selectedReports.length === filteredReports.length) {
      setSelectedReports([]);
    } else {
      setSelectedReports(filteredReports.map(r => r.id));
    }
  };

  const handleSelectReport = (reportId: string) => {
    setSelectedReports(prev => 
      prev.includes(reportId)
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId]
    );
  };

  const handleExport = async () => {
    if (selectedReports.length === 0) {
      toast({
        title: "No reports selected",
        description: "Please select at least one report to export.",
        variant: "warning",
      });
      return;
    }

    try {
      if (selectedReports.length === 1) {
        // Single report export
        if (includeReceipts) {
          await exportWithReceipts(selectedReports[0]);
        } else {
          await exportToExcel(selectedReports[0]);
        }
      } else {
        // Multiple reports - for now, export individually
        for (const reportId of selectedReports) {
          if (includeReceipts) {
            await exportWithReceipts(reportId);
          } else {
            await exportToExcel(reportId);
          }
        }
      }

      toast({
        title: "Export successful",
        description: `${selectedReports.length} report(s) exported successfully.`,
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Failed to export reports",
        variant: "destructive",
      });
    }
  };

  const selectedReportsData = filteredReports.filter(r => selectedReports.includes(r.id));
  const totalAmount = selectedReportsData.reduce((sum, r) => sum + r.totalAmount, 0);
  const totalItems = selectedReportsData.reduce((sum, r) => sum + (r.lineCount || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <Navigation currentPath="/export" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <DownloadIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Export Reports</h1>
              <p className="text-muted-foreground mt-1">
                Export expense reports to Excel with optional receipt attachments
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Filters */}
          <Card className="p-6 h-fit">
            <div className="flex items-center space-x-2 mb-4">
              <FilterIcon className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">Filters</h2>
            </div>

            <div className="space-y-4">
              {/* Date Range */}
              <div className="space-y-2">
                <Label>Date Range</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="month"
                    placeholder="Start month"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  />
                  <Input
                    type="month"
                    placeholder="End month"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Export Options */}
              <div className="space-y-2">
                <Label>Export Options</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-receipts"
                    checked={includeReceipts}
                    onCheckedChange={(checked) => setIncludeReceipts(checked as boolean)}
                  />
                  <Label htmlFor="include-receipts" className="text-sm">
                    Include receipt attachments (ZIP format)
                  </Label>
                </div>
              </div>
            </div>
          </Card>

          {/* Reports List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Selection Summary */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <PackageIcon className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="font-semibold text-foreground">Export Summary</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedReports.length} of {filteredReports.length} reports selected
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleExport}
                  disabled={selectedReports.length === 0 || isExporting}
                  className="bg-primary hover:bg-primary-hover"
                >
                  <DownloadIcon className="w-4 h-4 mr-2" />
                  {isExporting ? "Exporting..." : "Export Selected"}
                </Button>
              </div>

              {selectedReports.length > 0 && (
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Total Reports</div>
                    <div className="font-medium text-foreground">{selectedReports.length}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Total Amount</div>
                    <div className="font-medium text-foreground">€{totalAmount.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Total Items</div>
                    <div className="font-medium text-foreground">{totalItems}</div>
                  </div>
                </div>
              )}
            </Card>

            {/* Reports List */}
            {isLoading ? (
              <LoadingSpinner />
            ) : (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    Available Reports ({filteredReports.length})
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                  >
                    {selectedReports.length === filteredReports.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>

                {filteredReports.length === 0 ? (
                  <div className="text-center py-8">
                    <FileTextIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-foreground mb-2">No reports found</h4>
                    <p className="text-muted-foreground">
                      No reports match your current filter criteria.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredReports.map((report) => (
                      <div
                        key={report.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedReports.includes(report.id)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-muted-foreground/50"
                        }`}
                        onClick={() => handleSelectReport(report.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              checked={selectedReports.includes(report.id)}
                              onChange={() => handleSelectReport(report.id)}
                            />
                            <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                              <FileTextIcon className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium text-foreground">{report.title}</div>
                              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <CalendarIcon className="w-4 h-4" />
                                <span>
                                  {new Date(report.year, report.month - 1).toLocaleDateString('en-US', {
                                    month: 'long',
                                    year: 'numeric'
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right text-sm">
                              <div className="font-medium text-foreground">€{report.totalAmount.toFixed(2)}</div>
                              <div className="text-muted-foreground">{report.lineCount || 0} items</div>
                            </div>
                            <Badge variant={
                              report.status === "draft" ? "warning" :
                              report.status === "submitted" ? "info" :
                              "success"
                            }>
                              {report.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
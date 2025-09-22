"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useExpenseReports } from "@/hooks/use-expenses";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/ui/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusChangeDialog } from "@/components/reports/StatusChangeDialog";
import { Input } from "@/components/ui/input";
import { ExpenseReportCardSkeleton } from "@/components/ui/loading";
import {
  PlusIcon,
  SearchIcon,
  FileTextIcon,
  CalendarIcon,
  FilterIcon,
  CameraIcon,
  Trash2Icon
} from "lucide-react";

export default function ReportsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<{id: string, title: string, status: string} | null>(null);
  const { reports, isLoading, error, mutate } = useExpenseReports();
  const { toast } = useToast();

  // Debug logging
  console.log('📊 Reports Page State:', {
    reports,
    isLoading,
    error,
    reportsLength: reports?.length,
    reportsType: typeof reports
  });

  // Filter reports based on search and status - MUST be before early returns to follow Rules of Hooks
  const filteredReports = React.useMemo(() => {
    console.log('🔍 Filtering reports:', { reports, searchQuery, statusFilter });

    if (!Array.isArray(reports)) {
      console.warn('⚠️ Reports is not an array:', reports);
      return [];
    }

    try {
      return reports.filter(report => {
        if (!report) {
          console.warn('⚠️ Found null/undefined report in array');
          return false;
        }

        const matchesSearch = report.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             report.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || report.status === statusFilter;
        return matchesSearch && matchesStatus;
      });
    } catch (error) {
      console.error('❌ Error filtering reports:', error);
      return [];
    }
  }, [reports, searchQuery, statusFilter]);

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

  const handleStatusChange = (report: {id: string, title: string, status: string}) => {
    console.log('📝 Status change requested for report:', report);
    setSelectedReport(report);
    setStatusDialogOpen(true);
  };

  const handleStatusUpdate = async (newStatus: 'draft' | 'submitted' | 'approved' | 'rejected') => {
    if (!selectedReport) return;

    console.log('📝 Updating status:', { reportId: selectedReport.id, newStatus });

    try {
      const response = await fetch(`/api/reports/${selectedReport.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update status');
      }

      const updatedReport = await response.json();
      console.log('✅ Status updated successfully:', updatedReport);

      toast({
        title: "Status updated successfully",
        description: `Report status changed to ${newStatus}`,
      });

      // Refresh the reports list
      mutate();

    } catch (error) {
      console.error('❌ Error updating status:', error);
      toast({
        title: "Failed to update status",
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: "destructive",
      });
      throw error; // Let the dialog handle this
    }
  };

  const handleDeleteReport = async (reportId: string, reportTitle: string) => {
    console.log('🗑️ Delete button clicked for report:', reportId, reportTitle);

    if (!confirm(`Are you sure you want to delete "${reportTitle}"? This will permanently delete the report, all expense lines, and receipt images. This action cannot be undone.`)) {
      console.log('🗑️ Delete cancelled by user');
      return;
    }

    console.log('🗑️ Delete confirmed, starting deletion process');
    setDeletingReportId(reportId);

    try {
      console.log('🗑️ Making DELETE request to API');
      const response = await fetch(`/api/reports/${reportId}`, {
        method: 'DELETE',
      });

      console.log('🗑️ API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('🗑️ API error response:', errorData);
        throw new Error(errorData.error || 'Failed to delete report');
      }

      const result = await response.json();
      console.log('🗑️ Delete successful, result:', result);

      toast({
        title: "Report deleted successfully",
        description: `Deleted ${result.deletedLinesCount} expense lines and ${result.deletedReceiptsCount} receipts`,
      });

      // Refresh the reports list
      console.log('🗑️ Refreshing reports list');
      mutate();

    } catch (error) {
      console.error('🗑️ Error deleting report:', error);
      toast({
        title: "Failed to delete report",
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: "destructive",
      });
    } finally {
      console.log('🗑️ Cleaning up deletion state');
      setDeletingReportId(null);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xl text-foreground">Loading Reports...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation currentPath="/reports" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Expense Reports</h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                Manage and track all your expense reports
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => router.push("/upload")}
                className="w-full sm:w-auto"
              >
                <CameraIcon className="w-4 h-4 mr-2" />
                <span className="sm:inline">Upload Receipts</span>
              </Button>
              <Button
                onClick={() => router.push("/reports/new")}
                className="bg-primary hover:bg-primary-hover w-full sm:w-auto"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                <span>New Report</span>
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <FilterIcon className="w-4 h-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="min-w-[140px] px-3 py-2 border border-input bg-background rounded-md text-sm focus:ring-2 focus:ring-ring focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Reports List */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <ExpenseReportCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredReports.length === 0 ? (
          <Card className="p-8 text-center">
            <FileTextIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {searchQuery || statusFilter !== "all" ? "No reports match your criteria" : "No expense reports yet"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== "all" 
                ? "Try adjusting your search or filters" 
                : "Get started by creating your first expense report"
              }
            </p>
            {!searchQuery && statusFilter === "all" && (
              <Button onClick={() => router.push("/reports/new")}>
                <PlusIcon className="w-4 h-4 mr-2" />
                Create First Report
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <Card
                key={report.id}
                className="p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/reports/${report.id}?title=${encodeURIComponent(report.title)}`)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <FileTextIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{report.title}</h3>
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
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={
                        report.status === "draft" ? "warning" :
                        report.status === "submitted" ? "info" :
                        report.status === "approved" ? "success" :
                        "destructive"
                      }
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange({
                          id: report.id,
                          title: report.title,
                          status: report.status
                        });
                      }}
                      title="Click to change status"
                    >
                      {report.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteReport(report.id, report.title);
                      }}
                      disabled={deletingReportId === report.id}
                      className="text-destructive hover:text-destructive-foreground hover:bg-destructive/10 h-8 w-8 p-0"
                      title="Delete report"
                    >
                      {deletingReportId === report.id ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2Icon className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Amount</p>
                    <p className="font-medium text-foreground">€{report.totalAmount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Items</p>
                    <p className="font-medium text-foreground">{report.lineCount || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Updated</p>
                    <p className="font-medium text-foreground">
                      {new Date(report.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {report.description && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">{report.description}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Summary */}
        {filteredReports.length > 0 && (
          <div className="mt-8 pt-6 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Showing {filteredReports.length} of {reports.length} reports
              </span>
              <span className="text-muted-foreground">
                Total: €{filteredReports.reduce((sum, r) => sum + r.totalAmount, 0).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Status Change Dialog */}
        {selectedReport && (
          <StatusChangeDialog
            isOpen={statusDialogOpen}
            onClose={() => {
              setStatusDialogOpen(false);
              setSelectedReport(null);
            }}
            currentStatus={selectedReport.status as 'draft' | 'submitted' | 'approved' | 'rejected'}
            reportTitle={selectedReport.title}
            onConfirm={handleStatusUpdate}
          />
        )}
      </div>
    </div>
  );
}
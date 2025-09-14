"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useExpenseReports } from "@/hooks/use-expenses";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/ui/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ExpenseReportCardSkeleton } from "@/components/ui/loading";
import { 
  PlusIcon,
  SearchIcon,
  FileTextIcon,
  CalendarIcon,
  FilterIcon
} from "lucide-react";

export default function ReportsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { reports, isLoading, error } = useExpenseReports();
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
        <div className="text-xl text-foreground">Loading Reports...</div>
      </div>
    );
  }

  // Filter reports based on search and status
  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         report.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || report.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation currentPath="/reports" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Expense Reports</h1>
              <p className="text-muted-foreground mt-1">
                Manage and track all your expense reports
              </p>
            </div>
            <Button 
              onClick={() => router.push("/reports/new")}
              className="bg-primary hover:bg-primary-hover"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              New Report
            </Button>
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
                className="px-3 py-2 border border-input bg-background rounded-md text-sm focus:ring-2 focus:ring-ring focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
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
                onClick={() => router.push(`/reports/${report.id}`)}
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
                  <Badge variant={
                    report.status === "draft" ? "warning" : 
                    report.status === "submitted" ? "info" : 
                    "success"
                  }>
                    {report.status}
                  </Badge>
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
      </div>
    </div>
  );
}
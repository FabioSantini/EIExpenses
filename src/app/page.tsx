"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useExpenseReports } from "@/hooks/use-expenses";
import { useDataServiceType } from "@/services/data-service-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileTextIcon,
  EuroIcon,
  PlusIcon,
  CalendarIcon
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { reports, isLoading, error } = useExpenseReports();
  const currentDataService = useDataServiceType();

  // Helper function to get data service display info
  const getDataServiceInfo = () => {
    switch (currentDataService) {
      case 'mock':
        return {
          name: 'Local Mock Service',
          description: 'Local development with sample data'
        };
      case 'azure':
        return {
          name: 'Azure SQL Service',
          description: 'Production data from Azure SQL Database'
        };
      default:
        return {
          name: 'Data Service',
          description: 'Connected data service'
        };
    }
  };

  const serviceInfo = getDataServiceInfo();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-xl text-slate-600">Loading EI-Expenses...</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-xl text-slate-600">Loading expense reports...</div>
        <div className="text-sm text-slate-400 mt-2">Connecting to {serviceInfo.name}...</div>
      </div>
    );
  }

  // Calculate real statistics from data service
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // getMonth() is 0-based, so add 1
  const currentYear = now.getFullYear();

  const stats = {
    totalReports: reports.length,
    currentMonthReports: reports.filter(r => {
      return r.month === currentMonth && r.year === currentYear;
    }).length,
    dataStatus: reports.length > 0 ? `${reports.length} Reports` : "No Data"
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">EI-Expenses</h1>
              <p className="text-slate-600 mt-1">Manage your business expenses efficiently</p>
            </div>
            <Button
              className="bg-primary hover:bg-primary/90 w-full sm:w-auto h-12 sm:h-10"
              onClick={() => router.push('/reports/new')}
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              New Report
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">Error loading reports: {error}</p>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Total Reports
              </CardTitle>
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <FileTextIcon className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{stats.totalReports}</div>
              <p className="text-xs text-slate-500">All time reports</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                This Month
              </CardTitle>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <CalendarIcon className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{stats.currentMonthReports}</div>
              <p className="text-xs text-slate-500">Reports this month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Data Status
              </CardTitle>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <EuroIcon className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{stats.dataStatus}</div>
              <p className="text-xs text-slate-500">{serviceInfo.description}</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Reports */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <h2 className="text-xl font-semibold text-slate-900">Recent Expense Reports</h2>
            <Button variant="outline" className="w-full sm:w-auto">
              View All Reports
            </Button>
          </div>

          {reports.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <FileTextIcon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  No expense reports yet
                </h3>
                <p className="text-slate-500 text-center mb-4">
                  Create your first expense report to get started with tracking your business expenses.
                </p>
                <Button>
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Create First Report
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {reports.slice(0, 5).map((report) => (
                <Card key={report.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                      <div className="flex items-center space-x-3 flex-1">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileTextIcon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-slate-900 truncate">{report.title}</h3>
                          <div className="flex items-center space-x-2 text-sm text-slate-500">
                            <CalendarIcon className="w-4 h-4" />
                            <span>
                              {new Date(report.year, report.month - 1).toLocaleDateString('it-IT', {
                                month: 'long',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end sm:space-x-4">
                        <div className="text-left sm:text-right">
                          <p className="text-sm text-slate-500">Last updated</p>
                          <p className="font-medium text-slate-900">
                            {new Date(report.updatedAt).toLocaleDateString('it-IT')}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          className="ml-4 sm:ml-0"
                          onClick={() => router.push(`/reports/${report.id}`)}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>

                    {report.description && (
                      <p className="mt-3 text-sm text-slate-600">{report.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Connected Data Info */}
        <div className="mt-12 p-6 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">✓</span>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-green-900 mb-1">
                {serviceInfo.name} Connected Successfully!
              </h3>
              <p className="text-green-700">
                Dashboard now displays live data from {serviceInfo.name} with {reports.length} expense reports.
                {currentDataService === 'mock' && (
                  <> This demonstrates the complete expense tracking workflow with realistic Italian business expenses
                    including parking, fuel, meals, hotels, and other business costs.</>
                )}
                {currentDataService === 'azure' && (
                  <> Data is synchronized with your Azure SQL Database for production-grade reliability and backup.</>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
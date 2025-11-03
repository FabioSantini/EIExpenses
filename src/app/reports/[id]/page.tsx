"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useExpenseLines, useFileUpload } from "@/hooks/use-expenses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeftIcon,
  PlusIcon,
  ReceiptIcon,
  EuroIcon,
  CalendarIcon,
  EditIcon,
  TrashIcon,
  FileTextIcon,
  MapPinIcon,
  UtensilsIcon,
  CarIcon,
  BuildingIcon
} from "lucide-react";

export default function ExpenseReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const reportId = params.id as string;
  const reportTitle = searchParams.get('title') || 'Expense Report';
  
  const { expenses, summary, isLoading, error, deleteExpense } = useExpenseLines(reportId);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDeleteExpense = async (expenseId: string) => {
    if (window.confirm("Are you sure you want to delete this expense? This action cannot be undone.")) {
      try {
        await deleteExpense(expenseId);
      } catch (error) {
        console.error("Failed to delete expense:", error);
        // The error will be handled by the hook and displayed via toast
      }
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-xl text-slate-600">Loading...</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-xl text-slate-600">Loading expense details...</div>
      </div>
    );
  }

  // Helper function to get expense type icon and color
  const getExpenseTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'fuel':
      case 'carburante':
        return { icon: <CarIcon className="w-4 h-4" />, color: 'text-orange-600', bg: 'bg-orange-100' };
      case 'lunch':
      case 'dinner':
      case 'breakfast':
      case 'pranzo':
      case 'cena':
      case 'colazione':
        return { icon: <UtensilsIcon className="w-4 h-4" />, color: 'text-green-600', bg: 'bg-green-100' };
      case 'parking':
      case 'parcheggio':
        return { icon: <MapPinIcon className="w-4 h-4" />, color: 'text-blue-600', bg: 'bg-blue-100' };
      case 'hotel':
      case 'albergo':
        return { icon: <BuildingIcon className="w-4 h-4" />, color: 'text-purple-600', bg: 'bg-purple-100' };
      default:
        return { icon: <ReceiptIcon className="w-4 h-4" />, color: 'text-slate-600', bg: 'bg-slate-100' };
    }
  };

  // Helper function to format metadata in a user-friendly way
  const formatMetadata = (metadata: any) => {
    if (!metadata) return null;

    // Handle typed metadata format
    if (typeof metadata === 'object' && metadata.type && metadata.data) {
      return Object.entries(metadata.data).map(([key, value]) => (
        <span key={key} className="inline-block mr-3 mb-1">
          <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span> {String(value)}
        </span>
      ));
    }

    // Handle legacy string format or other objects
    if (typeof metadata === 'string') {
      try {
        const parsed = JSON.parse(metadata);
        return Object.entries(parsed).map(([key, value]) => (
          <span key={key} className="inline-block mr-3 mb-1">
            <span className="font-medium capitalize">{key}:</span> {String(value)}
          </span>
        ));
      } catch {
        return metadata;
      }
    }

    // Handle direct object format
    if (typeof metadata === 'object') {
      return Object.entries(metadata).map(([key, value]) => (
        <span key={key} className="inline-block mr-3 mb-1">
          <span className="font-medium capitalize">{key}:</span> {String(value)}
        </span>
      ));
    }

    return String(metadata);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <Button
                variant="outline"
                size="default"
                onClick={() => router.push('/reports')}
                className="self-start sm:self-auto"
              >
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back to Reports
              </Button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{reportTitle}</h1>
                <p className="text-slate-600 mt-1">Manage individual expense items</p>
              </div>
            </div>
            <Button
              className="bg-primary hover:bg-primary/90 w-full sm:w-auto h-12 sm:h-10"
              onClick={() => router.push(`/reports/${reportId}/expenses/new`)}
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Add Expense
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">Error loading expenses: {error}</p>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Total Amount
              </CardTitle>
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <EuroIcon className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                €{summary.totalAmount.toFixed(2)}
              </div>
              <p className="text-xs text-slate-500">Total expenses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Total Items
              </CardTitle>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <FileTextIcon className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{summary.count}</div>
              <p className="text-xs text-slate-500">Expense entries</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                With Receipts
              </CardTitle>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <ReceiptIcon className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{summary.withReceipts}</div>
              <p className="text-xs text-slate-500">Have receipt photos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Report ID
              </CardTitle>
              <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                <FileTextIcon className="h-4 w-4 text-slate-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-mono text-slate-900">
                {reportId.substring(0, 8)}...
              </div>
              <p className="text-xs text-slate-500">Truncated ID</p>
            </CardContent>
          </Card>
        </div>

        {/* Expense Lines */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <h2 className="text-xl font-semibold text-slate-900">Expense Items</h2>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <Button variant="outline" className="w-full sm:w-auto h-12 sm:h-9">
                Export Excel
              </Button>
              <Button
                className="w-full sm:w-auto h-12 sm:h-9"
                onClick={() => router.push(`/reports/${reportId}/expenses/new`)}
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Add Expense
              </Button>
            </div>
          </div>

          {expenses.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <ReceiptIcon className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  No expenses yet
                </h3>
                <p className="text-slate-500 text-center mb-4">
                  Start adding expenses to this report by uploading receipts or entering them manually.
                </p>
                <Button>
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add First Expense
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {expenses.map((expense) => {
                const typeInfo = getExpenseTypeIcon(expense.type);
                return (
                  <Card key={expense.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                        <div className="flex items-center space-x-3 sm:space-x-4 flex-1">
                          <div className={`w-10 h-10 sm:w-12 sm:h-12 ${typeInfo.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                            <span className={typeInfo.color}>{typeInfo.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-slate-900 truncate">{expense.description}</h3>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 mt-1">
                              <div className="flex items-center space-x-1">
                                <CalendarIcon className="w-4 h-4" />
                                <span>{new Date(expense.date).toLocaleDateString('it-IT')}</span>
                              </div>
                              <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium">
                                {expense.type}
                              </span>
                              {expense.receiptId && (
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                  Has Receipt
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end sm:space-x-4">
                          <div className="text-left sm:text-right">
                            <p className="text-lg font-bold text-slate-900">
                              €{expense.amount.toFixed(2)}
                            </p>
                            <p className="text-sm text-slate-500">{expense.currency}</p>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-10 w-10 sm:h-9 sm:w-auto sm:px-3"
                              onClick={() => router.push(`/reports/${reportId}/expenses/${expense.id}/edit`)}
                            >
                              <EditIcon className="w-4 h-4" />
                              <span className="sr-only sm:not-sr-only sm:ml-2">Edit</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-10 w-10 sm:h-9 sm:w-auto sm:px-3"
                              onClick={() => handleDeleteExpense(expense.id)}
                            >
                              <TrashIcon className="w-4 h-4" />
                              <span className="sr-only sm:not-sr-only sm:ml-2">Delete</span>
                            </Button>
                          </div>
                        </div>
                      </div>

                      {expense.metadata && (
                        <div className="mt-4 pt-4 border-t text-sm text-slate-600">
                          <div className="font-medium mb-2">Additional Info:</div>
                          <div className="flex flex-wrap">
                            {formatMetadata(expense.metadata)}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
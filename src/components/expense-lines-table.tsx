"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useExpenseLines } from "@/hooks/use-expenses";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingSpinner } from "@/components/ui/loading";
import {
  PlusIcon,
  EditIcon,
  TrashIcon,
  ReceiptIcon,
  EyeIcon,
} from "lucide-react";

interface ExpenseLinesTableProps {
  reportId: string;
}

const expenseTypeColors: Record<string, string> = {
  "PARKING": "bg-expense-parking",
  "FUEL": "bg-expense-fuel", 
  "TELEPASS": "bg-expense-telepass",
  "LUNCH": "bg-expense-lunch",
  "DINNER": "bg-expense-dinner",
  "HOTEL": "bg-expense-hotel",
  "TRAIN": "bg-expense-train",
  "BREAKFAST": "bg-expense-breakfast",
  "TOURIST_TAX": "bg-expense-tourist-tax",
  "OTHER": "bg-expense-other",
};

export function ExpenseLinesTable({ reportId }: ExpenseLinesTableProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { expenses, summary, isLoading, error, deleteExpense } = useExpenseLines(reportId);
  const { toast } = useToast();

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await deleteExpense(id);
      toast({
        title: "Expense deleted",
        description: "The expense line has been successfully deleted.",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Error deleting expense",
        description: error instanceof Error ? error.message : "Failed to delete expense",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-destructive">Error loading expenses: {error}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Amount</div>
          <div className="text-2xl font-bold text-foreground">
            €{summary.totalAmount.toFixed(2)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Items</div>
          <div className="text-2xl font-bold text-foreground">{summary.count}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">With Receipts</div>
          <div className="text-2xl font-bold text-foreground">{summary.withReceipts}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Completion</div>
          <div className="text-2xl font-bold text-foreground">
            {summary.count > 0 ? Math.round((summary.withReceipts / summary.count) * 100) : 0}%
          </div>
        </Card>
      </div>

      {/* Add New Expense Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-foreground">Expense Lines</h3>
        <Button
          onClick={() => router.push(`/reports/${reportId}/expenses/new`)}
          size="sm"
          className="bg-primary hover:bg-primary-hover"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Expense
        </Button>
      </div>

      {/* Expenses Table */}
      {expenses.length === 0 ? (
        <Card className="p-8 text-center">
          <ReceiptIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No expenses yet</h3>
          <p className="text-muted-foreground mb-4">
            Start by adding your first expense to this report
          </p>
          <Button onClick={() => router.push(`/reports/${reportId}/expenses/new`)}>
            <PlusIcon className="w-4 h-4 mr-2" />
            Add First Expense
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Receipt</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>
                    {new Date(expense.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <div 
                        className={`w-3 h-3 rounded-full ${expenseTypeColors[expense.type] || expenseTypeColors.OTHER}`}
                      />
                      <span className="text-sm">
                        {expense.type.replace('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      <div className="font-medium">{expense.description}</div>
                      {expense.metadata && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {typeof expense.metadata === 'string' 
                            ? expense.metadata 
                            : JSON.stringify(expense.metadata)
                          }
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    €{expense.amount.toFixed(2)}
                    {expense.currency !== 'EUR' && (
                      <span className="text-xs text-muted-foreground ml-1">
                        {expense.currency}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {expense.receiptUrl ? (
                      <Badge variant="success" className="text-xs">
                        <ReceiptIcon className="w-3 h-3 mr-1" />
                        Yes
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        No
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-1">
                      {expense.receiptUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/receipts/${expense.id}`)}
                        >
                          <EyeIcon className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/reports/${reportId}/expenses/${expense.id}`)}
                      >
                        <EditIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(expense.id)}
                        disabled={deletingId === expense.id}
                        className="text-destructive hover:text-destructive"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
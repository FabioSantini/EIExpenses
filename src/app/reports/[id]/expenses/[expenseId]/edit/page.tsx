"use client";

import { useParams } from "next/navigation";
import { useExpenseLines } from "@/hooks/use-expenses";
import { ExpenseLineForm } from "@/components/expense-line-form";
import { useEffect, useState } from "react";
import type { ExpenseLine } from "@/types";

export default function EditExpensePage() {
  const params = useParams();
  const reportId = params.id as string;
  const expenseId = params.expenseId as string;
  const { expenses, isLoading } = useExpenseLines(reportId);
  const [expense, setExpense] = useState<ExpenseLine | null>(null);

  useEffect(() => {
    const foundExpense = expenses.find(e => e.id === expenseId);
    if (foundExpense) {
      setExpense(foundExpense);
    }
  }, [expenses, expenseId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-xl text-slate-600">Loading expense...</div>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Expense Not Found</h1>
          <p className="text-slate-600">The expense you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <ExpenseLineForm
      reportId={reportId}
      expenseId={expenseId}
      initialData={expense}
    />
  );
}
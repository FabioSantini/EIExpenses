"use client";

import { useParams } from "next/navigation";
import { useExpenseReports } from "@/hooks/use-expenses";
import { ExpenseReportForm } from "@/components/expense-report-form";
import { useEffect, useState } from "react";
import type { ExpenseReport } from "@/types";

export default function EditExpenseReportPage() {
  const params = useParams();
  const reportId = params.id as string;
  const { reports, isLoading } = useExpenseReports();
  const [report, setReport] = useState<ExpenseReport | null>(null);

  useEffect(() => {
    const foundReport = reports.find(r => r.id === reportId);
    if (foundReport) {
      setReport(foundReport);
    }
  }, [reports, reportId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-xl text-slate-600">Loading expense report...</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Report Not Found</h1>
          <p className="text-slate-600">The expense report you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <ExpenseReportForm
      reportId={reportId}
      initialData={report}
    />
  );
}
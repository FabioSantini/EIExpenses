"use client";

import { useParams } from "next/navigation";
import { ExpenseLineForm } from "@/components/expense-line-form";

export default function NewExpensePage() {
  const params = useParams();
  const reportId = params.id as string;

  return <ExpenseLineForm reportId={reportId} />;
}
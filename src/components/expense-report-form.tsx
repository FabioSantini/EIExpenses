"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useExpenseReports } from "@/hooks/use-expenses";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SaveIcon,
  ArrowLeftIcon,
  CalendarIcon,
  FileTextIcon,
} from "lucide-react";
import type { ExpenseReport } from "@/types";

// Form validation schema
const expenseReportSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title is too long"),
  month: z.number().min(1, "Month is required").max(12, "Invalid month"),
  year: z.number().min(2020, "Year must be 2020 or later").max(2030, "Year must be 2030 or earlier"),
  description: z.string().max(500, "Description is too long").optional(),
});

type FormData = z.infer<typeof expenseReportSchema>;

interface ExpenseReportFormProps {
  reportId?: string;
  initialData?: ExpenseReport;
  onSuccess?: (report: ExpenseReport) => void;
  onCancel?: () => void;
}

export function ExpenseReportForm({
  reportId,
  initialData,
  onSuccess,
  onCancel,
}: ExpenseReportFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { createReport, updateReport, isLoading } = useExpenseReports();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!reportId && !!initialData;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(expenseReportSchema),
    defaultValues: {
      title: initialData?.title || "",
      month: initialData?.month || new Date().getMonth() + 1,
      year: initialData?.year || new Date().getFullYear(),
      description: initialData?.description || "",
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      let result: ExpenseReport;

      if (isEditing) {
        // Update existing report
        result = await updateReport(reportId, {
          title: data.title,
          month: data.month,
          year: data.year,
          description: data.description,
        });
        toast({
          title: "Report Updated",
          description: "Expense report has been updated successfully.",
        });
      } else {
        // Create new report
        result = await createReport({
          title: data.title,
          month: data.month,
          year: data.year,
          description: data.description,
        });
        toast({
          title: "Report Created",
          description: "New expense report has been created successfully.",
        });
      }

      if (onSuccess) {
        onSuccess(result);
      } else {
        router.push(`/reports/${result.id}`);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save expense report.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else if (isEditing) {
      router.push(`/reports/${reportId}`);
    } else {
      router.push("/");
    }
  };

  const getCurrentMonthName = (month: number) => {
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return months[month - 1] || "";
  };

  const watchedMonth = watch("month");
  const watchedYear = watch("year");

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="mb-4"
            disabled={isSubmitting}
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">
            {isEditing ? "Edit Expense Report" : "Create New Expense Report"}
          </h1>
          <p className="text-slate-600 mt-1">
            {isEditing ? "Update the expense report details" : "Create a new monthly expense report"}
          </p>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileTextIcon className="w-5 h-5 mr-2" />
              Report Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Report Title *</Label>
                <Input
                  id="title"
                  {...register("title")}
                  placeholder="e.g., Business Trip to Milan"
                  disabled={isSubmitting}
                />
                {errors.title && (
                  <p className="text-sm text-red-600">{errors.title.message}</p>
                )}
              </div>

              {/* Month & Year */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="month">Month *</Label>
                  <Select
                    value={watchedMonth?.toString()}
                    onValueChange={(value) => setValue("month", parseInt(value))}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
                        <SelectItem key={month} value={month.toString()}>
                          {getCurrentMonthName(month)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.month && (
                    <p className="text-sm text-red-600">{errors.month.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="year">Year *</Label>
                  <Input
                    id="year"
                    type="number"
                    {...register("year", { valueAsNumber: true })}
                    min="2020"
                    max="2030"
                    disabled={isSubmitting}
                  />
                  {errors.year && (
                    <p className="text-sm text-red-600">{errors.year.message}</p>
                  )}
                </div>
              </div>

              {/* Preview */}
              {watchedMonth && watchedYear && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center text-blue-800">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    <span className="font-medium">
                      Report Period: {getCurrentMonthName(watchedMonth)} {watchedYear}
                    </span>
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  placeholder="Add any additional notes about this expense report..."
                  rows={3}
                  disabled={isSubmitting}
                />
                {errors.description && (
                  <p className="text-sm text-red-600">{errors.description.message}</p>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting || isLoading}
                  className="flex-1"
                >
                  <SaveIcon className="w-4 h-4 mr-2" />
                  {isSubmitting ? "Saving..." : isEditing ? "Update Report" : "Create Report"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h3 className="font-medium text-amber-800 mb-2">Tips:</h3>
          <ul className="text-sm text-amber-700 space-y-1">
            <li>• Use descriptive titles like "Business Trip to Rome" or "March 2025 Expenses"</li>
            <li>• Reports are organized by month and year for easy tracking</li>
            <li>• You can add multiple expense lines to each report after creation</li>
            <li>• All fields marked with * are required</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
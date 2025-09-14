"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useExpenseLines, useSuggestions } from "@/hooks/use-expenses";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import {
  SaveIcon,
  ArrowLeftIcon,
  ReceiptIcon,
  MapPinIcon,
  UsersIcon,
  UserIcon,
} from "lucide-react";

const expenseTypes = [
  "PARKING",
  "FUEL", 
  "TELEPASS",
  "LUNCH",
  "DINNER",
  "HOTEL",
  "TRAIN",
  "BREAKFAST",
  "TOURIST_TAX",
  "OTHER",
] as const;

const expenseSchema = z.object({
  date: z.string().min(1, "Date is required"),
  type: z.enum(expenseTypes, { required_error: "Expense type is required" }),
  description: z.string().min(1, "Description is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  currency: z.string().default("EUR"),
  receiptUrl: z.string().optional(),
  metadata: z.string().optional(),
  // Type-specific fields
  customer: z.string().optional(),
  colleagues: z.string().optional(),
  startLocation: z.string().optional(),
  endLocation: z.string().optional(),
  distance: z.number().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  reportId: string;
  expenseId?: string;
  initialData?: Partial<ExpenseFormData>;
  receiptData?: {
    receiptUrl: string;
    ocrResult?: any;
  };
}

export function ExpenseForm({ 
  reportId, 
  expenseId, 
  initialData,
  receiptData 
}: ExpenseFormProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customerSuggestions, setCustomerSuggestions] = useState<string[]>([]);
  const [colleagueSuggestions, setColleagueSuggestions] = useState<string[]>([]);
  
  const { addExpense, updateExpense } = useExpenseLines(reportId);
  const { getCustomerSuggestions, getColleagueSuggestions } = useSuggestions();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      currency: "EUR",
      ...initialData,
      ...(receiptData?.ocrResult && {
        type: receiptData.ocrResult.expenseType,
        amount: receiptData.ocrResult.amount,
        date: receiptData.ocrResult.date,
        description: receiptData.ocrResult.description || "",
        receiptUrl: receiptData.receiptUrl,
      }),
    },
  });

  const selectedType = watch("type");

  useEffect(() => {
    setMounted(true);
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    const [customers, colleagues] = await Promise.all([
      getCustomerSuggestions(),
      getColleagueSuggestions(),
    ]);
    setCustomerSuggestions(customers);
    setColleagueSuggestions(colleagues);
  };

  const onSubmit = async (data: ExpenseFormData) => {
    try {
      setSaving(true);

      // Prepare metadata for type-specific fields
      const metadata: Record<string, any> = {};
      if (data.customer) metadata.customer = data.customer;
      if (data.colleagues) metadata.colleagues = data.colleagues;
      if (data.startLocation) metadata.startLocation = data.startLocation;
      if (data.endLocation) metadata.endLocation = data.endLocation;
      if (data.distance) metadata.distance = data.distance;

      const expenseData = {
        date: new Date(data.date),
        type: data.type,
        description: data.description,
        amount: data.amount,
        currency: data.currency,
        receiptUrl: data.receiptUrl,
        metadata: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : undefined,
      };

      if (expenseId) {
        await updateExpense(expenseId, expenseData);
        toast({
          title: "Expense updated",
          description: "The expense has been successfully updated.",
          variant: "success",
        });
      } else {
        await addExpense(expenseData);
        toast({
          title: "Expense added",
          description: "The expense has been successfully added to the report.",
          variant: "success",
        });
      }

      router.push(`/reports/${reportId}`);
    } catch (error) {
      toast({
        title: "Error saving expense",
        description: error instanceof Error ? error.message : "Failed to save expense",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xl text-foreground">Loading Form...</div>
      </div>
    );
  }

  // Check if this is a meal expense
  const isMealExpense = selectedType && ["LUNCH", "DINNER", "BREAKFAST"].includes(selectedType);
  
  // Check if this is a fuel expense
  const isFuelExpense = selectedType === "FUEL";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => router.push(`/reports/${reportId}`)}
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Report
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <ReceiptIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {expenseId ? "Edit Expense" : "New Expense"}
              </h1>
              <p className="text-muted-foreground">
                {receiptData ? "Review and confirm the extracted data" : "Enter expense details"}
              </p>
            </div>
          </div>

          {/* Receipt Preview */}
          {receiptData && (
            <Card className="p-4 bg-success/5 border-success/20">
              <div className="flex items-center space-x-2 mb-2">
                <ReceiptIcon className="w-4 h-4 text-success" />
                <span className="text-sm font-medium text-success">
                  Receipt attached and processed
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Data has been automatically extracted. Please review and adjust if needed.
              </p>
            </Card>
          )}

          {/* Basic Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                {...register("date")}
                className={errors.date ? "border-destructive" : ""}
              />
              {errors.date && (
                <p className="text-sm text-destructive">{errors.date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Expense Type *</Label>
              <Select
                value={watch("type")}
                onValueChange={(value: any) => setValue("type", value)}
              >
                <SelectTrigger className={errors.type ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select expense type..." />
                </SelectTrigger>
                <SelectContent>
                  {expenseTypes.map((type) => {
                    const displayName = type.replace('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
                    return (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center space-x-2">
                          <div 
                            className={`w-3 h-3 rounded-full bg-expense-${type.toLowerCase().replace('_', '-')}`}
                          />
                          <span>{displayName}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-sm text-destructive">{errors.type.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe the expense..."
              {...register("description")}
              className={errors.description ? "border-destructive" : ""}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("amount", { valueAsNumber: true })}
                className={errors.amount ? "border-destructive" : ""}
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={watch("currency")}
                onValueChange={(value) => setValue("currency", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Type-specific fields */}
          {isMealExpense && (
            <Card className="p-4 bg-muted/30">
              <div className="flex items-center space-x-2 mb-4">
                <UsersIcon className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-medium text-foreground">Meal Details</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer</Label>
                  <Input
                    id="customer"
                    placeholder="Customer name..."
                    {...register("customer")}
                    list="customer-suggestions"
                  />
                  <datalist id="customer-suggestions">
                    {customerSuggestions.map((customer) => (
                      <option key={customer} value={customer} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="colleagues">Colleagues</Label>
                  <Input
                    id="colleagues"
                    placeholder="Colleague names (comma separated)..."
                    {...register("colleagues")}
                    list="colleague-suggestions"
                  />
                  <datalist id="colleague-suggestions">
                    {colleagueSuggestions.map((colleague) => (
                      <option key={colleague} value={colleague} />
                    ))}
                  </datalist>
                </div>
              </div>
            </Card>
          )}

          {isFuelExpense && (
            <Card className="p-4 bg-muted/30">
              <div className="flex items-center space-x-2 mb-4">
                <MapPinIcon className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-medium text-foreground">Fuel Details</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startLocation">Start Location</Label>
                  <Input
                    id="startLocation"
                    placeholder="Starting address..."
                    {...register("startLocation")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endLocation">End Location</Label>
                  <Input
                    id="endLocation"
                    placeholder="Destination address..."
                    {...register("endLocation")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="distance">Distance (km)</Label>
                  <Input
                    id="distance"
                    type="number"
                    step="0.1"
                    placeholder="0.0"
                    {...register("distance", { valueAsNumber: true })}
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/reports/${reportId}`)}
            >
              Cancel
            </Button>
            
            <Button
              type="submit"
              disabled={saving}
              className="bg-primary hover:bg-primary-hover"
            >
              <SaveIcon className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : expenseId ? "Update Expense" : "Add Expense"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
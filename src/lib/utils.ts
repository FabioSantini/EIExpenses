import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format currency for display
export function formatCurrency(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: currency,
  }).format(amount);
}

// Format date for display
export function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("it-IT", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

// Format date for form inputs
export function formatDateForInput(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}

// Generate unique IDs
export function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Delay function for mock services
export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Get expense type color class
export function getExpenseTypeColorClass(type: string) {
  const normalizedType = type.toLowerCase().replace("_", "-");
  return `expense-${normalizedType}`;
}

// File size formatter
export function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
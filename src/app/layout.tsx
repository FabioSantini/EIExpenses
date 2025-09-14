import "./globals.css";
import { DataServiceProvider } from "@/services/data-service-provider";
import { Toaster } from "@/components/ui/toaster";

export const metadata = {
  title: "EI-Expenses",
  description: "Simplified expense tracking with receipt scanning and Excel export",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <DataServiceProvider>
          {children}
          <Toaster />
        </DataServiceProvider>
      </body>
    </html>
  );
}
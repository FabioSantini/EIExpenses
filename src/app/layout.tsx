import "./globals.css";
import { Providers } from "./providers";

export const dynamic = 'force-dynamic';

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
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
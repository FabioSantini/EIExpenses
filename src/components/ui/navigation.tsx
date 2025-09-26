"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { settingsService } from "@/services/settings-service";
import { Button } from "./button";
import {
  MenuIcon,
  PlusIcon,
  FileTextIcon,
  ReceiptIcon,
  DownloadIcon,
  HomeIcon,
  UserIcon,
  SettingsIcon,
  LogOutIcon
} from "lucide-react";

interface NavigationProps {
  currentPath: string;
}

export function Navigation({ currentPath }: NavigationProps) {
  const router = useRouter();
  const { data: session } = useSession();

  const navigationItems = [
    {
      href: "/reports",
      label: "Reports",
      icon: <FileTextIcon className="w-5 h-5" />,
      active: currentPath === "/reports" || currentPath === "/" || currentPath.startsWith("/reports/")
    },
    {
      href: "/upload",
      label: "Upload",
      icon: <ReceiptIcon className="w-5 h-5" />,
      active: currentPath === "/upload"
    },
    {
      href: "/export",
      label: "Export",
      icon: <DownloadIcon className="w-5 h-5" />,
      active: currentPath === "/export"
    },
    {
      href: "/settings",
      label: "Settings",
      icon: <SettingsIcon className="w-5 h-5" />,
      active: currentPath === "/settings"
    }
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">EI</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold text-gray-900">EI-Expenses</h1>
              <p className="text-xs text-gray-500 hidden sm:block">Expense Management</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-1">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                  item.active
                    ? "bg-primary text-primary-foreground"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* User Info & Actions */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:flex"
              onClick={() => router.push("/reports/new")}
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              New Report
            </Button>

            {session?.user && (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-3">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-medium text-gray-900">
                      {session.user.name || "User"}
                    </span>
                    <span className="text-xs text-gray-500">
                      {session.user.email}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const settings = settingsService.getSettings();
                      const automaticLogin = settings.authentication?.automaticLogin ?? true;

                      console.log("🚪 Logout clicked, automatic login:", automaticLogin);

                      // Use standard logout for both cases
                      // The automatic login difference is in the signin flow, not logout
                      console.log("🚪 Standard logout, automatic login:", automaticLogin);

                      signOut({
                        callbackUrl: "/auth/signin",
                        redirect: true
                      });
                    }}
                    className="flex items-center space-x-2"
                  >
                    <LogOutIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </Button>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t">
          <nav className="flex justify-around py-2">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center py-2 px-1 text-xs font-medium transition-colors ${
                  item.active
                    ? "text-primary"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {item.icon}
                <span className="mt-1">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Navigation;
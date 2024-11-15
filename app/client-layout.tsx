'use client';
import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <div className="relative min-h-screen bg-gradient-to-tl from-gray-100 to-gray-300 dark:from-gray-900 dark:to-gray-800">
      <div className="mx-auto max-w-screen-xl px-4 pb-6">
        <nav className="flex items-center justify-between py-4">
          <div className="flex items-center space-x-8">
            <Link
              href="/"
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                pathname === "/"
                  ? "text-black dark:text-white"
                  : "text-muted-foreground"
              )}
            >
              Home
            </Link>
            {user && (
              <Link
                href="/profile"
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  pathname === "/profile"
                    ? "text-black dark:text-white"
                    : "text-muted-foreground"
                )}
              >
                Profile
              </Link>
            )}
          </div>
        </nav>
        {children}
      </div>
    </div>
  );
} 
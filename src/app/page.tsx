import React from "react";
import ClientProvider from "@/components/ClientProvider";
import { HomePage } from "@/components/HomePage";

export const dynamic = "force-dynamic";

export default async function Page() {
  return (
    <div className="min-h-screen flex flex-col relative">
      <main className="flex-1 flex flex-col w-full mx-auto">
        <ClientProvider>
          <HomePage />
        </ClientProvider>
      </main>

      <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            © {new Date().getFullYear()} All Rights Reserved
          </span>
          <div className="flex items-center gap-6 text-sm text-neutral-600 dark:text-neutral-400">
            <a href="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400">
              Privacy Policy
            </a>
            <a href="/terms" className="hover:text-blue-600 dark:hover:text-blue-400">
              Terms of Service
            </a>
            <a href="/contact" className="hover:text-blue-600 dark:hover:text-blue-400">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

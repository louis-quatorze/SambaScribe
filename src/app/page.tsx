import React from "react";
import ClientProvider from "@/components/ClientProvider";
import { PdfUpload } from "@/components/PdfUpload";

export const dynamic = "force-dynamic";

export default async function Page() {
  return (
    <div className="min-h-screen flex flex-col relative">
      <main className="flex-1 flex flex-col w-full mx-auto">
        <ClientProvider>
          <div className="flex-1 flex items-start justify-center bg-gradient-to-b from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-950">
            <section className="max-w-7xl w-full space-y-8 animate-fade-in p-4">
              <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white">
                SambaScribe - PDF to Mnemonic Converter
              </h1>
              <p className="text-center text-gray-600 dark:text-gray-400">
                Upload your Samba notation PDF to generate helpful mnemonics
              </p>
              <PdfUpload />
            </section>
          </div>
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

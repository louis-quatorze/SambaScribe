"use client";

import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";

export default function VerifyContent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-950 px-4">
      <Link
        href="/"
        className="group absolute left-4 top-4 flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Back to Home
      </Link>

      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-brandBlue-500 to-brandBlue-700 dark:from-brandBlue-400 dark:to-brandBlue-600">
              Check Your Email
            </span>
          </h1>
          <p className="mt-3 text-neutral-600 dark:text-neutral-300">
            A sign in link has been sent to your email address.
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-neutral-800/50 p-8 shadow-xl">
          <div className="flex flex-col items-center justify-center space-y-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
              <Mail className="h-10 w-10 text-blue-600 dark:text-blue-300" />
            </div>
            <div className="space-y-2">
              <p className="text-neutral-700 dark:text-neutral-300">
                Click the link in the email to sign in. The link will expire in 24 hours.
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                If you don't see the email, check your spam folder.
              </p>
            </div>
            <Link 
              href="/auth/signin" 
              className="block w-full rounded-lg border border-neutral-300 dark:border-neutral-600 px-4 py-3 text-center text-neutral-700 dark:text-neutral-300 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 
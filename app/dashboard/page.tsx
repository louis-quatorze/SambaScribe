"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { SubscriptionManager } from "@/components/SubscriptionManager";
import { Header } from "@/components/Header";
import { ArrowLeft } from "lucide-react";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/dashboard");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-white dark:bg-gray-900">
        <div className="w-10 h-10 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect in the useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
            Dashboard
          </h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
            Welcome, {session.user?.name || session.user?.email}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Recent Analyses
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                You haven't analyzed any files yet. Upload a file from the home page to get started.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Account Settings
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-3">
                  <span className="text-gray-600 dark:text-gray-400">Email</span>
                  <span className="text-gray-900 dark:text-white">{session.user?.email}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-3">
                  <span className="text-gray-600 dark:text-gray-400">Name</span>
                  <span className="text-gray-900 dark:text-white">{session.user?.name || "Not set"}</span>
                </div>
                <div className="flex justify-between pb-3">
                  <span className="text-gray-600 dark:text-gray-400">Account Created</span>
                  <span className="text-gray-900 dark:text-white">
                    Not available
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <SubscriptionManager />
          </div>
        </div>
      </div>
    </div>
  );
} 
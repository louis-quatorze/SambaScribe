"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import { toast } from "react-toastify";

// Utility function to format date to YYYY-MM-DD
function formatDate(date: Date) {
  return date.toISOString().split('T')[0];
}

// Get date range for the last week
function getLastWeekRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  return { start, end };
}

// Function to safely display metadata
function formatMetadata(metadata: any): string {
  if (!metadata) return '-';
  
  try {
    // First check if it's a character-by-character object (has numeric keys 0,1,2,etc.)
    if (metadata && typeof metadata === 'object') {
      const keys = Object.keys(metadata);
      // Check if all keys are consecutive numbers starting from 0
      const isCharArray = keys.length > 0 && 
                        keys.every((key, index) => Number(key) === index);
      
      if (isCharArray) {
        // Convert the character array to a string
        const reconstructedString = Object.values(metadata).join('');
        console.log("Reconstructed string:", reconstructedString);
        
        try {
          // Check if the string is valid JSON
          if (reconstructedString.startsWith('{') || reconstructedString.startsWith('[')) {
            const parsedJson = JSON.parse(reconstructedString);
            
            // Remove email and userId from parsed JSON if they exist
            if (typeof parsedJson === 'object') {
              if ('email' in parsedJson) {
                delete parsedJson.email;
              }
              if ('userId' in parsedJson) {
                delete parsedJson.userId;
              }
            }
            
            return JSON.stringify(parsedJson, null, 2);
          }
          
          // If not JSON, return as is
          return reconstructedString;
        } catch (parseError) {
          console.error("Error parsing reconstructed string:", parseError);
          return reconstructedString;
        }
      }
    }
    
    // Handle regular objects
    if (metadata && typeof metadata === 'object') {
      const displayMetadata = { ...metadata };
      
      // Remove email and userId if they exist
      if ('email' in displayMetadata) {
        delete displayMetadata.email;
      }
      if ('userId' in displayMetadata) {
        delete displayMetadata.userId;
      }
      
      return JSON.stringify(displayMetadata, null, 2);
    }
    
    // Handle JSON strings
    if (typeof metadata === 'string' && (metadata.startsWith('{') || metadata.startsWith('['))) {
      try {
        const parsedJson = JSON.parse(metadata);
        
        // Remove email and userId if they exist
        if (typeof parsedJson === 'object') {
          if ('email' in parsedJson) {
            delete parsedJson.email;
          }
          if ('userId' in parsedJson) {
            delete parsedJson.userId;
          }
        }
        
        return JSON.stringify(parsedJson, null, 2);
      } catch (error) {
        // If parsing fails, just return the original string
        return metadata;
      }
    }
    
    // Default case - return as string
    return String(metadata);
  } catch (error) {
    console.error("Error formatting metadata:", error);
    return String(metadata);
  }
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState(getLastWeekRange());
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({});
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});
  const [logFileContent, setLogFileContent] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'database' | 'file'>('database');

  // Redirect if not admin or authorized user
  useEffect(() => {
    if (status === "authenticated") {
      // Only allow specific user email
      const authorizedEmail = "larivierlouise@gmail.com";
      const authorizedProvider = "google";
      
      if (session?.user?.email !== authorizedEmail) {
        toast.error("You do not have permission to access this page");
        redirect("/");
      }
    } else if (status === "unauthenticated") {
      redirect("/api/auth/signin");
    }
  }, [session, status]);

  // Fetch analytics data
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);

        // API call for fetching analytics data
        const response = await fetch(`/api/admin/analytics?start=${formatDate(dateRange.start)}&end=${formatDate(dateRange.end)}`);
        const data = await response.json();

        if (data.events) {
          // Sort events by timestamp in descending order (newest first)
          const sortedEvents = [...data.events].sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          
          setAnalyticsData(sortedEvents);
          setEventCounts(data.eventCounts || {});
          setUserCounts(data.userCounts || {});
        }

        // Get log file content if available
        try {
          const logResponse = await fetch('/api/admin/logs');
          if (logResponse.ok) {
            const logData = await logResponse.text();
            setLogFileContent(logData);
          }
        } catch (error) {
          console.error("Error fetching log file", error);
        }
      } catch (error) {
        console.error("Error fetching analytics data", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (status === "authenticated") {
      fetchData();
    }
  }, [dateRange, status]);

  // Handle date range changes
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateRange(prev => ({ ...prev, start: new Date(e.target.value) }));
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateRange(prev => ({ ...prev, end: new Date(e.target.value) }));
  };

  // Loading state
  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-4">Analytics Dashboard</h1>
          <div className="text-center py-12">Loading analytics data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Analytics Dashboard</h1>

        {/* Date range selector */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <h2 className="text-lg font-semibold mb-2">Date Range</h2>
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input
                type="date"
                value={formatDate(dateRange.start)}
                onChange={handleStartDateChange}
                className="px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input
                type="date"
                value={formatDate(dateRange.end)}
                onChange={handleEndDateChange}
                className="px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('database')}
              className={`py-2 px-4 ${
                activeTab === 'database'
                  ? 'border-b-2 border-blue-500 font-medium'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Database Records
            </button>
            <button
              onClick={() => setActiveTab('file')}
              className={`py-2 px-4 ${
                activeTab === 'file'
                  ? 'border-b-2 border-blue-500 font-medium'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Log Files
            </button>
          </div>
        </div>

        {/* Database analytics content */}
        {activeTab === 'database' && (
          <div>
            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <h3 className="text-lg font-semibold mb-2">Event Types</h3>
                <ul className="space-y-2">
                  {Object.entries(eventCounts).map(([type, count]) => (
                    <li key={type} className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{type}</span>
                      <span className="font-semibold">{count}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <h3 className="text-lg font-semibold mb-2">Most Active Users</h3>
                <ul className="space-y-2">
                  {Object.entries(userCounts)
                    .slice(0, 5)
                    .map(([userId, count]) => (
                      <li key={userId} className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">
                          {userId.length > 15 ? userId.substring(0, 15) + '...' : userId}
                        </span>
                        <span className="font-semibold">{count}</span>
                      </li>
                    ))}
                </ul>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <h3 className="text-lg font-semibold mb-2">Total Events</h3>
                <p className="text-3xl font-bold">{analyticsData.length}</p>
              </div>
            </div>

            {/* Events table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Target
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Metadata
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {analyticsData.map((event, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(event.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {event.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {event.target}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {event.userEmail || 
                           (event.metadata && typeof event.metadata === 'object' && event.metadata.email) || 
                           (event.userId?.substring(0, 8)) || 
                           'anonymous'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          <pre className="max-w-xs overflow-x-auto">
                            {formatMetadata(event.metadata)}
                          </pre>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {analyticsData.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  No analytics data available for the selected date range.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Log file content */}
        {activeTab === 'file' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-4">Analytics Log File</h3>
            {logFileContent ? (
              <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md overflow-x-auto text-sm max-h-[600px] overflow-y-auto">
                {logFileContent}
              </pre>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                No log file available or log file is empty.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 
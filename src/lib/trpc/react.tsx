"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  loggerLink,
  httpBatchStreamLink,
  createWSClient,
  wsLink,
  splitLink,
} from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { useState } from "react";
import SuperJSON from "superjson";

import { type AppRouter } from "@/lib/api/root";

const createQueryClient = () => new QueryClient();

let clientQueryClientSingleton: QueryClient | undefined = undefined;
const getQueryClient = () => {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return createQueryClient();
  }
  // Browser: use singleton pattern to keep the same query client
  return (clientQueryClientSingleton ??= createQueryClient());
};

export const api = createTRPCReact<AppRouter>();

// Create WebSocket client with error handling
let wsClient: ReturnType<typeof createWSClient> | undefined;

// Only try to create WebSocket client if we're in the browser
if (typeof window !== "undefined") {
  try {
    const wsUrl = process.env.NODE_ENV === "development"
      ? "ws://localhost:3001"
      : `wss://${window.location.host}`;
    
    // Add event listeners to handle WebSocket errors silently
    const ws = new WebSocket(wsUrl);
    ws.addEventListener('error', (e) => {
      console.log('WebSocket connection error handled silently:', e);
      ws.close();
    });
    
    // Only create the client if WebSocket connected successfully
    ws.addEventListener('open', () => {
      try {
        wsClient = createWSClient({
          url: wsUrl,
          // Add WebSocket options for better error handling
          retryDelayMs: () => 5000, // Retry every 5 seconds
          onClose() {
            console.log('WebSocket connection closed');
          },
        });
        console.log('WebSocket client created successfully');
      } catch (wsError) {
        console.log('Error creating WebSocket client:', wsError);
      }
    });
  } catch (error) {
    console.log('WebSocket setup error (handled):', error);
  }
}

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        loggerLink({
          enabled: (op) =>
            process.env.NODE_ENV === "development" ||
            (op.direction === "down" && op.result instanceof Error),
        }),
        // Always use HTTP batch link as fallback when WebSocket isn't available
        httpBatchStreamLink({
          transformer: SuperJSON,
          url: getBaseUrl() + "/api/trpc",
          headers: () => {
            const headers = new Headers();
            headers.set("x-trpc-source", "nextjs-react");
            return headers;
          },
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {props.children}
      </api.Provider>
    </QueryClientProvider>
  );
}

function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

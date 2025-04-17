import { createCallerFactory, createTRPCRouter } from "./trpc";
import { pdfAnalyzerRouter } from "./routers/pdfAnalyzer"; // Import the new router
// import all routers here

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  // add routers here
  pdfAnalyzer: pdfAnalyzerRouter, // Add the new router
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);

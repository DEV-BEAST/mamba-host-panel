import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import superjson from 'superjson';

// Define the context type that matches the API
export interface Context {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

// Initialize tRPC for type extraction only
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

// Define the router structure for type inference
// This MUST match the actual router in apps/api/src/trpc/trpc.router.ts
const appRouter = t.router({
  users: t.router({
    getProfile: t.procedure.query(async () => {
      // Type-only - never called at runtime
      return {} as any;
    }),
  }),
  servers: t.router({
    list: t.procedure.query(async () => {
      // Type-only - never called at runtime
      return [] as any;
    }),
    getById: t.procedure
      .input(z.object({ id: z.string() }))
      .query(async () => {
        // Type-only - never called at runtime
        return {} as any;
      }),
  }),
});

// Export the router type for client usage
export type AppRouter = typeof appRouter;

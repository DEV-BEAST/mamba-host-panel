import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@mambaPanel/api/src/trpc/trpc.router';

export const trpc = createTRPCReact<AppRouter>();

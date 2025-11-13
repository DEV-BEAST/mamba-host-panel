import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@mambaPanel/api-types';

export const trpc = createTRPCReact<AppRouter>();

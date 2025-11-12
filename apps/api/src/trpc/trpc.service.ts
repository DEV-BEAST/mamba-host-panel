import { Injectable } from '@nestjs/common';
import { initTRPC } from '@trpc/server';
import superjson from 'superjson';

export interface Context {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

@Injectable()
export class TrpcService {
  trpc = initTRPC.context<Context>().create({
    transformer: superjson,
  });

  procedure = this.trpc.procedure;
  router = this.trpc.router;
  middleware = this.trpc.middleware;
}

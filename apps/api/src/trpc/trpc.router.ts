import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { initTRPC } from '@trpc/server';
import superjson from 'superjson';
import { TrpcService, Context } from './trpc.service';
import { UsersService } from '../users/users.service';
import { ServersService } from '../servers/servers.service';

// Initialize tRPC once for type stability
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

// Create a dummy router for type extraction
// This will be replaced at runtime by the NestJS service
const dummyRouter = t.router({
  users: t.router({
    getProfile: t.procedure.query(async () => {
      throw new Error('Not implemented - use runtime router');
    }),
  }),
  servers: t.router({
    list: t.procedure.query(async () => {
      throw new Error('Not implemented - use runtime router');
    }),
    getById: t.procedure
      .input(z.object({ id: z.string() }))
      .query(async () => {
        throw new Error('Not implemented - use runtime router');
      }),
  }),
});

// Export the type from the dummy router
export type AppRouter = typeof dummyRouter;

@Injectable()
export class TrpcRouter {
  private _appRouter: any = null;

  constructor(
    private readonly trpc: TrpcService,
    private readonly usersService: UsersService,
    private readonly serversService: ServersService
  ) {}

  get appRouter() {
    if (!this._appRouter) {
      this._appRouter = this.trpc.router({
        users: this.trpc.router({
          getProfile: this.trpc.procedure.query(async ({ ctx }) => {
            if (!ctx.user) {
              throw new Error('Unauthorized');
            }
            return this.usersService.findById(ctx.user.userId);
          }),
        }),
        servers: this.trpc.router({
          list: this.trpc.procedure.query(async ({ ctx }) => {
            if (!ctx.user) {
              throw new Error('Unauthorized');
            }
            return this.serversService.findAll(ctx.user.userId);
          }),
          getById: this.trpc.procedure
            .input(z.object({ id: z.string() }))
            .query(async ({ input, ctx }) => {
              if (!ctx.user) {
                throw new Error('Unauthorized');
              }
              return this.serversService.findById(ctx.user.userId, input.id);
            }),
        }),
      });
    }
    return this._appRouter;
  }
}

import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { TrpcService } from './trpc.service';
import { UsersService } from '../users/users.service';
import { ServersService } from '../servers/servers.service';

@Injectable()
export class TrpcRouter {
  private _appRouter: ReturnType<TrpcService['router']> | null = null;

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

export type AppRouter = TrpcRouter['appRouter'];

import { Module, Global } from '@nestjs/common';
import { ResourceAllocator } from './allocator';
import type { Database } from '@mambaPanel/db';

/**
 * Symbol for injecting the ResourceAllocator
 */
export const RESOURCE_ALLOCATOR = Symbol('RESOURCE_ALLOCATOR');

/**
 * Symbol for injecting the database instance
 */
export const ALLOC_DATABASE = Symbol('ALLOC_DATABASE');

/**
 * Decorator for injecting ResourceAllocator
 */
export const InjectAllocator = () => {
  const inject = require('@nestjs/common').Inject;
  return inject(RESOURCE_ALLOCATOR);
};

/**
 * Global module that provides the ResourceAllocator
 */
@Global()
@Module({})
export class AllocModule {
  static forRoot(db: Database) {
    return {
      module: AllocModule,
      providers: [
        {
          provide: ALLOC_DATABASE,
          useValue: db,
        },
        {
          provide: RESOURCE_ALLOCATOR,
          useFactory: (database: Database) => {
            return new ResourceAllocator(database);
          },
          inject: [ALLOC_DATABASE],
        },
      ],
      exports: [RESOURCE_ALLOCATOR],
    };
  }
}

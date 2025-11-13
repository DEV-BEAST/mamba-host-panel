import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { InjectDrizzle } from './database/database.module';
import type { NodeDatabase } from '@mambaPanel/db';
import { nodes } from '@mambaPanel/db';
import { eq } from '@mambaPanel/db';

/**
 * mTLS Middleware for Wings Node Authentication
 *
 * This middleware validates that requests to Wings-specific endpoints
 * come from authenticated Wings nodes using client certificates.
 *
 * It:
 * 1. Verifies that a client certificate is present
 * 2. Extracts the node ID from the certificate CN
 * 3. Verifies the certificate fingerprint matches the database
 * 4. Attaches the authenticated node to the request
 */

export interface AuthenticatedNode {
  id: string;
  name: string;
  fqdn: string;
  certFingerprint: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    node?: AuthenticatedNode;
  }
}

@Injectable()
export class MTLSMiddleware implements NestMiddleware {
  constructor(@InjectDrizzle() private readonly db: NodeDatabase) {}

  async use(req: FastifyRequest, res: FastifyReply, next: () => void) {
    try {
      // Check if this route requires mTLS
      // Only apply to /wings/* endpoints
      const path = req.url;
      if (!path.startsWith('/wings/')) {
        return next();
      }

      // Get client certificate from TLS socket
      const socket = req.raw.socket as any;

      if (!socket.getPeerCertificate) {
        throw new UnauthorizedException('mTLS is required for this endpoint');
      }

      const cert = socket.getPeerCertificate();

      // Check if certificate is present and authorized
      if (!cert || Object.keys(cert).length === 0) {
        throw new UnauthorizedException(
          'Client certificate is required for Wings endpoints'
        );
      }

      // Extract node ID from certificate Common Name (CN)
      // Expected format: CN=<node-id>
      const subject = cert.subject;
      const nodeId = subject?.CN;

      if (!nodeId) {
        throw new UnauthorizedException(
          'Client certificate does not contain node ID in CN'
        );
      }

      // Calculate certificate fingerprint
      const fingerprint = cert.fingerprint256 || cert.fingerprint;

      if (!fingerprint) {
        throw new UnauthorizedException('Unable to extract certificate fingerprint');
      }

      // Normalize fingerprint (remove colons, uppercase)
      const normalizedFingerprint = fingerprint.replace(/:/g, '').toUpperCase();

      // Lookup node in database
      const [node] = await this.db
        .select()
        .from(nodes)
        .where(eq(nodes.id, nodeId))
        .limit(1);

      if (!node) {
        throw new UnauthorizedException(`Node ${nodeId} not found in database`);
      }

      // Verify certificate fingerprint matches database
      if (node.certFingerprint) {
        const dbFingerprint = node.certFingerprint.replace(/:/g, '').toUpperCase();

        if (dbFingerprint !== normalizedFingerprint) {
          throw new UnauthorizedException(
            `Certificate fingerprint mismatch for node ${nodeId}`
          );
        }
      } else {
        // If no fingerprint in database, this is the first connection
        // Update the database with the fingerprint
        await this.db
          .update(nodes)
          .set({ certFingerprint: fingerprint })
          .where(eq(nodes.id, nodeId));
      }

      // Attach authenticated node to request
      req.node = {
        id: node.id,
        name: node.name,
        fqdn: node.fqdn,
        certFingerprint: fingerprint,
      };

      next();
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('mTLS authentication failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }
}

/**
 * Decorator to get the authenticated node from the request
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const AuthNode = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest>();
    return request.node;
  }
);

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

@Injectable()
export class MtlsAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    // Check if client certificate is present
    const socket = request.raw.socket as any;
    const cert = socket.getPeerCertificate?.(false);

    if (!cert || Object.keys(cert).length === 0) {
      throw new UnauthorizedException('Client certificate required');
    }

    // Extract node ID from certificate CN (Common Name)
    // CN format: "node-{nodeId}"
    const subject = cert.subject;
    if (!subject || !subject.CN) {
      throw new UnauthorizedException('Invalid certificate subject');
    }

    const match = subject.CN.match(/^node-(.+)$/);
    if (!match) {
      throw new UnauthorizedException('Invalid certificate CN format');
    }

    // Attach node ID to request
    (request as any).nodeId = match[1];
    (request as any).cert = cert;

    return true;
  }
}

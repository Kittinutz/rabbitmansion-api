import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';

/**
 * Admin Guard - Placeholder Implementation
 *
 * TODO: Implement proper JWT token verification
 * - Verify JWT token from Authorization header
 * - Check user role is 'ADMIN'
 * - Validate token expiration
 * - Handle refresh tokens
 *
 * Current implementation: Bypass authentication for development
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const authHeader = request.headers.authorization;

    // TODO: Replace this with actual JWT verification
    // For now, just check if Authorization header exists
    // if (!authHeader) {
    //   throw new UnauthorizedException(
    //     'Authorization header required. Admin access only.',
    //   );
    // }

    // TODO: Implement JWT token verification here
    // Example:
    // const token = authHeader.replace('Bearer ', '');
    // const decoded = this.jwtService.verify(token);
    // if (decoded.role !== 'ADMIN') {
    //   throw new ForbiddenException('Admin access required');
    // }
    // request.user = decoded;

    // Bypass for development - REMOVE IN PRODUCTION
    console.warn('⚠️  AdminGuard: Bypassing authentication (development mode)');
    return true;
  }
}

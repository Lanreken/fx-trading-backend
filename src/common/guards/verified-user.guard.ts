import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { requireUuid } from '../utils/validation';
import { UsersService } from '../../users/users.service';

@Injectable()
export class VerifiedUserGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Record<string, any>>();
    const rawUserId = request.headers['x-user-id'];

    if (rawUserId === undefined) {
      throw new UnauthorizedException('x-user-id header is required');
    }

    const userId = requireUuid(rawUserId, 'x-user-id');

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException('User must verify their email before using wallet features');
    }

    request.user = user;
    return true;
  }
}

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { MembershipsService } from '../memberships.service';
import { isUUID } from 'class-validator';

@Injectable()
export class OrgAccessGuard implements CanActivate {
  constructor(private membershipsService: MembershipsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const orgId = request.params.orgId;

    // Validate UUID
    if (!orgId || !isUUID(orgId)) {
      throw new NotFoundException();
    }

    const userId = request['user']?.sub;
    if (!userId) {
      throw new NotFoundException();
    }

    // Check membership
    const membership = await this.membershipsService.findMembershipForUser(
      userId,
      orgId,
    );

    if (!membership) {
      throw new NotFoundException();
    }

    // Attach membership to request
    request['membership'] = membership;

    return true;
  }
}

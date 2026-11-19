import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { OrgAccessGuard } from './guards/org-access.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { MembershipRole } from './role.enum';
import { MembershipsService } from './memberships.service';
import { AddMemberDto } from './dto/add-member.dto';

@Controller('organizations/:orgId/members')
@UseGuards(AuthGuard, OrgAccessGuard, RolesGuard)
export class MembershipsController {
  constructor(private membershipsService: MembershipsService) {}

  @Get()
  findMembers(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.membershipsService.findMembers(orgId);
  }

  @Post()
  @Roles(MembershipRole.ADMIN)
  addMember(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() addMemberDto: AddMemberDto,
  ) {
    return this.membershipsService.addMember(orgId, addMemberDto);
  }
}

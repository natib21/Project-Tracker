import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { OrgAccessGuard } from '../memberships/guards/org-access.guard';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';

@Controller('organizations')
@UseGuards(AuthGuard)
export class OrganizationsController {
  constructor(private organizationsService: OrganizationsService) {}

  @Post()
  create(@Req() req: Request, @Body() createOrganizationDto: CreateOrganizationDto) {
    const userId = req['user'].sub;
    return this.organizationsService.create(userId, createOrganizationDto);
  }

  @Get()
  findAll(@Req() req: Request) {
    const userId = req['user'].sub;
    return this.organizationsService.findAllForUser(userId);
  }

  // Only members may read an organization. A non-member gets the same 404
  // as for an id that does not exist, so ids cannot be probed.
  @Get(':orgId')
  @UseGuards(OrgAccessGuard)
  findOne(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.organizationsService.findOne(orgId);
  }
}

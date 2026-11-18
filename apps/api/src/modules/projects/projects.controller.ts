import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { OrgAccessGuard } from '../memberships/guards/org-access.guard';
import { RolesGuard } from '../memberships/guards/roles.guard';
import { Roles } from '../memberships/decorators/roles.decorator';
import { MembershipRole } from '../memberships/role.enum';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Controller('organizations/:orgId/projects')
@UseGuards(AuthGuard, OrgAccessGuard, RolesGuard)
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Post()
  @Roles(MembershipRole.ADMIN)
  create(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() createProjectDto: CreateProjectDto,
  ) {
    return this.projectsService.create(orgId, createProjectDto);
  }

  @Get()
  findAll(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.projectsService.findAll(orgId);
  }

  @Get(':projectId')
  findOne(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.projectsService.findOne(orgId, projectId);
  }

  @Patch(':projectId')
  @Roles(MembershipRole.ADMIN)
  update(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectsService.update(orgId, projectId, updateProjectDto);
  }

  @Delete(':projectId')
  @Roles(MembershipRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    await this.projectsService.remove(orgId, projectId);
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
  ) {}

  async create(orgId: string, createProjectDto: CreateProjectDto): Promise<Project> {
    const project = this.projectRepository.create({
      ...createProjectDto,
      organizationId: orgId,
    });

    return this.projectRepository.save(project);
  }

  async findAll(orgId: string): Promise<Project[]> {
    return this.projectRepository.find({
      where: { organizationId: orgId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(orgId: string, projectId: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: {
        id: projectId,
        organizationId: orgId,
      },
    });

    if (!project) {
      throw new NotFoundException();
    }

    return project;
  }

  async update(
    orgId: string,
    projectId: string,
    updateProjectDto: UpdateProjectDto,
  ): Promise<Project> {
    const project = await this.findOne(orgId, projectId);

    Object.assign(project, updateProjectDto);

    return this.projectRepository.save(project);
  }

  async remove(orgId: string, projectId: string): Promise<void> {
    const project = await this.findOne(orgId, projectId);
    await this.projectRepository.remove(project);
  }
}

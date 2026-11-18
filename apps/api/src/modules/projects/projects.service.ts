import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

export interface ProjectWithBudgetSummary extends Project {
  spent: number;
  remaining: number;
  overBudget: boolean;
}

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
  ) {}

  private async addBudgetSummary(project: Project): Promise<ProjectWithBudgetSummary> {
    const result = await this.projectRepository
      .createQueryBuilder('project')
      .leftJoin('project.tasks', 'task')
      .select('project')
      .addSelect('COALESCE(SUM(task.estimatedCost), 0)', 'spent')
      .where('project.id = :projectId', { projectId: project.id })
      .groupBy('project.id')
      .getRawAndEntities();

    const spent = parseFloat(result.raw[0]?.spent || '0');
    const remaining = Number(project.budget) - spent;

    return {
      ...project,
      spent,
      remaining,
      overBudget: spent > Number(project.budget),
    };
  }

  private async addBudgetSummaryToList(projects: Project[]): Promise<ProjectWithBudgetSummary[]> {
    if (projects.length === 0) {
      return [];
    }

    const projectIds = projects.map(p => p.id);

    // ONE aggregated query for all projects
    const spentByProject = await this.projectRepository
      .createQueryBuilder('project')
      .leftJoin('project.tasks', 'task')
      .select('project.id', 'projectId')
      .addSelect('COALESCE(SUM(task.estimatedCost), 0)', 'spent')
      .where('project.id IN (:...projectIds)', { projectIds })
      .groupBy('project.id')
      .getRawMany();

    const spentMap = new Map(
      spentByProject.map(row => [row.projectId, parseFloat(row.spent)])
    );

    return projects.map(project => {
      const spent = spentMap.get(project.id) || 0;
      const remaining = Number(project.budget) - spent;

      return {
        ...project,
        spent,
        remaining,
        overBudget: spent > Number(project.budget),
      };
    });
  }

  async create(orgId: string, createProjectDto: CreateProjectDto): Promise<ProjectWithBudgetSummary> {
    const project = this.projectRepository.create({
      ...createProjectDto,
      organizationId: orgId,
    });

    const saved = await this.projectRepository.save(project);
    return this.addBudgetSummary(saved);
  }

  async findAll(orgId: string): Promise<ProjectWithBudgetSummary[]> {
    const projects = await this.projectRepository.find({
      where: { organizationId: orgId },
      order: { createdAt: 'DESC' },
    });

    return this.addBudgetSummaryToList(projects);
  }

  async findOne(orgId: string, projectId: string): Promise<ProjectWithBudgetSummary> {
    const project = await this.projectRepository.findOne({
      where: {
        id: projectId,
        organizationId: orgId,
      },
    });

    if (!project) {
      throw new NotFoundException();
    }

    return this.addBudgetSummary(project);
  }

  async update(
    orgId: string,
    projectId: string,
    updateProjectDto: UpdateProjectDto,
  ): Promise<ProjectWithBudgetSummary> {
    const project = await this.projectRepository.findOne({
      where: {
        id: projectId,
        organizationId: orgId,
      },
    });

    if (!project) {
      throw new NotFoundException();
    }

    Object.assign(project, updateProjectDto);

    const saved = await this.projectRepository.save(project);
    return this.addBudgetSummary(saved);
  }

  async remove(orgId: string, projectId: string): Promise<void> {
    const project = await this.projectRepository.findOne({
      where: {
        id: projectId,
        organizationId: orgId,
      },
    });

    if (!project) {
      throw new NotFoundException();
    }

    await this.projectRepository.remove(project);
  }
}

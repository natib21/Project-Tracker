import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { Project } from '../projects/entities/project.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
  ) {}

  async create(
    orgId: string,
    projectId: string,
    createTaskDto: CreateTaskDto,
  ): Promise<Task> {
    // Verify project exists in this org
    const project = await this.projectRepository.findOne({
      where: {
        id: projectId,
        organizationId: orgId,
      },
    });

    if (!project) {
      throw new NotFoundException();
    }

    const task = this.taskRepository.create({
      ...createTaskDto,
      projectId,
      organizationId: orgId,
    });

    return this.taskRepository.save(task);
  }

  async findAll(orgId: string, projectId: string): Promise<Task[]> {
    // Verify project exists in this org
    const project = await this.projectRepository.findOne({
      where: {
        id: projectId,
        organizationId: orgId,
      },
    });

    if (!project) {
      throw new NotFoundException();
    }

    return this.taskRepository.find({
      where: {
        projectId,
        organizationId: orgId,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(
    orgId: string,
    projectId: string,
    taskId: string,
  ): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: {
        id: taskId,
        projectId,
        organizationId: orgId,
      },
    });

    if (!task) {
      throw new NotFoundException();
    }

    return task;
  }

  async update(
    orgId: string,
    projectId: string,
    taskId: string,
    updateTaskDto: UpdateTaskDto,
  ): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: {
        id: taskId,
        projectId,
        organizationId: orgId,
      },
    });

    if (!task) {
      throw new NotFoundException();
    }

    Object.assign(task, updateTaskDto);

    return this.taskRepository.save(task);
  }

  async remove(orgId: string, projectId: string, taskId: string): Promise<void> {
    const task = await this.taskRepository.findOne({
      where: {
        id: taskId,
        projectId,
        organizationId: orgId,
      },
    });

    if (!task) {
      throw new NotFoundException();
    }

    await this.taskRepository.remove(task);
  }
}

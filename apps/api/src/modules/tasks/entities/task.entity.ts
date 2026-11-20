import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index, Check,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { Organization } from '../../organizations/entities/organization.entity';

@Entity('tasks')
@Index('IDX_tasks_projectId', ['projectId'])
@Index('IDX_tasks_organizationId', ['organizationId'])
@Index('IDX_tasks_org_priority', ['organizationId', 'priority'])
@Check('CHK_tasks_estimatedCost', '"estimatedCost" >= 0')
@Check('CHK_tasks_priority', `"priority" IN ('low','medium','high')`)
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId', foreignKeyConstraintName: 'FK_tasks_projectId' })
  project: Project;

  @Column({ type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId', foreignKeyConstraintName: 'FK_tasks_organizationId' })
  organization: Organization;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column('decimal', { precision: 14, scale: 2 })
  estimatedCost: number;

  @Column({ type: 'varchar', default: 'medium' })
  priority: 'low' | 'medium' | 'high';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
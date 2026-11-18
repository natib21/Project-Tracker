import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column('decimal', { precision: 14, scale: 2 })
  budget: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

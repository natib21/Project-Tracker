import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { MembershipRole } from '../role.enum';

@Entity('memberships')
@Unique('UQ_memberships_userId_organizationId', ['userId', 'organizationId'])
@Index('IDX_memberships_userId', ['userId'])
@Index('IDX_memberships_organizationId', ['organizationId'])
export class Membership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: MembershipRole,
    default: MembershipRole.MEMBER,
  })
  role: MembershipRole;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'FK_memberships_userId',
  })
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'organizationId',
    foreignKeyConstraintName: 'FK_memberships_organizationId',
  })
  organization: Organization;

  @Column({ type: 'uuid' })
  organizationId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

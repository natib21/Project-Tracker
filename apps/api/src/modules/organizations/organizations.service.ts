import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { Membership } from '../memberships/entities/membership.entity';
import { MembershipRole } from '../memberships/role.enum';
import { CreateOrganizationDto } from './dto/create-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    private dataSource: DataSource,
  ) {}

  async create(userId: string, createOrganizationDto: CreateOrganizationDto) {
    return this.dataSource.transaction(async (manager) => {
      // Create organization
      const organization = manager.create(Organization, createOrganizationDto);
      await manager.save(organization);

      // Create admin membership for creator
      const membership = manager.create(Membership, {
        userId,
        organizationId: organization.id,
        role: MembershipRole.ADMIN,
      });
      await manager.save(membership);

      return organization;
    });
  }

async findAllForUser(userId: string) {
  const membershipRepo = this.dataSource.getRepository(Membership);

  // Only the organizations this user belongs to (the isolation rule)
  const memberships = await membershipRepo.find({
    where: { userId },
    relations: { organization: true },
  });
  if (memberships.length === 0) return [];

  const orgIds = memberships.map((m) => m.organizationId);
  const counts = await membershipRepo
    .createQueryBuilder('m')
    .select('m."organizationId"', 'organizationId')
    .addSelect('COUNT(*)', 'count')
    .where('m."organizationId" IN (:...orgIds)', { orgIds })
    .groupBy('m."organizationId"')
    .getRawMany();

  const countByOrg = new Map(counts.map((c) => [c.organizationId, Number(c.count)]));

  return memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    description: m.organization.description,
    role: m.role,
    memberCount: countByOrg.get(m.organizationId) ?? 0,
  }));
}

  async findOne(orgId: string): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({
      where: { id: orgId },
    });

    if (!organization) {
      throw new NotFoundException();
    }

    return organization;
  }
}

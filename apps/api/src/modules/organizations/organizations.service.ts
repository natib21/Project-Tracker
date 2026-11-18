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

  async findAllForUser(userId: string): Promise<Organization[]> {
    return this.organizationRepository
      .createQueryBuilder('organization')
      .innerJoin(
        'organization.memberships',
        'membership',
        'membership.userId = :userId',
        { userId },
      )
      .getMany();
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

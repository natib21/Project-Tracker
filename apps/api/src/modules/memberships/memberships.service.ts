import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Membership } from './entities/membership.entity';
import { User } from '../users/entities/user.entity';
import { AddMemberDto } from './dto/add-member.dto';

@Injectable()
export class MembershipsService {
  constructor(
    @InjectRepository(Membership)
    private membershipRepository: Repository<Membership>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findMembers(orgId: string) {
    return this.membershipRepository.find({
      where: { organizationId: orgId },
      relations: ['user'],
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    });
  }

  async addMember(orgId: string, addMemberDto: AddMemberDto) {
    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email: addMemberDto.email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check for existing membership
    const existing = await this.membershipRepository.findOne({
      where: {
        userId: user.id,
        organizationId: orgId,
      },
    });

    if (existing) {
      throw new ConflictException('User is already a member');
    }

    // Create membership
    const membership = this.membershipRepository.create({
      userId: user.id,
      organizationId: orgId,
      role: addMemberDto.role,
    });

    await this.membershipRepository.save(membership);

    // Return membership with user data
    return this.membershipRepository.findOne({
      where: { id: membership.id },
      relations: ['user'],
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    });
  }

  async findMembershipForUser(userId: string, orgId: string): Promise<Membership | null> {
    return this.membershipRepository.findOne({
      where: {
        userId,
        organizationId: orgId,
      },
    });
  }
}

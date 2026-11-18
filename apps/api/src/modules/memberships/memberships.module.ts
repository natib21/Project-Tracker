import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { Membership } from './entities/membership.entity';
import { MembershipsController } from './memberships.controller';
import { MembershipsService } from './memberships.service';
import { OrgAccessGuard } from './guards/org-access.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Membership]),
    UsersModule,
  ],
  controllers: [MembershipsController],
  providers: [MembershipsService, OrgAccessGuard, RolesGuard],
  exports: [TypeOrmModule, OrgAccessGuard, RolesGuard],
})
export class MembershipsModule {}

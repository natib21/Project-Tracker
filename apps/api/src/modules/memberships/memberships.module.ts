import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { Membership } from './entities/membership.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Membership]),
    UsersModule,
  ],
  exports: [TypeOrmModule],
})
export class MembershipsModule {}

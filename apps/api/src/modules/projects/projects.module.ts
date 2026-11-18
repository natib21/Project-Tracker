import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { Project } from './entities/project.entity';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project]),
    AuthModule,
    MembershipsModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [TypeOrmModule],
})
export class ProjectsModule {}

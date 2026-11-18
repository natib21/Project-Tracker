import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { MembershipsModule } from './modules/memberships/memberships.module';
import { ProjectsModule } from './modules/projects/projects.module';

// 'ts' when running from source (dev, tests), 'js' when running compiled code (Docker)
const ext = __filename.endsWith('.ts') ? 'ts' : 'js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(process.cwd(), '.env'),
        join(process.cwd(), '..', '..', '.env'),
      ],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.getOrThrow<string>('DATABASE_URL'),
        ssl:
          configService.get<string>('DATABASE_SSL') === 'true'
            ? { rejectUnauthorized: false }
            : false,
        synchronize: false,
        logging: configService.get<string>('LOG_SQL') === 'true',
        entities: [join(__dirname, 'modules', '**', 'entities', `*.entity.${ext}`)],
        migrations: [join(__dirname, 'database', 'migrations', `*.${ext}`)],
      }),
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'public'),
      exclude: ['/api*'],
    }),
    UsersModule,
    OrganizationsModule,
    MembershipsModule,
    ProjectsModule,
    AuthModule,
    HealthModule,
  ],
})
export class AppModule {}
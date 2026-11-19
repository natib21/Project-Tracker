import 'reflect-metadata';
import { config } from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../modules/users/entities/user.entity';
import { Organization } from '../modules/organizations/entities/organization.entity';
import { Membership } from '../modules/memberships/entities/membership.entity';
import { MembershipRole } from '../modules/memberships/role.enum';
import { Project } from '../modules/projects/entities/project.entity';
import { Task } from '../modules/tasks/entities/task.entity';

// Load .env from repo root (local dev). Real env vars take precedence (e.g. Neon).
config({ path: join(__dirname, '..', '..', '..', '..', '.env') });

const BCRYPT_ROUNDS = 12; // Keep equal to AuthService
const DEMO_PASSWORD = 'Demo12345!'; // Min 8 chars to match validation
const ADMIN_EMAIL = 'demo.admin@example.com';
const MEMBER_EMAIL = 'demo.member@example.com';

const etb = (n: number) => `${n.toLocaleString('en-US')} ETB`;

async function seed() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  const dbHost = new URL(process.env.DATABASE_URL).host;
  console.log(`Seeding database on host: ${dbHost}\n`);

  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    synchronize: false,
    logging: false,
    entities: [User, Organization, Membership, Project, Task],
  });

  await dataSource.initialize();

  try {
    await dataSource.transaction(async (manager) => {
      const existing = await manager.findOne(User, { where: { email: ADMIN_EMAIL } });

      if (existing) {
        console.log('✓ Seed data already exists, nothing to do');
        return;
      }

      console.log('Creating seed data...\n');

      const password = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

      const admin = await manager.save(
        manager.create(User, {
          email: ADMIN_EMAIL,
          password,
          firstName: 'Demo',
          lastName: 'Admin',
        }),
      );
      console.log(`✓ Created admin user: ${ADMIN_EMAIL}`);

      const member = await manager.save(
        manager.create(User, {
          email: MEMBER_EMAIL,
          password,
          firstName: 'Demo',
          lastName: 'Member',
        }),
      );
      console.log(`✓ Created member user: ${MEMBER_EMAIL}`);

      const org = await manager.save(
        manager.create(Organization, {
          name: 'Demo Organization',
        }),
      );
      console.log(`✓ Created organization: ${org.name}`);

      await manager.save(
        manager.create(Membership, {
          userId: admin.id,
          organizationId: org.id,
          role: MembershipRole.ADMIN,
        }),
      );
      console.log(`✓ Added ${ADMIN_EMAIL} as admin to ${org.name}`);

      await manager.save(
        manager.create(Membership, {
          userId: member.id,
          organizationId: org.id,
          role: MembershipRole.MEMBER,
        }),
      );
      console.log(`✓ Added ${MEMBER_EMAIL} as member to ${org.name}`);

      const project = await manager.save(
        manager.create(Project, {
          organizationId: org.id,
          name: 'Website Redesign',
          description: 'Sample project to demonstrate the tracker',
          budget: 500000,
        }),
      );
      console.log(`✓ Created project: ${project.name} (budget: ${etb(500000)})`);

      const tasks = [
        {
          title: 'Design UI mockups',
          description: 'Create wireframes and high-fidelity designs',
          estimatedCost: 85000,
        },
        {
          title: 'Implement authentication',
          description: 'Set up user registration, login, and JWT auth',
          estimatedCost: 140000,
        },
        {
          title: 'Build dashboard',
          description: 'Create main dashboard with project overview',
          estimatedCost: 120000,
        },
        {
          title: 'Write documentation',
          description: 'Document all API endpoints and user guides',
          estimatedCost: 55000,
        },
      ];

      for (const t of tasks) {
        await manager.save(
          manager.create(Task, {
            ...t,
            projectId: project.id,
            organizationId: org.id,
          }),
        );
        console.log(`✓ Created task: ${t.title} (${etb(t.estimatedCost)})`);
      }

      const total = tasks.reduce((sum, t) => sum + t.estimatedCost, 0);
      const remaining = project.budget - total;

      console.log(`\n✓ Total estimated cost: ${etb(total)}`);
      console.log(`✓ Remaining budget: ${etb(remaining)}`);
      console.log('✓ Project is within budget\n');
    });

    console.log('=== Demo Credentials ===');
    console.log(`Admin:  ${ADMIN_EMAIL} / ${DEMO_PASSWORD}`);
    console.log(`Member: ${MEMBER_EMAIL} / ${DEMO_PASSWORD}`);
    console.log('========================\n');

    console.log('✓ Seed completed successfully!');
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((error) => {
  console.error('✗ Seed failed:', error);
  process.exit(1);
});

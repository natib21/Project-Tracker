import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';

describe('Projects (e2e)', () => {
  let app: INestApplication;
  let userAToken: string;
  let userBToken: string;
  let orgAId: string;
  let orgBId: string;
  let projectAId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.use(cookieParser(process.env.COOKIE_SECRET));
    await app.init();

    // Register and login user A
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'projectusera@test.com',
        password: 'password123',
        firstName: 'Project',
        lastName: 'UserA',
      });

    const loginARes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'projectusera@test.com',
        password: 'password123',
      });

    const cookieA = loginARes.headers['set-cookie'];
    userAToken = cookieA[0].split(';')[0].split('=')[1];

    // Register and login user B
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'projectuserb@test.com',
        password: 'password123',
        firstName: 'Project',
        lastName: 'UserB',
      });

    const loginBRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'projectuserb@test.com',
        password: 'password123',
      });

    const cookieB = loginBRes.headers['set-cookie'];
    userBToken = cookieB[0].split(';')[0].split('=')[1];

    // Create org A for user A
    const orgARes = await request(app.getHttpServer())
      .post('/api/organizations')
      .set('Cookie', [`token=${userAToken}`])
      .send({
        name: 'Project Org A',
      });
    orgAId = orgARes.body.id;

    // Create org B for user B
    const orgBRes = await request(app.getHttpServer())
      .post('/api/organizations')
      .set('Cookie', [`token=${userBToken}`])
      .send({
        name: 'Project Org B',
      });
    orgBId = orgBRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/organizations/:orgId/projects', () => {
    it('should create project as admin', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/organizations/${orgAId}/projects`)
        .set('Cookie', [`token=${userAToken}`])
        .send({
          name: 'Project Alpha',
          description: 'Test project',
          budget: 10000.50,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Project Alpha');
      expect(parseFloat(res.body.budget)).toBe(10000.50);
      projectAId = res.body.id;
    });

    it('should reject negative budget', async () => {
      await request(app.getHttpServer())
        .post(`/api/organizations/${orgAId}/projects`)
        .set('Cookie', [`token=${userAToken}`])
        .send({
          name: 'Bad Project',
          budget: -100,
        })
        .expect(400);
    });

    it('should reject more than 2 decimal places', async () => {
      await request(app.getHttpServer())
        .post(`/api/organizations/${orgAId}/projects`)
        .set('Cookie', [`token=${userAToken}`])
        .send({
          name: 'Bad Project',
          budget: 100.123,
        })
        .expect(400);
    });

    it('should reject missing required fields', async () => {
      await request(app.getHttpServer())
        .post(`/api/organizations/${orgAId}/projects`)
        .set('Cookie', [`token=${userAToken}`])
        .send({
          name: 'Project without budget',
        })
        .expect(400);
    });

    it('should return 403 when member tries to create project', async () => {
      // Add user B as member to org A
      await request(app.getHttpServer())
        .post(`/api/organizations/${orgAId}/members`)
        .set('Cookie', [`token=${userAToken}`])
        .send({
          email: 'projectuserb@test.com',
          role: 'member',
        });

      await request(app.getHttpServer())
        .post(`/api/organizations/${orgAId}/projects`)
        .set('Cookie', [`token=${userBToken}`])
        .send({
          name: 'Project by member',
          budget: 5000,
        })
        .expect(403);
    });

    it('should return 404 when non-member tries to create project', async () => {
      // User C is not a member
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'projectuserc@test.com',
          password: 'password123',
          firstName: 'Project',
          lastName: 'UserC',
        });

      const loginCRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'projectuserc@test.com',
          password: 'password123',
        });

      const cookieC = loginCRes.headers['set-cookie'];
      const userCToken = cookieC[0].split(';')[0].split('=')[1];

      await request(app.getHttpServer())
        .post(`/api/organizations/${orgAId}/projects`)
        .set('Cookie', [`token=${userCToken}`])
        .send({
          name: 'Project by non-member',
          budget: 5000,
        })
        .expect(404);
    });

    it('should reject invalid orgId UUID', async () => {
      await request(app.getHttpServer())
        .post('/api/organizations/not-a-uuid/projects')
        .set('Cookie', [`token=${userAToken}`])
        .send({
          name: 'Project',
          budget: 5000,
        })
        .expect(404);
    });
  });

  describe('GET /api/organizations/:orgId/projects', () => {
    it('should list projects for organization', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/organizations/${orgAId}/projects`)
        .set('Cookie', [`token=${userAToken}`])
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('budget');
    });

    it('should allow member to list projects', async () => {
      // User B is a member of org A
      const res = await request(app.getHttpServer())
        .get(`/api/organizations/${orgAId}/projects`)
        .set('Cookie', [`token=${userBToken}`])
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should return empty array for org with no projects', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/organizations/${orgBId}/projects`)
        .set('Cookie', [`token=${userBToken}`])
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it('should return 404 for non-member', async () => {
      await request(app.getHttpServer())
        .get(`/api/organizations/${orgBId}/projects`)
        .set('Cookie', [`token=${userAToken}`])
        .expect(404);
    });
  });

  describe('GET /api/organizations/:orgId/projects/:projectId', () => {
    it('should get project by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/organizations/${orgAId}/projects/${projectAId}`)
        .set('Cookie', [`token=${userAToken}`])
        .expect(200);

      expect(res.body.id).toBe(projectAId);
      expect(res.body.name).toBe('Project Alpha');
    });

    it('should allow member to view project', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/organizations/${orgAId}/projects/${projectAId}`)
        .set('Cookie', [`token=${userBToken}`])
        .expect(200);

      expect(res.body.id).toBe(projectAId);
    });

    it('should return 404 when project not found in org', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/api/organizations/${orgAId}/projects/${fakeId}`)
        .set('Cookie', [`token=${userAToken}`])
        .expect(404);
    });

    it('should return 404 when trying to access project from wrong org (guessable-id test)', async () => {
      // User B tries to access User A's project through their own org
      await request(app.getHttpServer())
        .get(`/api/organizations/${orgBId}/projects/${projectAId}`)
        .set('Cookie', [`token=${userBToken}`])
        .expect(404);
    });

    it('should return 404 when non-member tries to view project', async () => {
      // User A tries to view project in org B
      await request(app.getHttpServer())
        .get(`/api/organizations/${orgBId}/projects/${projectAId}`)
        .set('Cookie', [`token=${userAToken}`])
        .expect(404);
    });

    it('should reject invalid project UUID', async () => {
      await request(app.getHttpServer())
        .get(`/api/organizations/${orgAId}/projects/not-a-uuid`)
        .set('Cookie', [`token=${userAToken}`])
        .expect(400);
    });
  });

  describe('PATCH /api/organizations/:orgId/projects/:projectId', () => {
    it('should update project as admin', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/organizations/${orgAId}/projects/${projectAId}`)
        .set('Cookie', [`token=${userAToken}`])
        .send({
          name: 'Updated Project Alpha',
          budget: 15000.75,
        })
        .expect(200);

      expect(res.body.name).toBe('Updated Project Alpha');
      expect(parseFloat(res.body.budget)).toBe(15000.75);
    });

    it('should return 403 when member tries to update project', async () => {
      await request(app.getHttpServer())
        .patch(`/api/organizations/${orgAId}/projects/${projectAId}`)
        .set('Cookie', [`token=${userBToken}`])
        .send({
          name: 'Member update',
        })
        .expect(403);
    });

    it('should return 404 when trying to update project from wrong org', async () => {
      await request(app.getHttpServer())
        .patch(`/api/organizations/${orgBId}/projects/${projectAId}`)
        .set('Cookie', [`token=${userBToken}`])
        .send({
          name: 'Wrong org update',
        })
        .expect(404);
    });

    it('should reject negative budget on update', async () => {
      await request(app.getHttpServer())
        .patch(`/api/organizations/${orgAId}/projects/${projectAId}`)
        .set('Cookie', [`token=${userAToken}`])
        .send({
          budget: -500,
        })
        .expect(400);
    });
  });

  describe('DELETE /api/organizations/:orgId/projects/:projectId', () => {
    it('should return 403 when member tries to delete project', async () => {
      await request(app.getHttpServer())
        .delete(`/api/organizations/${orgAId}/projects/${projectAId}`)
        .set('Cookie', [`token=${userBToken}`])
        .expect(403);
    });

    it('should return 404 when trying to delete project from wrong org', async () => {
      await request(app.getHttpServer())
        .delete(`/api/organizations/${orgBId}/projects/${projectAId}`)
        .set('Cookie', [`token=${userBToken}`])
        .expect(404);
    });

    it('should delete project as admin', async () => {
      await request(app.getHttpServer())
        .delete(`/api/organizations/${orgAId}/projects/${projectAId}`)
        .set('Cookie', [`token=${userAToken}`])
        .expect(204);

      // Verify it's gone
      await request(app.getHttpServer())
        .get(`/api/organizations/${orgAId}/projects/${projectAId}`)
        .set('Cookie', [`token=${userAToken}`])
        .expect(404);
    });

    it('should return 404 when deleting non-existent project', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .delete(`/api/organizations/${orgAId}/projects/${fakeId}`)
        .set('Cookie', [`token=${userAToken}`])
        .expect(404);
    });
  });
});

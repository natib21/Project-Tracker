import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';

describe('Organizations (e2e)', () => {
  let app: INestApplication;
  let userAToken: string;
  let userBToken: string;
  let orgAId: string;
  let orgBId: string;

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
        email: 'usera@test.com',
        password: 'password123',
        firstName: 'User',
        lastName: 'A',
      });

    const loginARes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'usera@test.com',
        password: 'password123',
      });

    const cookieA = loginARes.headers['set-cookie'];
    userAToken = cookieA[0].split(';')[0].split('=')[1];

    // Register and login user B
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'userb@test.com',
        password: 'password123',
        firstName: 'User',
        lastName: 'B',
      });

    const loginBRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'userb@test.com',
        password: 'password123',
      });

    const cookieB = loginBRes.headers['set-cookie'];
    userBToken = cookieB[0].split(';')[0].split('=')[1];
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/organizations', () => {
    it('should create organization and make creator an admin', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/organizations')
        .set('Cookie', [`token=${userAToken}`])
        .send({
          name: 'Organization A',
          description: 'Test org A',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Organization A');
      orgAId = res.body.id;
    });

    it('should create organization B for user B', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/organizations')
        .set('Cookie', [`token=${userBToken}`])
        .send({
          name: 'Organization B',
        })
        .expect(201);

      orgBId = res.body.id;
    });

    it('should reject missing name', async () => {
      await request(app.getHttpServer())
        .post('/api/organizations')
        .set('Cookie', [`token=${userAToken}`])
        .send({})
        .expect(400);
    });
  });

  describe('GET /api/organizations', () => {
    it('should list only organizations where user is a member', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/organizations')
        .set('Cookie', [`token=${userAToken}`])
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe(orgAId);
      expect(res.body[0].name).toBe('Organization A');
    });

    it('should show both orgs for user in two orgs', async () => {
      // Add user A to org B
      await request(app.getHttpServer())
        .post(`/api/organizations/${orgBId}/members`)
        .set('Cookie', [`token=${userBToken}`])
        .send({
          email: 'usera@test.com',
          role: 'member',
        });

      const res = await request(app.getHttpServer())
        .get('/api/organizations')
        .set('Cookie', [`token=${userAToken}`])
        .expect(200);

      expect(res.body).toHaveLength(2);
    });
  });

  describe('GET /api/organizations/:orgId', () => {
    it('should get organization by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/organizations/${orgAId}`)
        .set('Cookie', [`token=${userAToken}`])
        .expect(200);

      expect(res.body.id).toBe(orgAId);
      expect(res.body.name).toBe('Organization A');
    });

    it('should return 404 when user is not a member (user B reading org A)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/organizations/${orgAId}`)
        .set('Cookie', [`token=${userBToken}`])
        .expect(404);

      // Nothing about the other organization may leak in the error body
      expect(JSON.stringify(res.body)).not.toContain('Organization A');
    });

    it('should give a non-member the same answer as for an organization that does not exist', async () => {
      const missingOrgId = '00000000-0000-4000-8000-000000000000';

      const forbidden = await request(app.getHttpServer())
        .get(`/api/organizations/${orgAId}`)
        .set('Cookie', [`token=${userBToken}`])
        .expect(404);

      const missing = await request(app.getHttpServer())
        .get(`/api/organizations/${missingOrgId}`)
        .set('Cookie', [`token=${userBToken}`])
        .expect(404);

      expect(forbidden.body).toEqual(missing.body);
    });

    it('should return 401 without a session', async () => {
      await request(app.getHttpServer())
        .get(`/api/organizations/${orgAId}`)
        .expect(401);
    });

    it('should reject invalid UUID', async () => {
      await request(app.getHttpServer())
        .get('/api/organizations/invalid-id')
        .set('Cookie', [`token=${userAToken}`])
        .expect(404);
    });
  });

  describe('GET /api/organizations/:orgId/members', () => {
    it('should list members of organization', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/organizations/${orgAId}/members`)
        .set('Cookie', [`token=${userAToken}`])
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].user.email).toBe('usera@test.com');
      expect(res.body[0].role).toBe('admin');
    });

    it('should return 404 when user is not a member (user B accessing org A)', async () => {
      await request(app.getHttpServer())
        .get(`/api/organizations/${orgAId}/members`)
        .set('Cookie', [`token=${userBToken}`])
        .expect(404);
    });

    it('should reject invalid orgId UUID', async () => {
      await request(app.getHttpServer())
        .get('/api/organizations/not-a-uuid/members')
        .set('Cookie', [`token=${userAToken}`])
        .expect(404);
    });
  });

  describe('POST /api/organizations/:orgId/members', () => {
    it('should add member as admin', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/organizations/${orgAId}/members`)
        .set('Cookie', [`token=${userAToken}`])
        .send({
          email: 'userb@test.com',
          role: 'member',
        })
        .expect(201);

      expect(res.body.user.email).toBe('userb@test.com');
      expect(res.body.role).toBe('member');
    });

    it('should return 404 when non-member tries to add member', async () => {
      // Create user C
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'userc@test.com',
          password: 'password123',
          firstName: 'User',
          lastName: 'C',
        });

      const loginCRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'userc@test.com',
          password: 'password123',
        });

      const cookieC = loginCRes.headers['set-cookie'];
      const userCToken = cookieC[0].split(';')[0].split('=')[1];

      await request(app.getHttpServer())
        .post(`/api/organizations/${orgAId}/members`)
        .set('Cookie', [`token=${userCToken}`])
        .send({
          email: 'userb@test.com',
          role: 'member',
        })
        .expect(404);
    });

    it('should return 403 when plain member tries to add member', async () => {
      // User B is now a member of org A, try to add someone
      await request(app.getHttpServer())
        .post(`/api/organizations/${orgAId}/members`)
        .set('Cookie', [`token=${userBToken}`])
        .send({
          email: 'userc@test.com',
          role: 'member',
        })
        .expect(403);
    });

    it('should return 409 when adding duplicate member', async () => {
      await request(app.getHttpServer())
        .post(`/api/organizations/${orgAId}/members`)
        .set('Cookie', [`token=${userAToken}`])
        .send({
          email: 'userb@test.com',
          role: 'member',
        })
        .expect(409);
    });

    it('should return 404 when adding non-existent user', async () => {
      await request(app.getHttpServer())
        .post(`/api/organizations/${orgAId}/members`)
        .set('Cookie', [`token=${userAToken}`])
        .send({
          email: 'nonexistent@test.com',
          role: 'member',
        })
        .expect(404);
    });

    it('should reject invalid role', async () => {
      await request(app.getHttpServer())
        .post(`/api/organizations/${orgAId}/members`)
        .set('Cookie', [`token=${userAToken}`])
        .send({
          email: 'userb@test.com',
          role: 'invalid-role',
        })
        .expect(400);
    });
  });
});

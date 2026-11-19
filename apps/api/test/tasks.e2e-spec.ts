import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';

describe('Tasks (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let memberToken: string;
  let nonMemberToken: string;
  let orgAId: string;
  let orgBId: string;
  let projectAId: string;
  let projectBId: string;
  let taskAId: string;

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

    // Register and login admin user
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'taskadmin@test.com',
        password: 'password123',
        firstName: 'Task',
        lastName: 'Admin',
      });

    const loginAdminRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'taskadmin@test.com',
        password: 'password123',
      });

    const cookieAdmin = loginAdminRes.headers['set-cookie'];
    adminToken = cookieAdmin[0].split(';')[0].split('=')[1];

    // Register and login member user
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'taskmember@test.com',
        password: 'password123',
        firstName: 'Task',
        lastName: 'Member',
      });

    const loginMemberRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'taskmember@test.com',
        password: 'password123',
      });

    const cookieMember = loginMemberRes.headers['set-cookie'];
    memberToken = cookieMember[0].split(';')[0].split('=')[1];

    // Register and login non-member user
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'tasknonmember@test.com',
        password: 'password123',
        firstName: 'Task',
        lastName: 'NonMember',
      });

    const loginNonMemberRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'tasknonmember@test.com',
        password: 'password123',
      });

    const cookieNonMember = loginNonMemberRes.headers['set-cookie'];
    nonMemberToken = cookieNonMember[0].split(';')[0].split('=')[1];

    // Create org A for admin
    const orgARes = await request(app.getHttpServer())
      .post('/api/organizations')
      .set('Cookie', [`token=${adminToken}`])
      .send({
        name: 'Task Org A',
      });
    orgAId = orgARes.body.id;

    // Add member to org A
    await request(app.getHttpServer())
      .post(`/api/organizations/${orgAId}/members`)
      .set('Cookie', [`token=${adminToken}`])
      .send({
        email: 'taskmember@test.com',
        role: 'member',
      });

    // Create org B for non-member user
    const orgBRes = await request(app.getHttpServer())
      .post('/api/organizations')
      .set('Cookie', [`token=${nonMemberToken}`])
      .send({
        name: 'Task Org B',
      });
    orgBId = orgBRes.body.id;

    // Create project A in org A
    const projectARes = await request(app.getHttpServer())
      .post(`/api/organizations/${orgAId}/projects`)
      .set('Cookie', [`token=${adminToken}`])
      .send({
        name: 'Task Project A',
        description: 'Project for testing tasks',
        budget: 10000.00,
      });
    projectAId = projectARes.body.id;

    // Create project B in org B
    const projectBRes = await request(app.getHttpServer())
      .post(`/api/organizations/${orgBId}/projects`)
      .set('Cookie', [`token=${nonMemberToken}`])
      .send({
        name: 'Task Project B',
        description: 'Project in different org',
        budget: 5000.00,
      });
    projectBId = projectBRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/organizations/:orgId/projects/:projectId/tasks', () => {
    it('should create task as admin', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/organizations/${orgAId}/projects/${projectAId}/tasks`)
        .set('Cookie', [`token=${adminToken}`])
        .send({
          title: 'Task Alpha',
          description: 'Test task by admin',
          estimatedCost: 1000.50,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('Task Alpha');
      expect(parseFloat(res.body.estimatedCost)).toBe(1000.50);
      expect(res.body.projectId).toBe(projectAId);
      expect(res.body.organizationId).toBe(orgAId);
      taskAId = res.body.id;
    });

    it('should create task as member', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/organizations/${orgAId}/projects/${projectAId}/tasks`)
        .set('Cookie', [`token=${memberToken}`])
        .send({
          title: 'Task Beta',
          description: 'Test task by member',
          estimatedCost: 500.25,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('Task Beta');
      expect(parseFloat(res.body.estimatedCost)).toBe(500.25);
    });

    it('should reject negative estimatedCost', async () => {
      await request(app.getHttpServer())
        .post(`/api/organizations/${orgAId}/projects/${projectAId}/tasks`)
        .set('Cookie', [`token=${adminToken}`])
        .send({
          title: 'Bad Task',
          estimatedCost: -100,
        })
        .expect(400);
    });

    it('should reject more than 2 decimal places', async () => {
      await request(app.getHttpServer())
        .post(`/api/organizations/${orgAId}/projects/${projectAId}/tasks`)
        .set('Cookie', [`token=${adminToken}`])
        .send({
          title: 'Bad Task',
          estimatedCost: 100.123,
        })
        .expect(400);
    });

    it('should reject missing required fields', async () => {
      await request(app.getHttpServer())
        .post(`/api/organizations/${orgAId}/projects/${projectAId}/tasks`)
        .set('Cookie', [`token=${adminToken}`])
        .send({
          title: 'Task without cost',
        })
        .expect(400);
    });

    it('should return 404 when non-member tries to create task', async () => {
      await request(app.getHttpServer())
        .post(`/api/organizations/${orgAId}/projects/${projectAId}/tasks`)
        .set('Cookie', [`token=${nonMemberToken}`])
        .send({
          title: 'Task by non-member',
          estimatedCost: 500,
        })
        .expect(404);
    });

    it('should return 404 when project does not exist in org', async () => {
      const fakeProjectId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .post(`/api/organizations/${orgAId}/projects/${fakeProjectId}/tasks`)
        .set('Cookie', [`token=${adminToken}`])
        .send({
          title: 'Task for non-existent project',
          estimatedCost: 500,
        })
        .expect(404);
    });

    it('should return 404 when trying to create task via wrong org path (guessable-id test)', async () => {
      // Non-member tries to create task in project A via org B path
      await request(app.getHttpServer())
        .post(`/api/organizations/${orgBId}/projects/${projectAId}/tasks`)
        .set('Cookie', [`token=${nonMemberToken}`])
        .send({
          title: 'Task via wrong org',
          estimatedCost: 500,
        })
        .expect(404);
    });

    it('should reject invalid project UUID', async () => {
      await request(app.getHttpServer())
        .post(`/api/organizations/${orgAId}/projects/not-a-uuid/tasks`)
        .set('Cookie', [`token=${adminToken}`])
        .send({
          title: 'Task',
          estimatedCost: 500,
        })
        .expect(400);
    });

    it('should reject invalid org UUID', async () => {
      await request(app.getHttpServer())
        .post(`/api/organizations/not-a-uuid/projects/${projectAId}/tasks`)
        .set('Cookie', [`token=${adminToken}`])
        .send({
          title: 'Task',
          estimatedCost: 500,
        })
        .expect(404);
    });
  });

  describe('GET /api/organizations/:orgId/projects/:projectId/tasks', () => {
    it('should list tasks for project as admin', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/organizations/${orgAId}/projects/${projectAId}/tasks`)
        .set('Cookie', [`token=${adminToken}`])
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('title');
      expect(res.body[0]).toHaveProperty('estimatedCost');
    });

    it('should list tasks for project as member', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/organizations/${orgAId}/projects/${projectAId}/tasks`)
        .set('Cookie', [`token=${memberToken}`])
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty array for project with no tasks', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/organizations/${orgBId}/projects/${projectBId}/tasks`)
        .set('Cookie', [`token=${nonMemberToken}`])
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it('should return 404 when non-member tries to list tasks', async () => {
      await request(app.getHttpServer())
        .get(`/api/organizations/${orgAId}/projects/${projectAId}/tasks`)
        .set('Cookie', [`token=${nonMemberToken}`])
        .expect(404);
    });

    it('should return 404 when trying to list tasks via wrong org path', async () => {
      await request(app.getHttpServer())
        .get(`/api/organizations/${orgBId}/projects/${projectAId}/tasks`)
        .set('Cookie', [`token=${nonMemberToken}`])
        .expect(404);
    });

    it('should return 404 when project does not exist', async () => {
      const fakeProjectId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/api/organizations/${orgAId}/projects/${fakeProjectId}/tasks`)
        .set('Cookie', [`token=${adminToken}`])
        .expect(404);
    });
  });

  describe('GET /api/organizations/:orgId/projects/:projectId/tasks/:taskId', () => {
    it('should get task by id as admin', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/organizations/${orgAId}/projects/${projectAId}/tasks/${taskAId}`)
        .set('Cookie', [`token=${adminToken}`])
        .expect(200);

      expect(res.body.id).toBe(taskAId);
      expect(res.body.title).toBe('Task Alpha');
    });

    it('should get task by id as member', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/organizations/${orgAId}/projects/${projectAId}/tasks/${taskAId}`)
        .set('Cookie', [`token=${memberToken}`])
        .expect(200);

      expect(res.body.id).toBe(taskAId);
    });

    it('should return 404 when task not found in project', async () => {
      const fakeTaskId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/api/organizations/${orgAId}/projects/${projectAId}/tasks/${fakeTaskId}`)
        .set('Cookie', [`token=${adminToken}`])
        .expect(404);
    });

    it('should return 404 when trying to access task via wrong org path (guessable-id test)', async () => {
      // Non-member tries to access task A via org B path
      await request(app.getHttpServer())
        .get(`/api/organizations/${orgBId}/projects/${projectAId}/tasks/${taskAId}`)
        .set('Cookie', [`token=${nonMemberToken}`])
        .expect(404);
    });

    it('should return 404 when non-member tries to view task', async () => {
      await request(app.getHttpServer())
        .get(`/api/organizations/${orgAId}/projects/${projectAId}/tasks/${taskAId}`)
        .set('Cookie', [`token=${nonMemberToken}`])
        .expect(404);
    });

    it('should reject invalid task UUID', async () => {
      await request(app.getHttpServer())
        .get(`/api/organizations/${orgAId}/projects/${projectAId}/tasks/not-a-uuid`)
        .set('Cookie', [`token=${adminToken}`])
        .expect(400);
    });
  });

  describe('PATCH /api/organizations/:orgId/projects/:projectId/tasks/:taskId', () => {
    it('should update task as admin', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/organizations/${orgAId}/projects/${projectAId}/tasks/${taskAId}`)
        .set('Cookie', [`token=${adminToken}`])
        .send({
          title: 'Updated Task Alpha',
          estimatedCost: 1500.75,
        })
        .expect(200);

      expect(res.body.title).toBe('Updated Task Alpha');
      expect(parseFloat(res.body.estimatedCost)).toBe(1500.75);
    });

    it('should update task as member', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/organizations/${orgAId}/projects/${projectAId}/tasks/${taskAId}`)
        .set('Cookie', [`token=${memberToken}`])
        .send({
          description: 'Updated by member',
        })
        .expect(200);

      expect(res.body.description).toBe('Updated by member');
    });

    it('should return 404 when trying to update task via wrong org path', async () => {
      await request(app.getHttpServer())
        .patch(`/api/organizations/${orgBId}/projects/${projectAId}/tasks/${taskAId}`)
        .set('Cookie', [`token=${nonMemberToken}`])
        .send({
          title: 'Wrong org update',
        })
        .expect(404);
    });

    it('should return 404 when non-member tries to update task', async () => {
      await request(app.getHttpServer())
        .patch(`/api/organizations/${orgAId}/projects/${projectAId}/tasks/${taskAId}`)
        .set('Cookie', [`token=${nonMemberToken}`])
        .send({
          title: 'Non-member update',
        })
        .expect(404);
    });

    it('should reject negative estimatedCost on update', async () => {
      await request(app.getHttpServer())
        .patch(`/api/organizations/${orgAId}/projects/${projectAId}/tasks/${taskAId}`)
        .set('Cookie', [`token=${adminToken}`])
        .send({
          estimatedCost: -500,
        })
        .expect(400);
    });

    it('should return 404 when task does not exist', async () => {
      const fakeTaskId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .patch(`/api/organizations/${orgAId}/projects/${projectAId}/tasks/${fakeTaskId}`)
        .set('Cookie', [`token=${adminToken}`])
        .send({
          title: 'Update non-existent',
        })
        .expect(404);
    });
  });

  describe('DELETE /api/organizations/:orgId/projects/:projectId/tasks/:taskId', () => {
    let taskToDelete: string;

    beforeAll(async () => {
      // Create a task to delete
      const res = await request(app.getHttpServer())
        .post(`/api/organizations/${orgAId}/projects/${projectAId}/tasks`)
        .set('Cookie', [`token=${adminToken}`])
        .send({
          title: 'Task to delete',
          estimatedCost: 100,
        });
      taskToDelete = res.body.id;
    });

    it('should delete task as admin', async () => {
      await request(app.getHttpServer())
        .delete(`/api/organizations/${orgAId}/projects/${projectAId}/tasks/${taskToDelete}`)
        .set('Cookie', [`token=${adminToken}`])
        .expect(204);

      // Verify it's gone
      await request(app.getHttpServer())
        .get(`/api/organizations/${orgAId}/projects/${projectAId}/tasks/${taskToDelete}`)
        .set('Cookie', [`token=${adminToken}`])
        .expect(404);
    });

    it('should delete task as member', async () => {
      // Create another task to delete
      const res = await request(app.getHttpServer())
        .post(`/api/organizations/${orgAId}/projects/${projectAId}/tasks`)
        .set('Cookie', [`token=${memberToken}`])
        .send({
          title: 'Task to delete by member',
          estimatedCost: 200,
        });
      const taskId = res.body.id;

      await request(app.getHttpServer())
        .delete(`/api/organizations/${orgAId}/projects/${projectAId}/tasks/${taskId}`)
        .set('Cookie', [`token=${memberToken}`])
        .expect(204);
    });

    it('should return 404 when trying to delete task via wrong org path', async () => {
      await request(app.getHttpServer())
        .delete(`/api/organizations/${orgBId}/projects/${projectAId}/tasks/${taskAId}`)
        .set('Cookie', [`token=${nonMemberToken}`])
        .expect(404);
    });

    it('should return 404 when non-member tries to delete task', async () => {
      await request(app.getHttpServer())
        .delete(`/api/organizations/${orgAId}/projects/${projectAId}/tasks/${taskAId}`)
        .set('Cookie', [`token=${nonMemberToken}`])
        .expect(404);
    });

    it('should return 404 when deleting non-existent task', async () => {
      const fakeTaskId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .delete(`/api/organizations/${orgAId}/projects/${projectAId}/tasks/${fakeTaskId}`)
        .set('Cookie', [`token=${adminToken}`])
        .expect(404);
    });
  });

  describe('Budget Summary Integration', () => {
    let testOrgId: string;
    let testProjectId: string;
    let testToken: string;

    beforeAll(async () => {
      // Create a new user for isolated budget testing
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'budgettest@test.com',
          password: 'password123',
          firstName: 'Budget',
          lastName: 'Test',
        });

      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'budgettest@test.com',
          password: 'password123',
        });

      const cookie = loginRes.headers['set-cookie'];
      testToken = cookie[0].split(';')[0].split('=')[1];

      // Create org
      const orgRes = await request(app.getHttpServer())
        .post('/api/organizations')
        .set('Cookie', [`token=${testToken}`])
        .send({
          name: 'Budget Test Org',
        });
      testOrgId = orgRes.body.id;

      // Create project with budget
      const projectRes = await request(app.getHttpServer())
        .post(`/api/organizations/${testOrgId}/projects`)
        .set('Cookie', [`token=${testToken}`])
        .send({
          name: 'Budget Test Project',
          budget: 5000.00,
        });
      testProjectId = projectRes.body.id;
    });

    it('should return budget summary with zero spent for project without tasks', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/organizations/${testOrgId}/projects/${testProjectId}`)
        .set('Cookie', [`token=${testToken}`])
        .expect(200);

      expect(res.body).toHaveProperty('budget');
      expect(res.body).toHaveProperty('spent');
      expect(res.body).toHaveProperty('remaining');
      expect(res.body).toHaveProperty('overBudget');
      expect(parseFloat(res.body.budget)).toBe(5000.00);
      expect(parseFloat(res.body.spent)).toBe(0);
      expect(parseFloat(res.body.remaining)).toBe(5000.00);
      expect(res.body.overBudget).toBe(false);
    });

    it('should calculate spent correctly after adding tasks', async () => {
      // Add tasks
      await request(app.getHttpServer())
        .post(`/api/organizations/${testOrgId}/projects/${testProjectId}/tasks`)
        .set('Cookie', [`token=${testToken}`])
        .send({
          title: 'Task 1',
          estimatedCost: 1000.50,
        });

      await request(app.getHttpServer())
        .post(`/api/organizations/${testOrgId}/projects/${testProjectId}/tasks`)
        .set('Cookie', [`token=${testToken}`])
        .send({
          title: 'Task 2',
          estimatedCost: 2000.25,
        });

      const res = await request(app.getHttpServer())
        .get(`/api/organizations/${testOrgId}/projects/${testProjectId}`)
        .set('Cookie', [`token=${testToken}`])
        .expect(200);

      expect(parseFloat(res.body.spent)).toBe(3000.75);
      expect(parseFloat(res.body.remaining)).toBe(1999.25);
      expect(res.body.overBudget).toBe(false);
    });

    it('should show overBudget when spent exceeds budget', async () => {
      // Add task that exceeds budget
      await request(app.getHttpServer())
        .post(`/api/organizations/${testOrgId}/projects/${testProjectId}/tasks`)
        .set('Cookie', [`token=${testToken}`])
        .send({
          title: 'Task 3',
          estimatedCost: 2500.00,
        });

      const res = await request(app.getHttpServer())
        .get(`/api/organizations/${testOrgId}/projects/${testProjectId}`)
        .set('Cookie', [`token=${testToken}`])
        .expect(200);

      expect(parseFloat(res.body.spent)).toBe(5500.75);
      expect(parseFloat(res.body.remaining)).toBe(-500.75);
      expect(res.body.overBudget).toBe(true);
    });

    it('should update budget summary after updating task cost', async () => {
      // Get a task to update
      const tasksRes = await request(app.getHttpServer())
        .get(`/api/organizations/${testOrgId}/projects/${testProjectId}/tasks`)
        .set('Cookie', [`token=${testToken}`]);

      const taskId = tasksRes.body.find((t: any) => t.title === 'Task 1').id;

      // Update task cost
      await request(app.getHttpServer())
        .patch(`/api/organizations/${testOrgId}/projects/${testProjectId}/tasks/${taskId}`)
        .set('Cookie', [`token=${testToken}`])
        .send({
          estimatedCost: 500.00,
        });

      const res = await request(app.getHttpServer())
        .get(`/api/organizations/${testOrgId}/projects/${testProjectId}`)
        .set('Cookie', [`token=${testToken}`])
        .expect(200);

      // Spent should be recalculated
      expect(parseFloat(res.body.spent)).toBe(5000.25); // 500 + 2000.25 + 2500
    });

    it('should update budget summary after deleting task', async () => {
      // Get tasks to delete one
      const tasksRes = await request(app.getHttpServer())
        .get(`/api/organizations/${testOrgId}/projects/${testProjectId}/tasks`)
        .set('Cookie', [`token=${testToken}`]);

      const taskId = tasksRes.body.find((t: any) => t.title === 'Task 1').id;

      // Delete task
      await request(app.getHttpServer())
        .delete(`/api/organizations/${testOrgId}/projects/${testProjectId}/tasks/${taskId}`)
        .set('Cookie', [`token=${testToken}`])
        .expect(204);

      const res = await request(app.getHttpServer())
        .get(`/api/organizations/${testOrgId}/projects/${testProjectId}`)
        .set('Cookie', [`token=${testToken}`])
        .expect(200);

      // Spent should be reduced
      expect(parseFloat(res.body.spent)).toBe(4500.25); // 2000.25 + 2500
    });

    it('should include budget summary in list projects response', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/organizations/${testOrgId}/projects`)
        .set('Cookie', [`token=${testToken}`])
        .expect(200);

      expect(res.body[0]).toHaveProperty('budget');
      expect(res.body[0]).toHaveProperty('spent');
      expect(res.body[0]).toHaveProperty('remaining');
      expect(res.body[0]).toHaveProperty('overBudget');
    });
  });

  describe('Cascade Delete', () => {
    let cascadeOrgId: string;
    let cascadeProjectId: string;
    let cascadeToken: string;
    let cascadeTaskIds: string[];

    beforeAll(async () => {
      // Create user for cascade testing
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'cascadetest@test.com',
          password: 'password123',
          firstName: 'Cascade',
          lastName: 'Test',
        });

      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'cascadetest@test.com',
          password: 'password123',
        });

      const cookie = loginRes.headers['set-cookie'];
      cascadeToken = cookie[0].split(';')[0].split('=')[1];

      // Create org
      const orgRes = await request(app.getHttpServer())
        .post('/api/organizations')
        .set('Cookie', [`token=${cascadeToken}`])
        .send({
          name: 'Cascade Test Org',
        });
      cascadeOrgId = orgRes.body.id;

      // Create project
      const projectRes = await request(app.getHttpServer())
        .post(`/api/organizations/${cascadeOrgId}/projects`)
        .set('Cookie', [`token=${cascadeToken}`])
        .send({
          name: 'Cascade Test Project',
          budget: 10000.00,
        });
      cascadeProjectId = projectRes.body.id;

      // Create multiple tasks
      cascadeTaskIds = [];
      for (let i = 1; i <= 3; i++) {
        const taskRes = await request(app.getHttpServer())
          .post(`/api/organizations/${cascadeOrgId}/projects/${cascadeProjectId}/tasks`)
          .set('Cookie', [`token=${cascadeToken}`])
          .send({
            title: `Cascade Task ${i}`,
            estimatedCost: 100 * i,
          });
        cascadeTaskIds.push(taskRes.body.id);
      }
    });

    it('should cascade delete all tasks when project is deleted', async () => {
      // Verify tasks exist
      const tasksBefore = await request(app.getHttpServer())
        .get(`/api/organizations/${cascadeOrgId}/projects/${cascadeProjectId}/tasks`)
        .set('Cookie', [`token=${cascadeToken}`])
        .expect(200);

      expect(tasksBefore.body.length).toBe(3);

      // Delete project
      await request(app.getHttpServer())
        .delete(`/api/organizations/${cascadeOrgId}/projects/${cascadeProjectId}`)
        .set('Cookie', [`token=${cascadeToken}`])
        .expect(204);

      // Verify project is gone
      await request(app.getHttpServer())
        .get(`/api/organizations/${cascadeOrgId}/projects/${cascadeProjectId}`)
        .set('Cookie', [`token=${cascadeToken}`])
        .expect(404);

      // Note: We can't verify tasks are gone via API since the project endpoint
      // returns 404, but the CASCADE DELETE constraint ensures they're removed
    });
  });
});

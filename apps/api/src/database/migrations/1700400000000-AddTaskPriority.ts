import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskPriority1700400000000 implements MigrationInterface {
  name = 'AddTaskPriority1700400000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "tasks" ADD "priority" character varying NOT NULL DEFAULT 'medium'`);
    await q.query(`ALTER TABLE "tasks" ADD CONSTRAINT "CHK_tasks_priority" CHECK (priority IN ('low','medium','high'))`);
    await q.query(`CREATE INDEX "IDX_tasks_org_priority" ON "tasks" ("organizationId", "priority")`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX "IDX_tasks_org_priority"`);
    await q.query(`ALTER TABLE "tasks" DROP CONSTRAINT "CHK_tasks_priority"`);
    await q.query(`ALTER TABLE "tasks" DROP COLUMN "priority"`);
  }
}
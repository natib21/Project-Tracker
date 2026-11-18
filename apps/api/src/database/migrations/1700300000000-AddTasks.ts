import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTasks1700300000000 implements MigrationInterface {
  name = 'AddTasks1700300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create tasks table
    await queryRunner.query(`
      CREATE TABLE "tasks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "projectId" uuid NOT NULL,
        "organizationId" uuid NOT NULL,
        "title" character varying NOT NULL,
        "description" character varying,
        "estimatedCost" numeric(14,2) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_tasks_estimatedCost" CHECK ("estimatedCost" >= 0),
        CONSTRAINT "PK_tasks_id" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key to projects with ON DELETE CASCADE
    await queryRunner.query(`
      ALTER TABLE "tasks"
      ADD CONSTRAINT "FK_tasks_projectId"
      FOREIGN KEY ("projectId") 
      REFERENCES "projects"("id")
      ON DELETE CASCADE
    `);

    // Add foreign key to organizations with ON DELETE CASCADE
    await queryRunner.query(`
      ALTER TABLE "tasks"
      ADD CONSTRAINT "FK_tasks_organizationId"
      FOREIGN KEY ("organizationId") 
      REFERENCES "organizations"("id")
      ON DELETE CASCADE
    `);

    // Add index on projectId
    await queryRunner.query(`
      CREATE INDEX "IDX_tasks_projectId"
      ON "tasks" ("projectId")
    `);

    // Add index on organizationId
    await queryRunner.query(`
      CREATE INDEX "IDX_tasks_organizationId"
      ON "tasks" ("organizationId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
      DROP INDEX "IDX_tasks_organizationId"
    `);

    await queryRunner.query(`
      DROP INDEX "IDX_tasks_projectId"
    `);

    // Drop foreign keys
    await queryRunner.query(`
      ALTER TABLE "tasks"
      DROP CONSTRAINT "FK_tasks_organizationId"
    `);

    await queryRunner.query(`
      ALTER TABLE "tasks"
      DROP CONSTRAINT "FK_tasks_projectId"
    `);

    // Drop table
    await queryRunner.query(`
      DROP TABLE "tasks"
    `);
  }
}

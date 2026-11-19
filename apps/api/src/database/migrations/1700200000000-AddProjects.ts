import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjects1700200000000 implements MigrationInterface {
  name = 'AddProjects1700200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create projects table
    await queryRunner.query(`
      CREATE TABLE "projects" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizationId" uuid NOT NULL,
        "name" character varying NOT NULL,
        "description" character varying,
        "budget" numeric(14,2) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_projects_budget" CHECK ("budget" >= 0),
        CONSTRAINT "PK_projects_id" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key with ON DELETE CASCADE
    await queryRunner.query(`
      ALTER TABLE "projects"
      ADD CONSTRAINT "FK_projects_organizationId"
      FOREIGN KEY ("organizationId") 
      REFERENCES "organizations"("id")
      ON DELETE CASCADE
    `);

    // Add index on organizationId
    await queryRunner.query(`
      CREATE INDEX "IDX_projects_organizationId"
      ON "projects" ("organizationId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`
      DROP INDEX "IDX_projects_organizationId"
    `);

    // Drop foreign key
    await queryRunner.query(`
      ALTER TABLE "projects"
      DROP CONSTRAINT "FK_projects_organizationId"
    `);

    // Drop table
    await queryRunner.query(`
      DROP TABLE "projects"
    `);
  }
}

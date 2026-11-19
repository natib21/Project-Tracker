import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMembershipConstraints1700100000000 implements MigrationInterface {
  name = 'AddMembershipConstraints1700100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add unique constraint on (userId, organizationId)
    await queryRunner.query(`
      ALTER TABLE "memberships" 
      ADD CONSTRAINT "UQ_memberships_userId_organizationId" 
      UNIQUE ("userId", "organizationId")
    `);

    // Add index on userId
    await queryRunner.query(`
      CREATE INDEX "IDX_memberships_userId" 
      ON "memberships" ("userId")
    `);

    // Add index on organizationId
    await queryRunner.query(`
      CREATE INDEX "IDX_memberships_organizationId" 
      ON "memberships" ("organizationId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
      DROP INDEX "IDX_memberships_organizationId"
    `);

    await queryRunner.query(`
      DROP INDEX "IDX_memberships_userId"
    `);

    // Drop unique constraint
    await queryRunner.query(`
      ALTER TABLE "memberships" 
      DROP CONSTRAINT "UQ_memberships_userId_organizationId"
    `);
  }
}

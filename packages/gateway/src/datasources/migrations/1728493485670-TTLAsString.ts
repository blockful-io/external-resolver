import { MigrationInterface, QueryRunner } from 'typeorm'

export class TTLAsString1728493485670 implements MigrationInterface {
  name = 'TTLAsString1728493485670'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "domain" DROP COLUMN "ttl"`)
    await queryRunner.query(
      `ALTER TABLE "domain" ADD "ttl" bigint NOT NULL DEFAULT 600`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "domain" DROP COLUMN "ttl"`)
    await queryRunner.query(
      `ALTER TABLE "domain" ADD "ttl" integer NOT NULL DEFAULT 600`,
    )
  }
}

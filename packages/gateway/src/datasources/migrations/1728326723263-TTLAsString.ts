import { MigrationInterface, QueryRunner } from 'typeorm'

export class TTLAsString1728326723263 implements MigrationInterface {
  name = 'TTLAsString1728326723263'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "domain" DROP COLUMN "ttl"`)
    await queryRunner.query(`ALTER TABLE "domain" ADD "ttl" bigint NOT NULL`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "domain" DROP COLUMN "ttl"`)
    await queryRunner.query(`ALTER TABLE "domain" ADD "ttl" integer NOT NULL`)
  }
}

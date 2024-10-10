import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddContenthashTable1728569226995 implements MigrationInterface {
  name = 'AddContenthashTable1728569226995'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "contenthash" ("domain" character varying NOT NULL, "contenthash" character varying NOT NULL, "resolver" character varying NOT NULL, "resolverVersion" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5a82be19e3bd0ea7c261604f6db" PRIMARY KEY ("domain"))`,
    )
    await queryRunner.query(`ALTER TABLE "domain" DROP COLUMN "contenthash"`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "domain" ADD "contenthash" character varying(32)`,
    )
    await queryRunner.query(`DROP TABLE "contenthash"`)
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateContenthashTable1724071035104 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE "contenthash" (
            "domain" character varying NOT NULL,
            "contenthash" character varying NOT NULL,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                PRIMARY KEY ("domain")
        )`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "contenthash"`)
  }
}

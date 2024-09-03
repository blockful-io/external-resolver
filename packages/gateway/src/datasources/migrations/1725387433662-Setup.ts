import { MigrationInterface, QueryRunner } from 'typeorm'

export class Setup1725387433662 implements MigrationInterface {
  name = 'Setup1725387433662'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "text" ("key" character varying NOT NULL, "value" character varying NOT NULL, "domain" character varying NOT NULL, "resolver" character varying NOT NULL, "resolverVersion" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_78c035e3615d5fbb539bd27bf6a" PRIMARY KEY ("key", "domain"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "address" ("coin" character varying NOT NULL, "address" character varying NOT NULL, "domain" character varying NOT NULL, "resolver" character varying NOT NULL, "resolverVersion" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_feb62619eb66027690f965369fe" PRIMARY KEY ("coin", "domain"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "domain" ("node" character varying NOT NULL, "name" character varying NOT NULL, "parent" character varying NOT NULL, "contenthash" character varying(32), "ttl" integer NOT NULL, "owner" character varying NOT NULL, "resolver" character varying NOT NULL, "resolverVersion" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9d01361cd11cbb412acb2e64595" PRIMARY KEY ("node"))`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_c0f1c395d3cf69ff59215055e1" ON "domain" ("owner") `,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c0f1c395d3cf69ff59215055e1"`,
    )
    await queryRunner.query(`DROP TABLE "domain"`)
    await queryRunner.query(`DROP TABLE "address"`)
    await queryRunner.query(`DROP TABLE "text"`)
  }
}

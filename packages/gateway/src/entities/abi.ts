import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

/**
 * Represents an ABI entity on the database.
 * See docs: https://docs.ens.domains/web/records
 */
@Entity()
export class ABI {
  @PrimaryColumn()
  domain: string

  @Column()
  abi: string

  @Column()
  resolver: string

  @Column()
  resolverVersion: string

  @CreateDateColumn()
  createdAt?: Date

  @UpdateDateColumn()
  updatedAt?: Date
}

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

/**
 * Represents an ContentHash entity on the database.
 * See docs: https://docs.ens.domains/web/records
 */
@Entity()
export class ContentHash {
  @PrimaryColumn()
  domain: string

  @Column()
  contentHash: `0x${string}`

  @Column()
  resolver: string

  @Column()
  resolverVersion: string

  @CreateDateColumn()
  createdAt?: Date

  @UpdateDateColumn()
  updatedAt?: Date
}

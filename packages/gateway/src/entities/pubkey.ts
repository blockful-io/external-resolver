import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

/**
 * Represents an Pubkey entity on the database.
 * See docs: https://docs.ens.domains/web/records
 */
@Entity()
export class Pubkey {
  @PrimaryColumn()
  domain: string

  @Column()
  x: `0x${string}`

  @Column()
  y: `0x${string}`

  @Column()
  resolver: string

  @Column()
  resolverVersion: string

  @CreateDateColumn()
  createdAt?: Date

  @UpdateDateColumn()
  updatedAt?: Date
}

import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

/**
 * Represents an Address entity on the database.
 * See docs: https://docs.ens.domains/web/resolution
 */
@Entity()
export class Address {
  @PrimaryColumn()
  coin: string

  @Column()
  address: string

  @PrimaryColumn()
  domain: string

  @Column()
  resolver: string

  @Column()
  resolverVersion: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}

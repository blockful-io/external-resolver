import { Domain } from '../entities'
import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
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
  @ManyToOne(() => Domain, (domain) => domain.addresses, {
    createForeignKeyConstraints: false,
  })
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

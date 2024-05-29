import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Domain } from './domain'

/**
 * Represents an Address entity on the database.
 * See docs: https://docs.ens.domains/web/resolution
 */
@Entity()
export class Address {
  @PrimaryColumn({ unique: true })
  coin: number

  @Column()
  address: string

  @JoinColumn({ name: 'domain', referencedColumnName: 'node' })
  @ManyToOne(() => Domain, (domain) => domain.addresses)
  @PrimaryColumn({
    name: 'domain',
    type: 'text',
  })
  domain: Domain

  @CreateDateColumn({ default: 'now' })
  createdAt?: Date

  @UpdateDateColumn({ default: 'now' })
  updatedAt?: Date
}

import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Domain } from './domain'

/**
 * Represents an Text entity on the database.
 * See docs: https://docs.ens.domains/web/records
 */
@Entity()
export class Text {
  @PrimaryColumn()
  key: string

  @Column()
  value: string

  @JoinColumn({ name: 'domain', referencedColumnName: 'node' })
  @ManyToOne(() => Domain, (domain) => domain.texts, { eager: true })
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

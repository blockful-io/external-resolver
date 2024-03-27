import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm'
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

  @JoinColumn({ name: 'domain', referencedColumnName: 'namehash' })
  @ManyToOne(() => Domain, (domain) => domain.texts)
  domain: Domain
}

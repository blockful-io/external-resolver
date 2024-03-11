import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm'
import { Domain } from './domain'

@Entity()
export class Text {
  @PrimaryColumn()
  key: string

  @Column()
  value: string

  @Column()
  ttl: number

  @JoinColumn({ name: 'domain', referencedColumnName: 'namehash' })
  @ManyToOne(() => Domain, (domain) => domain.texts)
  domain: Domain
}

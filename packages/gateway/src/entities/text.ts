import { Entity, PrimaryColumn, Column, ManyToOne } from 'typeorm'
import { Domain } from './domain'

@Entity()
export class Text {
  @PrimaryColumn()
  key: string

  @Column()
  value: string

  @Column()
  ttl: number

  @ManyToOne(() => Domain, (domain) => domain.texts)
  domainHash: string
}

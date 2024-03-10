import { Entity, PrimaryColumn, Column, ManyToOne } from 'typeorm'
import { Domain } from './domain'

@Entity()
export class Text {
  @PrimaryColumn({
    type: 'string',
  })
  key: string

  @Column({
    type: 'string',
  })
  value: string

  @ManyToOne(() => Domain, (domain) => domain.texts)
  domainHash: string

  @Column({
    type: 'number',
  })
  ttl: number
}

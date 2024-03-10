import { Entity, Column, PrimaryColumn, ManyToOne } from 'typeorm'
import { Domain } from './domain'

@Entity()
export class Address {
  @PrimaryColumn({
    type: 'number',
  })
  coin: number

  @Column({
    type: 'string',
  })
  address: string

  @ManyToOne(() => Domain, (domain) => domain.addresses)
  domainHash: string

  @Column({
    type: 'number',
  })
  ttl: number
}

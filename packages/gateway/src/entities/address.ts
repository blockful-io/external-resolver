import { Entity, Column, PrimaryColumn, ManyToOne } from 'typeorm'
import { Domain } from './domain'

@Entity()
export class Address {
  @PrimaryColumn()
  coin: number

  @Column()
  address: string

  @ManyToOne(() => Domain, (domain) => domain.addresses)
  domainHash: string

  @Column()
  ttl: number
}

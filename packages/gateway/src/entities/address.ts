import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm'
import { Domain } from './domain'

@Entity()
export class Address {
  @PrimaryColumn()
  coin: number

  @Column()
  address: string

  @Column()
  ttl: number

  @JoinColumn({ name: 'domain', referencedColumnName: 'namehash' })
  @ManyToOne(() => Domain, (domain) => domain.addresses)
  domain: Domain
}

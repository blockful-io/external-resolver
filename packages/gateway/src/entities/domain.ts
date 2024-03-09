import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm'
import { Address } from './address'
import { Text } from './text'

@Entity()
export class Domain {
  @PrimaryColumn()
  namehash: string

  @Column()
  contenthash: string

  @OneToMany(() => Address, (addr) => addr.domainHash)
  addresses: Address[]

  @OneToMany(() => Text, (text) => text.domainHash)
  texts: Text[]

  @Column()
  ttl: number
}

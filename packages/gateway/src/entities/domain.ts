import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm'
import { Address } from './address'
import { Text } from './text'

@Entity()
export class Domain {
  @PrimaryColumn({
    type: 'string',
  })
  namehash: string

  @Column({
    type: 'string',
  })
  contenthash: string

  @OneToMany(() => Address, (addr) => addr.domainHash)
  addresses: Address[]

  @OneToMany(() => Text, (text) => text.domainHash)
  texts: Text[]

  @Column({
    type: 'number',
  })
  ttl: number
}

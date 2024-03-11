import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm'
import { Address } from './address'
import { Text } from './text'

@Entity()
export class Domain {
  @PrimaryColumn()
  namehash: string

  @Column({ nullable: true })
  contenthash?: string

  @Column()
  ttl: number

  @OneToMany(() => Address, (addr) => addr.domain, { cascade: true })
  addresses: Address[]

  @OneToMany(() => Text, (text) => text.domain, { cascade: true })
  texts: Text[]
}

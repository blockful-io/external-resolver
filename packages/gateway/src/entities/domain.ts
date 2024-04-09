import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm'
import { Address } from './address'
import { Text } from './text'

/**
 * Represents the aggregation of ENS properties on the database.
 * See docs: https://docs.ens.domains/web/quickstart
 */
@Entity()
export class Domain {
  @PrimaryColumn()
  node: string

  @Column({ nullable: true, length: 32 })
  contenthash?: `0x${string}`

  @Column({ type: 'bigint' })
  ttl: number

  @OneToMany(() => Address, (addr) => addr.domain, { cascade: true })
  addresses: Address[]

  @OneToMany(() => Text, (text) => text.domain, { cascade: true })
  texts: Text[]
}

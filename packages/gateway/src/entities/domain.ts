import {
  Entity,
  PrimaryColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

import { Address } from './address'
import { Text } from './text'

/**
 * Represents the aggregation of ENS properties on the database.
 * See docs: https://docs.ens.domains/web/quickstart
 */
@Entity()
export class Domain {
  @PrimaryColumn({ unique: true })
  node: `0x${string}`

  @Column({ nullable: true, length: 32 })
  contenthash?: `0x${string}`

  @Column({ type: 'bigint' })
  ttl: number

  @OneToMany(() => Address, (addr) => addr.domain, { cascade: true })
  addresses: Address[]

  @OneToMany(() => Text, (text) => text.domain, { cascade: true })
  texts: Text[]

  @Column({ type: 'varchar' })
  owner: string

  @CreateDateColumn({ default: 'now' })
  createdAt?: Date

  @UpdateDateColumn({ default: 'now' })
  updatedAt?: Date
}

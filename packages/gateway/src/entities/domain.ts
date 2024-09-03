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
  @PrimaryColumn()
  node: `0x${string}`

  @Column()
  name: string

  @Column()
  parent: `0x${string}`

  @Column({ nullable: true, length: 32 })
  contenthash?: `0x${string}`

  @Column()
  ttl: number

  @OneToMany(() => Address, (addr) => addr.domain, {
    cascade: true,
    createForeignKeyConstraints: false,
  })
  addresses: Address[]

  @OneToMany(() => Text, (text) => text.domain, {
    cascade: true,
    createForeignKeyConstraints: false,
  })
  texts: Text[]

  @PrimaryColumn()
  owner: `0x${string}`

  @Column()
  resolver: `0x${string}`

  @Column()
  resolverVersion: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}

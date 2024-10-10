import {
  Entity,
  PrimaryColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToOne,
} from 'typeorm'

import { Address } from './address'
import { Text } from './text'
import { Contenthash } from './contenthash'

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

  @OneToOne(() => Contenthash, (contenthash) => contenthash.domain, {
    cascade: true,
    createForeignKeyConstraints: false,
    nullable: true,
  })
  contenthash?: Contenthash

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

  @Index()
  @Column()
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

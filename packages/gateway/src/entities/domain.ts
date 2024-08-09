import {
  Entity,
  PrimaryColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
} from 'typeorm'

import { Address, Text, ContentHash, Pubkey, ABI } from '.'

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

  @Column()
  ttl: number

  @OneToMany(() => Address, (addr) => addr.domain, { cascade: true })
  addresses: Address[]

  @OneToMany(() => Text, (text) => text.domain, { cascade: true })
  texts: Text[]

  @OneToOne(() => ContentHash, (contenthash) => contenthash.domain, {
    cascade: true,
    nullable: true,
  })
  contenthash?: ContentHash

  @OneToOne(() => Pubkey, (pubkey) => pubkey.domain, {
    cascade: true,
    nullable: true,
  })
  pubkey?: Pubkey

  @OneToOne(() => ABI, (abi) => abi.domain, { cascade: true, nullable: true })
  ABI?: ABI

  @PrimaryColumn()
  owner: `0x${string}`

  @Column()
  resolver: `0x${string}`

  @Column()
  resolverVersion: string

  @CreateDateColumn()
  createdAt?: Date

  @UpdateDateColumn()
  updatedAt?: Date
}

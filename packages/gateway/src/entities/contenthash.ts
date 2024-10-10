import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

/**
 * Represents the contenthash of a domain
 */
@Entity()
export class Contenthash {
  @PrimaryColumn()
  domain: string

  @Column()
  contenthash: string

  @Column()
  resolver: `0x${string}`

  @Column()
  resolverVersion: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}

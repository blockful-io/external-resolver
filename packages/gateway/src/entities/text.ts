import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm'

import { Domain } from '../entities'

/**
 * Represents an Text entity on the database.
 * See docs: https://docs.ens.domains/web/records
 */
@Entity()
export class Text {
  @PrimaryColumn()
  key: string

  @Column()
  value: string

  @PrimaryColumn()
  @ManyToOne(() => Domain, (domain) => domain.texts, {
    createForeignKeyConstraints: false,
  })
  domain: string

  @Column()
  resolver: string

  @Column()
  resolverVersion: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}

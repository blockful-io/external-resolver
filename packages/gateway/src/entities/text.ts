import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

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
  domain: string

  @CreateDateColumn()
  createdAt?: Date

  @UpdateDateColumn()
  updatedAt?: Date
}

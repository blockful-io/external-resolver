import 'reflect-metadata'
import { DataSource } from 'typeorm'

import { Address, Domain, Text } from '../entities'

// to initialize the initial connection with the database, register all entities
// and "synchronize" database schema, call "initialize()" method of a newly created database
// once in your application bootstrap
export function NewDataSource(dbUrl: string): DataSource {
  return new DataSource({
    type: 'postgres',
    url: dbUrl,
    entities: [Address, Domain, Text],
    synchronize: true,
    logging: false,
  })
}
